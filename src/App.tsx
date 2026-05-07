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
import IdtLanes from "./pages/IdtLanes";
import OdtLanes from "./pages/OdtLanes";
import LiveFireLanes from "./pages/LiveFireLanes";
import Qm360Lanes from "./pages/Qm360Lanes";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { ThemeToggle } from "@/components/ThemeToggle";

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
          <Route path="/idt/lanes" element={<IdtLanes />} />
          <Route path="/odt/lanes" element={<OdtLanes />} />
          <Route path="/live-fire/lanes" element={<LiveFireLanes />} />
          <Route path="/qm360/lanes" element={<Qm360Lanes />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
