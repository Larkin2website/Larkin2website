import { useEffect, useState, type FormEvent } from 'react';
import { useSetStaffPassword } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { AuthShell, NewPasswordFields, Notice, passwordProblem } from '@/components/auth-shell';
import { clearFragment, describeLinkError, errorStatus, readFragmentToken } from '@/lib/staff-auth';

export default function SetPasswordPage() {
  const [token, setToken] = useState<string | null>(() => readFragmentToken());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const save = useSetStaffPassword();
  useEffect(() => { clearFragment(); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    setLocalError(problem);
    if (problem || !token) return;
    try {
      await save.mutateAsync({ data:{ token, password } });
      setPassword(''); setConfirm(''); setToken(null); setDone(true);
    } catch { /* shown below */ }
  };

  const status = errorStatus(save.error);
  const malformed = typeof token === 'string' && (token.length < 40 || token.length > 128);
  const linkError = save.isError && (status === 400 || status === 404 || status === 410) ? describeLinkError(save.error) : null;

  let body;
  if (done) body = <div className="space-y-6"><Notice tone="success" title="Password saved" testId="status-password-set">Your password is set and the link can no longer be used. Sign in with your email address and new password.</Notice><Link href="/sign-in" data-testid="link-continue-sign-in" className="orange-button w-full justify-center">Continue to sign in</Link></div>;
  else if (!token || malformed || linkError) {
    const info = linkError ?? (token ? describeLinkError(null) : { title:'No link detected.', detail:'Open this page from the button in your invitation or password reset email. If you copied the address, make sure the whole link was included.' });
    body = <div className="space-y-6"><Notice tone="error" title={info.title} testId="status-link-error">{info.detail}</Notice><div className="flex flex-wrap gap-3"><Link href="/forgot-password" data-testid="link-request-new" className="quiet-button">Request a new link</Link><Link href="/sign-in" data-testid="link-back-sign-in" className="quiet-button">Back to sign in</Link></div></div>;
  } else {
    const failure = save.isError ? status === 429 ? 'Too many attempts. Wait a few minutes and try again.' : status === undefined ? 'Cannot reach the service. Your link has not been used; try again.' : 'Your password could not be saved. The link has not been used; try again shortly.' : null;
    body = <form onSubmit={submit} className="space-y-5">
      <NewPasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} />
      <button type="submit" disabled={save.isPending} data-testid="button-set-password" className="orange-button w-full justify-center">{save.isPending ? 'Saving…' : 'Save password'}</button>
      {localError && <Notice tone="error" testId="status-password-invalid">{localError}</Notice>}
      {failure && <Notice tone="error" testId="status-set-password-error">{failure}</Notice>}
    </form>;
  }
  return <AuthShell eyebrow="SET PASSWORD" title="Choose your password." detail="Set the password you will use to sign in to HETV staff workspaces.">{body}</AuthShell>;
}
