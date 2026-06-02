import { useNavigate } from "react-router-dom";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OrganizationList } from "@/components/organizations/OrganizationList";
import { CreateOrganizationForm } from "@/components/organizations/CreateOrganizationForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { data: organizations = [], isLoading, isError, refetch } = useOrganizations();

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

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load organizations.</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="ml-4 h-auto p-0 text-destructive-foreground underline hover:no-underline"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <OrganizationList
            organizations={organizations}
            isLoading={isLoading}
            onCardClick={handleCardClick}
          />
        )}
      </div>
    </div>
  );
}
