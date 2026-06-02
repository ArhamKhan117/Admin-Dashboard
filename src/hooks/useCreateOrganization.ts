import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization, CreateOrganizationPayload } from "@/types/database";
import { OrganizationType } from "@/types/database";

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrganizationPayload) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      return { ...data, type: data.type as OrganizationType } as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}
