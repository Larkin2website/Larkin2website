import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useSetStaffPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { AuthHeading, AuthNotice, AuthShell, authLink, authPrimary } from "@/components/auth/auth-shell";
import { NewPasswordFields, passwordProblem } from "@/components/auth/password-fields";
import { clearFragment, describeLinkError, errorStatus, readFragmentToken } from "@/lib/staff-auth";

export default function SetPasswordPage() {
  const [token, setToken] = useState<string | null>(() => readFragmentToken());
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const setStaffPassword = useSetStaffPassword();

  useEffect(() => {
    clearFragment();
  }, []);

  const tokenMalformed = typeof token === "string" && (token.length < 40 || token.length > 128);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    setLocalError(problem);
    if (problem || !token) return;
    try {
      await setStaffPassword.mutateAsync({ data: { token, password } });
      setPassword("");
      setConfirm("");
      setToken(null);
      setDone(true);
    } catch {
      // Error state rendered below.
    }
  };

  const serverStatus = errorStatus(setStaffPassword.error);
  const linkError = setStaffPassword.isError && (serverStatus === 400 || serverStatus === 404 || serverStatus === 410)
    ? describeLinkError(setStaffPassword.error) : null;

  let body;
  if (done) {
    body = (
      <div className="space-y-6">
        <AuthNotice tone="success" title="Password saved" testId="status-password-set">
          Your password is set and the link can no longer be used. Sign in with your email address and new password.
        </AuthNotice>
        <Link href="/sign-in" className={`${authPrimary} inline-flex items-center justify-center`} data-testid="link-continue-sign-in">Continue to sign in</Link>
      </div>
    );
  } else if (!token || tokenMalformed || linkError) {
    const info = linkError ?? (token ? describeLinkError(null) : { title: "No link detected.", detail: "Open this page from the button in your invitation or password reset email. If you copied the address, make sure the whole link was included." });
    body = (
      <div className="space-y-6">
        <AuthNotice tone="error" title={info.title} testId="status-link-error">{info.detail}</AuthNotice>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/forgot-password" className={authLink} data-testid="link-request-new">Request a new link</Link>
          <Link href="/sign-in" className={authLink} data-testid="link-back-sign-in">Back to sign in</Link>
        </div>
      </div>
    );
  } else {
    const failure = setStaffPassword.isError
      ? serverStatus === 429 ? "Too many attempts. Wait a few minutes and try again."
      : serverStatus === undefined ? "Cannot reach the service. Your link has not been used; try again."
      : "Your password could not be saved. The link has not been used; try again shortly."
      : null;
    body = (
      <form className="space-y-5" onSubmit={handleSubmit}>
        <NewPasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
        <Button type="submit" disabled={setStaffPassword.isPending} data-testid="button-set-password" className={authPrimary}>
          {setStaffPassword.isPending ? "Saving..." : "Save password"}
        </Button>
        {localError && <AuthNotice tone="error" testId="status-password-invalid">{localError}</AuthNotice>}
        {failure && <AuthNotice tone="error" testId="status-set-password-error">{failure}</AuthNotice>}
      </form>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <AuthHeading title="Choose your password" detail="Set the password you will use to sign in to the Larkin2 portal." />
        {body}
      </div>
    </AuthShell>
  );
}
