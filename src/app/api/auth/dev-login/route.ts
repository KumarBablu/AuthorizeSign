import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let email = 'demo@authsign.local';
    try {
      const body = await request.json();
      if (body?.email) {
        email = body.email.trim();
      }
    } catch {
      // Body is optional
    }

    const response = NextResponse.json({
      success: true,
      email,
      message: 'Logged in as demo user',
    });

    response.cookies.set('authsign_dev_user', email, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.set('authsign_dev_user', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}
