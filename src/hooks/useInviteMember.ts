import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  InviteMemberRequest,
  InviteMemberResponse,
} from "@/types/database";

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InviteMemberRequest) => {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: payload,
      });

      if (error) throw error;

      // Edge Function returns { success, member } or { error, status }
      if (data?.error) {
        const err = new Error(data.error) as Error & { status?: number };
        err.status = data.status;
        throw err;
      }

      return data as InviteMemberResponse;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["members", variables.organization_id],
      });
    },
  });
}
