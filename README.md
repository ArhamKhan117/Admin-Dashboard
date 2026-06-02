# AdminDash

> Production-grade admin dashboard for managing organizations and members — built with React 18, TypeScript, Supabase, and deployed to Vercel.

![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat)

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

---

## Features

- **Authentication** — Sign up / sign in with Supabase Auth. Protected routes redirect unauthenticated users to sign-in. Signed-in email shown in sidebar and header.
- **Organization Management** — Create organizations of type School, Nonprofit, or Business. School type reveals a conditional "School District" field. Delete organizations with confirmation.
- **Member Invitations** — Invite members by email via a Supabase Edge Function that validates input, verifies org ownership, and prevents duplicate invitations. Invited members appear with status badges.
- **Member Activation** — Manually activate invited members from the organization detail page.
- **Organization Directory** — Lists all organizations with name, type badge, member count, and creation date. Includes live search/filter by name or type.
- **Dark Mode** — System-aware dark/light mode toggle via `next-themes`, available on all pages.
- **Loading / Empty / Error States** — Skeleton loaders, empty state illustrations, and inline error messages throughout.

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
| Backend | Supabase — Postgres, Auth, Edge Functions (Deno) |
| Deployment | Vercel (production + preview environments) |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for deploying the Edge Function)

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
# Go to Supabase Dashboard → SQL Editor
# Paste the contents of supabase/migrations/20240101000000_initial_schema.sql and run it

# 5. Deploy the Edge Function
supabase functions deploy invite-member --project-ref <your-project-ref>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> --project-ref <your-project-ref>

# 6. Start the dev server
npm run dev
```

App runs at `http://localhost:5173`.

### Environment Variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |

> The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` as a Supabase secret — it is never exposed to the browser or committed to the repo.

---

## Database Schema

Two tables, both with Row Level Security enabled.

### `organizations`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `name` | TEXT NOT NULL | max 100 chars |
| `type` | TEXT NOT NULL | `School`, `Nonprofit`, or `Business` |
| `school_district` | TEXT | nullable — only for School type |
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
| `joined_at` | TIMESTAMPTZ nullable | set when activated |

**RLS policies** ensure admins can only read/write their own organizations and the members within them. The `organization_members` INSERT is handled exclusively by the Edge Function using the service role key — the anon key never has INSERT access to this table.

Full migration SQL: `supabase/migrations/20240101000000_initial_schema.sql`

---

## Branching Strategy

```
main           ← production → Vercel Production URL
  └── development  ← working branch → Vercel Preview URL
        └── feature/*  ← short-lived feature branches
```

- All feature work branches off `development`
- PRs merge into `development` (triggers Vercel preview deployment)
- `development` → `main` merges trigger production deployment
- At least 2 merged PRs are in the history — see the [Pull Requests](../../pulls) tab

---

## Architecture Decisions

**Why an Edge Function for invitations?**
Inviting a member requires verifying org ownership and inserting with the service role key to bypass RLS. Both operations need server-side authority. Doing this client-side would mean exposing the service role key to the browser — a critical security issue. The Edge Function keeps it server-side only.

**Why React Query for all server state?**
Automatic cache invalidation means when an org is created or a member invited, the UI updates instantly without a page reload. It also eliminates boilerplate `useEffect` + `useState` data fetching patterns and handles loading/error states cleanly.

**Why Supabase RLS instead of app-level auth checks?**
RLS is defense-in-depth. Even if there's a bug in the application layer, the database enforces the policy — admins can only access rows where `created_by = auth.uid()`. Application-level checks alone can be bypassed; database-level policies cannot.

**Why a nullable `school_district` column instead of a separate table?**
The requirement is one conditional field for one type. A separate table would be over-engineering for this scope. If more type-specific fields were added, a JSONB column or type-specific tables would be the right next step.

---

## What I'd Do With Another Day

1. **Email delivery** — Integrate [Resend](https://resend.com) at the `// TODO` placeholder in the Edge Function. The hook is already there — it's one API call away.
2. **Invitation acceptance flow** — Generate a signed magic link on invite; when clicked, the user signs up and their `organization_members.user_id` gets linked automatically, setting status to `active`.
3. **Role management UI** — Promote/demote members between `admin` and `member` from the detail page.
4. **Pagination** — Cursor-based pagination via React Query's `useInfiniteQuery` for large org/member lists.
5. **E2E tests** — A Playwright test covering sign-in → create org → invite member → verify member appears.

**Stretch goals already implemented:** dark mode (next-themes), search/filter on the org directory, delete organization with confirmation, member activation.

---

## Shortcuts & Tradeoffs

- **No email confirmation on sign-up** — Disabled so test credentials work immediately. In production this would be enabled.
- **No rate limiting on the Edge Function** — A production system would add rate limiting to prevent invite spam. Supabase Auth handles sign-in rate limiting natively.
- **Client-side search/filter** — Filtering happens in-memory on the fetched list. For datasets with thousands of orgs, this would move server-side using Supabase's `ilike` operator.
