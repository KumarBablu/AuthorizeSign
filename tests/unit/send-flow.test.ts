import { describe, expect, it } from 'vitest';
import { renderCompletedEmail } from '@/lib/email/templates/completed';
import { renderInvitationEmail } from '@/lib/email/templates/invitation';
import { renderOtpEmail } from '@/lib/email/templates/otp';
import { generateSignerToken, hashToken } from '@/lib/security/crypto';

describe('Send Flow & Email Templates', () => {
  it('renders invitation email with document title, organization, and action URL', () => {
    const rawToken = generateSignerToken();
    const signingUrl = `http://localhost:3000/sign/${rawToken}`;

    const html = renderInvitationEmail({
      signerName: 'Jane Signer',
      documentTitle: 'Non-Disclosure Agreement',
      organizationName: 'Alpha Tech Corp',
      signingUrl,
      expiresInDays: 7,
    });

    expect(html).toContain('Jane Signer');
    expect(html).toContain('Non-Disclosure Agreement');
    expect(html).toContain('Alpha Tech Corp');
    expect(html).toContain(signingUrl);
    expect(html).toContain('7 days');
  });

  it('renders OTP verification email with 6-digit code', () => {
    const code = '849201';
    const html = renderOtpEmail({
      signerName: 'Jane Signer',
      documentTitle: 'Non-Disclosure Agreement',
      code,
    });

    expect(html).toContain('849201');
    expect(html).toContain('Jane Signer');
    expect(html).toContain('10 minutes');
  });

  it('renders completion email with final download link', () => {
    const downloadUrl = 'http://localhost:3000/api/documents/doc-123/download?type=signed';
    const html = renderCompletedEmail({
      recipientName: 'Sender Bob',
      documentTitle: 'Employment Contract',
      downloadUrl,
      completedAt: '2026-10-28 17:50 UTC',
    });

    expect(html).toContain('Document Fully Executed');
    expect(html).toContain('Employment Contract');
    expect(html).toContain(downloadUrl);
  });

  it('token hashing matches expected SHA-256 properties', () => {
    const rawToken = generateSignerToken();
    const hash = hashToken(rawToken);

    expect(hash.length).toBe(64);
    expect(hash).not.toBe(rawToken);
  });
});
