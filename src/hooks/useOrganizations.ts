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

      return (data ?? []).map((org) => {
        const members = org.organization_members as { count: number }[] | null;
        return {
          id: org.id,
          name: org.name,
          type: org.type as OrganizationType,
          created_by: org.created_by,
          created_at: org.created_at,
          school_district: org.school_district,
          member_count: members?.[0]?.count ?? 0,
        } as Organization;
      });
    },
  });
}
