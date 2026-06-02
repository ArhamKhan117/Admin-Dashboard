import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Renders <Outlet /> when no authenticated session exists.
 * Shows a loading spinner while the initial session check is in progress.
 * Redirects to /dashboard/organizations when a session is active.
 */
export function PublicRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard/organizations" replace />;
  }

  return <Outlet />;
}
