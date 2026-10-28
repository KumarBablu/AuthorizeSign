import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const adminDb = createAdminClient();

    // Query document ensuring it belongs to user's organization
    const { data: document, error: docError } = await adminDb
      .from('documents')
      .select(`
        *,
        signers (
          id,
          name,
          email,
          order_index,
          status,
          verified_at,
          signed_at,
          created_at
        ),
        fields (
          id,
          signer_id,
          type,
          page,
          x,
          y,
          width,
          height
        ),
        signatures (
          id,
          signer_id,
          field_id,
          method,
          signed_at,
          ip_address
        ),
        audit_events (
          id,
          event_type,
          metadata,
          ip_address,
          user_agent,
          created_at
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgContext.organizationId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext || !['owner', 'admin'].includes(orgContext.role)) {
      return NextResponse.json({ error: 'Unauthorized or insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const adminDb = createAdminClient();

    const { error } = await adminDb
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgContext.organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
