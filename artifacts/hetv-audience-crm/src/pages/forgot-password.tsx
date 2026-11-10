import { useState, type FormEvent } from 'react';
import { useRequestStaffPasswordReset } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { AuthShell, Notice } from '@/components/auth-shell';
import { errorStatus } from '@/lib/staff-auth';

function failure(error: unknown) {
  switch (errorStatus(error)) {
    case 429: return 'Too many reset requests. Wait a few minutes before trying again.';
    case 503: return 'Password email is not configured or is temporarily offline. Contact your administrator.';
    case undefined: return 'Cannot reach the service. Check your connection and try again.';
    default: return 'The request could not be completed. Try again shortly.';
  }
}

export default function ForgotPasswordPage() {
  const request = useRequestStaffPasswordReset();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await request.mutateAsync({ data:{ email:email.trim() } }); setSentTo(email.trim()); } catch { /* shown below */ }
  };
  return <AuthShell eyebrow="PASSWORD RESET" title="Reset your password." detail="Enter your staff email address. We will send a single-use link to choose a new password.">
    {sentTo ? <Notice tone="success" title="Check your inbox" testId="status-reset-requested">If <span className="font-medium break-all">{sentTo}</span> belongs to an active staff account, a reset link is on its way. It expires after a short time and works once.</Notice> :
    <form onSubmit={submit} className="space-y-5">
      <div><label htmlFor="reset-email" className="micro block mb-2">Email address</label><input id="reset-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} data-testid="input-reset-email" className="input h-12" /></div>
      <button type="submit" disabled={request.isPending} data-testid="button-request-reset" className="orange-button w-full justify-center">{request.isPending ? 'Sending…' : 'Send reset link'}</button>
      {request.isError && <Notice tone="error" testId="status-reset-error">{failure(request.error)}</Notice>}
    </form>}
    <Link href="/sign-in" data-testid="link-back-sign-in" className="quiet-button mt-6">Back to sign in</Link>
  </AuthShell>;
}
