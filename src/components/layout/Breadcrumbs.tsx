import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

function OrgBreadcrumb({ id }: { id: string }) {
  const { data: org } = useOrganization(id);
  return <span className="font-medium text-foreground truncate max-w-[160px]">{org?.name ?? "Organization"}</span>;
}

export function Breadcrumbs() {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Only show on org detail page
  if (pathnames.length <= 2) return null;

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link
        to="/dashboard/organizations"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4 mx-1" />
      <Link to="/dashboard/organizations" className="hover:text-foreground transition-colors">
        Organizations
      </Link>
      {id && (
        <>
          <ChevronRight className="h-4 w-4 mx-1" />
          <OrgBreadcrumb id={id} />
        </>
      )}
    </nav>
  );
}
