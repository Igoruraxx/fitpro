import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Evolucao from "./pages/Evolucao";
import Financas from "./pages/Financas";
import Perfil from "./pages/Perfil";
import Admin from "./pages/Admin";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Agenda} />
        <Route path="/clientes" component={Clientes} />
        <Route path="/clientes/:id" component={ClienteDetalhe} />
        <Route path="/evolucao" component={Evolucao} />
        <Route path="/financas" component={Financas} />
        <Route path="/perfil" component={Perfil} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
