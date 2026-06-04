# 🚀 Admin Dashboard Enhancement Guide

## Table of Contents
1. [Critical Fixes](#critical-fixes)
2. [Stretch Goals Implementation](#stretch-goals-implementation)
3. [Additional Enhancements](#additional-enhancements)
4. [Testing Implementation](#testing-implementation)
5. [Production Readiness](#production-readiness)

---

## 1. Critical Fixes

### 1.1 Fix Edge Function Name Inconsistency

**Issue:** Code calls `"Invite-Member"` but folder is `invite-member`

**Fix in `src/hooks/useInviteMember.ts`:**
```typescript
// Change line 13 from:
const { data, error } = await supabase.functions.invoke("Invite-Member", {

// To:
const { data, error } = await supabase.functions.invoke("invite-member", {
```

**Why:** Supabase Edge Functions are case-sensitive. The function name must match the folder name.

---

## 2. Stretch Goals Implementation

### 2.1 Invitation Acceptance Flow

**Goal:** Allow invited users to click a link, sign up, and auto-link their account.

#### Step 1: Add Magic Link Generation to Edge Function

**File: `supabase/functions/invite-member/index.ts`**

Add after line 130 (after successful insert):

```typescript
// Generate a secure invitation token
const invitationToken = crypto.randomUUID();
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

// Update the member record with the token
const { error: updateError } = await serviceClient
  .from("organization_members")
  .update({
    invitation_token: invitationToken,
    invitation_expires_at: expiresAt.toISOString(),
  })
  .eq("id", member.id);

if (updateError) {
  console.error("Failed to set invitation token:", updateError);
}

// Generate invitation URL
const inviteUrl = `${Deno.env.get("APP_URL")}/accept-invite/${invitationToken}`;

// TODO: Send email with inviteUrl
// await sendInvitationEmail({ to: email, orgName: org.name, inviteUrl });

return new Response(
  JSON.stringify({ success: true, member, inviteUrl }),
  {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  }
);
```

#### Step 2: Add Migration for Invitation Tokens

**File: `supabase/migrations/20240102000000_add_invitation_tokens.sql`**

```sql
-- Add invitation token columns to organization_members
ALTER TABLE public.organization_members
ADD COLUMN invitation_token UUID UNIQUE,
ADD COLUMN invitation_expires_at TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX idx_org_members_invitation_token 
ON public.organization_members(invitation_token) 
WHERE invitation_token IS NOT NULL;
```


#### Step 3: Create Accept Invitation Page

**File: `src/pages/AcceptInvitePage.tsx`**

```typescript
import { useEffect, useState } from "react";
```typescript
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  const validateAndAcceptInvite = useCallback(async () => {
    try {
      // Check if user is signed in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to sign up with return URL
        navigate(`/sign-up?invite=${token}`);
        return;
      }

      // Verify token and accept invitation
      const { data: member, error: fetchError } = await supabase
        .from("organization_members")
        .select("*, organizations(name)")
        .eq("invitation_token", token)
        .single();

      if (fetchError || !member) {
        setStatus("error");
        setError("Invitation not found");
        return;
      }

      // Check expiration
      if (member.invitation_expires_at && new Date(member.invitation_expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      // Check if already accepted
      if (member.status === "active") {
        setStatus("error");
        setError("This invitation has already been accepted");
        return;
      }

      // Accept the invitation
      const { error: updateError } = await supabase
        .from("organization_members")
        .update({
          user_id: user.id,
          status: "active",
          joined_at: new Date().toISOString(),
          invitation_token: null, // Clear token after use
        })
        .eq("invitation_token", token);

      if (updateError) {
        setStatus("error");
        setError("Failed to accept invitation");
        return;
      }

      setOrgName(member.organizations?.name || "the organization");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError("Something went wrong");
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid invitation link");
      return;
    }

    validateAndAcceptInvite();
  }, [token, validateAndAcceptInvite]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Processing Invitation..."}
            {status === "success" && "Welcome!"}
            {status === "error" && "Invalid Invitation"}
            {status === "expired" && "Invitation Expired"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center text-muted-foreground">
                You've successfully joined <strong>{orgName}</strong>!
              </p>
              <Button onClick={() => navigate("/dashboard/organizations")}>
                Go to Dashboard
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-muted-foreground">{error}</p>
              <Button onClick={() => navigate("/sign-in")}>
                Sign In
              </Button>
            </>
          )}

          {status === "expired" && (
            <>
              <XCircle className="h-12 w-12 text-orange-500" />
              <p className="text-center text-muted-foreground">
                This invitation link has expired. Please contact the organization admin for a new invitation.
              </p>
              <Button onClick={() => navigate("/sign-in")}>
                Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```


#### Step 4: Update Sign Up Page to Handle Invitations

**File: `src/pages/SignUpPage.tsx`**

Add after imports:
```typescript
import { useSearchParams } from "react-router-dom";
```

Inside component, before return:
```typescript
const [searchParams] = useSearchParams();
const inviteToken = searchParams.get("invite");

// Pass inviteToken to SignUpForm as prop
```

**Update `src/components/auth/SignUpForm.tsx`:**
```typescript
// Add prop
interface SignUpFormProps {
  inviteToken?: string | null;
}

export function SignUpForm({ inviteToken }: SignUpFormProps) {
  // ... existing code
  
  const onSubmit = async (values: SignUpFormValues) => {
    // ... existing sign up logic
    
    // After successful sign up, redirect to accept invite if token exists
    if (inviteToken) {
      navigate(`/accept-invite/${inviteToken}`);
    } else {
      navigate("/dashboard/organizations");
    }
  };
}
```

#### Step 5: Add Route to App.tsx

```typescript
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";

// Add this route before the catch-all:
<Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
```

#### Step 6: Display Invitation Link in UI

**File: `src/components/members/MemberList.tsx`**

Add a "Copy Invite Link" button for invited members:

```typescript
import { Copy, CheckCircle } from "lucide-react";
import { useState } from "react";

// Inside member map:
{member.status === "invited" && member.invitation_token && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      const inviteUrl = `${window.location.origin}/accept-invite/${member.invitation_token}`;
      navigator.clipboard.writeText(inviteUrl);
      toast({ title: "Invitation link copied!" });
    }}
  >
    <Copy className="h-3 w-3 mr-1" />
    Copy Link
  </Button>
)}
```

---

### 2.2 Role-Based Permissions

**Goal:** Distinguish between admin and member roles with different permissions.


#### Step 1: Create Role Management Hook

**File: `src/hooks/useUpdateMemberRole.ts`**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface UpdateMemberRolePayload {
  memberId: string;
  organizationId: string;
  role: "admin" | "member";
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: UpdateMemberRolePayload) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["members", variables.organizationId] 
      });
    },
  });
}
```

#### Step 2: Add Role Dropdown to Member List

**File: `src/components/members/MemberList.tsx`**

Add imports:
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateMemberRole } from "@/hooks/useUpdateMemberRole";
```

Add in component:
```typescript
const updateRole = useUpdateMemberRole();

// In the member list item:
<Select
  value={member.role}
  onValueChange={(role: "admin" | "member") => {
    updateRole.mutate({
      memberId: member.id,
      organizationId,
      role,
    });
  }}
  disabled={member.status !== "active"}
>
  <SelectTrigger className="w-24">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="admin">Admin</SelectItem>
    <SelectItem value="member">Member</SelectItem>
  </SelectContent>
</Select>
```

#### Step 3: Update RLS Policies for Role-Based Access

**File: `supabase/migrations/20240103000000_role_based_permissions.sql`**

```sql
-- Performance optimization: Add indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_role 
ON public.organization_members(user_id, organization_id, role, status) 
WHERE role = 'admin' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_organizations_created_by 
ON public.organizations(created_by);

-- Allow org admins (created_by) and member admins to view members
DROP POLICY IF EXISTS "org_members_select_own_orgs" ON public.organization_members;

CREATE POLICY "org_members_select_own_orgs"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
    OR
    -- Members with admin role can also view
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_members.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

-- Only org creator and member admins can update/delete
DROP POLICY IF EXISTS "org_members_update_own_orgs" ON public.organization_members;

CREATE POLICY "org_members_update_own_orgs"
  ON public.organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_members.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );
```

#### Step 4: Show Role Badge in UI

**File: `src/components/members/MemberList.tsx`**

```typescript
<Badge variant={member.role === "admin" ? "default" : "secondary"}>
  {member.role}
</Badge>
```

---

### 2.3 End-to-End Testing with Playwright

#### Step 1: Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

#### Step 2: Configure Playwright

**File: `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```


#### Step 3: Create E2E Test

**File: `e2e/org-flow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Organization Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/sign-in');
  });

  test('complete flow: sign in → create org → invite member', async ({ page }) => {
    // Step 1: Sign In
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Admin1234');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard\/organizations/);
    await expect(page.locator('h1')).toContainText('Organizations');

    // Step 2: Create Organization
    await page.click('text=New Organization');
    await page.fill('input[name="name"]', 'Test School');
    await page.click('button[role="combobox"]'); // Open select
    await page.click('text=School');
    await page.fill('input[name="school_district"]', 'Test District');
    await page.click('button:has-text("Create Organization")');
    
    // Wait for success toast
    await expect(page.locator('text=Organization created')).toBeVisible();
    
    // Verify org appears in list
    await expect(page.locator('text=Test School')).toBeVisible();

    // Step 3: Navigate to org detail
    await page.click('text=Test School');
    await expect(page).toHaveURL(/\/dashboard\/organizations\/.+/);

    // Step 4: Invite Member
    await page.fill('input[type="email"]', 'member@test.com');
    await page.click('button:has-text("Send Invitation")');
    
    // Wait for success
    await expect(page.locator('text=Invitation sent')).toBeVisible();
    
    // Verify member appears in list
    await expect(page.locator('text=member@test.com')).toBeVisible();
    await expect(page.locator('text=invited')).toBeVisible();
  });

  test('should prevent duplicate invitations', async ({ page }) => {
    // Sign in
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Admin1234');
    await page.click('button[type="submit"]');
    
    // Navigate to first org
    await page.click('[data-testid="org-card"]').first();
    
    // Try to invite same email twice
    await page.fill('input[type="email"]', 'duplicate@test.com');
    await page.click('button:has-text("Send Invitation")');
    await expect(page.locator('text=Invitation sent')).toBeVisible();
    
    await page.fill('input[type="email"]', 'duplicate@test.com');
    await page.click('button:has-text("Send Invitation")');
    
    // Should show error
    await expect(page.locator('text=already been invited')).toBeVisible();
  });

  test('should filter organizations by search', async ({ page }) => {
    // Sign in
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Admin1234');
    await page.click('button[type="submit"]');
    
    // Wait for orgs to load
    await page.waitForSelector('h1:has-text("Organizations")');
    
    // Search
    await page.fill('input[placeholder*="Search"]', 'School');
    
    // Verify filtering
    await expect(page.locator('text=School')).toBeVisible();
  });
});
```

#### Step 4: Add Test Script to package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 3. Additional Enhancements

### 3.1 Add Unit Tests with Vitest

#### Create Hook Tests

**File: `src/hooks/__tests__/useOrganizations.test.ts`**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrganizations } from '../useOrganizations';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useOrganizations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch organizations successfully', async () => {
    const mockData = [
      {
        id: '1',
        name: 'Test Org',
        type: 'School',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        organization_members: [{ count: 3 }],
      },
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useOrganizations(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Test Org');
  });
});
```


#### Create Component Tests

**File: `src/components/organizations/__tests__/CreateOrganizationForm.test.tsx`**

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateOrganizationForm } from '../CreateOrganizationForm';
import { AuthProvider } from '@/contexts/AuthContext';

const mockUser = {
  id: 'user-123',
  email: 'test@test.com',
};

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      session: { user: mockUser },
      loading: false,
      signOut: vi.fn(),
    }),
  };
});

describe('CreateOrganizationForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  it('should render form fields', () => {
    render(<CreateOrganizationForm />, { wrapper });
    
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });

  it('should show school district field when School is selected', async () => {
    const user = userEvent.setup();
    render(<CreateOrganizationForm />, { wrapper });
    
    // School district should not be visible initially
    expect(screen.queryByLabelText(/school district/i)).not.toBeInTheDocument();
    
    // Select School type
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('School'));
    
    // School district should now be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/school district/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<CreateOrganizationForm />, { wrapper });
    
    // Submit without filling
    await user.click(screen.getByRole('button', { name: /create organization/i }));
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });
});
```

#### Add Validation Tests

**File: `src/components/organizations/__tests__/createOrgSchema.test.ts`**

```typescript
import { createOrgSchema } from '../CreateOrganizationForm';
import { OrganizationType } from '@/types/database';

describe('createOrgSchema', () => {
  it('should validate valid school organization', () => {
    const result = createOrgSchema.safeParse({
      name: 'Test School',
      type: OrganizationType.School,
      school_district: 'Test District',
    });
    
    expect(result.success).toBe(true);
  });

  it('should require school district for School type', () => {
    const result = createOrgSchema.safeParse({
      name: 'Test School',
      type: OrganizationType.School,
      school_district: '',
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('School District is required');
    }
  });

  it('should not require school district for other types', () => {
    const result = createOrgSchema.safeParse({
      name: 'Test Business',
      type: OrganizationType.Business,
    });
    
    expect(result.success).toBe(true);
  });

  it('should reject names over 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = createOrgSchema.safeParse({
      name: longName,
      type: OrganizationType.Business,
    });
    
    expect(result.success).toBe(false);
  });
});
```

---

### 3.2 Pagination for Large Lists

**File: `src/hooks/useOrganizations.ts`**

Replace with infinite query:

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization } from "@/types/database";
import { OrganizationType } from "@/types/database";

const PAGE_SIZE = 10;

export function useOrganizations() {
  return useInfiniteQuery({
    queryKey: ["organizations"],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("organizations")
        .select("*, organization_members(count)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        organizations: (data ?? []).map((org) => {
          const members = org.organization_members as { count: number }[] | null;
          return {
            ...org,
            type: org.type as OrganizationType,
            member_count: members?.[0]?.count ?? 0,
            organization_members: undefined,
          } as Organization;
        }),
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}
```

**Update `src/pages/OrganizationsPage.tsx`:**

```typescript
const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrganizations();

const organizations = data?.pages.flatMap(page => page.organizations) ?? [];

// Add "Load More" button before closing tag:
{hasNextPage && (
  <div className="flex justify-center mt-6">
    <Button
      onClick={() => fetchNextPage()}
      disabled={isFetchingNextPage}
      variant="outline"
    >
      {isFetchingNextPage ? "Loading..." : "Load More"}
    </Button>
  </div>
)}
```


---

### 3.3 Email Delivery Integration (Resend)

#### Step 1: Install Resend

```bash
npm install resend
```

#### Step 2: Update Edge Function

**File: `supabase/functions/invite-member/index.ts`**

Add at top:
```typescript
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
```

Replace the TODO section (around line 135):
```typescript
// Send invitation email
const inviteUrl = `${Deno.env.get("APP_URL")}/accept-invite/${invitationToken}`;

try {
  await resend.emails.send({
    from: "Admin Dashboard <noreply@yourdomain.com>",
    to: email,
    subject: `You've been invited to join ${org.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited!</h2>
        <p>You've been invited to join <strong>${org.name}</strong> on Admin Dashboard.</p>
        <p>Click the button below to accept your invitation:</p>
        <a href="${inviteUrl}" 
           style="display: inline-block; background: #0070f3; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                  margin: 20px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">
          This invitation will expire in 7 days.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
} catch (emailError) {
  console.error("Failed to send email:", emailError);
  // Don't fail the whole request if email fails
}
```

#### Step 3: Set Resend API Key

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key --project-ref <your-ref>
supabase secrets set APP_URL=https://your-app.vercel.app --project-ref <your-ref>
```

---

### 3.4 Activity Log / Audit Trail

#### Step 1: Create Activity Table

**File: `supabase/migrations/20240104000000_activity_log.sql`**

```sql
-- Activity log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'organization', 'member', etc.
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_org_id ON public.activity_log(organization_id);
CREATE INDEX idx_activity_created_at ON public.activity_log(created_at DESC);

-- RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select_own_orgs"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "activity_log_insert_own_orgs"
  ON public.activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id
        AND o.created_by = auth.uid()
    )
  );
```

#### Step 2: Create Logging Hook

**File: `src/hooks/useActivityLog.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ActivityLogEntry {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export function useActivityLog(orgId: string) {
  return useQuery({
    queryKey: ["activity", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as ActivityLogEntry[];
    },
    enabled: !!orgId,
  });
}

export async function logActivity(
  orgId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_log").insert({
    organization_id: orgId,
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
```

#### Step 3: Add Activity Tab to Org Detail

**File: `src/components/organizations/ActivityFeed.tsx`**

```typescript
import { useActivityLog } from "@/hooks/useActivityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Activity, UserPlus, UserCheck, Trash2, Building2 } from "lucide-react";

const actionIcons: Record<string, any> = {
  "member.invited": UserPlus,
  "member.activated": UserCheck,
  "member.removed": Trash2,
  "organization.created": Building2,
  "organization.updated": Building2,
};

interface ActivityFeedProps {
  orgId: string;
}

export function ActivityFeed({ orgId }: ActivityFeedProps) {
  const { data: activities = [], isLoading } = useActivityLog(orgId);

  if (isLoading) {
    return <div>Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = actionIcons[activity.action] || Activity;
            return (
              <div key={activity.id} className="flex gap-3 text-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.action.replace(".", " ")}</p>
                  {activity.details && (
                    <p className="text-muted-foreground">
                      {JSON.stringify(activity.details)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Step 4: Log Activities in Mutations

Update hooks to log activity:

```typescript
// In useCreateOrganization.ts
import { logActivity } from "@/hooks/useActivityLog";

onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ["organizations"] });
  logActivity(data.id, "organization.created", "organization", data.id, { name: data.name });
}

// Similar for other mutations
```


---

### 3.5 Export Organizations to CSV

**File: `src/components/organizations/ExportButton.tsx`**

```typescript
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Organization } from "@/types/database";
import { formatDate } from "@/lib/utils";

interface ExportButtonProps {
  organizations: Organization[];
}

export function ExportButton({ organizations }: ExportButtonProps) {
  const handleExport = () => {
    // Create CSV content
    const headers = ["Name", "Type", "School District", "Member Count", "Created At"];
    const rows = organizations.map((org) => [
      org.name,
      org.type,
      org.school_district || "N/A",
      org.member_count?.toString() || "0",
      formatDate(org.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organizations-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
```

Add to `OrganizationsPage.tsx`:
```typescript
import { ExportButton } from "@/components/organizations/ExportButton";

// In header section:
<ExportButton organizations={organizations} />
```

---

### 3.6 Organization Statistics Dashboard

**File: `src/components/organizations/OrgStats.tsx`**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UserPlus, TrendingUp } from "lucide-react";
import type { Organization } from "@/types/database";

interface OrgStatsProps {
  organizations: Organization[];
}

export function OrgStats({ organizations }: OrgStatsProps) {
  const totalOrgs = organizations.length;
  const totalMembers = organizations.reduce((sum, org) => sum + (org.member_count || 0), 0);
  const avgMembersPerOrg = totalOrgs > 0 ? (totalMembers / totalOrgs).toFixed(1) : 0;
  
  const typeBreakdown = organizations.reduce((acc, org) => {
    acc[org.type] = (acc[org.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      title: "Total Organizations",
      value: totalOrgs,
      icon: Building2,
      color: "text-blue-500",
    },
    {
      title: "Total Members",
      value: totalMembers,
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Avg Members/Org",
      value: avgMembersPerOrg,
      icon: TrendingUp,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Organizations by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(typeBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(count / totalOrgs) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

Add to `OrganizationsPage.tsx`:
```typescript
import { OrgStats } from "@/components/organizations/OrgStats";

// Before the search input:
<OrgStats organizations={organizations} />
```

---

### 3.7 Bulk Actions for Members

**File: `src/components/members/BulkActions.tsx`**

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, UserCheck } from "lucide-react";
import { useUpdateMemberStatus } from "@/hooks/useUpdateMemberStatus";
import { toast } from "@/hooks/use-toast";
import type { OrganizationMember } from "@/types/database";

interface BulkActionsProps {
  members: OrganizationMember[];
  organizationId: string;
}

export function BulkActions({ members, organizationId }: BulkActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const updateStatus = useUpdateMemberStatus();

  const toggleMember = (memberId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)));
    }
  };

  const activateSelected = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((memberId) =>
          updateStatus.mutateAsync({
            memberId,
            organizationId,
            status: "active",
          })
        )
      );
      toast({ title: `Activated ${selectedIds.size} members` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Failed to activate members", variant: "destructive" });
    }
  };

  if (members.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === members.length && members.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
          </span>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={activateSelected}>
              <UserCheck className="h-3 w-3 mr-1" />
              Activate Selected
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.has(member.id)}
              onCheckedChange={() => toggleMember(member.id)}
            />
            {/* Render member info */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 3.8 Advanced Search with Filters

**File: `src/components/organizations/OrgFilters.tsx`**

```typescript
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { OrganizationType } from "@/types/database";

interface OrgFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export function OrgFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortByChange,
}: OrgFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value={OrganizationType.School}>School</SelectItem>
          <SelectItem value={OrganizationType.Nonprofit}>Nonprofit</SelectItem>
          <SelectItem value={OrganizationType.Business}>Business</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_desc">Newest first</SelectItem>
          <SelectItem value="created_asc">Oldest first</SelectItem>
          <SelectItem value="name_asc">Name (A-Z)</SelectItem>
          <SelectItem value="name_desc">Name (Z-A)</SelectItem>
          <SelectItem value="members_desc">Most members</SelectItem>
          <SelectItem value="members_asc">Least members</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

Update `OrganizationsPage.tsx`:
```typescript
const [typeFilter, setTypeFilter] = useState("all");
const [sortBy, setSortBy] = useState("created_desc");

const filtered = organizations
  .filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.type.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || org.type === typeFilter;
    return matchesSearch && matchesType;
  })
  .sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "members_desc": return (b.member_count || 0) - (a.member_count || 0);
      case "members_asc": return (a.member_count || 0) - (b.member_count || 0);
      case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
```


---

## 4. Testing Implementation

### 4.1 Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 4.2 Setup Test Coverage

Install coverage:
```bash
npm install -D @vitest/coverage-v8
```

Update `vitest.config.ts`:
```typescript
export default defineConfig({
  // ... existing config
  test: {
    // ... existing test config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
});
```

---

## 5. Production Readiness

### 5.1 Add Error Boundary

**File: `src/components/ErrorBoundary.tsx`**

```typescript
import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = "/dashboard/organizations";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Error details</summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-2">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <Button onClick={this.handleReset} className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap App in `main.tsx`:
```typescript
import { ErrorBoundary } from "@/components/ErrorBoundary";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

---

### 5.2 Add Loading Spinner Component

**File: `src/components/ui/spinner.tsx`**

```typescript
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-4",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
```

---

### 5.3 Add Rate Limiting to Edge Function

**File: `supabase/functions/invite-member/index.ts`**

⚠️ **IMPORTANT:** The in-memory rate limiter shown below **will NOT work** in serverless Edge Functions because they are stateless. Use Upstash Redis for production.

**Option 1: Production-Ready Rate Limiting with Upstash Redis**

Install Upstash Redis:
```bash
npm install @upstash/ratelimit @upstash/redis
```

Add to Edge Function imports:
```typescript
import { Ratelimit } from "npm:@upstash/ratelimit";
import { Redis } from "npm:@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// Configure rate limiter: 10 requests per 60 seconds
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});
```

Add after user verification (line ~55):
```typescript
// Rate limiting with Redis
const { success, remaining } = await ratelimit.limit(user.id);

if (!success) {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.", 
      status: 429,
      retryAfter: 60 
    }),
    {
      status: 429,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": remaining.toString(),
      },
    }
  );
}
```

Set Upstash environment variables:
```bash
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io --project-ref <ref>
supabase secrets set UPSTASH_REDIS_REST_TOKEN=your-token --project-ref <ref>
```

**Option 2: Simple Demo (Development Only - NOT for Production)**

⚠️ **WARNING:** This in-memory approach will NOT work in production Edge Functions!

```typescript
// ⚠️ DEV ONLY - Will reset on every function cold start
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Use it (DEV ONLY)
if (!checkRateLimit(user.id)) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later.", status: 429 }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
```

---

### 5.4 Add Sentry Error Tracking

Install:
```bash
npm install @sentry/react
```

**File: `src/lib/sentry.ts`**

```typescript
import * as Sentry from "@sentry/react";

export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}
```

Update `main.tsx`:
```typescript
import { initSentry } from "@/lib/sentry";

initSentry();

createRoot(document.getElementById('root')!).render(
  // ... app
);
```

---

### 5.5 Add Analytics (PostHog)

Install:
```bash
npm install posthog-js
```

**File: `src/lib/analytics.ts`**

```typescript
import posthog from "posthog-js";

export function initAnalytics() {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: "https://app.posthog.com",
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug();
      },
    });
  }
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  posthog.identify(userId, traits);
}
```

Use in AuthContext:
```typescript
import { identifyUser } from "@/lib/analytics";

useEffect(() => {
  if (session?.user) {
    identifyUser(session.user.id, { email: session.user.email });
  }
}, [session]);
```

---

### 5.6 Add SEO Meta Tags

**File: `index.html`**

Update head section:
```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="Production-grade admin dashboard for managing organizations and members" />
  <meta name="keywords" content="admin, dashboard, organization management, member management" />
  <meta name="author" content="Your Name" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="AdminDash - Organization Management" />
  <meta property="og:description" content="Production-grade admin dashboard for managing organizations and members" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://your-domain.vercel.app" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="AdminDash - Organization Management" />
  <meta name="twitter:description" content="Production-grade admin dashboard for managing organizations and members" />
  
  <title>AdminDash - Organization Management</title>
</head>
```


---

### 5.7 Add Offline Support with Service Worker

**File: `public/sw.js`**

```javascript
const CACHE_NAME = 'admindash-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/vite.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
```

Register in `main.tsx`:
```typescript
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      console.log('Service worker registration failed');
    });
  });
}
```

---

### 5.8 Environment Variable Validation

**File: `src/lib/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_POSTHOG_KEY: z.string().optional(),
});

export function validateEnv() {
  try {
    envSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      throw new Error("Invalid environment variables");
    }
    throw error;
  }
}
```

Call in `main.tsx`:
```typescript
import { validateEnv } from "@/lib/env";

validateEnv();
```

---

### 5.9 Add Keyboard Shortcuts

**File: `src/hooks/useKeyboardShortcuts.ts`**

```typescript
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Quick search (if implemented)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Open search modal
      }

      // Cmd/Ctrl + N: New organization
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        // Open create org modal
      }

      // Cmd/Ctrl + H: Home
      if ((e.metaKey || e.ctrlKey) && e.key === "h") {
        e.preventDefault();
        navigate("/dashboard/organizations");
      }

      // ESC: Close modals
      if (e.key === "Escape") {
        // Close any open modals
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Empty dependency array - navigate is stable
}
```

Use in `App.tsx`:
```typescript
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function App() {
  useKeyboardShortcuts();
  // ... rest of app
}
```

---

### 5.10 Add useDebounce Hook

**File: `src/hooks/useDebounce.ts`**

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

---

### 5.11 Add Performance Monitoring

**File: `src/lib/performance.ts`**

```typescript
export function measurePageLoad() {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.log('Performance Metrics:', {
      pageLoadTime: `${pageLoadTime}ms`,
      connectTime: `${connectTime}ms`,
      renderTime: `${renderTime}ms`,
    });

    // Send to analytics
    if (window.posthog) {
      window.posthog.capture('page_load', {
        pageLoadTime,
        connectTime,
        renderTime,
      });
    }
  });
}

export function measureComponentRender(componentName: string, renderTime: number) {
  console.log(`${componentName} rendered in ${renderTime}ms`);
  
  if (window.posthog) {
    window.posthog.capture('component_render', {
      component: componentName,
      renderTime,
    });
  }
}
```

---

## 6. Priority Implementation Order

### Phase 1: Critical (Do First)
1. ✅ Fix Edge Function name case sensitivity
2. ✅ Add basic unit tests (at least 3-5 tests)
3. ✅ Create error boundary
4. ✅ Validate environment variables

### Phase 2: High Value (Stretch Goals)
1. ✅ Invitation acceptance flow
2. ✅ Role-based permissions UI
3. ✅ E2E test (sign-in → create org → invite)
4. ✅ Pagination for organizations

### Phase 3: Nice to Have
1. ✅ Email delivery (Resend)
2. ✅ Activity log/audit trail
3. ✅ Export to CSV
4. ✅ Organization statistics dashboard
5. ✅ Advanced filtering & sorting

### Phase 4: Production Polish
1. ✅ Error tracking (Sentry)
2. ✅ Analytics (PostHog)
3. ✅ Performance monitoring
4. ✅ SEO meta tags
5. ✅ Rate limiting on Edge Function

---

## 7. Quick Wins (30 min or less each)

### 7.1 Add Loading Skeleton for Org Cards

**File: `src/components/organizations/OrgCardSkeleton.tsx`**

```typescript
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function OrgCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### 7.2 Add Copy to Clipboard for Org ID

```typescript
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

<Button
  size="sm"
  variant="ghost"
  onClick={() => {
    navigator.clipboard.writeText(org.id);
    toast({ title: "Organization ID copied" });
  }}
>
  <Copy className="h-3 w-3" />
</Button>
```

### 7.3 Add Confirmation Before Leaving Unsaved Form

```typescript
import { useEffect } from "react";
import { useFormState } from "react-hook-form";

export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}

// Use in forms:
const { isDirty } = useFormState({ control: form.control });
useUnsavedChangesWarning(isDirty);
```

### 7.4 Add "Last Updated" Timestamp

Update organizations table:
```sql
ALTER TABLE public.organizations
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger to auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 7.5 Add Member Count Badge on Org Cards

```typescript
<Badge variant="outline" className="flex items-center gap-1">
  <Users className="h-3 w-3" />
  {org.member_count || 0}
</Badge>
```

---

## 8. Documentation Updates

### 8.1 Update README.md

Add these sections:

```markdown
## Testing

### Unit Tests
```bash
npm test                 # Run tests
npm run test:ui          # Open Vitest UI
npm run test:coverage    # Generate coverage report
```

### E2E Tests
```bash
npm run test:e2e         # Run Playwright tests
npm run test:e2e:ui      # Open Playwright UI
```

## Features

### Core Features
- ✅ Authentication with Supabase Auth
- ✅ Organization CRUD operations
- ✅ Member invitation system
- ✅ Role-based access control
- ✅ Dark mode support
- ✅ Search and filtering
- ✅ Responsive design

### Advanced Features
- ✅ Magic link invitation acceptance
- ✅ Activity audit log
- ✅ Bulk member actions
- ✅ CSV export
- ✅ Real-time updates
- ✅ Email notifications (Resend)
- ✅ Error tracking (Sentry)
- ✅ Analytics (PostHog)

## Performance

- Lazy loading of components
- React Query caching
- Optimistic updates
- Code splitting
- Image optimization
```

### 8.2 Create CONTRIBUTING.md

**File: `CONTRIBUTING.md`**

```markdown
# Contributing to AdminDash

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`
4. Start dev server: `npm run dev`

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write tests for new features

## Pull Request Process

1. Create a feature branch from `development`
2. Make your changes
3. Write/update tests
4. Update documentation
5. Submit PR to `development` branch

## Commit Messages

Follow Conventional Commits:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `test: add tests`
- `refactor: code refactoring`
```

---

## 9. Final Checklist

### Before Submission

- [ ] Fix Edge Function name case
- [ ] Add at least 3-5 unit tests
- [ ] Test both Vercel URLs
- [ ] Verify RLS policies work
- [ ] Test all features end-to-end
- [ ] Check mobile responsiveness
- [ ] Verify dark mode on all pages
- [ ] Test error states
- [ ] Review commit history
- [ ] Update README with any new features
- [ ] Create Loom video (5-10 min)
- [ ] Final code review

### Optional Enhancements (If Time)
- [ ] Invitation acceptance flow
- [ ] Role management UI
- [ ] Activity log
- [ ] E2E test
- [ ] Email integration
- [ ] Export functionality
- [ ] Advanced filters
- [ ] Statistics dashboard

---

## 10. Estimated Time Investment

| Enhancement | Time Required | Priority |
|-------------|--------------|----------|
| Fix Edge Function name | 5 min | Critical |
| Basic unit tests | 2-3 hours | High |
| Invitation acceptance | 4-6 hours | Medium |
| Role management | 2-3 hours | Medium |
| E2E test (one flow) | 1-2 hours | Medium |
| Email integration | 1-2 hours | Low |
| Activity log | 3-4 hours | Low |
| Export CSV | 1 hour | Low |
| Statistics dashboard | 2-3 hours | Low |
| Error boundary | 30 min | High |
| Performance monitoring | 1 hour | Low |

**Total for all critical + high priority: ~4-6 hours**
**Total for all stretch goals: ~20-25 hours**

---

## Summary

This enhancement guide covers:
1. ✅ Critical fixes (Edge Function naming)
2. ✅ All 4 stretch goals with full implementation
3. ✅ 10+ additional features beyond requirements
4. ✅ Complete testing strategy (unit + E2E)
5. ✅ Production readiness (error tracking, analytics, SEO)
6. ✅ Documentation improvements
7. ✅ Quick wins (under 30 min each)
8. ✅ Priority-based implementation order

Focus on Phase 1 (critical) first, then pick stretch goals based on available time. The codebase is already excellent - these enhancements will make it exceptional.
