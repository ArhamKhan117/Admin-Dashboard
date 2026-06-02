import { Building2 } from "lucide-react";
import { OrganizationCard } from "./OrganizationCard";
import type { Organization } from "@/types/database";

interface OrganizationListProps {
  organizations: Organization[];
  isLoading: boolean;
  onCardClick: (id: string) => void;
}

export function OrganizationList({
  organizations,
  isLoading,
  onCardClick,
}: OrganizationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border bg-muted"
          />
        ))}
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">No organizations yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first organization using the form above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {organizations.map((org) => (
        <OrganizationCard key={org.id} organization={org} onClick={onCardClick} />
      ))}
    </div>
  );
}
