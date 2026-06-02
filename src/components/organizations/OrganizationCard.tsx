import { Users, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@/types/database";
import { OrganizationType } from "@/types/database";
import { formatDate } from "@/lib/utils";

interface OrganizationCardProps {
  organization: Organization;
  onClick: (id: string) => void;
}

const typeBadgeVariant: Record<OrganizationType, "info" | "success" | "purple"> = {
  [OrganizationType.School]: "info",
  [OrganizationType.Nonprofit]: "success",
  [OrganizationType.Business]: "purple",
};

export function OrganizationCard({ organization, onClick }: OrganizationCardProps) {
  const variant = typeBadgeVariant[organization.type] ?? "secondary";

  return (
    <div
      className="group flex items-center justify-between rounded-lg border bg-card px-5 py-4 cursor-pointer transition-all hover:shadow-sm hover:border-primary/30 hover:bg-accent/30"
      onClick={() => onClick(organization.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(organization.id);
        }
      }}
      aria-label={`View ${organization.name}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Color dot by type */}
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
            organization.type === OrganizationType.School
              ? "bg-blue-100 text-blue-700"
              : organization.type === OrganizationType.Nonprofit
              ? "bg-green-100 text-green-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {organization.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{organization.name}</h3>
            <Badge variant={variant} className="shrink-0">{organization.type}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {organization.member_count ?? 0} {organization.member_count === 1 ? "member" : "members"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(organization.created_at)}
            </span>
          </div>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
    </div>
  );
}
