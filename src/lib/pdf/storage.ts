import fs from 'node:fs';
import path from 'node:path';
import { createAdminClient } from '@/lib/db/supabase-admin';

const BUCKET_NAME = 'documents';
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), '.storage');

/**
 * Stores a PDF buffer in Supabase Private Storage (with local disk fallback for dev/offline tests).
 */
export async function uploadPdfToStorage(
  storagePath: string,
  buffer: Buffer | Uint8Array
): Promise<string> {
  const isMockOrDev =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref');

  if (isMockOrDev) {
    const fullLocalPath = path.join(LOCAL_STORAGE_DIR, storagePath);
    fs.mkdirSync(path.dirname(fullLocalPath), { recursive: true });
    fs.writeFileSync(fullLocalPath, Buffer.from(buffer));
    return storagePath;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, Buffer.from(buffer), {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Failed to upload document to storage: ${error.message}`);
  }

  return storagePath;
}

/**
 * Downloads a PDF buffer from storage.
 */
export async function downloadPdfFromStorage(storagePath: string): Promise<Buffer> {
  const isMockOrDev =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref');

  if (isMockOrDev) {
    const fullLocalPath = path.join(LOCAL_STORAGE_DIR, storagePath);
    if (!fs.existsSync(fullLocalPath)) {
      throw new Error(`Document file not found at path: ${storagePath}`);
    }
    return fs.readFileSync(fullLocalPath);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);

  if (error || !data) {
    console.error('Supabase storage download error:', error);
    throw new Error(`Failed to download document from storage: ${error?.message || 'Not found'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
