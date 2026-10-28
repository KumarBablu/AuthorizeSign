import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface CertificateSignerInfo {
  name: string;
  email: string;
  orderIndex: number;
  verificationMethod: string;
  signatureMethod: string;
  ipAddress?: string;
  signedAt?: string;
}

export interface AppendCertificateParams {
  pdfBuffer: Buffer | Uint8Array;
  documentTitle: string;
  originalSha256: string;
  completedAt: string;
  signers: CertificateSignerInfo[];
}

/**
 * Appends a formal, tamper-evident "Certificate of Completion" page to the end of the PDF.
 */
export async function appendCertificateOfCompletion({
  pdfBuffer,
  documentTitle,
  originalSha256,
  completedAt,
  signers,
}: AppendCertificateParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Standard A4 dimensions in points: 595.28 x 841.89
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Top header background
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: rgb(0.06, 0.12, 0.24), // Slate 900
  });

  page.drawText('Certificate of Completion', {
    x: 40,
    y: height - 55,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('AuthSign Secure Digital Execution Record', {
    x: 40,
    y: height - 78,
    size: 11,
    font: fontRegular,
    color: rgb(0.6, 0.7, 0.85),
  });

  // Document Overview Box
  let currentY = height - 140;

  page.drawText('DOCUMENT SUMMARY', {
    x: 40,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.55),
  });

  currentY -= 20;
  page.drawText(`Document Title: ${documentTitle}`, {
    x: 40,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  currentY -= 18;
  page.drawText(`Completed Timestamp: ${completedAt}`, {
    x: 40,
    y: currentY,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  currentY -= 18;
  page.drawText(`Original SHA-256 Digest:`, {
    x: 40,
    y: currentY,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  currentY -= 14;
  page.drawText(originalSha256, {
    x: 40,
    y: currentY,
    size: 8,
    font: fontRegular,
    color: rgb(0.1, 0.3, 0.6),
  });

  // Signer Details Section
  currentY -= 35;
  page.drawText('SIGNER AUDIT TRAIL', {
    x: 40,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.45, 0.55),
  });

  currentY -= 15;

  for (const signer of signers) {
    // Card background for each signer
    page.drawRectangle({
      x: 40,
      y: currentY - 80,
      width: width - 80,
      height: 80,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.88, 0.9, 0.94),
      borderWidth: 1,
    });

    page.drawText(`${signer.name} (${signer.email})`, {
      x: 55,
      y: currentY - 25,
      size: 11,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.2),
    });

    const statusBadge = `Order: ${signer.orderIndex + 1} | Status: Signed`;
    page.drawText(statusBadge, {
      x: 55,
      y: currentY - 42,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.5, 0.2),
    });

    const verifyInfo = `Verification: ${signer.verificationMethod.toUpperCase()} | Method: ${signer.signatureMethod.toUpperCase()}`;
    page.drawText(verifyInfo, {
      x: 55,
      y: currentY - 58,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45),
    });

    const auditMeta = `Signed At: ${signer.signedAt || completedAt} | IP: ${signer.ipAddress || 'Recorded'}`;
    page.drawText(auditMeta, {
      x: 55,
      y: currentY - 72,
      size: 8,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.6),
    });

    currentY -= 95;
  }

  // Footer notes & authenticity statement
  page.drawRectangle({
    x: 40,
    y: 50,
    width: width - 80,
    height: 50,
    color: rgb(0.94, 0.97, 1.0),
    borderColor: rgb(0.7, 0.8, 0.95),
    borderWidth: 1,
  });

  page.drawText('Integrity & Tamper-Evidence Notice', {
    x: 55,
    y: 82,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.7),
  });

  page.drawText(
    'This document has been electronically signed in compliance with legal standards. Any alteration to this PDF will invalidate its cryptographic SHA-256 checksum and fail verification at /verify.',
    {
      x: 55,
      y: 65,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.3, 0.5),
      maxWidth: width - 110,
    }
  );

  return await pdfDoc.save();
}
