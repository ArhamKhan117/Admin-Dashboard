import { NavLink, Outlet } from "react-router-dom";
import { Building2, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function DashboardLayout() {
  const { user, signOut } = useAuth();

  // Truncate email for display
  const displayEmail = user?.email
    ? user.email.length > 28
      ? user.email.slice(0, 25) + "..."
      : user.email
    : "";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight">AdminDash</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Menu
          </p>
          <NavLink
            to="/dashboard/organizations"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
          >
            <Building2 className="h-4 w-4" />
            Organizations
          </NavLink>
        </nav>

        {/* User section at bottom of sidebar */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{displayEmail}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{displayEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="flex items-center gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
