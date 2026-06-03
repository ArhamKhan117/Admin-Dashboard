import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type State =
  | { status: "sign-in" }
  | { status: "loading" }
  | { status: "success"; orgId: string }
  | { status: "error"; message: string };

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>({ status: "sign-in" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // If user is already signed in, accept immediately
  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Invalid invitation link — no token found." });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        acceptInvite(token, data.session.access_token);
      }
    });
  }, [token]);

  async function acceptInvite(inviteToken: string, accessToken: string) {
    setState({ status: "loading" });
    try {
      const { data, error } = await supabase.functions.invoke("accept-invite", {
        body: { token: inviteToken },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setState({ status: "success", orgId: data.organization_id });
    } catch (err: unknown) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      let accessToken: string;

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setAuthError("Check your email to confirm your account, then come back to this link.");
          setAuthLoading(false);
          return;
        }
        accessToken = data.session.access_token;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        accessToken = data.session.access_token;
      }

      await acceptInvite(token, accessToken);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  if (state.status === "loading") {
    return (
      <AuthLayout title="Accepting invitation…">
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Please wait…</p>
        </div>
      </AuthLayout>
    );
  }

  if (state.status === "success") {
    return (
      <AuthLayout title="You're in!" subtitle="Your invitation has been accepted.">
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p className="text-sm text-center text-muted-foreground">
            You've successfully joined the organization.
          </p>
          <Button
            className="w-full"
            onClick={() => navigate("/dashboard/organizations")}
          >
            Go to Dashboard
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (state.status === "error") {
    return (
      <AuthLayout title="Invitation error">
        <div className="flex flex-col items-center gap-4 py-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm text-center text-muted-foreground">{state.message}</p>
          <Link to="/sign-in">
            <Button variant="outline" className="w-full">Go to Sign In</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Sign-in / Sign-up form
  return (
    <AuthLayout
      title="Accept your invitation"
      subtitle={isSignUp ? "Create an account to join the organization" : "Sign in to accept your invitation"}
    >
      <form onSubmit={handleAuth} className="space-y-4">
        {authError && (
          <Alert variant="destructive">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder={isSignUp ? "At least 8 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignUp ? 8 : 1}
          />
        </div>

        <Button type="submit" disabled={authLoading} className="w-full">
          {authLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isSignUp ? "Creating account…" : "Signing in…"}
            </span>
          ) : (
            isSignUp ? "Create account & accept" : "Sign in & accept"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
