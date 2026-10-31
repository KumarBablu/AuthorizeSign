import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { sendEmail } from '@/lib/email/resend';
import { renderOtpEmail } from '@/lib/email/templates/otp';
import { generateOtpCode, hashOtp, hashToken } from '@/lib/security/crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const adminDb = createAdminClient();

    const { data: signer, error: signerError } = await (adminDb.from('signers') as any)
      .select('id, name, email, status, document_id, documents(id, title, status, expires_at)')
      .eq('token_hash', tokenHash)
      .single();

    if (signerError || !signer) {
      return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
    }

    const doc = signer.documents;
    if (new Date(doc.expires_at).getTime() < Date.now() || doc.status === 'expired') {
      return NextResponse.json(
        { error: 'This signing link has expired. Time over. Please connect with the organization.' },
        { status: 400 }
      );
    }

    if (signer.status === 'signed') {
      return NextResponse.json({ error: 'You have already signed this document.' }, { status: 400 });
    }

    // Rate Limiting: Max 3 challenges in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentChallenges } = await (adminDb.from('otp_challenges') as any)
      .select('id')
      .eq('signer_id', signer.id)
      .gte('created_at', tenMinutesAgo);

    if (recentChallenges && recentChallenges.length >= 3) {
      return NextResponse.json(
        {
          error:
            'Too many verification attempts. Please wait 10 minutes before requesting a new code.',
        },
        { status: 429 }
      );
    }

    // Invalidate any prior active (unconsumed) challenges
    await (adminDb.from('otp_challenges') as any)
      .update({ consumed_at: new Date().toISOString() })
      .eq('signer_id', signer.id)
      .is('consumed_at', null);

    // Generate 6-digit cryptographically random OTP
    const code = generateOtpCode();
    const codeHash = hashOtp(signer.id, code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await (adminDb.from('otp_challenges') as any).insert({
      signer_id: signer.id,
      code_hash: codeHash,
      attempts: 0,
      max_attempts: 5,
      expires_at: expiresAt.toISOString(),
    });

    // Send email via transactional email provider
    const emailHtml = renderOtpEmail({
      signerName: signer.name,
      documentTitle: doc.title,
      code,
    });

    await sendEmail({
      to: signer.email,
      subject: `Your AuthSign Verification Code: ${code}`,
      html: emailHtml,
    });

    // Log immutable audit event (Never log the code itself)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await (adminDb.from('audit_events') as any).insert({
      document_id: doc.id,
      signer_id: signer.id,
      event_type: 'otp_sent',
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        expires_at: expiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
