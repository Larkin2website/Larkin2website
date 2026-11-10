import { Link } from "wouter";
import { AuthHeading, AuthNotice, AuthShell, authLink, authPrimary } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell>
      <div className="space-y-8">
        <AuthHeading title="Access is by invitation" detail="Larkin2 portal accounts are not self-registered." />
        <AuthNotice tone="info" testId="status-invitation-only">
          Ask a portal super admin to grant you access. You will receive an email with a single-use link to set your password, after which you can sign in.
        </AuthNotice>
        <div className="space-y-4">
          <Link href="/sign-in" className={`${authPrimary} inline-flex items-center justify-center`} data-testid="link-sign-in">Go to sign in</Link>
          <Link href="/set-password" className={authLink} data-testid="link-have-invitation">I have an invitation link</Link>
        </div>
      </div>
    </AuthShell>
  );
}
