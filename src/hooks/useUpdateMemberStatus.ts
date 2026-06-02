import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface UpdateMemberStatusPayload {
  memberId: string;
  organizationId: string;
  status: "invited" | "active";
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, status }: UpdateMemberStatusPayload) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ status, ...(status === "active" ? { joined_at: new Date().toISOString() } : {}) })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members", variables.organizationId] });
    },
  });
}
