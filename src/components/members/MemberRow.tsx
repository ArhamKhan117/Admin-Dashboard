import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrganizationMember } from "@/types/database";

interface MemberRowProps {
  member: OrganizationMember;
  onActivate?: (memberId: string) => void;
  isActivating?: boolean;
}

export function MemberRow({ member, onActivate, isActivating }: MemberRowProps) {
  const initial = member.email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar initial */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {initial}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{member.email}</span>
          {member.invited_at && (
            <span className="text-xs text-muted-foreground">
              Invited {new Date(member.invited_at).toLocaleDateString()}
            </span>
          )}
        </div>
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
        {member.status === "invited" && onActivate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onActivate(member.id)}
            disabled={isActivating}
            className="h-7 text-xs px-2"
          >
            {isActivating ? "…" : "Activate"}
          </Button>
        )}
      </div>
    </div>
  );
}
