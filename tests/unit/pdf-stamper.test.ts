import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { appendCertificateOfCompletion } from '@/lib/pdf/certificate';
import { computeSha256Hex } from '@/lib/pdf/hash';
import { stampDocument } from '@/lib/pdf/stamper';
import { validatePdfMagicBytes } from '@/lib/pdf/validator';

describe('PDF Stamper & Certificate Generator', () => {
  async function createBlankPdf(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]);
    return await doc.save();
  }

  it('validates %PDF- magic bytes on a valid PDF', async () => {
    const pdfBytes = await createBlankPdf();
    expect(validatePdfMagicBytes(pdfBytes)).toBe(true);

    const invalidBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    expect(validatePdfMagicBytes(invalidBytes)).toBe(false);
  });

  it('stamps date and signature onto PDF without errors', async () => {
    const initialPdf = await createBlankPdf();
    const stamped = await stampDocument({
      pdfBuffer: initialPdf,
      signatureFields: [
        { page: 1, x: 0.1, y: 0.8, width: 0.3, height: 0.1 },
      ],
      dateFields: [
        { page: 1, x: 0.5, y: 0.8, width: 0.2, height: 0.05, dateText: '2026-10-28 17:45 UTC' },
      ],
    });

    expect(stamped).toBeDefined();
    expect(stamped.length).toBeGreaterThan(0);
    expect(validatePdfMagicBytes(stamped)).toBe(true);
  });

  it('appends Certificate of Completion page increasing page count by 1', async () => {
    const initialPdf = await createBlankPdf();
    const initialDoc = await PDFDocument.load(initialPdf);
    expect(initialDoc.getPageCount()).toBe(1);

    const initialHash = await computeSha256Hex(initialPdf);

    const certifiedBytes = await appendCertificateOfCompletion({
      pdfBuffer: initialPdf,
      documentTitle: 'Master Service Agreement',
      originalSha256: initialHash,
      completedAt: new Date().toISOString(),
      signers: [
        {
          name: 'Bablu Signer',
          email: 'bablu@example.com',
          orderIndex: 0,
          verificationMethod: 'email_otp',
          signatureMethod: 'draw',
          ipAddress: '192.168.1.10',
          signedAt: '2026-10-28T17:50:00Z',
        },
      ],
    });

    const certifiedDoc = await PDFDocument.load(certifiedBytes);
    expect(certifiedDoc.getPageCount()).toBe(2);

    const finalHash = await computeSha256Hex(certifiedBytes);
    expect(finalHash).not.toBe(initialHash);
    expect(finalHash.length).toBe(64);
  });
});
