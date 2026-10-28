export interface OtpEmailProps {
  signerName: string;
  documentTitle: string;
  code: string;
}

export function renderOtpEmail({ signerName, documentTitle, code }: OtpEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; color: #ffffff;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700;">Auth<span style="color: #3b82f6;">Sign</span> Verification</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
                Hello <strong>${signerName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #334155;">
                Use the verification code below to securely access and sign <strong>"${documentTitle}"</strong>:
              </p>

              <!-- OTP Code Display -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1d4ed8;">
                  ${code}
                </span>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748b; line-height: 18px;">
                • This code expires in <strong>10 minutes</strong>.<br>
                • For your protection, never share this code with anyone.
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
