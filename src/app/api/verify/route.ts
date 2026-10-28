import { type NextRequest, NextResponse } from 'next/server';
import { devDb } from '@/lib/db/dev-store';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { validatePdfFile, validatePdfMagicBytes } from '@/lib/pdf/validator';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let targetHash = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
      }

      const validation = validatePdfFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (!validatePdfMagicBytes(buffer)) {
        return NextResponse.json(
          { error: 'Invalid file format: File missing %PDF- header magic bytes.' },
          { status: 400 }
        );
      }

      targetHash = await computeSha256Hex(buffer);
    } else {
      const body = await request.json();
      targetHash = (body.sha256 || '').trim().toLowerCase();
    }

    if (!targetHash || targetHash.length !== 64 || !/^[a-f0-9]{64}$/.test(targetHash)) {
      return NextResponse.json({ error: 'Invalid or missing SHA-256 checksum' }, { status: 400 });
    }

    let document: any = null;

    if (devDb.isDevMode()) {
      document = devDb.findDocumentBySignedSha256(targetHash);
    } else {
      const adminDb = createAdminClient();
      // Query completed documents matching this signed_sha256
      const { data, error } = await (adminDb.from('documents') as any)
        .select('id, title, status, signed_sha256, updated_at, created_at')
        .eq('signed_sha256', targetHash)
        .eq('status', 'completed')
        .single();

      if (!error && data) {
        document = data;
      }
    }

    if (!document) {
      return NextResponse.json({
        verified: false,
        sha256: targetHash,
        message:
          'No completed document matches this cryptographic checksum. The file may have been altered or not signed through AuthSign.',
      });
    }

    return NextResponse.json({
      verified: true,
      title: document.title,
      status: document.status,
      completedAt: document.updated_at,
      sha256: document.signed_sha256,
      message: 'Cryptographically verified authentic document.',
    });
  } catch (err: any) {
    console.error('Verify endpoint error:', err);
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
