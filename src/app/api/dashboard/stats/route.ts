import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = createAdminClient();

    // Fetch all documents for this organization
    const { data: docs, error: docError } = await (adminDb.from('documents') as any)
      .select('id, title, status, expires_at, created_at, is_template')
      .eq('organization_id', orgContext.organizationId)
      .eq('is_template', false);

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    const documents = docs || [];
    const now = Date.now();

    const createdCount = documents.length;
    const signedCount = documents.filter((d: any) => d.status === 'completed').length;
    const pendingCount = documents.filter((d: any) => d.status === 'pending').length;
    const expiredCount = documents.filter(
      (d: any) => d.status === 'expired' || (new Date(d.expires_at).getTime() < now && d.status !== 'completed')
    ).length;

    // Fetch recent activity logs across all documents in this organization
    const docIds = documents.map((d: any) => d.id);
    let recentActivity: any[] = [];

    if (docIds.length > 0) {
      const { data: events, error: eventError } = await (adminDb.from('audit_events') as any)
        .select(`
          id,
          event_type,
          metadata,
          ip_address,
          created_at,
          document_id,
          signer_id,
          documents (
            title
          ),
          signers (
            name,
            email
          )
        `)
        .in('document_id', docIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!eventError && events) {
        recentActivity = events.map((e: any) => ({
          id: e.id,
          eventType: e.event_type,
          metadata: e.metadata,
          ipAddress: e.ip_address,
          createdAt: e.created_at,
          documentTitle: e.documents?.title || 'Document',
          signerName: e.signers?.name || null,
          signerEmail: e.signers?.email || null,
        }));
      }
    }

    return NextResponse.json({
      counts: {
        created: createdCount,
        signed: signedCount,
        pending: pendingCount,
        expired: expiredCount,
      },
      recentActivity,
      organizationName: orgContext.organizationName,
      userRole: orgContext.role,
    });
  } catch (err: any) {
    console.error('Stats endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
