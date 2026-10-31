import { createClient } from '@/lib/db/supabase-server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('authsign_dev_user');
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore error and redirect
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const response = NextResponse.redirect(`${appUrl}/login`);
  response.cookies.delete('authsign_dev_user');
  return response;
}
