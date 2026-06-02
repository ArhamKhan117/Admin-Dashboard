import { Badge } from "@/components/ui/badge";
import type { OrganizationMember } from "@/types/database";

interface MemberRowProps {
  member: OrganizationMember;
}

export function MemberRow({ member }: MemberRowProps) {
  const initial = member.email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar initial */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {initial}
        </div>
        <span className="text-sm font-medium text-foreground truncate">{member.email}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <Badge variant="secondary" className="capitalize">
          {member.role}
        </Badge>
        <Badge
          variant={member.status === "active" ? "success" : "info"}
          className="capitalize"
        >
          {member.status}
        </Badge>
      </div>
    </div>
  );
}
