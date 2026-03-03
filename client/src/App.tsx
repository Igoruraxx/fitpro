import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SplashScreen from "./components/SplashScreen";
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
import Upgrade from "./pages/Upgrade";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail from "./pages/ConfirmEmail";
import LoginOtp from "./pages/LoginOtp";

function Router() {
  return (
    <Switch>
      {/* Auth Routes - No AppLayout */}
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/confirm-email" component={ConfirmEmail} />
      <Route path="/login-otp" component={LoginOtp} />

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
              <Route path="/upgrade" component={Upgrade} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Mostrar splash apenas na primeira visita da sessão
    const seen = sessionStorage.getItem("fitpro_splash_seen");
    if (seen) return false;
    sessionStorage.setItem("fitpro_splash_seen", "1");
    return true;
  });

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
