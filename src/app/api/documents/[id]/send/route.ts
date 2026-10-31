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
    const { data: doc, error: docError } = await (adminDb.from('documents') as any)
      .select(`
        id,
        title,
        status,
        signing_order,
        expires_at,
        created_by,
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

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = doc;
    const signers = doc.signers || [];

    if (document.status !== 'draft') {
      return NextResponse.json(
        { error: 'Document has already been sent or completed' },
        { status: 400 }
      );
    }

    if (signers.length === 0) {
      return NextResponse.json(
        { error: 'Cannot send document without any signers' },
        { status: 400 }
      );
    }

    // Sort signers by order_index
    signers.sort((a: any, b: any) => a.order_index - b.order_index);

    const nowIso = new Date().toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const expiresAtDate = new Date(document.expires_at);
    const diffDays = Math.max(1, Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const isSequential = document.signing_order === 'sequential';

    // Retrieve sender profile
    const { data: senderUserData } = await adminDb.auth.admin.getUserById(orgContext.userId);
    const senderName =
      senderUserData?.user?.user_metadata?.name ||
      orgContext.userEmail.split('@')[0];
    const senderEmail = orgContext.userEmail;

    let sentCount = 0;

    await (adminDb.from('documents') as any)
      .update({
        status: 'pending',
        updated_at: nowIso,
      })
      .eq('id', id);

    await (adminDb.from('audit_events') as any).insert({
      document_id: id,
      user_id: orgContext.userId,
      event_type: 'document_sent',
      metadata: {
        signing_order: document.signing_order,
        signer_count: signers.length,
        sender_name: senderName,
        sender_email: senderEmail,
      },
    });

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const rawToken = generateSignerToken();
      const tokenHash = hashToken(rawToken);

      await (adminDb.from('signers') as any)
        .update({ token_hash: tokenHash })
        .eq('id', signer.id);

      // In sequential order, send invite only to the first signer; otherwise send to all
      if (!isSequential || i === 0) {
        const signingUrl = `${appUrl}/sign/${rawToken}`;
        const emailHtml = renderInvitationEmail({
          signerName: signer.name,
          documentTitle: document.title,
          organizationName: orgContext.organizationName,
          senderName,
          senderEmail,
          signingUrl,
          expiresInDays: diffDays,
        });

        await sendEmail({
          to: signer.email,
          subject: `Action Required: Signature requested by ${senderName} for "${document.title}"`,
          html: emailHtml,
          replyTo: senderEmail,
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
