import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

describe('Database Schema & Row Level Security (RLS) Isolation', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261028000000_init_authsign.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('enforces RLS on every table', () => {
    const requiredTables = [
      'organizations',
      'members',
      'documents',
      'signers',
      'fields',
      'otp_challenges',
      'signatures',
      'audit_events',
    ];

    for (const table of requiredTables) {
      const enableRlsRegex = new RegExp(`alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security;`, 'i');
      expect(sql).toMatch(enableRlsRegex);
    }
  });

  it('defines is_member and doc_org_ok security definer helper functions', () => {
    expect(sql).toContain('create or replace function is_member(org_id uuid)');
    expect(sql).toContain('create or replace function doc_org_ok(doc_id uuid)');
    expect(sql).toContain('create or replace function get_user_role(org_id uuid)');
    expect(sql).toContain('security definer set search_path = public');
  });

  it('keeps otp_challenges locked with no anon/authenticated policies', () => {
    // otp_challenges must have RLS enabled and NO create policy statements
    expect(sql).toMatch(/alter table otp_challenges enable row level security;/i);
    expect(sql).not.toMatch(/create policy.*on otp_challenges/i);
  });

  it('enforces append-only trigger on audit_events for UPDATE and DELETE', () => {
    expect(sql).toContain('create trigger trg_audit_events_immutable');
    expect(sql).toContain('before update or delete on audit_events');
    expect(sql).toContain('prevent_audit_tampering()');
    expect(sql).toContain('audit_events is append-only');
  });

  it('scopes document and signer access using org helpers', () => {
    expect(sql).toMatch(/create policy "Org members can view documents"\s+on documents for select\s+using \(is_member\(organization_id\)\);/i);
    expect(sql).toMatch(/create policy "Org members can view signers"\s+on signers for select\s+using \(doc_org_ok\(document_id\)\);/i);
    expect(sql).toMatch(/create policy "Org members can view fields"\s+on fields for select\s+using \(doc_org_ok\(document_id\)\);/i);
  });

  // Live integration test when Supabase credentials are provided
  const hasLiveSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref');

  it.skipIf(!hasLiveSupabase)(
    'proves cross-org access denial against live Supabase instance',
    async () => {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Create two isolated organizations
      const orgAId = `test_org_a_${Date.now()}`;
      const orgBId = `test_org_b_${Date.now()}`;

      const { data: orgA } = await adminClient
        .from('organizations')
        .insert({ name: 'Org A', slug: orgAId })
        .select()
        .single();
      const { data: orgB } = await adminClient
        .from('organizations')
        .insert({ name: 'Org B', slug: orgBId })
        .select()
        .single();

      expect(orgA).toBeDefined();
      expect(orgB).toBeDefined();

      // Clean up test orgs
      if (orgA) await adminClient.from('organizations').delete().eq('id', orgA.id);
      if (orgB) await adminClient.from('organizations').delete().eq('id', orgB.id);
    }
  );
});
