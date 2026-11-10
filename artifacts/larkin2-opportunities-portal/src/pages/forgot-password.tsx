import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useRequestStaffPasswordReset } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthHeading, AuthNotice, AuthShell, authInput, authLabel, authLink, authPrimary } from "@/components/auth/auth-shell";
import { errorStatus } from "@/lib/staff-auth";

function resetFailure(error: unknown) {
  switch (errorStatus(error)) {
    case 429: return "Too many reset requests. Wait a few minutes before trying again.";
    case 503: return "Password email is not configured or is temporarily offline. Contact the portal administrator.";
    case undefined: return "Cannot reach the service. Check your connection and try again.";
    default: return "The request could not be completed. Try again shortly.";
  }
}

export default function ForgotPasswordPage() {
  const request = useRequestStaffPasswordReset();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await request.mutateAsync({ data: { email: email.trim() } });
      setSentTo(email.trim());
    } catch {
      // Error state rendered below.
    }
  };

  return (
    <AuthShell>
      <div className="space-y-8">
        <AuthHeading title="Reset your password" detail="Enter the email address your portal access was granted to. We will email a single-use link to choose a new password." />
        {sentTo ? (
          <AuthNotice tone="success" title="Check your inbox" testId="status-reset-requested">
            If <span className="font-medium break-all">{sentTo}</span> belongs to an active staff account, a reset link is on its way. It expires after a short time and works once. Check spam folders before requesting another.
          </AuthNotice>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="reset-email" className={authLabel}>Email address</label>
              <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required maxLength={254} data-testid="input-reset-email" className={authInput} />
            </div>
            <Button type="submit" disabled={request.isPending} data-testid="button-request-reset" className={authPrimary}>
              {request.isPending ? "Sending..." : "Send reset link"}
            </Button>
            {request.isError && <AuthNotice tone="error" testId="status-reset-error">{resetFailure(request.error)}</AuthNotice>}
          </form>
        )}
        <Link href="/sign-in" className={authLink} data-testid="link-back-sign-in">Back to sign in</Link>
      </div>
    </AuthShell>
  );
}
