import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization } from "@/types/database";
import { OrganizationType } from "@/types/database";

interface RawOrg {
  id: string;
  name: string;
  type: string;
  created_by: string;
  created_at: string;
  school_district: string | null;
  organization_members: { count: number }[] | null;
}

function normalizeOrg(org: RawOrg, isOwner: boolean): Organization {
  return {
    id: org.id,
    name: org.name,
    type: org.type as OrganizationType,
    created_by: org.created_by,
    created_at: org.created_at,
    school_district: org.school_district,
    member_count: org.organization_members?.[0]?.count ?? 0,
    is_owner: isOwner,
  };
}

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

      // Fetch orgs the user is an active member of
      const { data: memberRows, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, organizations(*, organization_members(count))")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) throw memberError;

      const owned = (ownedOrgs ?? []).map((org) => normalizeOrg(org as unknown as RawOrg, true));
      const ownedIds = new Set(owned.map((o) => o.id));

      const joined = (memberRows ?? [])
        .map((row) => row.organizations as unknown as RawOrg | null)
        .filter((org): org is RawOrg => !!org && !ownedIds.has(org.id))
        .map((org) => normalizeOrg(org, false));

      return [...owned, ...joined];
    },
  });
}
