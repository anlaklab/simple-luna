import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch } from "wouter";

// Import pages
import Home from "./pages/home";
import Presentations from "./pages/presentations";
import PresentationAnalysis from "./pages/presentation-analysis";
import PresentationAnalysisNew from "./pages/presentation-analysis-new";
import Converter from "./pages/converter";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/presentations" component={Presentations} />
      <Route path="/converter" component={Converter} />
      
      {/* Legacy presentation analysis (keep for backward compatibility) */}
      <Route path="/presentations/:id" component={PresentationAnalysis} />
      
      {/* New presentation analysis with Screaming Architecture */}
      <Route path="/presentations/:id/analysis" component={PresentationAnalysisNew} />
      <Route path="/analysis/:id" component={PresentationAnalysisNew} />
      
      {/* Catch all */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
