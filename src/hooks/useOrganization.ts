import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization } from "@/types/database";
import { OrganizationType } from "@/types/database";

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ["organizations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return { ...data, type: data.type as OrganizationType } as Organization;
    },
    enabled: !!id,
  });
}
