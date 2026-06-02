import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization } from "@/types/database";
import { OrganizationType } from "@/types/database";

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*, organization_members(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Normalize the member_count from the joined count
      return (data ?? []).map((org) => {
        const members = org.organization_members as { count: number }[] | null;
        return {
          ...org,
          type: org.type as OrganizationType,
          member_count: members?.[0]?.count ?? 0,
          organization_members: undefined,
        } as Organization;
      });
    },
  });
}
