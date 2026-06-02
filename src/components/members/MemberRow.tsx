import { Badge } from "@/components/ui/badge";
import type { OrganizationMember } from "@/types/database";

interface MemberRowProps {
  member: OrganizationMember;
}

export function MemberRow({ member }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm font-medium text-foreground">{member.email}</span>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {member.role}
        </Badge>
        <Badge
          variant={member.status === "active" ? "success" : "warning"}
          className="capitalize"
        >
          {member.status}
        </Badge>
      </div>
    </div>
  );
}
