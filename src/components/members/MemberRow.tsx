import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrganizationMember } from "@/types/database";

interface MemberRowProps {
  member: OrganizationMember;
  onRemove?: (memberId: string) => void;
  isRemoving?: boolean;
}

export function MemberRow({ member, onRemove, isRemoving }: MemberRowProps) {
  const initial = member.email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
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
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(member.id)}
            disabled={isRemoving}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Remove member"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
