import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { hashOtp, hashToken, verifyHashTimingSafe } from '@/lib/security/crypto';
import { otpVerifySchema } from '@/lib/validations/signer.schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const body = await request.json();
    const validated = otpVerifySchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.errors[0].message }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const adminDb = createAdminClient();

    const { data: signer, error: signerError } = await (adminDb.from('signers') as any)
      .select('id, document_id, status, documents(id, status, expires_at)')
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

    // Fetch active challenge
    const { data: challenge, error: challengeError } = await (adminDb.from('otp_challenges') as any)
      .select('id, code_hash, attempts, max_attempts, expires_at, consumed_at')
      .eq('signer_id', signer.id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'No active verification code found. Please request a new code.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check expiration
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check attempt limit
    if (challenge.attempts >= challenge.max_attempts) {
      return NextResponse.json(
        {
          error: 'Maximum verification attempts exceeded. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // Increment attempts
    const newAttempts = challenge.attempts + 1;
    await (adminDb.from('otp_challenges') as any)
      .update({ attempts: newAttempts })
      .eq('id', challenge.id);

    // Verify hash with constant-time comparison
    const computedHash = hashOtp(signer.id, validated.data.code);
    const isMatch = verifyHashTimingSafe(challenge.code_hash, computedHash);

    if (!isMatch) {
      const remainingAttempts = challenge.max_attempts - newAttempts;

      // Log audit event: otp_failed
      await (adminDb.from('audit_events') as any).insert({
        document_id: doc.id,
        signer_id: signer.id,
        event_type: 'otp_failed',
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          remaining_attempts: remainingAttempts,
        },
      });

      return NextResponse.json(
        {
          error: `Incorrect verification code. ${remainingAttempts} attempts remaining.`,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Mark challenge consumed
    const nowIso = new Date().toISOString();
    await (adminDb.from('otp_challenges') as any)
      .update({ consumed_at: nowIso })
      .eq('id', challenge.id);

    await (adminDb.from('signers') as any)
      .update({ verified_at: nowIso })
      .eq('id', signer.id);

    await (adminDb.from('audit_events') as any).insert({
      document_id: doc.id,
      signer_id: signer.id,
      event_type: 'otp_verified',
      ip_address: ip,
      user_agent: userAgent,
      metadata: {
        verified_at: nowIso,
      },
    });

    return NextResponse.json({
      success: true,
      verifiedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
