import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AppClerkProvider, clerkBasePath } from '@/lib/clerk';
import { useAuth, useClerk } from '@clerk/react';
import { useGetPortalSession } from '@workspace/api-client-react';
import { PortalLayout } from '@/components/layout/portal-layout';

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
  const { signOut } = useClerk();
  const status = (error as { status?: number } | null)?.status;

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Verifying portal access
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6 text-foreground">
        <div className="max-w-lg border border-border bg-card p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Larkin2 portal</p>
          <h1 className="mt-4 text-3xl font-semibold">
            {status === 403 ? "Access awaiting approval" : "We could not verify your access"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {status === 403
              ? "A portal administrator must approve your account before you can view opportunity data."
              : "Please try signing in again. If the problem continues, contact a portal administrator."}
          </p>
          <button
            type="button"
            className="mt-6 bg-primary px-4 py-2 font-semibold text-primary-foreground"
            onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })}
          >
            Sign out
          </button>
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
      <div className="border border-border bg-card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Restricted</p>
        <h1 className="mt-3 text-2xl font-semibold">You do not have permission to view this page</h1>
        <p className="mt-2 text-muted-foreground">
          Ask a Super Admin if your portal responsibilities have changed.
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

function Router() {
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

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AppClerkProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AppClerkProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
