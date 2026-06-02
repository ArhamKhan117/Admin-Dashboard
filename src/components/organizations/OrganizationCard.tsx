import { Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Organization } from "@/types/database";
import { OrganizationType } from "@/types/database";
import { formatDate } from "@/lib/utils";

interface OrganizationCardProps {
  organization: Organization;
  onClick: (id: string) => void;
}

const typeBadgeVariant: Record<
  OrganizationType,
  "info" | "success" | "purple"
> = {
  [OrganizationType.School]: "info",
  [OrganizationType.Nonprofit]: "success",
  [OrganizationType.Business]: "purple",
};

export function OrganizationCard({
  organization,
  onClick,
}: OrganizationCardProps) {
  const variant =
    typeBadgeVariant[organization.type] ?? "secondary";

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
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
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">{organization.name}</h3>
          <Badge variant={variant}>{organization.type}</Badge>
        </div>

        <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{organization.member_count ?? 0} members</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(organization.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
