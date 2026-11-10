import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { getGetPortalSessionQueryKey, useGetPortalSession } from '@workspace/api-client-react';
import { PortalLayout } from '@/components/layout/portal-layout';
import { Larkin2Wordmark } from '@/components/brand';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createStaffQueryClient, errorStatus, useIdentityCacheGuard, useStaffSession, useStaffSignOut } from '@/lib/staff-auth';

// Pages
import LandingPage from '@/pages/index';
import SignInPage from '@/pages/sign-in';
import SignUpPage from '@/pages/sign-up';
import ForgotPasswordPage from '@/pages/forgot-password';
import SetPasswordPage from '@/pages/set-password';
import DashboardPage from '@/pages/dashboard';
import OpportunitiesPage from '@/pages/opportunities/index';
import NewOpportunityPage from '@/pages/opportunities/new';
import DetailOpportunityPage from '@/pages/opportunities/detail';
import EditOpportunityPage from '@/pages/opportunities/edit';
import ProgrammesPage from '@/pages/programmes/index';
import NewProgrammePage from '@/pages/programmes/new';
import DetailProgrammePage from '@/pages/programmes/detail';
import EditProgrammePage from '@/pages/programmes/edit';
import SettingsPage from '@/pages/settings';

const queryClient = createStaffQueryClient();

function PortalAccessGate({ children }: { children: ReactNode }) {
  const { data: session, isLoading, error, refetch, isFetching } = useGetPortalSession({
    query: { queryKey: getGetPortalSessionQueryKey(), retry: false, refetchOnWindowFocus: true, staleTime: 60_000 },
  });
  const status = errorStatus(error);
  const { signOut, isPending, isError: signOutFailed } = useStaffSignOut(() => undefined);

  if (isLoading) {
    return <FullScreenMessage>Verifying portal access...</FullScreenMessage>;
  }

  if (!session) {
    if (status === 401) return <Redirect to="/sign-in" />;
    const denied = status === 403;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 sm:px-6 text-foreground">
        <div className="w-full max-w-md border border-border bg-[#171b1d] p-6 sm:p-8 md:p-12 text-center break-words">
          <Larkin2Wordmark className="mb-8" />
          <h1 className="font-mono text-2xl font-medium tracking-tight mb-4">
            {denied ? "Access Not Active" : "Verification Failed"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            {denied
              ? "Your account is signed in but does not currently have portal access. A super admin can activate or restore it."
              : "Your portal permissions could not be loaded. Try again, or contact a portal administrator if the problem continues."}
          </p>
          <div className="flex flex-col gap-3">
            {!denied && (
              <Button variant="outline" disabled={isFetching} data-testid="button-retry-access" className="w-full h-12 rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => refetch()}>
                {isFetching ? "Checking..." : "Try again"}
              </Button>
            )}
            <Button variant="outline" disabled={isPending} data-testid="button-sign-out-access" className="w-full h-12 rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => void signOut()}>
              {isPending ? "Signing out..." : "Sign out"}
            </Button>
            {signOutFailed && <p role="alert" className="text-xs text-destructive">Sign-out did not complete. Try again.</p>}
          </div>
        </div>
      </div>
    );
  }

  return children;
}

type PortalPermission =
  | "opportunities:read"
  | "opportunities:write"
  | "opportunities:publish"
  | "opportunities:delete"
  | "opportunity-options:manage"
  | "programmes:read"
  | "programmes:write"
  | "programmes:publish"
  | "programmes:delete"
  | "members:manage";

function PermissionGate({
  permission,
  children,
}: {
  permission: PortalPermission;
  children: ReactNode;
}) {
  const { data: session } = useGetPortalSession();

  if (!session?.permissions.includes(permission)) {
    return (
      <div className="border border-border bg-[#171b1d] p-6 sm:p-8 md:p-12 text-center max-w-2xl mx-4 md:mx-auto my-12 break-words">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-6" />
        <h1 className="font-mono text-2xl font-medium tracking-tight mb-4">Restricted Area</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You do not have permission to view this page. Ask a Super Admin if your portal responsibilities have changed.
        </p>
      </div>
    );
  }

  return children;
}

function AuthenticatedRoutes() {
  return (
    <PortalAccessGate>
      <PortalLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />

          <Route path="/opportunities">
            <PermissionGate permission="programmes:read">
              <ProgrammesPage />
            </PermissionGate>
          </Route>
          <Route path="/opportunities/new">
            <PermissionGate permission="programmes:write">
              <NewProgrammePage />
            </PermissionGate>
          </Route>
          <Route path="/opportunities/:id">
            <PermissionGate permission="programmes:read">
              <DetailProgrammePage />
            </PermissionGate>
          </Route>
          <Route path="/opportunities/:id/edit">
            <PermissionGate permission="programmes:write">
              <EditProgrammePage />
            </PermissionGate>
          </Route>

          <Route path="/roles" component={OpportunitiesPage} />
          <Route path="/roles/new">
            <PermissionGate permission="opportunities:write">
              <NewOpportunityPage />
            </PermissionGate>
          </Route>
          <Route path="/roles/:id" component={DetailOpportunityPage} />
          <Route path="/roles/:id/edit">
            <PermissionGate permission="opportunities:write">
              <EditOpportunityPage />
            </PermissionGate>
          </Route>
          <Route path="/settings">
            <PermissionGate permission="members:manage">
              <SettingsPage />
            </PermissionGate>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </PortalLayout>
    </PortalAccessGate>
  );
}

function StaffRouter() {
  const { user, isLoading, isUnavailable, refetch } = useStaffSession();
  useIdentityCacheGuard(isLoading || isUnavailable ? undefined : user ? `${user.userId}:${user.role}` : null);
  const [location] = useLocation();
  const isAuthPage = ["/sign-in", "/forgot-password", "/set-password", "/sign-up"].some((p) => location.startsWith(p));

  if (isLoading && !isAuthPage) {
    return <FullScreenMessage>Checking your session...</FullScreenMessage>;
  }

  if (isUnavailable && !isAuthPage) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 sm:px-6 text-foreground">
        <div className="w-full max-w-md border border-border bg-[#171b1d] p-6 sm:p-8 md:p-12 text-center break-words">
          <Larkin2Wordmark className="mb-8" />
          <h1 className="font-mono text-2xl font-medium tracking-tight mb-4">Portal Unavailable</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            We could not reach the staff sign-in service, so you have not been signed in. Check your connection and try again. If this continues, contact a portal administrator.
          </p>
          <Button variant="outline" data-testid="button-retry-session" className="w-full h-12 rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const signedIn = Boolean(user);

  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/sign-in">{signedIn ? <Redirect to="/dashboard" /> : <SignInPage />}</Route>
        <Route path="/forgot-password">{signedIn ? <Redirect to="/dashboard" /> : <ForgotPasswordPage />}</Route>
        <Route path="/set-password" component={SetPasswordPage} />
        <Route path="/sign-up">{signedIn ? <Redirect to="/dashboard" /> : <SignUpPage />}</Route>
        <Route path="/">{signedIn ? <Redirect to="/dashboard" /> : <LandingPage />}</Route>
        <Route path="/*">{signedIn ? <AuthenticatedRoutes key={`${user?.userId}:${user?.role}`} /> : <Redirect to="/sign-in" />}</Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 sm:px-6 text-foreground">
      <Larkin2Wordmark className="mb-6 opacity-50" />
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground animate-pulse">{children}</p>
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <TooltipProvider>
          <StaffRouter />
          <Toaster />
        </TooltipProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
