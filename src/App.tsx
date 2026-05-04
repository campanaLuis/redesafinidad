import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoginPage from "./pages/LoginPage";
import DashboardHome from "./pages/DashboardHome";
import SeguidoresPage from "./pages/SeguidoresPage";
import SocialNetworksPage from "./pages/SocialNetworksPage";
import EjercitoPagina from "./pages/EjercitoPagina";
import BeneficiariosPage from "./pages/BeneficiariosPage";
import AtencionCiudadanaPage from "./pages/AtencionCiudadanaPage";
import EncuestaPage from "./pages/EncuestaPage";
import EstructuraTerritorialPage from "./pages/EstructuraTerritorialPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1500,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/"                       element={<PrivateRoute><ErrorBoundary><DashboardHome /></ErrorBoundary></PrivateRoute>} />
            <Route path="/redes-de-afinidad"       element={<PrivateRoute><ErrorBoundary><SeguidoresPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/ejercito-digital"       element={<PrivateRoute><ErrorBoundary><EjercitoPagina /></ErrorBoundary></PrivateRoute>} />
            <Route path="/beneficiarios"          element={<PrivateRoute><ErrorBoundary><BeneficiariosPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/atencion-ciudadana"     element={<PrivateRoute><ErrorBoundary><AtencionCiudadanaPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/redes-sociales"         element={<PrivateRoute><ErrorBoundary><SocialNetworksPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/encuesta-telefonica"    element={<PrivateRoute><ErrorBoundary><EncuestaPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="/estructura-territorial" element={<PrivateRoute><ErrorBoundary><EstructuraTerritorialPage /></ErrorBoundary></PrivateRoute>} />
            <Route path="*"                       element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
