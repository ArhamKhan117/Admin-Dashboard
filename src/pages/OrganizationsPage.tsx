import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, AlertCircle, Search } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OrganizationList } from "@/components/organizations/OrganizationList";
import { CreateOrganizationForm } from "@/components/organizations/CreateOrganizationForm";
import { OrgStats } from "@/components/organizations/OrgStats";
import { ExportButton } from "@/components/organizations/ExportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OrganizationType } from "@/types/database";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { data: organizations = [], isLoading, isError, refetch } = useOrganizations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.type.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || org.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
            {isLoading ? "Loading…" : `${organizations.length} organization${organizations.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton organizations={organizations} />
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
      </div>

      {/* Stats */}
      {!isLoading && !isError && organizations.length > 0 && (
        <OrgStats organizations={organizations} />
      )}

      {/* Search + type filter */}
      {!isError && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value={OrganizationType.School}>School</SelectItem>
              <SelectItem value={OrganizationType.Nonprofit}>Nonprofit</SelectItem>
              <SelectItem value={OrganizationType.Business}>Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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
        <>
          <OrganizationList
            organizations={filtered}
            isLoading={isLoading}
            onCardClick={handleCardClick}
          />
          {!isLoading && (search || typeFilter !== "all") && filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No organizations match your filters.
            </p>
          )}
        </>
      )}
    </div>
  );
}
