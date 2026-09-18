import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { useEffect } from "react";
import "./index.css";
import { scrollToHash } from "./utils/navigation";

import { Home } from "./pages/home";
import { RolesPage } from "./pages/roles";
import { RoleDetailPage } from "./pages/role-detail";
import { OpportunityPage } from "./pages/opportunity";
import { PrivacyNoticePage, TermsPage } from "./pages/legal";
import { UnsubscribePage } from "./pages/unsubscribe";

const queryClient = new QueryClient();

function ScrollManager() {
  const [location] = useLocation();

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash) {
        scrollToHash(hash);
      } else {
        window.scrollTo(0, 0);
      }
    };

    handleHash();

    // Optionally handle native hash changes (like back/forward buttons)
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [location]);

  return null;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <ScrollManager />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/roles" component={RolesPage} />
        <Route path="/roles/:id">
          {(params) => <RoleDetailPage id={params.id} />}
        </Route>
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
