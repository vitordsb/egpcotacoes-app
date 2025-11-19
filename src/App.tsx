import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SupplierLogin from "./pages/SupplierLogin";
import SupplierQuotation from "./pages/SupplierQuotation";
import AdminDashboard from "./pages/AdminDashboard";
import { AuthProvider } from "@/_core/hooks/useAuth";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/supplier/login"} component={SupplierLogin} />
      <Route path={"/supplier/access"} component={SupplierLogin} />
      <Route path={"/supplier/quotations"} component={SupplierQuotation} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="light"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
