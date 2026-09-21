import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { useEffect } from "react";
import "./index.css";
import "./paper-orange.css";
import { programmeRouteForHash, scrollToHash } from "./utils/navigation";

import { Home } from "./pages/home";
import { RolesPage } from "./pages/roles";
import { RoleDetailPage } from "./pages/role-detail";
import { OpportunityPage } from "./pages/opportunity";
import { OpportunitiesIndexPage } from "./pages/opportunities-index";
import { PrivacyNoticePage, TermsPage } from "./pages/legal";
import { UnsubscribePage } from "./pages/unsubscribe";
import { TrainingPage, DevelopmentPage } from "./pages/programme-overview";

const queryClient = new QueryClient();

function ScrollManager() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const pathname = window.location.pathname.slice(base.length);
      const programmeRoute = programmeRouteForHash(pathname, hash);
      if (programmeRoute) {
        navigate(`${programmeRoute}${window.location.search}`, { replace: true });
        return;
      }
      if (hash) {
        scrollToHash(hash);
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    };

    handleHash();

    // Optionally handle native hash changes (like back/forward buttons)
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("popstate", handleHash);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("popstate", handleHash);
    };
  }, [location, navigate]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <ScrollManager />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/training" component={TrainingPage} />
        <Route path="/development" component={DevelopmentPage} />
        <Route path="/roles" component={RolesPage} />
        <Route path="/roles/:id">
          {(params) => <RoleDetailPage id={params.id} />}
        </Route>
        <Route path="/opportunities" component={OpportunitiesIndexPage} />
        <Route path="/opportunities/:id">
          {(params) => <OpportunityPage id={params.id} />}
        </Route>
        <Route path="/privacy" component={PrivacyNoticePage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/unsubscribe" component={UnsubscribePage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
