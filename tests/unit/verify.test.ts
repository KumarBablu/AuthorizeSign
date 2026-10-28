import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { validatePdfMagicBytes } from '@/lib/pdf/validator';

describe('Public Verification & Tamper Detection', () => {
  it('detects tampering when any single byte of a PDF is altered', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 500]);
    page.drawText('Original Contract Content');
    const originalPdfBytes = await doc.save();

    const originalHash = await computeSha256Hex(originalPdfBytes);

    // Tampered copy: modify a single byte
    const tamperedPdfBytes = new Uint8Array(originalPdfBytes);
    tamperedPdfBytes[tamperedPdfBytes.length - 20] =
      tamperedPdfBytes[tamperedPdfBytes.length - 20] ^ 0xff;

    const tamperedHash = await computeSha256Hex(tamperedPdfBytes);

    expect(originalHash).not.toBe(tamperedHash);
    expect(originalHash.length).toBe(64);
    expect(tamperedHash.length).toBe(64);
  });

  it('validates 64-character hex format for SHA-256 inputs', () => {
    const isValidSha256 = (str: string) => /^[a-f0-9]{64}$/.test(str);

    expect(isValidSha256('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe(true);
    expect(isValidSha256('invalid_hash')).toBe(false);
    expect(isValidSha256('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85Z')).toBe(false); // non-hex
  });

  it('validates %PDF- magic bytes strictly', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.7\nSample content');
    const invalidBuffer = Buffer.from('NOT_A_PDF_FILE');

    expect(validatePdfMagicBytes(validPdfBuffer)).toBe(true);
    expect(validatePdfMagicBytes(invalidBuffer)).toBe(false);
  });
});
