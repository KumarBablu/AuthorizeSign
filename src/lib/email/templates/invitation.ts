export interface InvitationEmailProps {
  signerName: string;
  documentTitle: string;
  organizationName: string;
  senderName?: string;
  senderEmail?: string;
  signingUrl: string;
  expiresInDays: number;
}

export function renderInvitationEmail({
  signerName,
  documentTitle,
  organizationName,
  senderName = 'The Document Sender',
  senderEmail = 'noreply@authsign.com',
  signingUrl,
  expiresInDays,
}: InvitationEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signature Requested by ${senderName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0f172a; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Auth<span style="color: #3b82f6;">Sign</span></h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Enterprise Digital Execution Platform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 14px 0; font-size: 18px; color: #0f172a; font-weight: 600;">Signature Requested</h2>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #334155;">
                Hello <strong>${signerName}</strong>,
              </p>

              <!-- Sender Attribution Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 16px; font-size: 13px; line-height: 20px; color: #334155;">
                    <strong>Sender:</strong> ${senderName} (<a href="mailto:${senderEmail}" style="color: #2563eb; text-decoration: none;">${senderEmail}</a>)<br>
                    <strong>Organization:</strong> ${organizationName}<br>
                    <strong>Document:</strong> "${documentTitle}"
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #334155;">
                <strong>${senderName}</strong> has invited you to review and electronically sign this document. Your session is protected by cryptographic audit trail recording.
              </p>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${signingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 36px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.25);">
                      Review &amp; Sign Document &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; margin: 24px 0 0 0;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12px; color: #64748b; line-height: 18px;">
                    • <strong>Security Authentication:</strong> A 6-digit email code will be required before signing.<br>
                    • <strong>Validity:</strong> This single-use link expires in <strong>${expiresInDays} days</strong>.<br>
                    • <strong>Questions?</strong> You can reply directly to this email to contact <strong>${senderName}</strong>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              This invitation was dispatched by AuthSign on behalf of ${senderName} (${senderEmail}).
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
