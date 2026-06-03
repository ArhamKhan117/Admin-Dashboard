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

      // Get org IDs where user is an active member
      const { data: memberRows, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) throw memberError;

      const ownedIds = new Set((ownedOrgs ?? []).map((o) => o.id));
      const joinedOrgIds = (memberRows ?? [])
        .map((r) => r.organization_id as string)
        .filter((id) => !ownedIds.has(id));

      // Fetch joined orgs by ID
      let joinedOrgs: typeof ownedOrgs = [];
      if (joinedOrgIds.length > 0) {
        const { data: fetched, error: fetchError } = await supabase
          .from("organizations")
          .select("*, organization_members(count)")
          .in("id", joinedOrgIds);

        if (fetchError) throw fetchError;
        joinedOrgs = fetched ?? [];
      }

      const normalize = (org: typeof ownedOrgs[0], isOwner: boolean): Organization => {
        const members = org.organization_members as { count: number }[] | null;
        return {
          id: org.id,
          name: org.name,
          type: org.type as OrganizationType,
          created_by: org.created_by,
          created_at: org.created_at,
          school_district: org.school_district,
          member_count: members?.[0]?.count ?? 0,
          is_owner: isOwner,
        };
      };

      const owned = (ownedOrgs ?? []).map((org) => normalize(org, true));
      const joined = joinedOrgs.map((org) => normalize(org, false));

      return [...owned, ...joined];
    },
  });
}
