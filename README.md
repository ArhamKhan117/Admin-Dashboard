# AdminDash

> A production-grade admin dashboard for managing organizations and members — built with React 18, TypeScript, Supabase, and deployed to Vercel.

![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen?style=flat)

---

## Live URLs

| Environment | URL |
|---|---|
| **Production** | https://admin-dashboard-wun4.vercel.app |
| **Preview** (development branch) | https://admin-dashboard-wun4-git-development-arhamkhan117s-projects.vercel.app |

## Test Credentials

| Field | Value |
|---|---|
| Email | `admin@test.com` |
| Password | `Admin1234` |

> Sign in immediately — email confirmation is disabled for testing purposes.

---

## Features

### Core Requirements
- **Authentication** — Sign up / sign in with Supabase Auth (email + password). Protected routes redirect unauthenticated users. Email shown in sidebar and header.
- **Organization Creation** — Create organizations of type School, Nonprofit, or Business. Selecting School reveals a conditional "School District" field. Validated client-side (Zod) and server-side (DB constraints).
- **Member Invitations** — Invite by email via a Supabase Edge Function. The function validates input, verifies caller owns the org, prevents duplicates, and sends a real invitation email via Resend.
- **Invitation Acceptance Flow** — Invited users click the email link → sign up or sign in → automatically marked as `active`. Token-based with 7-day expiry.
- **Organization Directory** — Lists all organizations with name, type badge, member count, and creation date. Click any row to navigate to the org detail page.

### Stretch Goals Implemented
- **Dark mode** — System-aware toggle via `next-themes`, available on every page including auth pages
- **Search + filter + sort** — Live debounced search, type filter (School/Nonprofit/Business), and sort by name/date/members
- **Org stats dashboard** — Total orgs, total members, and avg members shown at the top of the directory
- **Export CSV** — One-click download of org list
- **Delete organization** — With confirmation dialog
- **Remove member** — Trash icon on each member row
- **Breadcrumb navigation** — Shows org name on detail pages
- **Copy org ID** — Hover an org card to reveal a copy button
- **Password strength indicator** — 5-level strength bar on sign-up
- **Error boundary** — Catches crashes and shows a friendly recovery screen
- **Unit tests** — Schema validation tests with Vitest
- **E2E tests** — Playwright test covering sign-in → create org → invite member
- **SEO meta tags** — Open Graph and Twitter Card in `index.html`
- **Tooltips** — On all icon buttons (delete, copy, sign out)
- **Animated toast progress bar** — Visual countdown on notifications

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (strict mode) |
| Build tool | Vite with SWC |
| Routing | React Router v6 |
| Styling | Tailwind CSS + shadcn/ui (Radix-based) |
| Server state | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Theme | next-themes |
| Email | Resend |
| Backend | Supabase — Postgres, Auth, Edge Functions (Deno) |
| Deployment | Vercel (production + preview environments) |
| Testing | Vitest + Playwright |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for Edge Function deployment)
- A free [Resend](https://resend.com) account (for invitation emails)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/ArhamKhan117/Admin-Dashboard.git
cd Admin-Dashboard

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Run the database migration
# Supabase Dashboard → SQL Editor → paste and run:
# supabase/migrations/20240101000000_initial_schema.sql

# 5. Run additional RLS policies (required for delete/update)
# Supabase Dashboard → SQL Editor → run each:
#
# CREATE POLICY "organizations_delete_own"
#   ON public.organizations FOR DELETE
#   USING (auth.uid() = created_by);
#
# CREATE POLICY "org_members_update_own_orgs"
#   ON public.organization_members FOR UPDATE
#   USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()))
#   WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()));
#
# CREATE POLICY "org_members_delete_own_orgs"
#   ON public.organization_members FOR DELETE
#   USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid()));

# 6. Deploy Edge Functions
supabase functions deploy Invite-Member --project-ref <your-project-ref>
supabase functions deploy accept-invite --project-ref <your-project-ref>

# 7. Set Edge Function secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key> --project-ref <your-project-ref>
supabase secrets set RESEND_API_KEY=<key> --project-ref <your-project-ref>
supabase secrets set APP_URL=https://your-vercel-url.vercel.app --project-ref <your-project-ref>

# 8. Start the dev server
npm run dev
```

App runs at `http://localhost:5173`.

### Environment Variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |

> `SUPABASE_SERVICE_ROLE_KEY` is set as a Supabase Edge Function secret only — never committed or exposed to the browser.

### Known Limitation — Resend Free Tier

Resend's free tier only delivers emails to the account's verified email address. The invitation architecture, token generation, accept-invite Edge Function, and accept page are all fully implemented. To test the end-to-end flow, invite the email you used to register with Resend. For production use, verify a custom domain in Resend to send to any address.

---

## Database Schema

Both tables have Row Level Security enabled.

### `organizations`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `name` | TEXT NOT NULL | max 100 chars |
| `type` | TEXT NOT NULL | `School`, `Nonprofit`, or `Business` |
| `school_district` | TEXT nullable | only for School type |
| `created_by` | UUID FK | → `auth.users.id` |
| `created_at` | TIMESTAMPTZ | default `now()` |

### `organization_members`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `organization_id` | UUID FK | → `organizations.id` ON DELETE CASCADE |
| `user_id` | UUID FK nullable | → `auth.users.id` (null until accepted) |
| `email` | TEXT NOT NULL | unique per org |
| `status` | TEXT | `invited` or `active` |
| `role` | TEXT | `admin` or `member` |
| `invited_at` | TIMESTAMPTZ | |
| `joined_at` | TIMESTAMPTZ nullable | set on acceptance |
| `invite_token` | TEXT nullable | cleared after use |
| `token_expires_at` | TIMESTAMPTZ nullable | 7-day expiry |

**RLS** ensures admins can only access rows they own. `organization_members` INSERT is handled exclusively by the Edge Function using the service role key — the anon key has no INSERT access.

Full migration: `supabase/migrations/20240101000000_initial_schema.sql`

---

## Testing

### Unit Tests
```bash
npm test               # Run all tests once
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

Covers `createOrgSchema` (name length, type enum, conditional school_district), `signInSchema`, and `signUpSchema` validation rules.

### E2E Tests (Playwright)
```bash
npm run test:e2e       # Run (requires dev server on port 5173)
npm run test:e2e:ui    # Playwright UI mode
```

Covers: sign-in → create org → invite member → duplicate prevention → type filter.

---

## Branching Strategy

```
main           ← production → Vercel Production URL
  └── development  ← default working branch → Vercel Preview URL
        └── feature/*  ← short-lived feature branches
```

- All work branches off `development`
- PRs target `development` (triggers preview deployment)
- `development` → `main` merges trigger production deployment
- See the [Pull Requests](../../pulls) tab for merged PR history

---

## Architecture Decisions

**Why an Edge Function for invitations?**
Inviting requires verifying org ownership server-side and inserting with the service role key (bypassing RLS). Exposing the service role key to the browser is a critical security hole. The Edge Function keeps all privileged operations server-side using two Supabase clients — one with the user's JWT for identity, one with the service role key for the DB write.

**Why React Query for all server state?**
Automatic cache invalidation means the UI updates instantly on any mutation without a full reload. It eliminates boilerplate `useEffect + useState` patterns and handles loading/error/stale states cleanly out of the box.

**Why Supabase RLS instead of only app-level auth checks?**
RLS is defense-in-depth. Even if there's a bug in the application layer, the database enforces access control. Admins can only read/write rows where `created_by = auth.uid()` — this cannot be bypassed by a client-side bug.

**Why a nullable `school_district` column instead of a separate table?**
The spec requires one conditional field for one org type. A separate table is over-engineering at this scope. If more type-specific fields were added, a JSONB column or type-specific tables would be the right next step.

**Why Resend for email delivery?**
Resend provides a clean REST API callable from Deno Edge Functions without any Node.js SDK dependency. The free tier is sufficient for demonstration purposes. The `RESEND_API_KEY` lives only in Supabase Edge Function secrets — it never touches the client bundle.

---

## What I'd Do With Another Day

1. **Role management UI** — Promote/demote members between `admin` and `member` from the detail page
2. **Pagination** — Cursor-based pagination via `useInfiniteQuery` for large datasets
3. **Activity audit log** — Track invitation, removal, and role changes in a new `activity_log` table
4. **Rate limiting** — Use Upstash Redis to rate-limit the invite Edge Function per user/minute
5. **Custom email domain** — Verify a domain on Resend to send from a branded address instead of `onboarding@resend.dev`
6. **Member view of joined orgs** — Currently the directory only shows orgs the admin created; members who accepted invitations should also see those orgs

---

## Shortcuts & Tradeoffs

- **Email confirmation disabled** — Supabase email confirmation is off so test credentials work immediately. In production this would be enabled.
- **Resend free tier restriction** — Invitation emails only deliver to the Resend account's verified address without a custom domain. The full acceptance flow (token, page, Edge Function) is built — it's a provider configuration limitation, not an architectural one.
- **Client-side filtering** — Search, sort, and type filter run in-memory on the fetched list. For 100+ organizations, this would move server-side using Supabase's `ilike` and `order` operators.
- **Single Supabase project** — One project serves both production and preview environments. In a real setup, separate staging and production Supabase projects would be used.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, code style, and pull request process.

---

## License

MIT
