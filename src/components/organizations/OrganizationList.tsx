import { Building2, Plus } from "lucide-react";
import { OrganizationCard } from "./OrganizationCard";
import type { Organization } from "@/types/database";

interface OrganizationListProps {
  organizations: Organization[];
  isLoading: boolean;
  onCardClick: (id: string) => void;
}

export function OrganizationList({ organizations, isLoading, onCardClick }: OrganizationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-lg border bg-muted" />
        ))}
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">No organizations yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Create your first organization using the{" "}
          <span className="inline-flex items-center gap-0.5 font-medium">
            <Plus className="h-3 w-3" /> New Organization
          </span>{" "}
          button above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {organizations.map((org) => (
        <OrganizationCard key={org.id} organization={org} onClick={onCardClick} />
      ))}
    </div>
  );
}
