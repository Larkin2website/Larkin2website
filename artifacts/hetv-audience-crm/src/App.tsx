import { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { getGetPortalSessionQueryKey, getGetCrmTaxonomyQueryKey, useGetPortalSession, useGetCrmTaxonomy } from '@workspace/api-client-react';
import { basePath } from '@/lib/base-path';
import { createStaffQueryClient, errorStatus, useIdentityCacheGuard, useStaffSession, useStaffSignOut } from '@/lib/staff-auth';
import { Shell, State, Brand } from '@/components/crm-ui';
import Dashboard from '@/pages/dashboard';
import Audience from '@/pages/audience';
import Profile from '@/pages/profile';
import Communications from '@/pages/communications';
import Enquiries from '@/pages/enquiries';
import SignInPage from '@/pages/sign-in';
import ForgotPasswordPage from '@/pages/forgot-password';
import SetPasswordPage from '@/pages/set-password';

const client = createStaffQueryClient({ staleTime:30_000 });

function Loading() {
  return <div className="min-h-[100dvh] p-8 sm:p-14"><Brand/><div className="max-w-xl mx-auto mt-24"><State kind="loading"/></div></div>;
}

function Restricted({ title, detail, onRetry, retrying, onSignOut, signingOut, signOutFailed }: { title:string; detail:string; onRetry?:()=>void; retrying?:boolean; onSignOut?:()=>void; signingOut?:boolean; signOutFailed?:boolean }) {
  return <div className="min-h-[100dvh] flex items-center justify-center p-6"><div className="surface max-w-lg w-full p-8 sm:p-12"><Brand/><p className="micro text-[#b45024] mt-14 mb-4">ACCESS RESTRICTED</p><h1 className="display text-4xl font-semibold">{title}</h1><p className="text-sm leading-6 text-[#625d58] mt-5">{detail}</p><div className="flex flex-wrap gap-3 mt-8">{onRetry && <button data-testid="button-retry-access" disabled={retrying} onClick={onRetry} className="quiet-button">{retrying ? 'Checking…' : 'Try again'}</button>}{onSignOut && <button data-testid="button-sign-out-access" disabled={signingOut} onClick={onSignOut} className="orange-button">{signingOut ? 'Signing out…' : 'Sign out'}</button>}</div>{signOutFailed && <p role="alert" className="text-sm text-[#b45024] mt-4">Sign-out did not complete. Try again.</p>}</div></div>;
}

function AccessGate({ displayName, isSuperAdmin, children }: { displayName:string; isSuperAdmin:boolean; children:ReactNode }) {
  const [, navigate] = useLocation();
  const { signOut, isPending, isError } = useStaffSignOut(() => navigate('/sign-in', { replace:true }));
  const portal = useGetPortalSession({ query:{ queryKey:getGetPortalSessionQueryKey(), retry:false, enabled:isSuperAdmin, refetchOnWindowFocus:true } });
  const member = portal.data?.member;
  const isStaffAdmin = Boolean(member?.active && member.status === 'active' && member.role === 'super_admin');
  const access = useGetCrmTaxonomy({ query:{ queryKey:getGetCrmTaxonomyQueryKey(), enabled:isStaffAdmin, retry:false } });
  const handleSignOut = () => { void signOut(); };

  if (!isSuperAdmin) return <Restricted title="This workspace is private." detail="The audience workspace is limited to active super admins. Your account is signed in but does not have that access. Ask an administrator if you need it." onSignOut={handleSignOut} signingOut={isPending} signOutFailed={isError}/>;
  if (portal.isLoading || (isStaffAdmin && access.isLoading)) return <Loading/>;
  const status = errorStatus(portal.error) ?? errorStatus(access.error);
  if (status === 401) return <Redirect to="/sign-in"/>;
  if (status === 403 || (portal.data && !isStaffAdmin)) return <Restricted title="This workspace is private." detail="Your staff account has not been authorised for this workspace. Ask an administrator to review your access." onSignOut={handleSignOut} signingOut={isPending} signOutFailed={isError}/>;
  if (portal.isError || access.isError || !access.data) return <Restricted title="Access could not be verified." detail="We could not confirm your staff access right now. Try again, or contact an administrator if this continues." onRetry={() => { void portal.refetch(); void access.refetch(); }} retrying={portal.isFetching || access.isFetching} onSignOut={handleSignOut} signingOut={isPending} signOutFailed={isError}/>;
  return <Shell name={member?.displayName ?? displayName} onSignOut={handleSignOut}>{children}</Shell>;
}

function ProtectedRouter({ displayName, isSuperAdmin }: { displayName:string; isSuperAdmin:boolean }) {
  return <AccessGate displayName={displayName} isSuperAdmin={isSuperAdmin}><Switch>
    <Route path="/" component={Dashboard}/>
    <Route path="/audience" component={Audience}/>
    <Route path="/audience/:id" component={Profile}/>
    <Route path="/communications" component={Communications}/>
    <Route path="/enquiries" component={Enquiries}/>
    <Route><div className="surface p-10"><p className="micro text-[#b45024]">404 / NOT FOUND</p><h1 className="display text-3xl mt-5">Nothing at this address.</h1><Link href="/" data-testid="link-back-home" className="quiet-button mt-6">Back to overview</Link></div></Route>
  </Switch></AccessGate>;
}

function AuthRouter() {
  const { user, isLoading, isUnavailable, refetch } = useStaffSession();
  useIdentityCacheGuard(isLoading || isUnavailable ? undefined : user ? `${user.userId}:${user.role}` : null);
  const [location] = useLocation();
  if (location.startsWith('/set-password')) return <SetPasswordPage/>;
  const isPublic = location.startsWith('/sign-in') || location.startsWith('/forgot-password');
  if (isLoading && !isPublic) return <Loading/>;
  if (isUnavailable && !isPublic) return <Restricted title="Workspace unavailable." detail="We could not reach the staff sign-in service, so you have not been signed in. Check your connection and try again. If this continues, contact an administrator." onRetry={() => { void refetch(); }}/>;
  if (!user) {
    if (location.startsWith('/forgot-password')) return <ForgotPasswordPage/>;
    return location.startsWith('/sign-in') ? <SignInPage/> : <Redirect to="/sign-in"/>;
  }
  if (isPublic) return <Redirect to="/"/>;
  return <ProtectedRouter key={`${user.userId}:${user.role}`} displayName={user.displayName} isSuperAdmin={user.role === 'super_admin'}/>;
}

function App() {
  return <QueryClientProvider client={client}><WouterRouter base={basePath}><AuthRouter/></WouterRouter></QueryClientProvider>;
}
export default App;
