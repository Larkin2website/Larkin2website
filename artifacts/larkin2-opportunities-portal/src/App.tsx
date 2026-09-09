import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AppClerkProvider, clerkBasePath } from '@/lib/clerk';
import { useAuth, useClerk } from '@clerk/react';
import { getGetPortalSessionQueryKey, useGetPortalSession } from '@workspace/api-client-react';
import { PortalLayout } from '@/components/layout/portal-layout';
import { Larkin2Wordmark } from '@/components/brand';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { portalDemoMode } from '@/lib/demo-mode';

// Pages
import LandingPage from '@/pages/index';
import SignInPage from '@/pages/sign-in';
import SignUpPage from '@/pages/sign-up';
import DashboardPage from '@/pages/dashboard';
import OpportunitiesPage from '@/pages/opportunities/index';
import NewOpportunityPage from '@/pages/opportunities/new';
import DetailOpportunityPage from '@/pages/opportunities/detail';
import EditOpportunityPage from '@/pages/opportunities/edit';
import SettingsPage from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PortalAccessGate({ children }: { children: ReactNode }) {
  const { data: session, isLoading, error } = useGetPortalSession();
  const status = (error as { status?: number } | null)?.status;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 sm:px-6 text-foreground">
        <Larkin2Wordmark className="mb-6 opacity-50" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
          Verifying portal access...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 sm:px-6 text-foreground">
        <div className="w-full max-w-md border border-border bg-[#171b1d] p-6 sm:p-8 md:p-12 text-center break-words">
          <Larkin2Wordmark className="mb-8" />
          <h1 className="font-mono text-2xl font-medium tracking-tight mb-4">
            {status === 403 ? "Access Awaiting Approval" : "Verification Failed"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            {status === 403
              ? "A portal administrator must approve your account before you can view opportunity data."
              : "Please try signing in again. If the problem continues, contact a portal administrator."}
          </p>
          {portalDemoMode ? (
            <Button
              variant="outline"
              className="w-full h-12 rounded-none font-mono text-xs uppercase tracking-wider"
              onClick={() => window.location.reload()}
            >
              Retry demo
            </Button>
          ) : (
            <ClerkAccessFailureAction />
          )}
        </div>
      </div>
    );
  }

  return children;
}

function ClerkAccessFailureAction() {
  const { signOut } = useClerk();
  return (
    <Button
      variant="outline"
      className="w-full h-12 rounded-none font-mono text-xs uppercase tracking-wider"
      onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })}
    >
      Sign out
    </Button>
  );
}

type PortalPermission =
  | "opportunities:read"
  | "opportunities:write"
  | "opportunities:publish"
  | "opportunities:delete"
  | "opportunity-options:manage"
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
          <Route path="/opportunities" component={OpportunitiesPage} />
          <Route path="/opportunities/new">
            <PermissionGate permission="opportunities:write">
              <NewOpportunityPage />
            </PermissionGate>
          </Route>
          <Route path="/opportunities/:id" component={DetailOpportunityPage} />
          <Route path="/opportunities/:id/edit">
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

function ClerkRouter() {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) return null;

  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Public auth routes */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        
        {/* Root is handled specially based on auth status */}
        <Route path="/">
          {!isSignedIn ? <LandingPage /> : <Redirect to="/dashboard" />}
        </Route>
        
        {/* All other routes require auth */}
        <Route path="/*">
          {isSignedIn ? <AuthenticatedRoutes /> : <LandingPage />}
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function DemoRouter() {
  const { data, isError, isLoading } = useGetPortalSession({
    query: { queryKey: getGetPortalSessionQueryKey(), retry: false },
  });
  const session = isError ? undefined : data;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Checking demo session" />
      </div>
    );
  }

  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/">
          {session ? <Redirect to="/dashboard" /> : <LandingPage />}
        </Route>
        <Route path="/sign-in/*?">
          {session ? <Redirect to="/dashboard" /> : <SignInPage />}
        </Route>
        <Route path="/sign-up/*?">
          {session ? <Redirect to="/dashboard" /> : <LandingPage />}
        </Route>
        <Route path="/*">
          {session ? <AuthenticatedRoutes /> : <Redirect to="/" />}
        </Route>
      </Switch>
    </RoutedErrorBoundary>
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
        {portalDemoMode ? (
          <TooltipProvider>
            <DemoRouter />
            <Toaster />
          </TooltipProvider>
        ) : (
          <AppClerkProvider>
            <TooltipProvider>
              <ClerkRouter />
              <Toaster />
            </TooltipProvider>
          </AppClerkProvider>
        )}
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
