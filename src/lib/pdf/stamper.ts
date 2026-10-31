import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface StampSignatureField {
  page: number; // 1-indexed
  x: number; // 0..1 from top-left
  y: number; // 0..1 from top-left
  width: number; // 0..1
  height: number; // 0..1
}

export interface StampDateField {
  page: number; // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  dateText: string;
}

export interface StampDocumentParams {
  pdfBuffer: Buffer | Uint8Array;
  signaturePngBase64?: string;
  signatureFields: StampSignatureField[];
  dateFields?: StampDateField[];
  signerAuditStamp?: {
    name: string;
    documentId: string;
    timestamp: string;
  };
}

/**
 * Stamps signature PNG, audit metadata, and date texts onto the PDF document using pdf-lib.
 * Handles coordinate conversion: top-left (web fraction) -> bottom-left (pdf points).
 */
export async function stampDocument({
  pdfBuffer,
  signaturePngBase64,
  signatureFields,
  dateFields = [],
  signerAuditStamp,
}: StampDocumentParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount();
  const fontSmall = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let embeddedPngImage: any = null;
  if (signaturePngBase64 && signatureFields.length > 0) {
    const rawPngBytes = Buffer.from(
      signaturePngBase64.replace(/^data:image\/png;base64,/, ''),
      'base64'
    );
    embeddedPngImage = await pdfDoc.embedPng(rawPngBytes);
  }

  // Stamp signature fields
  for (const field of signatureFields) {
    if (field.page < 1 || field.page > totalPages) continue;

    const page = pdfDoc.getPage(field.page - 1);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const pdfX = field.x * pageWidth;
    const pdfWidth = field.width * pageWidth;
    const pdfHeight = field.height * pageHeight;
    // Top-left to bottom-left inverted Y coordinate
    const pdfY = pageHeight - (field.y + field.height) * pageHeight;

    if (embeddedPngImage) {
      // Leave 10pt at bottom for audit stamp if present
      const imageStampHeight = signerAuditStamp ? Math.max(10, pdfHeight - 11) : pdfHeight;
      const imageStampY = signerAuditStamp ? pdfY + 11 : pdfY;

      page.drawImage(embeddedPngImage, {
        x: pdfX,
        y: imageStampY,
        width: pdfWidth,
        height: imageStampHeight,
      });

      // ESign audit banner: name, doc ID, timestamp
      if (signerAuditStamp) {
        const auditText = `eSigned by ${signerAuditStamp.name} • Doc ID: ${signerAuditStamp.documentId.slice(0, 8)} • ${signerAuditStamp.timestamp}`;
        page.drawText(auditText, {
          x: pdfX + 2,
          y: pdfY + 2,
          size: 6,
          font: fontSmall,
          color: rgb(0.35, 0.4, 0.5),
        });
      }
    }
  }

  // Stamp date fields
  if (dateFields.length > 0) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const dField of dateFields) {
      if (dField.page < 1 || dField.page > totalPages) continue;

      const page = pdfDoc.getPage(dField.page - 1);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const pdfX = dField.x * pageWidth + 4;
      const pdfHeight = dField.height * pageHeight;
      const pdfY = pageHeight - (dField.y + dField.height) * pageHeight + (pdfHeight / 2) - 4;

      page.drawText(dField.dateText, {
        x: pdfX,
        y: pdfY,
        size: 9,
        font,
        color: rgb(0.1, 0.1, 0.2),
      });
    }
  }

  return await pdfDoc.save();
}
