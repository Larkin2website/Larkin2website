import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLoginStaff } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { AuthShell, Notice } from '@/components/auth-shell';
import { adoptStaffSession, errorStatus } from '@/lib/staff-auth';

function failure(error: unknown): { title:string; detail:string } {
  switch (errorStatus(error)) {
    case 400: case 401: case 403: return { title:'Sign-in unsuccessful', detail:'Those details could not be used to sign in. Check your email and password, or set a password from your invitation email. If the problem continues, contact an administrator.' };
    case 429: return { title:'Too many attempts', detail:'Sign-in is paused for a short while. Wait a few minutes, then try again.' };
    case 503: return { title:'Sign-in is unavailable', detail:'The staff sign-in service is not configured or is temporarily offline. Contact your administrator.' };
    case undefined: return { title:'Cannot reach the service', detail:'Check your connection and try again. Nothing has been signed in.' };
    default: return { title:'Sign-in failed', detail:'The service returned an unexpected error. Try again shortly.' };
  }
}

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLoginStaff();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const session = await login.mutateAsync({ data:{ email:email.trim(), password } });
      setPassword('');
      if (!session.authenticated) return;
      adoptStaffSession(client, session);
      navigate('/', { replace:true });
    } catch {
      setPassword('');
    }
  };
  const problem = login.isError ? failure(login.error) : null;
  return <AuthShell title="Welcome back." detail="Sign in to continue to your audience workspace.">
    <form onSubmit={signIn} className="space-y-5">
      <div><label htmlFor="crm-email" className="micro block mb-2">Email address</label><input id="crm-email" name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} data-testid="input-email" className="input h-12" /></div>
      <div><div className="flex items-center justify-between mb-2"><label htmlFor="crm-password" className="micro">Password</label><Link href="/forgot-password" data-testid="link-forgot-password" className="micro text-[#b45024] hover:text-[#1d2020]">Forgot password?</Link></div><input id="crm-password" name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} data-testid="input-password" className="input h-12" /></div>
      <button type="submit" disabled={login.isPending} data-testid="button-sign-in" className="orange-button w-full justify-center">{login.isPending ? 'Signing in…' : 'Sign in'}</button>
      {problem && <Notice tone="error" title={problem.title} testId="status-sign-in-error">{problem.detail}</Notice>}
    </form>
  </AuthShell>;
}
