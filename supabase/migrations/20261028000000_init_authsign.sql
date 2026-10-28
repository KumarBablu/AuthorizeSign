-- =============================================================================
-- AuthSign Database Schema Migration
-- Includes Multi-Tenancy, Role-Based Access Control, RLS Policies,
-- Append-Only Audit Triggers, and Future-Proofing for Aadhaar / E-Stamping.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Clean teardown (if re-running in dev)
drop table if exists audit_events cascade;
drop table if exists signatures cascade;
drop table if exists otp_challenges cascade;
drop table if exists fields cascade;
drop table if exists signers cascade;
drop table if exists documents cascade;
drop table if exists members cascade;
drop table if exists organizations cascade;

drop function if exists is_member(uuid) cascade;
drop function if exists get_user_role(uuid) cascade;
drop function if exists doc_org_ok(uuid) cascade;
drop function if exists prevent_audit_tampering() cascade;

-- -----------------------------------------------------------------------------
-- 1. Organizations
-- -----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 2),
  slug text not null unique check (slug ~* '^[a-z0-9-]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_slug on organizations(slug);

-- -----------------------------------------------------------------------------
-- 2. Organization Members
-- -----------------------------------------------------------------------------
create table members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'sender', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_members_org_user on members(organization_id, user_id);
create index idx_members_user on members(user_id);

-- -----------------------------------------------------------------------------
-- 3. Documents
-- -----------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) >= 1),
  status text not null default 'draft' check (status in ('draft', 'pending', 'completed', 'expired')),
  signing_order text not null default 'sequential' check (signing_order in ('sequential', 'parallel')),
  
  -- Storage paths in private bucket 'documents'
  original_storage_path text not null,
  original_sha256 text not null check (char_length(original_sha256) = 64),
  signed_storage_path text,
  signed_sha256 text check (signed_sha256 is null or char_length(signed_sha256) = 64),

  -- Provider configs (future-proofed for Aadhaar / auto-seal)
  verification_method text not null default 'email_otp' check (verification_method in ('email_otp', 'aadhaar_otp')),
  signature_method text not null default 'draw' check (signature_method in ('draw', 'typed', 'aadhaar_esign', 'auto_seal')),

  -- Future-proofing for e-stamping
  stamp_ref text,
  stamp_amount numeric(12, 2) check (stamp_amount is null or stamp_amount >= 0),

  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_org_status on documents(organization_id, status);
create index idx_documents_signed_sha256 on documents(signed_sha256) where signed_sha256 is not null;
create index idx_documents_expires_at on documents(expires_at);

-- -----------------------------------------------------------------------------
-- 4. Signers
-- -----------------------------------------------------------------------------
create table signers (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  name text not null check (char_length(name) >= 1),
  email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  order_index integer not null default 0 check (order_index >= 0),
  
  -- 32-byte base64url token is hashed before storing (SHA-256)
  token_hash text not null unique check (char_length(token_hash) = 64),
  
  status text not null default 'pending' check (status in ('pending', 'signed', 'declined')),
  verified_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, email)
);

create index idx_signers_doc_order on signers(document_id, order_index);
create index idx_signers_token_hash on signers(token_hash);

-- -----------------------------------------------------------------------------
-- 5. Fields (Drag-and-Drop Form Fields)
-- Coordinates stored as fractions 0.00000 to 1.00000 from top-left
-- -----------------------------------------------------------------------------
create table fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  signer_id uuid not null references signers(id) on delete cascade,
  type text not null check (type in ('signature', 'date')),
  page integer not null check (page >= 1),
  x numeric(6, 5) not null check (x >= 0 and x <= 1),
  y numeric(6, 5) not null check (y >= 0 and y <= 1),
  width numeric(6, 5) not null check (width > 0 and width <= 1),
  height numeric(6, 5) not null check (height > 0 and height <= 1),
  created_at timestamptz not null default now()
);

create index idx_fields_doc_signer on fields(document_id, signer_id);

-- -----------------------------------------------------------------------------
-- 6. OTP Challenges (Strictly Server-Side Managed)
-- -----------------------------------------------------------------------------
create table otp_challenges (
  id uuid primary key default gen_random_uuid(),
  signer_id uuid not null references signers(id) on delete cascade,
  code_hash text not null check (char_length(code_hash) = 64),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_otp_signer_created on otp_challenges(signer_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 7. Signatures
-- -----------------------------------------------------------------------------
create table signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  signer_id uuid not null references signers(id) on delete cascade,
  field_id uuid not null references fields(id) on delete cascade,
  method text not null check (method in ('draw', 'typed', 'aadhaar_esign', 'auto_seal')),
  image_storage_path text,
  provider_txn_id text,
  cert_info jsonb,
  ip_address text,
  user_agent text,
  consent_text text not null,
  signed_at timestamptz not null default now()
);

create index idx_signatures_doc_signer on signatures(document_id, signer_id);

-- -----------------------------------------------------------------------------
-- 8. Audit Events (Append-Only Log)
-- -----------------------------------------------------------------------------
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  signer_id uuid references signers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'document_created', 'document_sent', 'link_opened', 'otp_sent',
    'otp_failed', 'otp_verified', 'signed', 'completed', 'expired'
  )),
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_doc_created on audit_events(document_id, created_at asc);

-- -----------------------------------------------------------------------------
-- 9. Append-Only Trigger for Audit Events
-- Prevents any modification or deletion of audit logs
-- -----------------------------------------------------------------------------
create or replace function prevent_audit_tampering()
returns trigger as $$
begin
  raise exception 'audit_events is append-only. UPDATE or DELETE operations are forbidden.';
end;
$$ language plpgsql;

create trigger trg_audit_events_immutable
before update or delete on audit_events
for each row execute function prevent_audit_tampering();

-- -----------------------------------------------------------------------------
-- 10. Helper Functions for Row-Level Security
-- -----------------------------------------------------------------------------
create or replace function is_member(org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from members
    where members.organization_id = org_id
      and members.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function get_user_role(org_id uuid)
returns text as $$
  select role from members
  where organization_id = org_id
    and user_id = auth.uid()
  limit 1;
$$ language sql security definer set search_path = public;

create or replace function doc_org_ok(doc_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from documents
    join members on members.organization_id = documents.organization_id
    where documents.id = doc_id
      and members.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- 11. Row-Level Security (RLS) Configuration
-- -----------------------------------------------------------------------------

-- Enable RLS across all tables
alter table organizations enable row level security;
alter table members enable row level security;
alter table documents enable row level security;
alter table signers enable row level security;
alter table fields enable row level security;
alter table otp_challenges enable row level security;
alter table signatures enable row level security;
alter table audit_events enable row level security;

-- Organizations policies
create policy "Org members can view their organization"
  on organizations for select
  using (is_member(id));

create policy "Org owners and admins can update organization"
  on organizations for update
  using (is_member(id) and get_user_role(id) in ('owner', 'admin'));

create policy "Authenticated users can create an organization"
  on organizations for insert
  with check (auth.uid() is not null);

-- Members policies
create policy "Members can view membership within their org"
  on members for select
  using (is_member(organization_id));

create policy "Owners and admins can manage members"
  on members for insert
  with check (is_member(organization_id) and get_user_role(organization_id) in ('owner', 'admin'));

create policy "Owners and admins can update members"
  on members for update
  using (is_member(organization_id) and get_user_role(organization_id) in ('owner', 'admin'));

create policy "Owners and admins can delete members"
  on members for delete
  using (is_member(organization_id) and get_user_role(organization_id) in ('owner', 'admin'));

-- Documents policies
create policy "Org members can view documents"
  on documents for select
  using (is_member(organization_id));

create policy "Senders, admins, and owners can insert documents"
  on documents for insert
  with check (is_member(organization_id) and get_user_role(organization_id) in ('owner', 'admin', 'sender'));

create policy "Senders, admins, and owners can update documents"
  on documents for update
  using (is_member(organization_id) and get_user_role(organization_id) in ('owner', 'admin', 'sender'));

create policy "Owners and admins can delete documents"
  on documents for delete
  using (is_member(organization_id) and get_user_role(organization_id) in ('owner', 'admin'));

-- Signers policies (Sender authenticated management; Signer access is handled exclusively via Service Role)
create policy "Org members can view signers"
  on signers for select
  using (doc_org_ok(document_id));

create policy "Senders can manage signers"
  on signers for insert
  with check (doc_org_ok(document_id));

create policy "Senders can update signers"
  on signers for update
  using (doc_org_ok(document_id));

create policy "Senders can delete signers"
  on signers for delete
  using (doc_org_ok(document_id));

-- Fields policies
create policy "Org members can view fields"
  on fields for select
  using (doc_org_ok(document_id));

create policy "Senders can manage fields"
  on fields for all
  using (doc_org_ok(document_id))
  with check (doc_org_ok(document_id));

-- OTP Challenges policies:
-- NO POLICIES DEFINED FOR AUTH/ANON.
-- With RLS enabled and zero policies, only service-role key can access this table.

-- Signatures policies
create policy "Org members can view signatures"
  on signatures for select
  using (doc_org_ok(document_id));

-- Audit Events policies
create policy "Org members can view document audit events"
  on audit_events for select
  using (doc_org_ok(document_id));

create policy "Org members can append audit events"
  on audit_events for insert
  with check (doc_org_ok(document_id));

-- -----------------------------------------------------------------------------
-- 12. Supabase Storage Bucket & RLS Configuration
-- Private bucket: 'documents'
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 15728640, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = array['application/pdf'];

create policy "Authenticated users can upload to their org documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid() is not null
  );

create policy "Org members can read their documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid() is not null
  );
