import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { devDb } from '@/lib/db/dev-store';
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

    let document: any = null;
    let signers: any[] = [];
    let fields: any[] = [];

    if (devDb.isDevMode()) {
      document = devDb.getDocumentById(id);
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      signers = document.signers || [];
      fields = document.fields || [];
    } else {
      const adminDb = createAdminClient();
      const { data: doc, error: docError } = await (adminDb.from('documents') as any)
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

      if (docError || !doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      document = doc;
      signers = doc.signers || [];
      fields = doc.fields || [];
    }

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
    signers.sort((a, b) => a.order_index - b.order_index);

    const nowIso = new Date().toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const expiresAtDate = new Date(document.expires_at);
    const diffDays = Math.max(1, Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const isSequential = document.signing_order === 'sequential';

    let sentCount = 0;

    if (devDb.isDevMode()) {
      devDb.updateDocument(id, { status: 'pending', updated_at: nowIso });
      devDb.insertAuditEvent({
        document_id: id,
        user_id: orgContext.userId,
        event_type: 'document_sent',
        metadata: {
          signing_order: document.signing_order,
          signer_count: signers.length,
        },
      });

      for (let i = 0; i < signers.length; i++) {
        const signer = signers[i];
        const rawToken = generateSignerToken();
        const tokenHash = hashToken(rawToken);
        const signingUrl = `${appUrl}/sign/${rawToken}`;
        devDb.updateSigner(signer.id, {
          token_hash: tokenHash,
          dev_signing_url: (!isSequential || i === 0) ? signingUrl : undefined,
        });

        if (!isSequential || i === 0) {
          console.log(`\n======================================================`);
          console.log(`[INVITATION DISPATCHED] For: ${signer.name} (${signer.email})`);
          console.log(`Signing Link: ${signingUrl}`);
          console.log(`======================================================\n`);

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
    }

    const adminDb = createAdminClient();
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
      },
    });

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const rawToken = generateSignerToken();
      const tokenHash = hashToken(rawToken);

      await (adminDb.from('signers') as any)
        .update({ token_hash: tokenHash })
        .eq('id', signer.id);

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
