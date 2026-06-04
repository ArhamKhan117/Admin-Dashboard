import { Building2 } from "lucide-react";
import { OrganizationCard } from "./OrganizationCard";
import { EmptyState } from "@/components/ui/empty-state";
import type { Organization } from "@/types/database";

interface OrganizationListProps {
  organizations: Organization[];
  isLoading: boolean;
  onCardClick: (id: string) => void;
  onCreateClick?: () => void;
}

export function OrganizationList({ organizations, isLoading, onCardClick, onCreateClick }: OrganizationListProps) {
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
      <EmptyState
        icon={Building2}
        title="No organizations yet"
        description="You haven't created any organizations. Create your first one to start managing members."
        action={onCreateClick ? { label: "New Organization", onClick: onCreateClick } : undefined}
      />
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
