import { type NextRequest, NextResponse } from 'next/server';
import { getUserOrgContext } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/db/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = createAdminClient();

    // Query members table
    const { data: members, error: memError } = await (adminDb.from('members') as any)
      .select('id, user_id, role, created_at, updated_at')
      .eq('organization_id', orgContext.organizationId)
      .order('created_at', { ascending: true });

    if (memError) {
      return NextResponse.json({ error: memError.message }, { status: 500 });
    }

    // Fetch user details from auth.users via admin API
    const userIds = (members || []).map((m: any) => m.user_id);
    const memberDetails = [];

    for (const m of members || []) {
      const { data: userData } = await adminDb.auth.admin.getUserById(m.user_id);
      memberDetails.push({
        id: m.id,
        userId: m.user_id,
        email: userData?.user?.email || 'user@organization.com',
        name: userData?.user?.user_metadata?.name || userData?.user?.email?.split('@')[0] || 'Team Member',
        role: m.role,
        createdAt: m.created_at,
        isCurrent: m.user_id === orgContext.userId,
      });
    }

    return NextResponse.json({
      members: memberDetails,
      currentUserRole: orgContext.role,
      organizationName: orgContext.organizationName,
    });
  } catch (err: any) {
    console.error('Fetch members error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgContext = await getUserOrgContext();
    if (!orgContext || !['owner', 'admin'].includes(orgContext.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only organization owners and admins can invite or add members.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const role = body.role || 'sender';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    if (!['admin', 'sender', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Check if user already exists in auth.users
    let targetUserId: string | null = null;
    const { data: userList } = await adminDb.auth.admin.listUsers();
    const existingUser = (userList?.users || []).find((u) => u.email?.toLowerCase() === email);

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Invite user via Supabase Auth Admin
      const { data: invitedUser, error: inviteError } = await adminDb.auth.admin.inviteUserByEmail(email, {
        data: { name },
      });

      if (inviteError || !invitedUser?.user) {
        return NextResponse.json(
          { error: inviteError?.message || 'Failed to send invite to user' },
          { status: 500 }
        );
      }
      targetUserId = invitedUser.user.id;
    }

    // Check if member already exists in organization
    const { data: existingMember } = await (adminDb.from('members') as any)
      .select('id')
      .eq('organization_id', orgContext.organizationId)
      .eq('user_id', targetUserId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization.' },
        { status: 400 }
      );
    }

    // Add member record
    const { data: newMember, error: insertError } = await (adminDb.from('members') as any)
      .insert({
        organization_id: orgContext.organizationId,
        user_id: targetUserId,
        role,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        userId: targetUserId,
        email,
        name: name || email.split('@')[0],
        role: newMember.role,
      },
    });
  } catch (err: any) {
    console.error('Invite member error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
