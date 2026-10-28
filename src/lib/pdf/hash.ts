/**
 * Computes SHA-256 hash across both browser and server runtimes.
 */
export async function computeSha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = new Uint8Array(data);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(bytes).digest('hex');
}
