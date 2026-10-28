# AuthSign — Enterprise E-Signature Platform

**AuthSign** is a secure, multi-tenant digital signature web application built for internal enterprise use with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

Engineered with a pluggable provider architecture, AuthSign supports Draw/Typed canvas signatures today while enabling **Aadhaar eSign** and legal **e-stamping** to be added in Phase 2 **without refactoring**.

---

## Features

- 🏢 **Multi-Tenant Organizations & RBAC**: Row-Level Security on every table scoped by organization membership (`owner`, `admin`, `sender`, `viewer`).
- 📄 **PDF Upload & Validation**: Validates `%PDF-` magic header bytes (max 15 MB) and computes SHA-256 digests.
- 🎯 **Visual Drag-and-Drop Field Editor**: Place "Signature" and "Date" fields anywhere across pages, stored as fractional coordinates ($0.0 \dots 1.0$).
- 🔀 **Flexible Signing Order**: Sequential (Signer 1 then Signer 2) or Parallel simultaneous execution.
- ⏱️ **Custom Expiry & Expired Notice**: Sender selects link validity (1 to 30 days, default 7 days). Post-expiry, displays *"Signing Link Expired (Time over). Please connect with the organization."*
- 🔐 **High-Entropy Token & OTP Security**:
  - Signer invitation links contain 32-byte `base64url` tokens; only `SHA-256(token)` is stored.
  - 6-digit cryptographic OTPs hashed with `SHA-256(signerId:code:OTP_PEPPER)`.
  - Constant-time verification (`crypto.timingSafeEqual`) to prevent timing side channels.
  - 10-minute expiry, max 5 failed attempts, rate-limited to 3 sends per 10 minutes.
  - 30-minute authenticated signing session window.
- ✍️ **Dual Signature Capture Modes**:
  - **Draw Mode**: Smooth HTML5 canvas with touch/pointer support for phones and stylus pens.
  - **Auto-Generated Mode**: Typed name rendered across 3 cursive Google fonts (*Dancing Script*, *Caveat*, *Pacifico*).
  - Empty signatures are rejected; outputs transparent PNGs $\le 300\text{ KB}$.
- 📜 **Certificate of Completion**: Appends a cryptographic audit trail page to the PDF with document title, original SHA-256, signer names, emails, verification method (`Email OTP`), signature method (`draw`/`typed`), IPs, and timestamps.
- ✅ **Persistent Completed State**: Clicking a completed link at any time, on any day, displays a prominent **green check mark** (*"Document has been signed"*) and a direct download button.
- 🛡️ **Public Verification (`/verify`)**: Upload any PDF to compute its SHA-256 hash and verify its authenticity against completed database records. Tampering with even a single byte invalidates the checksum.
- 🔒 **Append-Only DB Audit Trigger**: Database trigger `trg_audit_events_immutable` prevents any `UPDATE` or `DELETE` on audit events.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + shadcn/ui design tokens
- **Database & Auth**: Supabase (PostgreSQL with RLS, Supabase Auth)
- **Storage**: Supabase Private Storage (`documents` bucket)
- **PDF Engine**: `pdf-lib` (stamping & certificate generation), `pdfjs-dist` / WebCrypto (integrity)
- **Email Delivery**: Resend
- **Validation**: Zod
- **Testing**: Vitest (32 passing automated tests)

---

## Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm or pnpm
- Git

### 2. Clone and Install Dependencies
```bash
git clone <repo-url>
cd AuthorizeSign
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your configuration:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...

RESEND_API_KEY=re_your_resend_key
EMAIL_FROM=AuthSign <onboarding@resend.dev>

OTP_PEPPER=super_secret_otp_pepper_minimum_32_characters_long_2026
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
*(Note: If live keys are omitted in development, local storage and email simulation fallbacks allow testing offline).*

### 4. Run Database Migration in Supabase
Run the migration file in your Supabase SQL Editor:
```bash
supabase/migrations/20261028000000_init_authsign.sql
```
This sets up all tables, RLS policies, security-definer helper functions, append-only triggers, and private storage bucket policies.

### 5. Run the Automated Test Suite
```bash
npm run test
```
Runs 32 unit and security tests covering crypto, providers, PDF stamper, send flow, signer journey, and public verification.

### 6. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Supabase & Vercel Deployment Guide

### Supabase Setup
1. In the Supabase Dashboard, open **Authentication > Providers** and ensure **Email** is enabled.
2. In **Storage > Buckets**, verify that the `documents` bucket exists and is set to **Private** (public: false).
3. In **SQL Editor**, execute `supabase/migrations/20261028000000_init_authsign.sql`.

### Vercel Deployment
1. Import the repository into your Vercel Dashboard.
2. In **Settings > Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `OTP_PEPPER`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel production domain, e.g. `https://authsign.vercel.app`)
3. Deploy!

---

## Manual Acceptance Test Checklist

| # | Step | Expected Result |
| :--- | :--- | :--- |
| 1 | **Upload Valid PDF** | Drop a PDF ($\le 15\text{ MB}$). Verifies `%PDF-` header and computes SHA-256 checksum. |
| 2 | **Upload Non-PDF File** | Uploading `.txt` or `.png` is rejected immediately with clear error. |
| 3 | **Configure 2 Sequential Signers** | Add Signer 1 and Signer 2 in sequential order. Select 7 days expiry. |
| 4 | **Place Fields in Editor** | Click to place Signature and Date fields assigned to each signer. Coordinates saved in $[0, 1]$. |
| 5 | **Send for Signature** | Document status changes to `pending`. Signer 1 receives invitation email with unique link. |
| 6 | **Signer 2 Blocks Early** | Signer 2 opening `/sign/[token]` sees *"Awaiting signature from [Signer 1]"*. |
| 7 | **Signer 1 OTP Flow** | Clicks *"Send Verification Code"*. Receives 6-digit OTP. Incorrect codes decrease attempts; correct code grants 30-min session. |
| 8 | **Signer 1 Signs & Submits** | Draws signature on touch canvas, checks mandatory consent, and submits. Server stamps signature PNG and date. |
| 9 | **Signer 2 Hand-off** | Signer 2 receives invitation email automatically. Enters OTP and signs using typed cursive mode. |
| 10 | **Final Execution & Certificate** | Last signer submits. "Certificate of Completion" page is appended with audit table. Document marked `completed`. Final PDF emailed to all parties. |
| 11 | **Persistent Completed Link** | Opening `/sign/[token]` on any day displays a **green check mark** (*"Document has been signed"*) and download button. |
| 12 | **Expired Link State** | When `now() > expires_at` on an uncompleted document, link displays *"Signing Link Expired (Time over). Please connect with [Organization Name]"*. |
| 13 | **Public Verification (`/verify`)** | Upload final PDF $\rightarrow$ shows **"Verified Authentic Document"**. Modifying any character of the PDF produces a different SHA-256 and fails verification. |
| 14 | **RLS Isolation** | Authenticated user in Organization A cannot view or modify Organization B's documents or signers. |
