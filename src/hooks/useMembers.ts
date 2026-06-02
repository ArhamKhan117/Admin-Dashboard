import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { OrganizationMember } from "@/types/database";

export function useMembers(orgId: string) {
  return useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", orgId)
        .order("invited_at", { ascending: false });

      if (error) throw error;

      return (data ?? []) as OrganizationMember[];
    },
    enabled: !!orgId,
  });
}
