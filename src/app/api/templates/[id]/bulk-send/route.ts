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
      return NextResponse.json({ error: 'Unauthorized to dispatch documents' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const recipients = (body.recipients || []) as Array<{ name: string; email: string }>;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
    }

    if (recipients.length > 250) {
      return NextResponse.json(
        { error: 'Bulk dispatch limit is 250 recipients per batch.' },
        { status: 400 }
      );
    }

    const adminDb = createAdminClient();

    // 1. Fetch template definition and fields
    const { data: template, error: tmplError } = await (adminDb.from('documents') as any)
      .select(`
        id,
        title,
        template_name,
        original_storage_path,
        original_sha256,
        verification_method,
        signature_method,
        fields (
          type,
          page,
          x,
          y,
          width,
          height
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgContext.organizationId)
      .eq('is_template', true)
      .single();

    if (tmplError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
    const templateFields = template.fields || [];

    // Retrieve sender details
    const { data: senderUserData } = await adminDb.auth.admin.getUserById(orgContext.userId);
    const senderName =
      senderUserData?.user?.user_metadata?.name ||
      orgContext.userEmail.split('@')[0];
    const senderEmail = orgContext.userEmail;

    let dispatchedCount = 0;
    const errors: string[] = [];

    // 2. Process each recipient as an individual legally binding document execution
    for (const recipient of recipients) {
      const email = recipient.email?.trim().toLowerCase();
      const name = recipient.name?.trim() || email.split('@')[0];

      if (!email || !email.includes('@')) {
        errors.push(`Invalid email skipped: ${recipient.email}`);
        continue;
      }

      const individualDocId = crypto.randomUUID();
      const individualSignerId = crypto.randomUUID();
      const rawToken = generateSignerToken();
      const tokenHash = hashToken(rawToken);

      // Create Document clone
      const { error: docInsertErr } = await (adminDb.from('documents') as any).insert({
        id: individualDocId,
        organization_id: orgContext.organizationId,
        created_by: orgContext.userId,
        title: `${template.template_name || template.title} - ${name}`,
        status: 'pending',
        signing_order: 'parallel',
        original_storage_path: template.original_storage_path,
        original_sha256: template.original_sha256,
        verification_method: template.verification_method || 'email_otp',
        signature_method: template.signature_method || 'draw',
        expires_at: expiresAt,
        is_template: false,
      });

      if (docInsertErr) {
        errors.push(`Failed to create document for ${email}: ${docInsertErr.message}`);
        continue;
      }

      // Create Signer
      await (adminDb.from('signers') as any).insert({
        id: individualSignerId,
        document_id: individualDocId,
        name,
        email,
        order_index: 0,
        token_hash: tokenHash,
        status: 'pending',
      });

      // Clone template fields mapped to this signer
      if (templateFields.length > 0) {
        const clonedFields = templateFields.map((f: any) => ({
          document_id: individualDocId,
          signer_id: individualSignerId,
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
        }));
        await (adminDb.from('fields') as any).insert(clonedFields);
      }

      // Log audit events
      await (adminDb.from('audit_events') as any).insert([
        {
          document_id: individualDocId,
          user_id: orgContext.userId,
          event_type: 'document_created',
          metadata: {
            source_template_id: template.id,
            bulk_campaign: true,
            sender_name: senderName,
            sender_email: senderEmail,
          },
        },
        {
          document_id: individualDocId,
          user_id: orgContext.userId,
          event_type: 'document_sent',
          metadata: {
            signer_email: email,
            bulk_campaign: true,
            sender_name: senderName,
            sender_email: senderEmail,
          },
        },
      ]);

      // Dispatch invitation email with single-use secure signing URL and sender attribution
      const signingUrl = `${appUrl}/sign/${rawToken}`;
      const emailHtml = renderInvitationEmail({
        signerName: name,
        documentTitle: template.template_name || template.title,
        organizationName: orgContext.organizationName,
        senderName,
        senderEmail,
        signingUrl,
        expiresInDays: 14,
      });

      await sendEmail({
        to: email,
        subject: `Action Required: Signature requested by ${senderName} for "${template.template_name || template.title}"`,
        html: emailHtml,
        replyTo: senderEmail,
      });

      dispatchedCount++;
    }

    return NextResponse.json({
      success: true,
      totalDispatched: dispatchedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Bulk send error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
