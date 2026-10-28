import { type NextRequest, NextResponse } from 'next/server';
import { devDb } from '@/lib/db/dev-store';
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
    let signer: any = null;

    if (devDb.isDevMode()) {
      signer = devDb.getSignerByTokenHash(tokenHash);
    } else {
      const adminDb = createAdminClient();
      const { data, error: signerError } = await (adminDb.from('signers') as any)
        .select(`
          id,
          name,
          email,
          status,
          document_id,
          documents (
            id,
            title,
            status,
            expires_at
          )
        `)
        .eq('token_hash', tokenHash)
        .single();

      if (!signerError && data) {
        signer = data;
      }
    }

    if (!signer) {
      return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
    }

    const doc = signer.documents;
    if (doc.status === 'completed') {
      return NextResponse.json({ error: 'Document has already been signed and completed.' }, { status: 400 });
    }

    if (new Date(doc.expires_at).getTime() < Date.now() || doc.status === 'expired') {
      return NextResponse.json(
        { error: 'This signing link has expired. Time over. Please connect with the organization.' },
        { status: 400 }
      );
    }

    // Rate limiting: Max 3 OTP sends per signer in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    if (devDb.isDevMode()) {
      const recentChallenges = devDb.getRecentOtpChallenges(signer.id, tenMinutesAgo);
      if (recentChallenges.length >= 3) {
        return NextResponse.json(
          {
            error: 'Too many verification code requests. Please wait a few minutes before trying again.',
          },
          { status: 429 }
        );
      }
    } else {
      const adminDb = createAdminClient();
      const { data: recentChallenges } = await (adminDb.from('otp_challenges') as any)
        .select('id')
        .eq('signer_id', signer.id)
        .gte('created_at', tenMinutesAgo);

      if (recentChallenges && recentChallenges.length >= 3) {
        return NextResponse.json(
          {
            error: 'Too many verification code requests. Please wait a few minutes before trying again.',
          },
          { status: 429 }
        );
      }
    }

    // Generate 6-digit code
    const code = generateOtpCode();
    const codeHash = hashOtp(signer.id, code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save challenge
    if (devDb.isDevMode()) {
      devDb.insertOtpChallenge({
        signer_id: signer.id,
        code_hash: codeHash,
        attempts: 0,
        max_attempts: 5,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });
      console.log(`\n======================================================`);
      console.log(`[DEV MODE OTP] Signer: ${signer.name} (${signer.email})`);
      console.log(`OTP Code: ${code}`);
      console.log(`======================================================\n`);
    } else {
      const adminDb = createAdminClient();
      await (adminDb.from('otp_challenges') as any).insert({
        signer_id: signer.id,
        code_hash: codeHash,
        attempts: 0,
        max_attempts: 5,
        expires_at: expiresAt.toISOString(),
      });
    }

    // Send email
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

    // Log audit event: otp_sent (Never log the code itself)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (devDb.isDevMode()) {
      devDb.insertAuditEvent({
        document_id: doc.id,
        signer_id: signer.id,
        event_type: 'otp_sent',
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          expires_at: expiresAt.toISOString(),
        },
      });
    } else {
      const adminDb = createAdminClient();
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
    }

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      devCode: devDb.isDevMode() ? code : undefined,
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
