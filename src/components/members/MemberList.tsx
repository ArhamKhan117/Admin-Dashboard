import { Users } from "lucide-react";
import { MemberRow } from "./MemberRow";
import { useUpdateMemberStatus } from "@/hooks/useUpdateMemberStatus";
import type { OrganizationMember } from "@/types/database";

interface MemberListProps {
  members: OrganizationMember[];
  isLoading: boolean;
  organizationId: string;
}

export function MemberList({ members, isLoading, organizationId }: MemberListProps) {
  const updateStatus = useUpdateMemberStatus();

  const handleActivate = (memberId: string) => {
    updateStatus.mutate({ memberId, organizationId, status: "active" });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-md border bg-muted"
          />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <Users className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No members yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Invite someone using the form below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          onActivate={handleActivate}
          isActivating={updateStatus.isPending && updateStatus.variables?.memberId === member.id}
        />
      ))}
    </div>
  );
}
