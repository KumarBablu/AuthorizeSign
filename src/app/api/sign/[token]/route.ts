import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { hashToken, maskEmail } from '@/lib/security/crypto';

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
    const adminDb = createAdminClient();

    // Query signer by token_hash joined with document and organization
    const { data: signer, error: signerError } = await (adminDb.from('signers') as any)
      .select(`
        id,
        name,
        email,
        order_index,
        status,
        verified_at,
        signed_at,
        document_id,
        documents (
          id,
          title,
          status,
          signing_order,
          expires_at,
          signed_sha256,
          organization_id,
          organizations (
            name
          )
        )
      `)
      .eq('token_hash', tokenHash)
      .single();

    if (signerError || !signer) {
      return NextResponse.json(
        { error: 'Invalid or unknown signing link.' },
        { status: 404 }
      );
    }

    const doc = signer.documents;
    const org = doc.organizations;
    const orgName = org?.name || 'the organization';
    const isExpired = new Date(doc.expires_at).getTime() < Date.now();

    // Log audit event: link_opened
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await (adminDb.from('audit_events') as any).insert({
      document_id: doc.id,
      signer_id: signer.id,
      event_type: 'link_opened',
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        signer_email: signer.email,
        signer_status: signer.status,
        document_status: doc.status,
      },
    });

    // STATE 1: DOCUMENT COMPLETED (Show green checkmark any time, any day)
    if (doc.status === 'completed') {
      return NextResponse.json({
        state: 'completed',
        title: doc.title,
        organizationName: orgName,
        signedSha256: doc.signed_sha256,
        message: 'Document has been signed',
        downloadUrl: `/api/documents/${doc.id}/download?type=signed`,
      });
    }

    // STATE 2: LINK EXPIRED (Time over)
    if (isExpired || doc.status === 'expired') {
      return NextResponse.json({
        state: 'expired',
        title: doc.title,
        organizationName: orgName,
        message: `This signing link has expired. Time over. Please connect with ${orgName} to request a new signing link.`,
      });
    }

    // STATE 3: THIS SIGNER ALREADY SIGNED (Waiting for other parties)
    if (signer.status === 'signed') {
      return NextResponse.json({
        state: 'already_signed_by_you',
        title: doc.title,
        organizationName: orgName,
        signedAt: signer.signed_at,
        message: 'You have signed this document. Waiting for remaining signatories to finish.',
      });
    }

    // STATE 4: SEQUENTIAL BLOCKING CHECK
    // If sequential, check if all signers with lower order_index have signed
    if (doc.signing_order === 'sequential' && signer.order_index > 0) {
      const { data: previousSigners } = await (adminDb.from('signers') as any)
        .select('name, status, order_index')
        .eq('document_id', doc.id)
        .lt('order_index', signer.order_index);

      const unsignedPrev = (previousSigners || []).find((s: any) => s.status !== 'signed');
      if (unsignedPrev) {
        return NextResponse.json({
          state: 'blocked',
          title: doc.title,
          organizationName: orgName,
          blockedBy: unsignedPrev.name,
          message: `This document is currently awaiting signature from ${unsignedPrev.name}. You will be notified via email when it is your turn to sign.`,
        });
      }
    }

    // Check if OTP was verified within last 30 minutes
    const isVerifiedRecently =
      signer.verified_at &&
      Date.now() - new Date(signer.verified_at).getTime() <= 30 * 60 * 1000;

    // STATE 5: READY FOR VERIFICATION OR SIGNING
    return NextResponse.json({
      state: isVerifiedRecently ? 'ready_to_sign' : 'ready_to_verify',
      title: doc.title,
      organizationName: orgName,
      signerName: signer.name,
      maskedEmail: maskEmail(signer.email),
      isVerified: Boolean(isVerifiedRecently),
      expiresAt: doc.expires_at,
    });
  } catch (err: any) {
    console.error('Signer link status error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
