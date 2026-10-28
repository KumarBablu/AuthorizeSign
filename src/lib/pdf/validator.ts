export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates whether a file/buffer contains valid %PDF- magic header bytes.
 * The standard PDF header begins with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D).
 */
export function validatePdfMagicBytes(buffer: Uint8Array | ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 5) {
    return false;
  }
  // %PDF-
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d    // -
  );
}

export function validatePdfFile(file: { size: number; name: string }): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 15 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      valid: false,
      error: 'Only PDF documents are allowed.',
    };
  }
  return { valid: true };
}
