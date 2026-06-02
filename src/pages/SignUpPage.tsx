import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";

export function SignUpPage() {
  return (
    <AuthLayout
      title="Create an account"
      subtitle="Sign up to start managing your organizations"
    >
      <SignUpForm />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
