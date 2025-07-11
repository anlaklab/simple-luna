/**
 * Luna App - Enhanced with Error Handling and Theme System
 * 🎯 RESPONSIBILITY: Main application component with enhanced error handling
 * 📋 SCOPE: Routing, global providers, error boundaries
 * ⚡ FEATURES: Dark/light theme, error boundary, enhanced toasts
 */

import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Theme and Error Handling
import { ThemeProvider } from '@/lib/theme/theme-provider';
import ErrorBoundary from '@/components/error-boundary';
import { useEnhancedToast } from '@/components/enhanced-toast';

// UI Components
import { Toaster } from '@/components/ui/toaster';

// Pages
import Home from '@/pages/home';
import Converter from '@/pages/converter';
import Presentations from '@/pages/presentations';
import PresentationAnalysis from '@/pages/presentation-analysis';
import DebugDashboard from '@/pages/debug-dashboard';
import NotFound from '@/pages/not-found';

// Conditional DevTools import for development only
const ReactQueryDevtools = React.lazy(() =>
  import('@tanstack/react-query-devtools').then((module) => ({
    default: module.ReactQueryDevtools,
  }))
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if (error instanceof Error && error.message.includes('4')) {
          const status = parseInt(error.message.match(/\d{3}/)?.[0] || '0');
          if (status >= 400 && status < 500 && status !== 408) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Global error handler for the application
const useGlobalErrorHandler = () => {
  const { showError } = useEnhancedToast();

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      showError('Unexpected Error', {
        description: 'An unexpected error occurred. Please refresh the page if the issue persists.',
        persistent: true,
        actions: [{
          label: 'Refresh Page',
          action: () => window.location.reload(),
          variant: 'outline',
        }],
      });
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      showError('JavaScript Error', {
        description: 'A runtime error occurred. The application may not function correctly.',
        persistent: true,
        actions: [{
          label: 'Refresh Page',
          action: () => window.location.reload(),
          variant: 'outline',
        }],
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [showError]);
};

// Main App Component
function AppContent() {
  useGlobalErrorHandler();

  return (
    <Router>
      <Switch>
        {/* Home page */}
        <Route path="/" component={Home} />
        
        {/* Converter page */}
        <Route path="/converter" component={Converter} />
        
        {/* Presentations list */}
        <Route path="/presentations" component={Presentations} />
        
        {/* Presentation analysis (both new and legacy routes) */}
        <Route path="/presentations/:id/analysis">
          {(params) => <PresentationAnalysis id={params.id} />}
        </Route>
        <Route path="/analysis/:id">
          {(params) => <PresentationAnalysis id={params.id} />}
        </Route>
        
        {/* Debug dashboard (development/internal use) */}
        <Route path="/debug" component={DebugDashboard} />
        
        {/* 404 page */}
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

// Root App with all providers
function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Root ErrorBoundary caught error:', error, errorInfo);
        
        // Report to monitoring service in production
        if (import.meta.env.PROD) {
          // Example: Sentry.captureException(error, { extra: errorInfo });
        }
      }}
    >
      <ThemeProvider defaultTheme="system" storageKey="luna-ui-theme">
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-background font-sans antialiased">
            <AppContent />
            
            {/* Global Toast Container */}
            <Toaster />
            
            {/* React Query DevTools (development only) */}
            {import.meta.env.DEV && (
              <React.Suspense fallback={null}>
                <ReactQueryDevtools initialIsOpen={false} />
              </React.Suspense>
            )}
          </div>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
