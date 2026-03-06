# Fictionry — CLAUDE.md

> This file is the authoritative context for Claude Code working on the Fictionry codebase.
> Owner: Ben Farrell (ben.m.farrell@gmail.com)
> Last updated: March 2026

---

## What Is This Project?

Fictionry is a web fiction platform for readers and writers — a "human-first" alternative to Royal Road and Wattpad. Tagline: *"The Modern Way to Read and Write Fiction."*

**Production URL:** https://www.fictionry.com
**Canonical URL is www** — always use `https://www.fictionry.com`. The app enforces www. Never hardcode non-www URLs.

### Key Differentiators
- Human-first discovery (rewards quality + engagement, not upload volume)
- Author-protective terms (authors own their work, full stop)
- Chapter upload throttle (prevents AI volume spam)
- Dual-role users (same person can be reader and writer)
- Gamification via XP + achievements

### Business Model
- **Reader Premium:** ~$4/month — ad-free + features
- **Author Direct Support:** Readers subscribe to specific authors (Patreon-style)
- **Platform fee:** On author subscriptions (percentage tracked in DB via `platform_config` table)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.2.21 (App Router), React 18, TypeScript, Tailwind CSS 3 |
| UI Primitives | Radix UI (raw — NO shadcn. Don't add shadcn.) |
| Icons | lucide-react |
| Theming | next-themes (dark/light mode) |
| Rich Text Editor | Tiptap (story chapter writing) |
| Charts | Recharts (author dashboard analytics) |
| Backend | Next.js API Routes (`/src/app/api/`) + Supabase PostgreSQL functions |
| Database | Supabase (PostgreSQL) — project ID `nxcxakqkddmbunmipsej` |
| Auth | Supabase Auth — email/password + Google OAuth |
| Storage | Supabase Storage (cover images, avatars) |
| Hosting | Vercel (auto-deploy from `main` branch) |
| Domain | fictionry.com (Porkbun DNS) |
| Payments | Stripe (subscriptions + Stripe Connect for author payouts) |
| Push Notifications | Web Push API via `web-push` package + Serwist (PWA) |
| Error Monitoring | Sentry (`@sentry/nextjs`) |
| Drag & Drop | @hello-pangea/dnd |
| DOCX Import | mammoth + jszip |

---

## Mandatory Workflow Rules

### NEVER push directly to `main`. EVER.
1. Create a feature branch (e.g., `feature/phase-11-emails`)
2. Build + commit to that branch
3. Push → Vercel auto-creates preview URL
4. Create a PR and share it with Ben
5. Ben tests on the Vercel preview URL
6. **Ben merges the PR** — the agent never merges

### Before Coding Any Feature
Provide a plan first:
- Objective
- Dependencies
- Schema Changes (if any)
- Files to be created/modified
- Downstream Impact
- Step-by-step implementation plan
- Acceptance Criteria

Before coding: raise concerns if the approach has problems or there's a better way. **"Future-proof decisions always"** — Ben explicitly does not want legacy decisions made in week 2 that cause problems in year 2.

### After Every Feature Ships
Update `uat-test-scripts.md` with test steps for the new feature.

---

## Naming Conventions

- **Files/folders:** kebab-case (`story-card.tsx`, `reading-progress.ts`)
- **Components:** PascalCase exports (`StoryCard`, `ReadingProgress`)
- **Database tables/columns:** snake_case
- **API routes:** kebab-case paths (`/api/chapters/publish`)

---

## Component Patterns

- **Server Components by default** — use `'use client'` only when needed (interactivity, hooks, browser APIs)
- **No global state management library** — React state + Supabase realtime where needed
- **Radix UI** for accessible primitives; styled with Tailwind classes. NO shadcn — raw primitives only. Follow existing patterns.
- **lucide-react** for all icons
- **next-themes** for dark/light mode
- No design system doc — look at existing components for patterns

---

## Supabase Client Patterns — USE THE RIGHT ONE

### 1. Browser Client (`src/lib/supabase/client.ts`)
```typescript
'use client'
import { createBrowserClient } from '@supabase/ssr'
```
**Use in:** Client components (`'use client'`), event handlers, `useEffect`. Respects RLS via browser cookies.

### 2. Server Client (`src/lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
```
**Use in:** Server Components, Route Handlers, Server Actions. Respects RLS via server-side cookies.

### 3. Admin Client (`src/lib/supabase-admin.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
```
**Use in:** API routes that need to bypass RLS (webhooks, admin operations). **NEVER expose on client side.**

**⚠️ COMMON MISTAKE:** Don't use the browser client in Server Components or vice versa. The `cookies()` import from `next/headers` only works server-side. If you see "cookies is not a function," you're using the wrong client.

**⚠️ MIDDLEWARE GOTCHA:** The middleware (`src/middleware.ts`) creates its own Supabase client — not imported from `lib/supabase/server.ts` — because it needs special cookie handling for `NextRequest`/`NextResponse`. Do not refactor to share the server client.

---

## Critical Gotchas

1. **`onboarding_completed` flag is critical** — controls whether new users get redirected to genre picker. Never set this to true prematurely.

2. **All user data cascades on `auth.users` DELETE** — `profiles` has `ON DELETE CASCADE` from `auth.users`, and all other user tables cascade from `profiles`. Single delete from `auth.users` cleans everything.

3. **`user_experience` and `user_peer_reputation` rows are created by `handle_new_user()` trigger** — created automatically on signup. Don't INSERT them manually.

4. **The old `GenreOnboardingWrapper` component exists at `src/components/onboarding/genre-onboarding-wrapper.tsx`** — removed from `layout.tsx` (PR #17). Don't re-add it. Superseded by `/onboarding/genres` page flow.

5. **RLS policies use `auth.uid()` extensively** — when testing with service role key (bypass RLS), results differ from end-user experience.

6. **`is_hidden` pattern** — stories, chapters, comments, ratings all have `is_hidden`, `hidden_reason`, `hidden_at`, `hidden_by` columns. Hidden content is invisible to regular users but visible to admins/moderators and content owner.

7. **Discovery functions are PostgreSQL functions, not API routes** — `get_rising_stars()`, `get_trending_stories()`, etc. are called directly from server components via Supabase RPC.

8. **`story.short_id` ≠ `story.slug`** — slug is human-readable URL path, short_id is short alphanumeric for short URLs. Both auto-generated by separate DB triggers. Same for chapters.

9. **The `follows` table IS the reader's library** — following a story = adding it to library. The `status` field (reading/want_to_read/etc.) is the shelf system.

10. **Chapter content: dual storage** — Tiptap JSON in `content` (jsonb) is source of truth for the editor. HTML in `content_html` (text) is for reading display. **Both must be kept in sync on save.**

11. **Stripe: all monetary amounts stored in cents** (not dollars) throughout the codebase.

12. **DUPLICATE TRIGGERS exist** — e.g., `follows` has both `on_follow_insert` AND `on_follow_change` ON INSERT. This is legacy. If adding new triggers, check for existing ones on the same table/event to avoid double-counting.

13. **If adding a new image host** (e.g., Google avatars), add it to `images.remotePatterns` in `next.config.js` or use `unoptimized={true}`.

14. **Types in `src/types/database.ts` are manually defined** — they don't cover all tables. Many tables use inline types or `any`. Extend this file or run `supabase gen types typescript` if you need type safety for uncovered tables.

15. **Two genre sets exist** — 17 genres for story tagging (in `GENRES` const) are NOT the same as the 13 reader-preference genres used in onboarding.

---

## Environments

| Environment | URL | Database |
|------------|-----|----------|
| Production | https://www.fictionry.com | Fictionry (`nxcxakqkddmbunmipsej`) |
| Preview | Vercel preview URL per PR | Production DB (⚠️ same DB — be careful) |
| Local dev | localhost:3000 | Currently uses production DB (dev DB migration pending) |

> ⚠️ Dev DB (`Fictionry_DEV` / `oeuqqbqvgsjgigpvhgrv`) exists but has NOT had data migrated. Until migrated, all dev work runs against production DB. Be careful.

---

## Environment Variables (names only)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PREMIUM_MONTHLY_PRICE_ID
STRIPE_PREMIUM_YEARLY_PRICE_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
SENTRY_AUTH_TOKEN
NEXT_PUBLIC_SENTRY_DSN
```

---

## GitHub

- **Repo:** `onedollarbanana/fictionry`
- **Default branch:** `main` (auto-deploys to Vercel production)
- **No GitHub Actions / CI** — no automated tests
- **No branch protection rules** — workflow enforced by convention (agent pushes feature branches, Ben reviews + merges)

---

## Error Handling
- Sentry for runtime error monitoring (`@sentry/nextjs`)
- `src/app/error.tsx` and `global-error.tsx` for Next.js error boundaries
- API routes return typed error responses
- No custom logging library — console + Sentry

---

## Testing
- **No automated test suite** — no Jest, no Playwright
- **Manual UAT** via test scripts at `/agent/home/fictionforge/uat-test-scripts.md`
- Testing workflow: push to feature branch → Vercel preview URL → manual testing → merge

---

## Local Dev Commands
```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
```

---

## Current State (as of March 2026)

### Shipped
- Full database schema with all tables, enums, RLS, functions
- XP trigger system with daily caps
- Achievement engine (50 achievements, 5 tracks)
- Achievement UI
- Scheduled jobs (auto-publish, streaks, rankings, account age)
- Performance optimisation (caching, query optimisation)
- SEO & growth (sitemap, robots, OG images, meta, structured data)
- Mobile responsiveness
- Onboarding flow (genre picker, empty-state library, signup CTAs)
- Google OAuth (PR #16 — needs Google Cloud Console setup for production)
- Genre preferences in settings (PR #17)

### In Progress
- Google OAuth production setup (Google Cloud Console + Supabase provider config)
- Dev environment migration (BLOCKED — needs `supabase db dump` from production)

### Backlog (prioritised)
1. Branded transactional emails (Phase 11)
2. Author Rights / Terms page (plain-English ownership statement)
3. Landing page "human-first" messaging update
4. Chapter upload throttle (1/day after initial batch)
5. Rating system design decision
6. Discovery algorithm improvements
7. Vercel Image Optimization fix (hitting Hobby limit)
8. PWA icons/favicon (awaiting assets)
9. Supabase custom domain (requires Pro plan)
10. New book notifications for followers
11. Reader reading stats dashboard
12. Story import from other platforms
13. Writing contests
14. Author promotion marketplace

### Known Bugs / Tech Debt
- Vercel Image Optimization hitting monthly limit (deferred)
- OAuth consent screen shows Supabase URL in redirect (cosmetic — proper fix needs Supabase Pro)

---

## Key Architecture Decisions (and WHY)

**Supabase for everything:** Simplicity. Auth, DB, storage, realtime in one place. Avoids vendor sprawl for a solo project.

**DB functions/triggers for XP and achievements:** Business logic close to data = no race conditions, no double-counting.

**Denormalised counters:** `stories.follower_count`, `stories.total_views`, `chapters.likes` etc. are maintained by DB triggers. This prevents expensive COUNT queries. The `reconcile_story_counters()` function exists to repair drift.

**No shadcn:** Raw Radix UI + Tailwind. Decided early. Don't retrofit shadcn.

**`short_id` on stories and chapters:** Both have a `short_id` for short URLs, auto-generated by DB trigger. Don't remove or bypass.

**Stripe architecture:** Platform subscriptions → `subscriptions` table. Author direct support → `author_tiers` + `author_subscriptions`. Stripe Connect for author payouts. Platform fee in `transactions.platform_fee_cents`. Revenue split tracked in `author_revenue`.
