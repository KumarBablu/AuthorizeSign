export interface CompletedSignerSummary {
  name: string;
  email: string;
  signedAt: string;
  ipAddress?: string;
}

export interface CompletedEmailProps {
  recipientName: string;
  recipientRole?: 'sender' | 'signer';
  documentTitle: string;
  downloadUrl: string;
  completedAt: string;
  originalSha256?: string;
  signedSha256?: string;
  signers?: CompletedSignerSummary[];
  senderName?: string;
  senderEmail?: string;
  verifyUrl?: string;
}

export function renderCompletedEmail({
  recipientName,
  recipientRole = 'signer',
  documentTitle,
  downloadUrl,
  completedAt,
  originalSha256,
  signedSha256,
  signers = [],
  senderName,
  senderEmail,
  verifyUrl,
}: CompletedEmailProps): string {
  const isSender = recipientRole === 'sender';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Executed &amp; Certified: ${documentTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 26px 32px; background-color: #065f46; color: #ffffff;">
              <h1 style="margin: 0; font-size: 19px; font-weight: 700;">Document Fully Executed &amp; Certified</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #a7f3d0;">
                Certificate of Completion &amp; Legal Audit Trail Attached
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 14px 0; font-size: 14px; color: #334155;">
                Hello <strong>${recipientName}</strong> ${isSender ? '(Sender)' : '(Signatory)'},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #334155;">
                ${
                  isSender
                    ? `Great news! All invited signatories have successfully signed and completed <strong>"${documentTitle}"</strong>.`
                    : `You and all other signatories have successfully signed and executed <strong>"${documentTitle}"</strong>.`
                }
              </p>

              <!-- Document Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 22px 0;">
                <tr>
                  <td style="padding: 16px; font-size: 12px; line-height: 20px; color: #334155;">
                    <strong>Document:</strong> ${documentTitle}<br>
                    ${senderName ? `<strong>Invited by (Sender):</strong> ${senderName} (${senderEmail})<br>` : ''}
                    <strong>Completed At:</strong> ${completedAt}<br>
                    <strong>Execution Status:</strong> <span style="color: #059669; font-weight: 600;">100% Completed</span>
                  </td>
                </tr>
              </table>

              <!-- Action Button: Download Signed Copy -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(5,150,105,0.25);">
                      Download Signed PDF &amp; Certificate &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              ${
                signers.length > 0
                  ? `
              <!-- Signatory Audit Trail Table -->
              <h3 style="margin: 26px 0 10px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">
                Signatory Audit Trail
              </h3>
              <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; margin-bottom: 20px; border-collapse: collapse;">
                <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                  <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Signer</th>
                  <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Signed Timestamp</th>
                  <th style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">Status</th>
                </tr>
                ${signers
                  .map(
                    (s) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 12px; color: #0f172a;">
                    <strong>${s.name}</strong><br>
                    <span style="color: #64748b; font-size: 11px;">${s.email}</span>
                  </td>
                  <td style="padding: 8px 12px; color: #334155; font-size: 11px;">
                    ${s.signedAt}
                  </td>
                  <td style="padding: 8px 12px; color: #059669; font-weight: 600; font-size: 11px;">
                    ✓ Signed
                  </td>
                </tr>
                `
                  )
                  .join('')}
              </table>
              `
                  : ''
              }

              ${
                originalSha256 && signedSha256
                  ? `
              <!-- Cryptographic Integrity Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; margin: 20px 0 0 0;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 11px; color: #475569; line-height: 18px;">
                    <strong>Original SHA-256:</strong> <span style="font-family: monospace; word-break: break-all;">${originalSha256}</span><br>
                    <strong>Signed SHA-256:</strong> <span style="font-family: monospace; word-break: break-all; color: #0369a1;">${signedSha256}</span><br>
                    ${
                      verifyUrl
                        ? `You or any regulatory authority can independently verify this document at <a href="${verifyUrl}" style="color: #2563eb; text-decoration: underline;">${verifyUrl}</a>.`
                        : ''
                    }
                  </td>
                </tr>
              </table>
              `
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              Delivered automatically to both sender and signatories by AuthSign Enterprise.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
