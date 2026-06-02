import { useNavigate } from "react-router-dom";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OrganizationList } from "@/components/organizations/OrganizationList";
import { CreateOrganizationForm } from "@/components/organizations/CreateOrganizationForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { data: organizations = [], isLoading } = useOrganizations();

  const handleCardClick = (id: string) => {
    navigate(`/dashboard/organizations/${id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage your organizations.
        </p>
      </div>

      {/* Create org form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>

      {/* Directory */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your Organizations
        </h2>
        <OrganizationList
          organizations={organizations}
          isLoading={isLoading}
          onCardClick={handleCardClick}
        />
      </div>
    </div>
  );
}
