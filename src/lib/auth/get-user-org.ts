import { cookies } from 'next/headers';
import { devDb } from '@/lib/db/dev-store';
import { createClient } from '@/lib/db/supabase-server';
import type { MemberRole } from '@/types/database.types';

export interface UserOrgContext {
  userId: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  role: MemberRole;
}

/**
 * Retrieves the current authenticated user and their active organization membership.
 * If user has no organization yet, creates an initial organization for them with 'owner' role.
 * Includes local dev/demo mode fallback for offline evaluation.
 */
export async function getUserOrgContext(): Promise<UserOrgContext | null> {
  const cookieStore = await cookies();
  const devCookie = cookieStore.get('authsign_dev_user')?.value;

  // In offline dev mode or when demo cookie is set
  if (devCookie || devDb.isDevMode()) {
    return {
      userId: 'dev-user-001',
      userEmail: devCookie || 'demo@authsign.local',
      organizationId: 'dev-org-001',
      organizationName: 'AuthSign Demo Workspace',
      role: 'owner',
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  // Find user's organization memberships
  const { data: memberRecords, error: memberError } = await (supabase
    .from('members') as any)
    .select(`
      organization_id,
      role,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id)
    .limit(1);

  if (memberError) {
    console.error('Error fetching member records:', memberError);
    return null;
  }

  if (memberRecords && memberRecords.length > 0) {
    const member = memberRecords[0];
    const org = member.organizations as { id: string; name: string; slug: string };
    return {
      userId: user.id,
      userEmail: user.email,
      organizationId: org.id,
      organizationName: org.name,
      role: member.role as MemberRole,
    };
  }

  // If no org exists for this user, create one automatically
  const userName = user.user_metadata?.name || user.email.split('@')[0] || 'My';
  const orgName = `${userName}'s Workspace`;
  const orgSlug = `workspace-${user.id.slice(0, 8)}`;

  const { data: newOrg, error: orgCreateError } = await (supabase
    .from('organizations') as any)
    .insert({
      name: orgName,
      slug: orgSlug,
    })
    .select()
    .single();

  if (orgCreateError || !newOrg) {
    console.error('Failed to auto-create user organization:', orgCreateError);
    return null;
  }

  // Insert member as owner
  const { error: memberInsertError } = await (supabase.from('members') as any).insert({
    organization_id: newOrg.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberInsertError) {
    console.error('Failed to assign user as owner:', memberInsertError);
    return null;
  }

  return {
    userId: user.id,
    userEmail: user.email,
    organizationId: newOrg.id,
    organizationName: newOrg.name,
    role: 'owner',
  };
}
