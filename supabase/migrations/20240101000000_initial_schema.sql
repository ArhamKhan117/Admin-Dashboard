-- supabase/migrations/20240101000000_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- organizations
-- ============================================================
CREATE TABLE public.organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL CHECK (char_length(name) <= 100),
  type          TEXT NOT NULL CHECK (type IN ('School', 'Nonprofit', 'Business')),
  school_district TEXT,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX idx_organizations_created_at ON public.organizations(created_at DESC);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: admins can only see their own organizations
CREATE POLICY "organizations_select_own"
  ON public.organizations FOR SELECT
  USING (auth.uid() = created_by);

-- INSERT: admins can only insert rows they own
CREATE POLICY "organizations_insert_own"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: admins can only update their own organizations
CREATE POLICY "organizations_update_own"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: admins can only delete their own organizations
CREATE POLICY "organizations_delete_own"
  ON public.organizations FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================
-- organization_members
-- ============================================================
CREATE TABLE public.organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_at      TIMESTAMPTZ DEFAULT NOW(),
  joined_at       TIMESTAMPTZ,
  CONSTRAINT uq_org_member_email UNIQUE (organization_id, email)
);

-- Indexes
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_email ON public.organization_members(email);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: admins can see members of organizations they own
CREATE POLICY "org_members_select_own_orgs"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );

-- UPDATE: admins can update members of organizations they own (e.g. activate status)
CREATE POLICY "org_members_update_own_orgs"
  ON public.organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );

-- INSERT: only via Edge Function (service role key bypasses RLS)
-- No direct INSERT policy for anon/authenticated role on this table.
-- The invite-member Edge Function uses the service role key.
