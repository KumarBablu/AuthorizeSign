import { type NextRequest, NextResponse } from 'next/server';
import { devDb } from '@/lib/db/dev-store';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { downloadPdfFromStorage } from '@/lib/pdf/storage';
import { hashToken } from '@/lib/security/crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    let signer: any = null;

    if (devDb.isDevMode()) {
      signer = devDb.getSignerByTokenHash(tokenHash);
    } else {
      const adminDb = createAdminClient();
      const { data, error: signerError } = await (adminDb.from('signers') as any)
        .select(`
          id,
          order_index,
          verified_at,
          status,
          document_id,
          documents (
            id,
            title,
            status,
            signing_order,
            original_storage_path,
            signed_storage_path,
            expires_at
          )
        `)
        .eq('token_hash', tokenHash)
        .single();

      if (!signerError && data) {
        signer = data;
      }
    }

    if (!signer) {
      return NextResponse.json({ error: 'Invalid signer token' }, { status: 404 });
    }

    const doc = signer.documents;

    // Check expiration
    if (new Date(doc.expires_at).getTime() < Date.now() || doc.status === 'expired') {
      return NextResponse.json(
        { error: 'Signing link has expired. Time over.' },
        { status: 403 }
      );
    }

    // Check 30-minute verification window (unless already signed or document completed)
    if (signer.status !== 'signed' && doc.status !== 'completed') {
      if (!signer.verified_at) {
        return NextResponse.json(
          { error: 'Authentication required: please verify email code first.' },
          { status: 401 }
        );
      }

      const verifiedDurationMs = Date.now() - new Date(signer.verified_at).getTime();
      if (verifiedDurationMs > 30 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Verification session expired. Please verify with a new code.' },
          { status: 401 }
        );
      }

      // Check sequential signing order
      if (doc.signing_order === 'sequential' && signer.order_index > 0) {
        let hasUnsignedPrior = false;
        if (devDb.isDevMode()) {
          const prior = devDb.getSignersForDocument(doc.id).filter((s) => s.order_index < signer.order_index);
          hasUnsignedPrior = prior.some((s) => s.status !== 'signed');
        } else {
          const adminDb = createAdminClient();
          const { data: priorSigners } = await (adminDb.from('signers') as any)
            .select('status')
            .eq('document_id', doc.id)
            .lt('order_index', signer.order_index);

          hasUnsignedPrior = (priorSigners || []).some((s: any) => s.status !== 'signed');
        }

        if (hasUnsignedPrior) {
          return NextResponse.json(
            { error: 'Prior signers in sequence must complete signing before you can access this PDF.' },
            { status: 403 }
          );
        }
      }
    }

    // Determine storage path
    const storagePath =
      doc.status === 'completed' && doc.signed_storage_path
        ? doc.signed_storage_path
        : doc.original_storage_path;

    const pdfBuffer = await downloadPdfFromStorage(storagePath);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: any) {
    console.error('Signer PDF fetch error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
