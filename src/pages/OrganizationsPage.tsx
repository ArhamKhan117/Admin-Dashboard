import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OrganizationList } from "@/components/organizations/OrganizationList";
import { CreateOrganizationForm } from "@/components/organizations/CreateOrganizationForm";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { data: organizations = [], isLoading, isError, refetch } = useOrganizations();
  const [open, setOpen] = useState(false);

  const handleCardClick = (id: string) => {
    navigate(`/dashboard/organizations/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organizations and invite members.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Add a new organization to your dashboard.
              </DialogDescription>
            </DialogHeader>
            <CreateOrganizationForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Directory */}
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
  );
}
