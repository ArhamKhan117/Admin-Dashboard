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
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
        <div className="rounded-2xl bg-primary/10 p-5 mb-5">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">No organizations yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
          You haven't created any organizations. Hit{" "}
          <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
            <Plus className="h-3 w-3" /> New Organization
          </span>{" "}
          to get started.
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
