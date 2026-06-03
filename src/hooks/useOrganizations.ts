import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization } from "@/types/database";
import { OrganizationType } from "@/types/database";

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch orgs the user created
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from("organizations")
        .select("*, organization_members(count)")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Fetch orgs the user is a member of (but didn't create)
      const { data: memberOrgs, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, organizations(*, organization_members(count))")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) throw memberError;

      const normalize = (org: Record<string, unknown>, isOwned: boolean): Organization => {
        const members = org.organization_members as { count: number }[] | null;
        return {
          ...org,
          type: org.type as OrganizationType,
          member_count: members?.[0]?.count ?? 0,
          organization_members: undefined,
          is_owner: isOwned,
        } as Organization;
      };

      const owned = (ownedOrgs ?? []).map((org) => normalize(org as Record<string, unknown>, true));

      const ownedIds = new Set(owned.map((o) => o.id));

      const joined = (memberOrgs ?? [])
        .map((row) => row.organizations as Record<string, unknown> | null)
        .filter((org): org is Record<string, unknown> => !!org && !ownedIds.has(org.id as string))
        .map((org) => normalize(org, false));

      return [...owned, ...joined];
    },
  });
}
