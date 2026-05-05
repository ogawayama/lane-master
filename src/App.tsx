import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import LoginScreen from "./pages/LoginScreen";
import OdtScreen from "./pages/OdtScreen";
import LiveFireScreen from "./pages/LiveFireScreen";
import Qm360Screen from "./pages/Qm360Screen";
import LaneOverview from "./pages/LaneOverview";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/idt" element={<LoginScreen />} />
          <Route path="/odt" element={<OdtScreen />} />
          <Route path="/live-fire" element={<LiveFireScreen />} />
          <Route path="/qm360" element={<Qm360Screen />} />
          <Route path="/lanes" element={<LaneOverview />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
