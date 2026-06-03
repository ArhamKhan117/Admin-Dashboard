import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider, setQueryCacheClearer } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/router/ProtectedRoute";
import { PublicRoute } from "@/router/PublicRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { OrganizationsPage } from "@/pages/OrganizationsPage";
import { OrganizationDetailPage } from "@/pages/OrganizationDetailPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

// Allow AuthContext to clear the query cache on sign-out
setQueryCacheClearer(() => queryClient.clear());

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            {/* Public routes — redirect to dashboard if already signed in */}
            <Route element={<PublicRoute />}>
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
            </Route>

            {/* Accept invite — accessible without auth (handles its own auth) */}
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            {/* Protected routes — redirect to /sign-in if not authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route
                  path="/dashboard/organizations"
                  element={<OrganizationsPage />}
                />
                <Route
                  path="/dashboard/organizations/:id"
                  element={<OrganizationDetailPage />}
                />
              </Route>
            </Route>

            {/* Root and catch-all redirect */}
            <Route
              index
              element={<Navigate to="/dashboard/organizations" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/dashboard/organizations" replace />}
            />
          </Routes>
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
