import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { generateSignerToken, hashToken } from '@/lib/security/crypto';
import { saveSignersSchema } from '@/lib/validations/document.schema';

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

    const body = await request.json();
    const validated = saveSignersSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 });
    }

    const generatedSigners = [];
    const signerRows = [];

    for (let index = 0; index < validated.data.signers.length; index++) {
      const s = validated.data.signers[index];
      const token = generateSignerToken();
      const tokenHash = hashToken(token);
      const signerId = crypto.randomUUID();

      signerRows.push({
        id: signerId,
        document_id: id,
        name: s.name,
        email: s.email.toLowerCase(),
        order_index: s.orderIndex !== undefined ? s.orderIndex : index,
        token_hash: tokenHash,
        status: 'pending' as const,
      });

      generatedSigners.push({
        id: signerId,
        name: s.name,
        email: s.email,
        orderIndex: s.orderIndex !== undefined ? s.orderIndex : index,
        token,
      });
    }

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
        { error: 'Cannot modify signers on a document that is already sent or completed' },
        { status: 400 }
      );
    }

    await adminDb.from('signers').delete().eq('document_id', id);
    const { error: insertError } = await (adminDb.from('signers') as any).insert(signerRows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signers: generatedSigners,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
