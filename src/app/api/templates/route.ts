import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { uploadPdfToStorage } from '@/lib/pdf/storage';
import { validatePdfFile, validatePdfMagicBytes } from '@/lib/pdf/validator';

export async function GET(request: NextRequest) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = createAdminClient();
    const { data: templates, error } = await (adminDb.from('documents') as any)
      .select(`
        id,
        title,
        template_name,
        created_at,
        original_sha256,
        signing_order,
        fields (
          id,
          type,
          page,
          x,
          y,
          width,
          height
        )
      `)
      .eq('organization_id', orgContext.organizationId)
      .eq('is_template', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      templates: (templates || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        templateName: t.template_name || t.title,
        fieldCount: (t.fields || []).length,
        createdAt: t.created_at,
        originalSha256: t.original_sha256,
      })),
      canManage: ['owner', 'admin'].includes(orgContext.role),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext || !['owner', 'admin'].includes(orgContext.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only organization admins can create templates.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const templateName = (formData.get('templateName') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No template PDF file provided' }, { status: 400 });
    }

    if (!templateName.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validatePdfMagicBytes(buffer)) {
      return NextResponse.json(
        { error: 'Invalid file format: File missing valid %PDF- header magic bytes.' },
        { status: 400 }
      );
    }

    const originalSha256 = await computeSha256Hex(buffer);
    const docId = crypto.randomUUID();
    const storagePath = `${orgContext.organizationId}/${docId}/template.pdf`;

    await uploadPdfToStorage(storagePath, buffer);

    const adminDb = createAdminClient();
    const { data: template, error: createError } = await (adminDb.from('documents') as any)
      .insert({
        id: docId,
        organization_id: orgContext.organizationId,
        created_by: orgContext.userId,
        title: templateName.trim(),
        template_name: templateName.trim(),
        is_template: true,
        status: 'draft',
        signing_order: 'parallel',
        original_storage_path: storagePath,
        original_sha256: originalSha256,
        verification_method: 'email_otp',
        signature_method: 'draw',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (createError || !template) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create template' },
        { status: 500 }
      );
    }

    // Default signature field placed on page 1 near bottom
    const dummySignerId = crypto.randomUUID();
    await (adminDb.from('signers') as any).insert({
      id: dummySignerId,
      document_id: docId,
      name: 'Template Signer Placeholder',
      email: 'placeholder@template.local',
      order_index: 0,
      token_hash: originalSha256,
      status: 'pending',
    });

    await (adminDb.from('fields') as any).insert([
      {
        document_id: docId,
        signer_id: dummySignerId,
        type: 'signature',
        page: 1,
        x: 0.15,
        y: 0.8,
        width: 0.35,
        height: 0.08,
      },
      {
        document_id: docId,
        signer_id: dummySignerId,
        type: 'date',
        page: 1,
        x: 0.55,
        y: 0.8,
        width: 0.25,
        height: 0.08,
      },
    ]);

    return NextResponse.json({
      success: true,
      templateId: template.id,
      templateName: template.template_name,
    });
  } catch (err: any) {
    console.error('Create template error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
