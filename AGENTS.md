# AGENTS.md: Developer & Agent Guide for AuthSign

This document outlines key conventions, architectural invariant rules, and commands for agents and developers working on the **AuthSign** codebase.

---

## 1. Project Invariants & Non-Negotiables

1. **Signer Security Model**:
   - Signer tokens are 32 random bytes (`base64url`). Store **ONLY** the SHA-256 hash in `signers.token_hash`.
   - Never expose raw tokens in server logs or database queries.
   - OTPs must be hashed via `SHA-256(signerId:code:OTP_PEPPER)`.
   - Compare OTP hashes exclusively using `crypto.timingSafeEqual` in `src/lib/security/crypto.ts`.
   - Never log OTP codes in plain text.
2. **Row-Level Security (RLS)**:
   - Every database table has RLS enabled.
   - Access is scoped by org membership using helper functions `is_member(org_id)` and `doc_org_ok(document_id)`.
   - `otp_challenges` has RLS enabled with **zero policies**; only the server-side service role client (`src/lib/db/supabase-admin.ts`) can access it.
   - `audit_events` is strictly append-only: a database trigger `trg_audit_events_immutable` raises an exception on any `UPDATE` or `DELETE`.
3. **Pluggable Provider Architecture**:
   - Provider interfaces reside in `src/lib/providers/types.ts`:
     - `VerificationProvider`: `email_otp`, future `aadhaar_otp`
     - `SignatureProvider`: `draw`, `typed`, future `aadhaar_esign`, `auto_seal`
     - `StampProvider`: `NoopStampProvider`, future `NeSLStampProvider`
   - Document signing routes dynamically load providers via `getSignatureProvider()` and `getVerificationProvider()`. Never hardcode provider logic into API handlers.
   - Do **NOT** modify database schema when adding future providers.
   - **Never store Aadhaar numbers** in database or logs.

---

## 2. Directory Layout Reference

- `src/app/(dashboard)/`: Sender experience (Dashboard, New Document, Document Details).
- `src/app/(signer)/sign/[token]/`: Mobile-first signer journey (OTP verification, PDF review, canvas/typed signature, consent, done screen).
- `src/app/(public)/verify/`: Public document verification page via cryptographic SHA-256 hash matching.
- `src/lib/providers/`: Pluggable verification, signature, and stamping providers.
- `src/lib/pdf/`: PDF validation (`validator.ts`), hashing (`hash.ts`), stamping (`stamper.ts`), and Certificate of Completion generation (`certificate.ts`).
- `supabase/migrations/`: Supabase Postgres migrations containing complete schema, RLS, functions, and triggers.
- `tests/`: Vitest test suites for RLS, crypto, PDF stamper, send flow, signer journey, and verification.

---

## 3. Key Commands

```bash
# Run unit and RLS test suites
npm run test

# Run tests in watch mode
npm run test:watch

# Type check across all files
npx tsc --noEmit

# Production Next.js build
npm run build

# Start local Next.js dev server
npm run dev
```
