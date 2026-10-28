import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { sendEmail } from '@/lib/email/resend';
import { renderInvitationEmail } from '@/lib/email/templates/invitation';
import { generateSignerToken, hashToken } from '@/lib/security/crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext || !['owner', 'admin', 'sender'].includes(orgContext.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const adminDb = createAdminClient();

    // Fetch document with signers and fields
    const { data: document, error: docError } = await (adminDb.from('documents') as any)
      .select(`
        id,
        title,
        status,
        signing_order,
        expires_at,
        signers (
          id,
          name,
          email,
          order_index,
          status
        ),
        fields (
          id,
          signer_id,
          type
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgContext.organizationId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status !== 'draft') {
      return NextResponse.json(
        { error: 'Document has already been sent or completed' },
        { status: 400 }
      );
    }

    const signers: any[] = document.signers || [];
    const fields: any[] = document.fields || [];

    if (signers.length === 0) {
      return NextResponse.json(
        { error: 'Cannot send document without any signers' },
        { status: 400 }
      );
    }

    // Validate that each signer has at least one signature field
    for (const signer of signers) {
      const hasSignatureField = fields.some(
        (f) => f.signer_id === signer.id && f.type === 'signature'
      );
      if (!hasSignatureField) {
        return NextResponse.json(
          { error: `Signer ${signer.name} (${signer.email}) has no signature field assigned.` },
          { status: 400 }
        );
      }
    }

    // Sort signers by order_index
    signers.sort((a, b) => a.order_index - b.order_index);

    // Update document status to pending
    await (adminDb.from('documents') as any)
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Insert audit event
    await (adminDb.from('audit_events') as any).insert({
      document_id: id,
      user_id: orgContext.userId,
      event_type: 'document_sent',
      metadata: {
        signing_order: document.signing_order,
        signer_count: signers.length,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const expiresAtDate = new Date(document.expires_at);
    const diffDays = Math.max(1, Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    // Generate fresh cryptographic tokens for signers and dispatch invitations
    let sentCount = 0;
    const isSequential = document.signing_order === 'sequential';

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const rawToken = generateSignerToken();
      const tokenHash = hashToken(rawToken);

      // Store ONLY the SHA-256 hash
      await (adminDb.from('signers') as any)
        .update({
          token_hash: tokenHash,
        })
        .eq('id', signer.id);

      // For sequential, only email the first signer (order_index === 0) now
      // Subsequent signers will be emailed when the preceding signer finishes
      if (!isSequential || i === 0) {
        const signingUrl = `${appUrl}/sign/${rawToken}`;
        const emailHtml = renderInvitationEmail({
          signerName: signer.name,
          documentTitle: document.title,
          organizationName: orgContext.organizationName,
          signingUrl,
          expiresInDays: diffDays,
        });

        await sendEmail({
          to: signer.email,
          subject: `Action Required: Signature requested for "${document.title}"`,
          html: emailHtml,
        });

        sentCount++;
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      signingOrder: document.signing_order,
    });
  } catch (err: any) {
    console.error('Send document error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
