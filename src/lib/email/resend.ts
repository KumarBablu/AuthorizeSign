import { Resend } from 'resend';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Dispatches transactional email via Resend.
 * Gracefully falls back to console logging when RESEND_API_KEY is not configured in dev/testing.
 */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'AuthSign <onboarding@resend.dev>';

  if (!apiKey || apiKey.startsWith('re_123456789')) {
    console.log(`[EMAIL DISPATCH - SIMULATION]`);
    console.log(`To: ${to}`);
    if (replyTo) console.log(`Reply-To: ${replyTo}`);
    console.log(`Subject: ${subject}`);
    return {
      success: true,
      messageId: `sim_${Date.now()}`,
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error('Resend delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error('Email dispatch exception:', err);
    return { success: false, error: err.message || 'Email delivery failed' };
  }
}
