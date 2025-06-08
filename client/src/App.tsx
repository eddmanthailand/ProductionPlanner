import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Sales from "@/pages/sales-new";
import Quotations from "@/pages/sales/quotations";
import QuotationsNew from "@/pages/sales/quotations-new";
import Production from "@/pages/production";
import Accounting from "@/pages/accounting";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import MasterData from "@/pages/master-data";
import Reports from "@/pages/reports";
import Users from "@/pages/users";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Always bypass authentication for development
  return <MainLayout>{children}</MainLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        <PublicRoute>
          <Login />
        </PublicRoute>
      </Route>

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/sales">
        <ProtectedRoute>
          <Sales />
        </ProtectedRoute>
      </Route>

      <Route path="/production">
        <ProtectedRoute>
          <Production />
        </ProtectedRoute>
      </Route>

      <Route path="/accounting">
        <ProtectedRoute>
          <Accounting />
        </ProtectedRoute>
      </Route>

      <Route path="/inventory">
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      </Route>

      <Route path="/customers">
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      </Route>

      <Route path="/master-data">
        <ProtectedRoute>
          <MasterData />
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      </Route>

      {/* Fallback to 404 */}
      <Route>
        <ProtectedRoute>
          <NotFound />
        </ProtectedRoute>
      </Route>
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
