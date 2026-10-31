import { type NextRequest, NextResponse } from 'next/server';
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
    const adminDb = createAdminClient();

    const { data: signer, error: signerError } = await (adminDb.from('signers') as any)
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

    if (signerError || !signer) {
      return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
    }

    const doc = signer.documents;
    const org = doc.organizations;
    const orgName = org?.name || 'the organization';

    // Check expiration
    if (new Date(doc.expires_at).getTime() < Date.now() || doc.status === 'expired') {
      return NextResponse.json(
        { error: 'Signing link has expired. Time over. Please contact the sender.' },
        { status: 400 }
      );
    }

    // Check if document is already completed
    if (doc.status === 'completed') {
      return NextResponse.json(
        { error: 'This document is already completed and closed for new signatures.' },
        { status: 400 }
      );
    }

    // Check if signer already submitted
    if (signer.status === 'signed') {
      return NextResponse.json(
        { error: 'You have already signed this document.' },
        { status: 400 }
      );
    }

    // Verification check: signer must have verified OTP within last 30 minutes
    if (!signer.verified_at) {
      return NextResponse.json(
        { error: 'Authentication required. Please verify your email code before signing.' },
        { status: 401 }
      );
    }

    const verifiedDurationMs = Date.now() - new Date(signer.verified_at).getTime();
    if (verifiedDurationMs > 30 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Verification session expired. Please verify your email code again.' },
        { status: 401 }
      );
    }

    // Check sequential signing order
    if (doc.signing_order === 'sequential' && signer.order_index > 0) {
      const { data: priorSigners } = await (adminDb.from('signers') as any)
        .select('name, status')
        .eq('document_id', doc.id)
        .lt('order_index', signer.order_index);

      const hasUnsignedPrior = (priorSigners || []).find((s: any) => s.status !== 'signed');
      if (hasUnsignedPrior) {
        return NextResponse.json(
          { error: `Previous signer (${hasUnsignedPrior.name}) must sign before you can submit.` },
          { status: 403 }
        );
      }
    }

    // Fetch fields assigned to this signer
    const { data: signerFieldsRaw } = await (adminDb.from('fields') as any)
      .select('id, type, page, x, y, width, height')
      .eq('document_id', doc.id)
      .eq('signer_id', signer.id);

    const signerFields = signerFieldsRaw || [];
    const sigFields = signerFields.filter((f: any) => f.type === 'signature');
    const dateFields = signerFields.filter((f: any) => f.type === 'date');

    // Download current PDF from storage (or original if first signer)
    const currentPdfPath = doc.signed_storage_path || doc.original_storage_path;
    const currentPdfBytes = await downloadPdfFromStorage(currentPdfPath);

    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    // Handle signer biometric photo upload if provided
    let photoStoragePath: string | null = null;
    if (validated.data.signerPhotoBase64) {
      try {
        const photoData = Buffer.from(
          validated.data.signerPhotoBase64.replace(/^data:image\/(jpeg|png|webp);base64,/, ''),
          'base64'
        );
        photoStoragePath = `${doc.organization_id}/${doc.id}/${signer.id}_photo.jpg`;
        await uploadPdfToStorage(photoStoragePath, photoData);
      } catch (err) {
        console.error('Error saving signer photo to storage:', err);
      }
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

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
      signerAuditStamp: {
        name: signer.name,
        documentId: doc.id,
        timestamp: formattedDate,
      },
    });

    const geo = validated.data.geoLocation;

    // Insert into signatures table for each signature field
    for (const f of sigFields) {
      await (adminDb.from('signatures') as any).insert({
        document_id: doc.id,
        signer_id: signer.id,
        field_id: f.id,
        method: validated.data.signatureMethod,
        ip_address: ip,
        user_agent: userAgent,
        consent_text: 'I agree to sign this document electronically and understand this signature is legally binding.',
        photo_storage_path: photoStoragePath,
        geo_lat: geo?.lat || null,
        geo_lng: geo?.lng || null,
        geo_accuracy: geo?.accuracy || null,
        signed_at: nowIso,
      });
    }

    // Update signer status to signed
    await (adminDb.from('signers') as any)
      .update({
        status: 'signed',
        signed_at: nowIso,
      })
      .eq('id', signer.id);

    // Record immutable audit event
    await (adminDb.from('audit_events') as any).insert({
      document_id: doc.id,
      signer_id: signer.id,
      event_type: 'signed',
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        method: validated.data.signatureMethod,
        font: validated.data.typedFont || null,
        has_photo: Boolean(photoStoragePath),
        geo_location: geo ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : null,
        signed_at: nowIso,
      },
    });

    // Check if ALL signers on this document are now signed
    const { data: allSigners } = await (adminDb.from('signers') as any)
      .select('id, name, email, order_index, status, signed_at')
      .eq('document_id', doc.id)
      .order('order_index', { ascending: true });

    const totalSigners = allSigners || [];
    const allCompleted = totalSigners.every((s: any) => s.status === 'signed');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (allCompleted) {
      // -----------------------------------------------------------------------
      // FINAL COMPLETION: Append Certificate of Completion Page
      // -----------------------------------------------------------------------

      // Fetch all signatures for this document to extract photos and locations
      const { data: signaturesList } = await (adminDb.from('signatures') as any)
        .select('signer_id, ip_address, photo_storage_path, geo_lat, geo_lng, geo_accuracy, signed_at')
        .eq('document_id', doc.id);

      const sigMap = new Map<string, any>();
      (signaturesList || []).forEach((sig: any) => {
        if (!sigMap.has(sig.signer_id)) {
          sigMap.set(sig.signer_id, sig);
        }
      });

      // Prepare signer info for the certificate
      const certSigners = [];
      for (const s of totalSigners) {
        const sigRecord = sigMap.get(s.id);
        let photoBase64: string | undefined = undefined;

        // If this is the current signer and we have photo base64
        if (s.id === signer.id && validated.data.signerPhotoBase64) {
          photoBase64 = validated.data.signerPhotoBase64;
        } else if (sigRecord?.photo_storage_path) {
          try {
            const buf = await downloadPdfFromStorage(sigRecord.photo_storage_path);
            photoBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
          } catch (e) {
            console.error('Failed to load photo for certificate:', e);
          }
        }

        certSigners.push({
          name: s.name,
          email: s.email,
          orderIndex: s.order_index,
          verificationMethod: 'email_otp',
          signatureMethod: validated.data.signatureMethod,
          signedAt: s.signed_at || nowIso,
          ipAddress: sigRecord?.ip_address || ip,
          photoBase64,
          geoLocation:
            sigRecord?.geo_lat && sigRecord?.geo_lng
              ? {
                  lat: Number(sigRecord.geo_lat),
                  lng: Number(sigRecord.geo_lng),
                  accuracy: sigRecord.geo_accuracy ? Number(sigRecord.geo_accuracy) : undefined,
                }
              : geo && s.id === signer.id
              ? geo
              : undefined,
        });
      }

      const certifiedPdfBytes = await appendCertificateOfCompletion({
        pdfBuffer: stampedPdfBytes,
        documentTitle: doc.title,
        documentId: doc.id,
        originalSha256: doc.original_sha256,
        completedAt: formattedDate,
        signers: certSigners,
      });

      const finalSha256 = await computeSha256Hex(certifiedPdfBytes);
      const completedStoragePath = `${doc.organization_id}/${doc.id}/completed.pdf`;

      // Upload completed PDF to storage
      await uploadPdfToStorage(completedStoragePath, certifiedPdfBytes);

      // Update document record to completed
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

      // Email completed document link to all signers
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
          subject: `Completed & Executed: "${doc.title}"`,
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

      await (adminDb.from('documents') as any)
        .update({
          signed_storage_path: partialPath,
          updated_at: nowIso,
        })
        .eq('id', doc.id);

      // If sequential order, dispatch invitation to the next signer
      if (doc.signing_order === 'sequential') {
        const nextSigner = totalSigners.find(
          (s: any) => s.order_index === signer.order_index + 1 && s.status === 'pending'
        );

        if (nextSigner) {
          const nextToken = generateSignerToken();
          const nextTokenHash = hashToken(nextToken);
          const nextSigningUrl = `${appUrl}/sign/${nextToken}`;

          await (adminDb.from('signers') as any)
            .update({ token_hash: nextTokenHash })
            .eq('id', nextSigner.id);

          const diffDays = Math.max(1, Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

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
