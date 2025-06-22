import React, { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Sales from "@/pages/sales-new";
import Quotations from "@/pages/sales/quotations";
import QuotationsNew from "@/pages/sales/quotations-new";
import QuotationsEdit from "@/pages/sales/quotations-edit";
import Invoices from "@/pages/sales/invoices";
import TaxInvoices from "@/pages/sales/tax-invoices";
import Receipts from "@/pages/sales/receipts";

import ProductionCalendar from "@/pages/production/calendar";
import OrganizationChart from "@/pages/production/organization";
import WorkQueue from "@/pages/production/work-queue";
import WorkSteps from "@/pages/production/work-steps-simple";
import WorkOrders from "@/pages/production/work-orders";
import WorkOrderForm from "@/pages/production/work-order-form";
import WorkQueuePlanning from "@/pages/production/work-queue-planning";
import DailyWorkLog from "@/pages/production/daily-work-log";
import ProductionReports from "@/pages/production/production-reports";
import TeamRevenueReport from "@/pages/production/team-revenue-report";
import WorkQueueTable from "@/pages/production/work-queue-table";
import Accounting from "@/pages/accounting";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import MasterData from "@/pages/master-data";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import UserManagement from "@/pages/user-management";
import PageAccessManagement from "@/pages/page-access-management";
import AccessDemo from "@/pages/access-demo";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();
  
  // Auto-clear JWT when window is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear JWT tokens when user closes the browser/tab
      const token = localStorage.getItem("token");
      if (token) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">กำลังตรวจสอบการเข้าสู่ระบบ...</div>
      </div>
    );
  }
  
  // If not authenticated, show login or landing options
  if (!isAuthenticated || error) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/">
        <MainLayout><Dashboard /></MainLayout>
      </Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/home" component={Home} />
      
      {/* Protected routes with MainLayout */}
      <Route path="/sales">
        <MainLayout><Sales /></MainLayout>
      </Route>
      <Route path="/sales/quotations">
        <MainLayout><Quotations /></MainLayout>
      </Route>
      <Route path="/sales/quotations/new">
        <MainLayout><QuotationsNew /></MainLayout>
      </Route>
      <Route path="/sales/quotations/edit/:id">
        <MainLayout><QuotationsEdit /></MainLayout>
      </Route>
      <Route path="/sales/invoices">
        <MainLayout><Invoices /></MainLayout>
      </Route>
      <Route path="/sales/tax-invoices">
        <MainLayout><TaxInvoices /></MainLayout>
      </Route>
      <Route path="/sales/receipts">
        <MainLayout><Receipts /></MainLayout>
      </Route>

      <Route path="/production/calendar">
        <MainLayout><ProductionCalendar /></MainLayout>
      </Route>
      <Route path="/production/organization">
        <MainLayout><OrganizationChart /></MainLayout>
      </Route>
      <Route path="/production/work-queue">
        <MainLayout><WorkQueue /></MainLayout>
      </Route>
      <Route path="/production/work-queue-planning">
        <MainLayout><WorkQueuePlanning /></MainLayout>
      </Route>
      <Route path="/production/work-steps">
        <MainLayout><WorkSteps /></MainLayout>
      </Route>
      <Route path="/production/work-orders">
        <MainLayout><WorkOrders /></MainLayout>
      </Route>
      <Route path="/production/work-orders/new">
        <MainLayout><WorkOrderForm /></MainLayout>
      </Route>
      <Route path="/production/work-orders/edit/:id">
        <MainLayout><WorkOrderForm /></MainLayout>
      </Route>
      <Route path="/production/production-reports">
        <MainLayout><ProductionReports /></MainLayout>
      </Route>
      <Route path="/production/team-revenue-report">
        <MainLayout><TeamRevenueReport /></MainLayout>
      </Route>
      <Route path="/production/work-queue-table">
        <MainLayout><WorkQueueTable /></MainLayout>
      </Route>
      <Route path="/production/daily-work-log">
        <MainLayout><DailyWorkLog /></MainLayout>
      </Route>
      <Route path="/accounting">
        <MainLayout><Accounting /></MainLayout>
      </Route>
      <Route path="/inventory">
        <MainLayout><Inventory /></MainLayout>
      </Route>
      <Route path="/customers">
        <MainLayout><Customers /></MainLayout>
      </Route>
      <Route path="/master-data">
        <MainLayout><MasterData /></MainLayout>
      </Route>
      <Route path="/reports">
        <MainLayout><Reports /></MainLayout>
      </Route>
      <Route path="/users">
        <MainLayout><Users /></MainLayout>
      </Route>
      <Route path="/user-management">
        <MainLayout><UserManagement /></MainLayout>
      </Route>
      <Route path="/page-access-management">
        <MainLayout><PageAccessManagement /></MainLayout>
      </Route>
      <Route path="/access-demo">
        <MainLayout><AccessDemo /></MainLayout>
      </Route>
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