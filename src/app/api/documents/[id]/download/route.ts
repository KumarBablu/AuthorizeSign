import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { downloadPdfFromStorage } from '@/lib/pdf/storage';

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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'original'; // 'original' or 'signed'

    const adminDb = createAdminClient();
    const { data, error: docError } = await adminDb
      .from('documents')
      .select('id, title, original_storage_path, signed_storage_path, status')
      .eq('id', id)
      .eq('organization_id', orgContext.organizationId)
      .single();

    if (docError || !data) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = data as {
      id: string;
      title: string;
      original_storage_path: string;
      signed_storage_path: string | null;
      status: string;
    };

    const storagePath =
      type === 'signed' && document.signed_storage_path
        ? document.signed_storage_path
        : document.original_storage_path;

    const pdfBuffer = await downloadPdfFromStorage(storagePath);

    const safeTitle = document.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_${type}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Download failed' }, { status: 500 });
  }
}
