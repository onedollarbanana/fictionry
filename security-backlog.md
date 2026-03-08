# Security & Pre-Launch Backlog

Items from the March 2026 security audit that were NOT fixed in PR fix/security-hardening.
Prioritised order. Fix before significant public traffic or monetisation goes live.

---

## HIGH — Fix Before Monetisation Is Live

### 1. Payout request never calls Stripe — money doesn't move
**File:** `src/app/api/stripe/request-payout/route.ts:83`

The route inserts a `payouts` row with `status: 'pending'` and `stripe_payout_id: null`
but never calls `stripe.transfers.create()`. Authors who request a payout get a DB record
but no money moves.

**Fix:** Implement `stripe.transfers.create({ amount, currency: 'usd', destination: stripeAccount.stripe_account_id })` after the insert, then update the row with the returned `stripe_payout_id` and set `status: 'processing'`.

---

### 2. Refund operation has no database transaction
**File:** `src/app/api/admin/refund/route.ts`

Four sequential DB writes (mark refunded → insert refund record → update author balance → update subscription) with no transaction. A mid-sequence failure leaves data inconsistent.

**Fix:** Wrap in a Postgres function/transaction or use Supabase's `rpc()` with a stored procedure that does all four writes atomically.

---

### 3. Hardcoded Vercel preview URL as Stripe redirect fallback
**Files:**
- `src/app/api/stripe/author-subscribe/route.ts`
- `src/app/api/stripe/connect/create-account/route.ts`

```ts
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fictionry-beige.vercel.app'
```

If the env var is missing from a deployment, Stripe redirects silently go to the preview domain.

**Fix:** Replace the fallback with a hard throw: `if (!siteUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')`. Also confirm `NEXT_PUBLIC_APP_URL` (the var in CLAUDE.md) vs `NEXT_PUBLIC_SITE_URL` (the var these files use) — one of them may be the wrong name.

---

## MEDIUM — Fix Before Significant Public Traffic

### 4. Financial report needs proper DB-level aggregation
**File:** `src/app/api/admin/financial-report/route.ts`

Currently fetches up to 10,000 transaction rows and 5,000 subscription rows into Node.js
for in-memory aggregation. At scale this will hit Vercel's 10s timeout.

**Fix:** Move aggregations (SUM, COUNT, GROUP BY month) into SQL queries or Supabase RPC
functions. Only the top-10 authors lookup genuinely needs application-level sorting.

---

### 5. In-memory rate limiting on epub export is not instance-safe
**File:** `src/app/api/export/epub/route.ts`

Uses a module-level `Map` that resets on cold starts and doesn't share state across
Vercel serverless instances. The DB-backed `check_rate_limit` RPC (used by comments,
ratings, announcements) is the right approach.

**Fix:** Replace the `rateLimitMap` / `checkRateLimit` in epub/route.ts with a call to
the shared `checkRateLimit` from `@/lib/rate-limit` using the user's ID as the key.
Add an `'epub_export'` action type (e.g. 3 per 10 minutes).

---

### 6. `interval` parameter in Stripe checkout not allowlisted
**File:** `src/app/api/stripe/create-checkout/route.ts`

The client-supplied `interval` value is used to construct a Stripe price lookup key with
no server-side validation. A bad value silently results in a 500.

**Fix:** Add `if (!['monthly', 'annual'].includes(interval)) return 400`.

---

## LOW — Clean Up When Convenient

### 7. Localhost fallback in Stripe checkout redirect origin
**File:** `src/app/api/stripe/create-checkout/route.ts:79`
```ts
const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
```
Harmless in production (origin header always present from a real browser), but remove the `localhost` fallback and use a hard throw instead so misconfiguration is obvious.

### 8. CRON_SECRET strength
Ensure `CRON_SECRET` in all Vercel environments is a random string of at least 32 characters. Used to gate: `snapshot-rankings`, `fraud-scan`, `reconcile-counters`, `recommendations/recompute`.

### 9. `console.error` verbosity in webhook handler
`src/app/api/webhooks/stripe/route.ts` logs full Supabase error objects which may reveal DB schema details. Ensure Vercel log access is restricted to team members and is not publicly accessible via any dashboard integration.
