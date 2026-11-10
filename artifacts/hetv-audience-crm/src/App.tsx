import { type ReactNode } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { getGetPortalSessionQueryKey, getGetCrmTaxonomyQueryKey, useGetPortalSession, useGetCrmTaxonomy } from '@workspace/api-client-react';
import { useDeleteCrmDemoSession } from '@workspace/api-client-react';
import { StaffClerkProvider, basePath } from '@/lib/clerk';
import { Shell, State, Brand } from '@/components/crm-ui';
import Dashboard from '@/pages/dashboard';
import Audience from '@/pages/audience';
import Profile from '@/pages/profile';
import Communications from '@/pages/communications';
import Enquiries from '@/pages/enquiries';
import SignInPage from '@/pages/sign-in';
import { crmDemoMode } from '@/lib/demo-mode';

const client = new QueryClient({ defaultOptions:{ queries:{ retry:1, refetchOnWindowFocus:false, staleTime:30_000 } } });

function AccessGate({children}:{children:ReactNode}) {
  const query = useGetPortalSession({query:{queryKey:getGetPortalSessionQueryKey(), retry:false}});
  const isStaffAdmin = query.data?.member.active && query.data.member.status === 'active' && query.data.member.role === 'super_admin';
  const access = useGetCrmTaxonomy({query:{queryKey:getGetCrmTaxonomyQueryKey(),enabled:Boolean(isStaffAdmin),retry:false}});
  const {signOut} = useClerk();
  if(query.isLoading || (isStaffAdmin && access.isLoading)) return <div className="min-h-[100dvh] p-8 sm:p-14"><Brand/><div className="max-w-xl mx-auto mt-24"><State kind="loading"/></div></div>;
  if(query.isError || !isStaffAdmin || access.isError || !access.data) {
    const status = (query.error as {status?:number}|null)?.status;
    return <div className="min-h-[100dvh] flex items-center justify-center p-6"><div className="surface max-w-lg w-full p-8 sm:p-12"><Brand/><p className="micro text-[#b45024] mt-14 mb-4">ACCESS RESTRICTED</p><h1 className="display text-4xl font-semibold">This workspace is private.</h1><p className="text-sm leading-6 text-[#625d58] mt-5">{status===403 || access.isError || query.data ? 'Your staff account has not been authorised for this workspace. Ask an administrator to review your access.' : 'We could not verify your staff access. Try again or contact an administrator.'}</p><div className="flex gap-3 mt-8"><button data-testid="button-retry-access" onClick={()=>{query.refetch();access.refetch();}} className="quiet-button">Try again</button><button data-testid="button-sign-out-access" onClick={()=>signOut({redirectUrl:`${window.location.origin}${basePath}/sign-in`})} className="orange-button">Sign out</button></div></div></div>;
  }
  return <Shell name={query.data!.member.displayName} onSignOut={() => signOut({redirectUrl:`${window.location.origin}${basePath}/sign-in`})}>{children}</Shell>;
}
function ProtectedRouter() {
  return <AccessGate><Switch>
    <Route path="/" component={Dashboard}/>
    <Route path="/audience" component={Audience}/>
    <Route path="/audience/:id" component={Profile}/>
    <Route path="/communications" component={Communications}/>
    <Route path="/enquiries" component={Enquiries}/>
    <Route><div className="surface p-10"><p className="micro text-[#b45024]">404 / NOT FOUND</p><h1 className="display text-3xl mt-5">Nothing at this address.</h1><Link href="/" data-testid="link-back-home" className="quiet-button mt-6">Back to overview</Link></div></Route>
  </Switch></AccessGate>;
}
function AuthRouter() {
  const {isLoaded,isSignedIn} = useAuth();
  const [location] = useLocation();
  if(!isLoaded) return <div className="min-h-[100dvh] p-8 sm:p-14"><Brand/><div className="max-w-xl mx-auto mt-24"><State kind="loading"/></div></div>;
  if(!isSignedIn) return location.startsWith('/sign-in') ? <SignInPage/> : <Redirect to="/sign-in"/>;
  if(location.startsWith('/sign-in')) return <Redirect to="/"/>;
  return <ProtectedRouter/>;
}
function DemoRouter() {
  const [location, navigate] = useLocation();
  const query = useGetCrmTaxonomy({query:{queryKey:getGetCrmTaxonomyQueryKey(),retry:false,staleTime:0}});
  const client = useQueryClient();
  const endSession = useDeleteCrmDemoSession();
  const signOut = async () => {
    try {
      await endSession.mutateAsync();
      client.clear();
      navigate('/sign-in', {replace:true});
    } catch {
      // Keep the protected view until the server confirms that the session ended.
    }
  };
  if (query.isLoading) return <div className="min-h-[100dvh] p-8 sm:p-14"><Brand/><div className="max-w-xl mx-auto mt-24"><State kind="loading"/></div></div>;
  if (!query.data) return location.startsWith('/sign-in') ? <SignInPage/> : <Redirect to="/sign-in"/>;
  if (location.startsWith('/sign-in')) return <Redirect to="/"/>;
  return <Shell name="Staff member" development onSignOut={signOut}><Switch>
    <Route path="/" component={Dashboard}/>
    <Route path="/audience" component={Audience}/>
    <Route path="/audience/:id" component={Profile}/>
    <Route path="/communications" component={Communications}/>
    <Route path="/enquiries" component={Enquiries}/>
    <Route><Redirect to="/"/></Route>
  </Switch></Shell>;
}
function App() {
  return <QueryClientProvider client={client}><WouterRouter base={basePath}>{crmDemoMode ? <DemoRouter/> : <StaffClerkProvider><AuthRouter/></StaffClerkProvider>}</WouterRouter></QueryClientProvider>;
}
export default App;