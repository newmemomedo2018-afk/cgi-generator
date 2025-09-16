import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Pricing from "@/pages/pricing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show landing page for unauthenticated users on root path
  const HomePage = () => {
    return (isLoading || !isAuthenticated) ? <Landing /> : <Dashboard />;
  };

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div dir="rtl" className="min-h-screen">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
