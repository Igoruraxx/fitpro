import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Evolucao from "./pages/Evolucao";
import Financas from "./pages/Financas";
import Perfil from "./pages/Perfil";
import Admin from "./pages/Admin";
import Fotos from "./pages/Fotos";
import RelatorioPlanos from "./pages/RelatorioPlanos";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail from "./pages/ConfirmEmail";

function Router() {
  return (
    <Switch>
      {/* Auth Routes - No AppLayout */}
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/confirm-email" component={ConfirmEmail} />

      {/* App Routes - With AppLayout */}
      <Route>
        {() => (
          <AppLayout>
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/" component={Agenda} />
              <Route path="/clientes" component={Clientes} />
              <Route path="/clientes/:id" component={ClienteDetalhe} />
              <Route path="/fotos" component={Fotos} />
              <Route path="/relatorio-planos" component={RelatorioPlanos} />
              <Route path="/evolucao" component={Evolucao} />
              <Route path="/financas" component={Financas} />
              <Route path="/perfil" component={Perfil} />
              <Route path="/admin" component={Admin} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
