# Contributing to AdminDash

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in Supabase credentials
4. Run the database migration in Supabase SQL Editor
5. Start dev server: `npm run dev`

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── auth/       # Sign-in, sign-up forms
│   ├── layout/     # AuthLayout, DashboardLayout
│   ├── members/    # MemberRow, MemberList, InviteMemberForm
│   └── organizations/ # OrganizationCard, OrganizationDetail, etc.
├── contexts/       # AuthContext
├── hooks/          # React Query data hooks
├── pages/          # Page-level components
├── router/         # ProtectedRoute, PublicRoute
├── types/          # TypeScript type definitions
└── lib/            # Supabase client, utilities
```

## Code Style

- TypeScript strict mode — type all props and API responses
- Use React Query for all server state — no raw `useEffect` + `fetch`
- Validate all forms with Zod schemas
- Use shadcn/ui components — avoid adding new component libraries
- Follow existing naming conventions

## Commit Messages

Use Conventional Commits style:

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: code refactoring
chore: maintenance tasks
```

## Pull Request Process

1. Branch off `development` (not `main`)
2. Make your changes
3. Test locally with `npm run dev`
4. Run `npm run build` to catch TypeScript errors
5. Submit PR targeting `development`
6. `development` → `main` merges happen when a milestone is stable

## Environment Variables

Never commit `.env.local`. The service role key must only live in Supabase Edge Function secrets — never in the browser bundle or `.env.local`.
