import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { uploadPdfToStorage } from '@/lib/pdf/storage';
import { validatePdfFile, validatePdfMagicBytes } from '@/lib/pdf/validator';
import { createDocumentSchema } from '@/lib/validations/document.schema';

export async function GET(request: NextRequest) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const adminDb = createAdminClient();
    let query = (adminDb.from('documents') as any)
      .select(`
        id,
        title,
        status,
        signing_order,
        original_sha256,
        signed_sha256,
        expires_at,
        created_at,
        updated_at,
        is_template,
        template_name,
        signers (
          id,
          name,
          email,
          order_index,
          status
        )
      `)
      .eq('organization_id', orgContext.organizationId)
      .eq('is_template', false)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: documents, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext || !['owner', 'admin', 'sender'].includes(orgContext.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not have permission to upload documents.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';
    const signingOrder = (formData.get('signingOrder') as string) || 'sequential';
    const verificationMethod = (formData.get('verificationMethod') as string) || 'email_otp';
    const signatureMethod = (formData.get('signatureMethod') as string) || 'draw';
    const expiryDays = parseInt((formData.get('expiryDays') as string) || '7', 10);

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Validate PDF file size, type, and magic bytes
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validatePdfMagicBytes(buffer)) {
      return NextResponse.json(
        { error: 'Invalid file format: Document is missing valid %PDF- header magic bytes.' },
        { status: 400 }
      );
    }

    const validatedInput = createDocumentSchema.safeParse({
      title: title || file.name.replace(/\.pdf$/i, ''),
      signingOrder,
      verificationMethod,
      signatureMethod,
      expiryDays,
    });

    if (!validatedInput.success) {
      return NextResponse.json(
        { error: validatedInput.error.errors[0].message },
        { status: 400 }
      );
    }

    // Compute cryptographic SHA-256
    const originalSha256 = await computeSha256Hex(buffer);
    const expiresAt = new Date(Date.now() + validatedInput.data.expiryDays * 24 * 60 * 60 * 1000);

    const docId = crypto.randomUUID();
    const storagePath = `${orgContext.organizationId}/${docId}/original.pdf`;

    // Upload to private storage
    await uploadPdfToStorage(storagePath, buffer);

    const documentData = {
      id: docId,
      organization_id: orgContext.organizationId,
      created_by: orgContext.userId,
      title: validatedInput.data.title,
      status: 'draft',
      signing_order: validatedInput.data.signingOrder,
      original_storage_path: storagePath,
      original_sha256: originalSha256,
      verification_method: validatedInput.data.verificationMethod,
      signature_method: validatedInput.data.signatureMethod,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_template: false,
    };

    const adminDb = createAdminClient();
    const { data: document, error: docError } = await (adminDb.from('documents') as any)
      .insert(documentData)
      .select()
      .single();

    if (docError || !document) {
      console.error('Failed to create document record:', docError);
      return NextResponse.json(
        { error: docError?.message || 'Database error creating document' },
        { status: 500 }
      );
    }

    // Log immutable audit event
    await (adminDb.from('audit_events') as any).insert({
      document_id: document.id,
      user_id: orgContext.userId,
      event_type: 'document_created',
      metadata: {
        title: document.title,
        original_sha256: originalSha256,
        signing_order: document.signing_order,
        expires_at: document.expires_at,
      },
    });

    return NextResponse.json({
      documentId: document.id,
      title: document.title,
      originalSha256: document.original_sha256,
      expiresAt: document.expires_at,
    });
  } catch (err: any) {
    console.error('Document upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process document upload' },
      { status: 500 }
    );
  }
}
