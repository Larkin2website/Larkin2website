import { SignIn } from '@clerk/react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCrmTaxonomyQueryKey, useCreateCrmDemoSession } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Brand } from '@/components/crm-ui';
import { crmDemoMode } from '@/lib/demo-mode';
import { basePath } from '@/lib/clerk';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const startSession = useCreateCrmDemoSession();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await startSession.mutateAsync({data:{email,password}});
      setPassword('');
      await client.invalidateQueries({queryKey:getGetCrmTaxonomyQueryKey()});
      navigate('/', {replace:true});
    } catch {
      setPassword('');
    }
  };
  return <div className="min-h-[100dvh] grid lg:grid-cols-[.9fr_1.1fr]">
    <section className="ink min-h-[340px] lg:min-h-[100dvh] flex flex-col justify-between p-8 sm:p-12 lg:p-16"><Brand light/><div className="my-16 max-w-lg"><div className="micro text-[#f4773f] mb-7">PRIVATE WORKSPACE / HETV HUB</div><h1 className="display text-5xl sm:text-6xl xl:text-7xl leading-[1.02] font-medium">Closer to<br/>the people<br/><span className="text-[#f4773f]">we serve.</span></h1><p className="text-[#aaaeaa] text-sm leading-7 mt-8 max-w-sm">Audience insight, delivery visibility and subscriber enquiries. For authorised HETV staff only.</p></div><div className="border-t border-[#373d3e] pt-5 micro text-[#85898a]">HETV / AUDIENCE & ENGAGEMENT</div></section>
    <section className="flex items-center justify-center p-6 sm:p-12 lg:p-16"><div className="w-full max-w-[440px]"><div className="micro text-[#b45024] mb-6">{crmDemoMode ? 'DEVELOPMENT ACCESS ONLY' : 'STAFF ACCESS'}</div><h2 className="display text-3xl sm:text-4xl font-semibold mb-3">Welcome back.</h2><p className="text-sm leading-6 text-[#625d58] mb-8">{crmDemoMode ? 'Temporary sign-in for testing current development records. Any valid email and non-empty password will work here; this is not secure authentication.' : 'Sign in with your authorised staff account to continue.'}</p><div className="border-t rule pt-8">{crmDemoMode ? (
      <form onSubmit={signIn} className="space-y-5">
        <div><label htmlFor="crm-demo-email" className="micro block mb-2">Email address</label><input id="crm-demo-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="w-full h-12 px-3 border rule bg-transparent" /></div>
        <div><label htmlFor="crm-demo-password" className="micro block mb-2">Password</label><input id="crm-demo-password" type="password" autoComplete="off" required value={password} onChange={event => setPassword(event.target.value)} className="w-full h-12 px-3 border rule bg-transparent" /></div>
        <button type="submit" disabled={startSession.isPending} className="orange-button w-full justify-center">{startSession.isPending ? 'Signing in…' : 'Sign in for development'}</button>
        {startSession.isError && <p role="alert" className="text-sm text-[#b45024]">Development sign-in could not be started. Please try again.</p>}
      </form>
    ) : <SignIn routing="path" path={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/`} signUpUrl={undefined} appearance={{ elements:{rootBox:'!w-full',cardBox:'!w-full !max-w-full !shadow-none !rounded-none !bg-transparent',card:'!p-0 !shadow-none !bg-transparent',header:'!hidden',footer:'!hidden',socialButtons:'!hidden',dividerRow:'!hidden'} }}/>}</div><p className="text-xs leading-5 text-[#625d58] mt-10">{crmDemoMode ? 'Development access only. Restore verified staff sign-in before going live.' : 'Access to audience information is restricted and governed by staff permissions.'}</p></div></section>
  </div>;
}