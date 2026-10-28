export interface CompletedEmailProps {
  recipientName: string;
  documentTitle: string;
  downloadUrl: string;
  completedAt: string;
}

export function renderCompletedEmail({
  recipientName,
  documentTitle,
  downloadUrl,
  completedAt,
}: CompletedEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Document Fully Executed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 24px 32px; background-color: #059669; color: #ffffff;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700;">Document Fully Executed</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5;">Certificate of Completion generated</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #334155;">
                All signatories have completed signing <strong>"${documentTitle}"</strong> on ${completedAt}. A formal Certificate of Completion with tamper-evident cryptographic checksums has been appended to the final PDF.
              </p>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                      Download Signed Copy &amp; Certificate
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 18px;">
                You can verify the cryptographic authenticity of this document anytime by uploading it to our public verification portal.
              </p>
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
