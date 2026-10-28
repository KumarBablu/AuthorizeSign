export interface InvitationEmailProps {
  signerName: string;
  documentTitle: string;
  organizationName: string;
  signingUrl: string;
  expiresInDays: number;
}

export function renderInvitationEmail({
  signerName,
  documentTitle,
  organizationName,
  signingUrl,
  expiresInDays,
}: InvitationEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signature Requested</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; background-color: #0f172a; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Auth<span style="color: #3b82f6;">Sign</span></h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Secure Digital Execution</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a; font-weight: 600;">Signature Requested</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #334155;">
                Hello <strong>${signerName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #334155;">
                <strong>${organizationName}</strong> has sent you <strong>"${documentTitle}"</strong> to review and electronically sign.
              </p>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${signingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 1px 2px rgba(37,99,235,0.2);">
                      Review &amp; Sign Document
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; margin: 24px 0 0 0;">
                <tr>
                  <td style="padding: 16px; font-size: 12px; color: #64748b; line-height: 18px;">
                    • <strong>Security Note:</strong> You will be asked to verify a 6-digit email security code before viewing the PDF.<br>
                    • <strong>Expiration:</strong> This link is active for <strong>${expiresInDays} days</strong>. Post-expiry, the document will become inaccessible.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              This is an automated notification from AuthSign. Do not forward this link as it contains your unique access credential.
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
