import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLoginStaff } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthHeading, AuthNotice, AuthShell, authInput, authLabel, authLink, authPrimary } from "@/components/auth/auth-shell";
import { adoptStaffSession, errorStatus } from "@/lib/staff-auth";

export function signInFailure(error: unknown): { title: string; detail: string } {
  switch (errorStatus(error)) {
    case 400:
    case 401:
    case 403: return { title: "Sign-in unsuccessful", detail: "Those details could not be used to sign in. Check your email and password, or set a password from your invitation email. If the problem continues, contact an administrator." };
    case 429: return { title: "Too many attempts", detail: "Sign-in is paused for this account for a short while. Wait a few minutes, then try again." };
    case 503: return { title: "Sign-in is unavailable", detail: "The staff sign-in service is not configured or is temporarily offline. Contact the portal administrator." };
    case undefined: return { title: "Cannot reach the service", detail: "Check your connection and try again. Nothing has been signed in." };
    default: return { title: "Sign-in failed", detail: "The service returned an unexpected error. Try again shortly." };
  }
}

export default function SignInPage() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const login = useLoginStaff();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const session = await login.mutateAsync({ data: { email: email.trim(), password } });
      setPassword("");
      if (!session.authenticated) return;
      adoptStaffSession(queryClient, session);
      navigate("/dashboard", { replace: true });
    } catch {
      setPassword("");
    }
  };

  const failure = login.isError ? signInFailure(login.error) : null;

  return (
    <AuthShell>
      <div className="space-y-8">
        <AuthHeading title="Sign in to Larkin2" detail="Sign in to manage opportunities, programmes and your workspace." />
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <label htmlFor="staff-email" className={authLabel}>Email address</label>
            <Input id="staff-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" required maxLength={254} data-testid="input-email" className={authInput} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="staff-password" className={authLabel}>Password</label>
              <Link href="/forgot-password" className={authLink} data-testid="link-forgot-password">Forgot password?</Link>
            </div>
            <Input id="staff-password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required maxLength={128} data-testid="input-password" className={authInput} />
          </div>
          <Button type="submit" disabled={login.isPending} data-testid="button-sign-in" className={authPrimary}>
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
          {failure && <AuthNotice tone="error" title={failure.title} testId="status-sign-in-error">{failure.detail}</AuthNotice>}
        </form>
        <p className="text-xs leading-relaxed text-[#625d58] border-t border-[#c7c2bc] pt-6">
          Accounts are created by invitation from a portal super admin. New to Larkin2? Use the link in your invitation email to set your password.
        </p>
      </div>
    </AuthShell>
  );
}
