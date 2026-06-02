import { useParams, Navigate } from "react-router-dom";
import { OrganizationDetail } from "@/components/organizations/OrganizationDetail";

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/dashboard/organizations" replace />;
  }

  return <OrganizationDetail orgId={id} />;
}
