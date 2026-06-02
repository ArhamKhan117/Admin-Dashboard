# Admin Dashboard

A production-minded admin dashboard that lets authenticated admins create organizations, invite members, and manage an organization directory.

**Live URLs**
- Production: https://admin-dashboard-wun4.vercel.app
- Preview (development branch): https://admin-dashboard-wun4-git-development-arhamkhan117s-projects.vercel.app

**Test credentials**
- Email: `admin@test.com`
- Password: `Admin1234!`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (strict), Vite (SWC) |
| Routing | React Router v6 |
| Styling | Tailwind CSS + shadcn/ui (Radix-based) |
| Server state | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Deployment | Vercel (production + preview) |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/admin-dashboard.git
cd admin-dashboard

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and fill in your Supabase URL and anon key

# 4. Run the database migration
# Go to Supabase Dashboard → SQL Editor, paste the contents of:
# supabase/migrations/20240101000000_initial_schema.sql
# and run it.

# 5. Deploy the Edge Function
supabase functions deploy invite-member --project-ref <your-project-ref>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> --project-ref <your-project-ref>

# 6. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon / public key |

The Edge Function also requires `SUPABASE_SERVICE_ROLE_KEY` — set it as a Supabase secret (never in `.env.local`, never in the browser bundle):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> --project-ref <your-project-ref>
```

---

## Branching Strategy

```
main          ← production (deployed to Vercel Production URL)
  └── development  ← default working branch (deployed to Vercel Preview URL)
        └── feature/xyz  ← short-lived feature branches
```

- Feature work happens on branches cut from `development`.
- PRs merge into `development` (triggers a Vercel preview deployment).
- When a milestone is stable, `development` is merged into `main` via PR (triggers production deployment).
- At least 2 PRs are required in the history — see the PR list on GitHub.

---

## Database Schema

Two tables, both with RLS enabled:

**`organizations`**
- `id` UUID PK
- `name` TEXT NOT NULL (max 100 chars)
- `type` TEXT NOT NULL — one of `School`, `Nonprofit`, `Business`
- `school_district` TEXT nullable — only relevant for `School` type
- `created_by` UUID FK → `auth.users.id`
- `created_at` TIMESTAMPTZ

**`organization_members`**
- `id` UUID PK
- `organization_id` UUID FK → `organizations.id` ON DELETE CASCADE
- `user_id` UUID nullable FK → `auth.users.id` (null until invitation accepted)
- `email` TEXT NOT NULL
- `status` TEXT — `invited` or `active`
- `role` TEXT — `admin` or `member`
- `invited_at` TIMESTAMPTZ
- `joined_at` TIMESTAMPTZ nullable
- UNIQUE constraint on `(organization_id, email)`

RLS policies ensure an admin can only see and modify their own organizations and the members within them. The `organization_members` INSERT goes through the `invite-member` Edge Function using the service role key — it never happens directly from the client.

The full migration SQL is at `supabase/migrations/20240101000000_initial_schema.sql`.

---

## Architecture Decisions

**Why an Edge Function for invitations?**
The invitation flow needs to verify that the caller owns the target organization and insert the member record with the service role key (bypassing RLS). Both of these require server-side authority. Doing this client-side would mean exposing the service role key to the browser, which is a security hole. The Edge Function keeps the service role key server-side only.

**Why React Query for all server state?**
It gives us automatic cache invalidation — when a new organization is created or a member is invited, the relevant query is invalidated and the UI updates without a full page reload. It also handles loading/error states cleanly without boilerplate `useEffect` + `useState` patterns.

**Why Supabase RLS instead of application-level auth checks?**
RLS is defense-in-depth. Even if a bug in the application layer accidentally fetches the wrong data, the database will filter it out. The policies are simple: admins can only see rows where `created_by = auth.uid()`.

**Why `school_district` as a nullable column instead of a separate table?**
The spec requires exactly one conditional field for one type. A separate table would be over-engineering for this scope. If more type-specific fields were added, a JSONB column or a proper type-specific table would be the right next step.

---

## What I'd Do With Another Day

1. **Email delivery** — Plug in [Resend](https://resend.com) or SendGrid in the `// TODO` comment inside the Edge Function. The architecture already has the right hook — it's just calling an API and templating the email.
2. **Invitation acceptance flow** — A magic link that lets an invited user sign up and have their `organization_members.user_id` linked to their new auth user automatically.
3. **Role management UI** — Promote/demote members between `admin` and `member` roles from the detail page.
4. **Pagination** — The org directory and members list currently load everything. For large datasets, cursor-based pagination via React Query's `useInfiniteQuery` would be the right approach.
5. **Search/filter** — A search input on the org directory, filtered client-side (or server-side via Supabase's `ilike` operator).
6. **E2E tests** — A Playwright test covering the full happy path: sign-in → create org → invite member → verify member appears in list.

## Shortcuts and Tradeoffs

- **No email confirmation** — Supabase's email confirmation is disabled in this setup so you can sign in immediately without checking email. In production, you'd enable it.
- **Bundle size warning** — The Vite build reports a chunk > 500 kB. This is mostly lucide-react icons. The fix is tree-shaking (already happening) and optionally code-splitting the icon library. It doesn't affect functionality.
- **No rate limiting on the Edge Function** — A production system would add rate limiting on the invite endpoint to prevent spam. Supabase's built-in rate limiting on Auth handles sign-in attempts.
