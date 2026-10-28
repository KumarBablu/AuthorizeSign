import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { saveFieldsSchema } from '@/lib/validations/document.schema';

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

    const { data: document, error: docError } = await (adminDb.from('documents') as any)
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', orgContext.organizationId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot modify fields on a non-draft document' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = saveFieldsSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 });
    }

    // Replace fields for draft
    await adminDb.from('fields').delete().eq('document_id', id);

    const fieldRows = validated.data.fields.map((f) => ({
      document_id: id,
      signer_id: f.signerId,
      type: f.type,
      page: f.page,
      x: Number(f.x.toFixed(5)),
      y: Number(f.y.toFixed(5)),
      width: Number(f.width.toFixed(5)),
      height: Number(f.height.toFixed(5)),
    }));

    const { data: inserted, error: insertError } = await (adminDb
      .from('fields') as any)
      .insert(fieldRows)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: inserted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
