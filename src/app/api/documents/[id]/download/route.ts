import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { devDb } from '@/lib/db/dev-store';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { downloadPdfFromStorage } from '@/lib/pdf/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'original'; // 'original' or 'signed'

    let document: any = null;

    if (devDb.isDevMode()) {
      document = devDb.getDocumentById(id);
    } else {
      const adminDb = createAdminClient();
      const { data, error: docError } = await adminDb
        .from('documents')
        .select('id, title, original_storage_path, signed_storage_path, status, organization_id')
        .eq('id', id)
        .single();

      if (!docError && data) {
        document = data;
      }
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Authorization:
    // If downloading a completed signed document, allow public/signer access.
    // If downloading original or uncompleted document, require organization context.
    const isCompletedSignedDownload = type === 'signed' && document.status === 'completed';
    if (!isCompletedSignedDownload) {
      const orgContext = await getUserOrgContext();
      if (!orgContext || orgContext.organizationId !== document.organization_id) {
        return NextResponse.json({ error: 'Unauthorized to download this file' }, { status: 401 });
      }
    }

    const storagePath =
      type === 'signed' && document.signed_storage_path
        ? document.signed_storage_path
        : document.original_storage_path;

    const pdfBuffer = await downloadPdfFromStorage(storagePath);

    const safeTitle = (document.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
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
