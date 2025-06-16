import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

// Import pages
import Login from "@/pages/auth/login";
import Dashboard from "@/pages/dashboard";
import Sales from "@/pages/sales-new";
import Quotations from "@/pages/sales/quotations";
import QuotationsNew from "@/pages/sales/quotations-new";
import QuotationsEdit from "@/pages/sales/quotations-edit";
import Invoices from "@/pages/sales/invoices";
import TaxInvoices from "@/pages/sales/tax-invoices";
import Receipts from "@/pages/sales/receipts";
import Production from "@/pages/production";
import ProductionCalendar from "@/pages/production/calendar";
import OrganizationChart from "@/pages/production/organization";
import WorkQueue from "@/pages/production/work-queue";
import WorkSteps from "@/pages/production/work-steps-simple";
import WorkOrders from "@/pages/production/work-orders";
import WorkOrderForm from "@/pages/production/work-order-form";
import WorkQueuePlanning from "@/pages/production/work-queue-planning";
import DailyWorkLog from "@/pages/production/daily-work-log";
import ProductionReports from "@/pages/production/production-reports";
import Accounting from "@/pages/accounting";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import MasterData from "@/pages/master-data";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import Permissions from "@/pages/permissions";
import MainLayout from "@/components/layout/main-layout";

// Unauthorized page
function Unauthorized() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-gray-600 mb-6">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <button
          onClick={logout}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <MainLayout>{children}</MainLayout>;
}

// Public route wrapper (for login page)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <main className="min-h-screen bg-background">
          <Switch>
            {/* Public routes */}
            <Route path="/login">
              <PublicRoute>
                <Login />
              </PublicRoute>
            </Route>
            <Route path="/unauthorized">
              <Unauthorized />
            </Route>

            {/* Protected routes */}
            <Route path="/">
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Route>
            
            <Route path="/dashboard">
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Route>
            
            <Route path="/sales">
              <ProtectedRoute>
                <Sales />
              </ProtectedRoute>
            </Route>
            
            <Route path="/quotations">
              <ProtectedRoute>
                <Quotations />
              </ProtectedRoute>
            </Route>
            
            <Route path="/quotations/new">
              <ProtectedRoute>
                <QuotationsNew />
              </ProtectedRoute>
            </Route>
            
            <Route path="/quotations/edit/:id">
              <ProtectedRoute>
                <QuotationsEdit />
              </ProtectedRoute>
            </Route>
            
            <Route path="/invoices">
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            </Route>
            
            <Route path="/tax-invoices">
              <ProtectedRoute>
                <TaxInvoices />
              </ProtectedRoute>
            </Route>
            
            <Route path="/receipts">
              <ProtectedRoute>
                <Receipts />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production">
              <ProtectedRoute>
                <Production />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/calendar">
              <ProtectedRoute>
                <ProductionCalendar />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/organization">
              <ProtectedRoute>
                <OrganizationChart />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/work-queue">
              <ProtectedRoute>
                <WorkQueue />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/work-steps">
              <ProtectedRoute>
                <WorkSteps />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/work-orders">
              <ProtectedRoute>
                <WorkOrders />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/work-orders/new">
              <ProtectedRoute>
                <WorkOrderForm />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/work-orders/edit/:id">
              <ProtectedRoute>
                <WorkOrderForm />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/queue-planning">
              <ProtectedRoute>
                <WorkQueuePlanning />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/daily-work-log">
              <ProtectedRoute>
                <DailyWorkLog />
              </ProtectedRoute>
            </Route>
            
            <Route path="/production/reports">
              <ProtectedRoute>
                <ProductionReports />
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
            
            <Route path="/permissions">
              <ProtectedRoute>
                <Permissions />
              </ProtectedRoute>
            </Route>

            {/* 404 page */}
            <Route>
              <ProtectedRoute>
                <div className="text-center py-8">
                  <h1 className="text-2xl font-bold">ไม่พบหน้าที่ต้องการ</h1>
                </div>
              </ProtectedRoute>
            </Route>
          </Switch>
        </main>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;