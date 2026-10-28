import { type NextRequest, NextResponse } from 'next/server';
import { devDb } from '@/lib/db/dev-store';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { sendEmail } from '@/lib/email/resend';
import { renderCompletedEmail } from '@/lib/email/templates/completed';
import { renderInvitationEmail } from '@/lib/email/templates/invitation';
import { appendCertificateOfCompletion } from '@/lib/pdf/certificate';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { stampDocument } from '@/lib/pdf/stamper';
import { downloadPdfFromStorage, uploadPdfToStorage } from '@/lib/pdf/storage';
import { generateSignerToken, hashToken } from '@/lib/security/crypto';
import { signatureSubmitSchema } from '@/lib/validations/signer.schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const body = await request.json();
    const validated = signatureSubmitSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 });
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
          name,
          email,
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
            original_sha256,
            signed_storage_path,
            expires_at,
            organization_id,
            created_by,
            organizations (
              name
            )
          )
        `)
        .eq('token_hash', tokenHash)
        .single();

      if (!signerError && data) {
        signer = data;
      }
    }

    if (!signer) {
      return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
    }

    const doc = signer.documents;
    const org = doc.organizations;
    const orgName = org?.name || 'the organization';

    // Verify document is not completed or expired
    if (doc.status === 'completed') {
      return NextResponse.json({ error: 'Document has already been fully signed and completed.' }, { status: 400 });
    }

    if (new Date(doc.expires_at).getTime() < Date.now() || doc.status === 'expired') {
      return NextResponse.json(
        { error: 'This signing link has expired. Time over. Please connect with the organization.' },
        { status: 400 }
      );
    }

    if (signer.status === 'signed') {
      return NextResponse.json({ error: 'You have already signed this document.' }, { status: 400 });
    }

    // Verify 30-minute verification window
    if (!signer.verified_at) {
      return NextResponse.json(
        { error: 'Email verification code required before signing.' },
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
      let hasUnsignedPrior: any = null;
      if (devDb.isDevMode()) {
        const prior = devDb.getSignersForDocument(doc.id).filter((s) => s.order_index < signer.order_index);
        hasUnsignedPrior = prior.find((s) => s.status !== 'signed');
      } else {
        const adminDb = createAdminClient();
        const { data: priorSigners } = await (adminDb.from('signers') as any)
          .select('name, status')
          .eq('document_id', doc.id)
          .lt('order_index', signer.order_index);

        hasUnsignedPrior = (priorSigners || []).find((s: any) => s.status !== 'signed');
      }

      if (hasUnsignedPrior) {
        return NextResponse.json(
          { error: `Previous signer (${hasUnsignedPrior.name}) must sign before you can submit.` },
          { status: 403 }
        );
      }
    }

    // Fetch fields assigned to this signer
    let signerFields: any[] = [];
    if (devDb.isDevMode()) {
      signerFields = devDb.getFieldsForSigner(doc.id, signer.id);
    } else {
      const adminDb = createAdminClient();
      const { data } = await (adminDb.from('fields') as any)
        .select('id, type, page, x, y, width, height')
        .eq('document_id', doc.id)
        .eq('signer_id', signer.id);
      signerFields = data || [];
    }

    const sigFields = signerFields.filter((f: any) => f.type === 'signature');
    const dateFields = signerFields.filter((f: any) => f.type === 'date');

    // Download current PDF from storage (or original if first signer)
    const currentPdfPath = doc.signed_storage_path || doc.original_storage_path;
    const currentPdfBytes = await downloadPdfFromStorage(currentPdfPath);

    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    // Stamp signature PNG and date onto PDF using pdf-lib
    const stampedPdfBytes = await stampDocument({
      pdfBuffer: currentPdfBytes,
      signaturePngBase64: validated.data.signaturePngBase64,
      signatureFields: sigFields.map((f: any) => ({
        page: f.page,
        x: Number(f.x),
        y: Number(f.y),
        width: Number(f.width),
        height: Number(f.height),
      })),
      dateFields: dateFields.map((f: any) => ({
        page: f.page,
        x: Number(f.x),
        y: Number(f.y),
        width: Number(f.width),
        height: Number(f.height),
        dateText: formattedDate,
      })),
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert into signatures table for each signature field
    if (devDb.isDevMode()) {
      for (const f of sigFields) {
        devDb.insertSignature({
          document_id: doc.id,
          signer_id: signer.id,
          field_id: f.id,
          method: validated.data.signatureMethod,
          ip_address: ip,
          user_agent: userAgent,
          consent_text: 'I agree to sign this document electronically and understand this signature is legally binding.',
          signed_at: nowIso,
        });
      }
      devDb.updateSigner(signer.id, {
        status: 'signed',
        signed_at: nowIso,
      });
      devDb.insertAuditEvent({
        document_id: doc.id,
        signer_id: signer.id,
        event_type: 'signed',
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          method: validated.data.signatureMethod,
          font: validated.data.typedFont || null,
          signed_at: nowIso,
        },
      });
    } else {
      const adminDb = createAdminClient();
      for (const f of sigFields) {
        await (adminDb.from('signatures') as any).insert({
          document_id: doc.id,
          signer_id: signer.id,
          field_id: f.id,
          method: validated.data.signatureMethod,
          ip_address: ip,
          user_agent: userAgent,
          consent_text: 'I agree to sign this document electronically and understand this signature is legally binding.',
          signed_at: nowIso,
        });
      }

      await (adminDb.from('signers') as any)
        .update({
          status: 'signed',
          signed_at: nowIso,
        })
        .eq('id', signer.id);

      await (adminDb.from('audit_events') as any).insert({
        document_id: doc.id,
        signer_id: signer.id,
        event_type: 'signed',
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          method: validated.data.signatureMethod,
          font: validated.data.typedFont || null,
          signed_at: nowIso,
        },
      });
    }

    // Check if ALL signers on this document are now signed
    let totalSigners: any[] = [];
    if (devDb.isDevMode()) {
      totalSigners = devDb.getSignersForDocument(doc.id);
    } else {
      const adminDb = createAdminClient();
      const { data: allSigners } = await (adminDb.from('signers') as any)
        .select('id, name, email, order_index, status, signed_at')
        .eq('document_id', doc.id)
        .order('order_index', { ascending: true });
      totalSigners = allSigners || [];
    }

    const allCompleted = totalSigners.every((s: any) => s.status === 'signed');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (allCompleted) {
      // -----------------------------------------------------------------------
      // FINAL COMPLETION: Append Certificate of Completion Page
      // -----------------------------------------------------------------------
      const certifiedPdfBytes = await appendCertificateOfCompletion({
        pdfBuffer: stampedPdfBytes,
        documentTitle: doc.title,
        originalSha256: doc.original_sha256,
        completedAt: formattedDate,
        signers: totalSigners.map((s: any) => ({
          name: s.name,
          email: s.email,
          orderIndex: s.order_index,
          verificationMethod: 'email_otp',
          signatureMethod: validated.data.signatureMethod,
          signedAt: s.signed_at || nowIso,
          ipAddress: ip,
        })),
      });

      const finalSha256 = await computeSha256Hex(certifiedPdfBytes);
      const completedStoragePath = `${doc.organization_id}/${doc.id}/completed.pdf`;

      // Upload completed PDF to storage
      await uploadPdfToStorage(completedStoragePath, certifiedPdfBytes);

      // Update document record to completed
      if (devDb.isDevMode()) {
        devDb.updateDocument(doc.id, {
          status: 'completed',
          signed_sha256: finalSha256,
          signed_storage_path: completedStoragePath,
          updated_at: nowIso,
        });
        devDb.insertAuditEvent({
          document_id: doc.id,
          event_type: 'completed',
          ip_address: ip,
          user_agent: userAgent,
          metadata: {
            signed_sha256: finalSha256,
            total_signers: totalSigners.length,
            completed_at: nowIso,
          },
        });
      } else {
        const adminDb = createAdminClient();
        await (adminDb.from('documents') as any)
          .update({
            status: 'completed',
            signed_sha256: finalSha256,
            signed_storage_path: completedStoragePath,
            updated_at: nowIso,
          })
          .eq('id', doc.id);

        await (adminDb.from('audit_events') as any).insert({
          document_id: doc.id,
          event_type: 'completed',
          ip_address: ip,
          user_agent: userAgent,
          metadata: {
            signed_sha256: finalSha256,
            total_signers: totalSigners.length,
            completed_at: nowIso,
          },
        });
      }

      // Email completed document to all signers
      const downloadUrl = `/api/documents/${doc.id}/download?type=signed`;
      for (const s of totalSigners) {
        const completedEmailHtml = renderCompletedEmail({
          recipientName: s.name,
          documentTitle: doc.title,
          downloadUrl: `${appUrl}${downloadUrl}`,
          completedAt: formattedDate,
        });

        await sendEmail({
          to: s.email,
          subject: `Completed: "${doc.title}" has been fully executed`,
          html: completedEmailHtml,
        });
      }

      return NextResponse.json({
        success: true,
        isCompleted: true,
        message: 'Document has been signed and completed.',
        downloadUrl,
      });
    } else {
      // Temporary save of partially signed PDF
      const partialPath = `${doc.organization_id}/${doc.id}/in_progress.pdf`;
      await uploadPdfToStorage(partialPath, stampedPdfBytes);

      if (devDb.isDevMode()) {
        devDb.updateDocument(doc.id, {
          signed_storage_path: partialPath,
          updated_at: nowIso,
        });
      } else {
        const adminDb = createAdminClient();
        await (adminDb.from('documents') as any)
          .update({
            signed_storage_path: partialPath,
            updated_at: nowIso,
          })
          .eq('id', doc.id);
      }

      // If sequential order, dispatch invitation to the next signer
      if (doc.signing_order === 'sequential') {
        const nextSigner = totalSigners.find(
          (s: any) => s.order_index === signer.order_index + 1 && s.status === 'pending'
        );

        if (nextSigner) {
          const nextToken = generateSignerToken();
          const nextTokenHash = hashToken(nextToken);
          const nextSigningUrl = `${appUrl}/sign/${nextToken}`;

          if (devDb.isDevMode()) {
            devDb.updateSigner(nextSigner.id, {
              token_hash: nextTokenHash,
              dev_signing_url: nextSigningUrl,
            });
          } else {
            const adminDb = createAdminClient();
            await (adminDb.from('signers') as any)
              .update({ token_hash: nextTokenHash })
              .eq('id', nextSigner.id);
          }

          const diffDays = Math.max(1, Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

          console.log(`\n======================================================`);
          console.log(`[SEQUENTIAL ADVANCEMENT] Next Signer: ${nextSigner.name} (${nextSigner.email})`);
          console.log(`Signing Link: ${nextSigningUrl}`);
          console.log(`======================================================\n`);

          const nextEmailHtml = renderInvitationEmail({
            signerName: nextSigner.name,
            documentTitle: doc.title,
            organizationName: orgName,
            signingUrl: nextSigningUrl,
            expiresInDays: diffDays,
          });

          await sendEmail({
            to: nextSigner.email,
            subject: `Action Required: It's your turn to sign "${doc.title}"`,
            html: nextEmailHtml,
          });
        }
      }

      return NextResponse.json({
        success: true,
        isCompleted: false,
        message: 'Your signature has been successfully recorded. Waiting for remaining signatories to finish.',
      });
    }
  } catch (err: any) {
    console.error('Submit signature error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
