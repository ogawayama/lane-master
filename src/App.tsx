import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { m3Theme, m3ThemeHighContrast, m3ThemeMediumContrast, saabTheme } from "@/theme/m3Theme";
import Landing from "./pages/Landing";
import LoginScreen from "./pages/LoginScreen";
import OdtScreen from "./pages/OdtScreen";
import LiveFireScreen from "./pages/LiveFireScreen";
import Qm360Screen from "./pages/Qm360Screen";
import IdtLanes from "./pages/IdtLanes";
import OdtLanes from "./pages/OdtLanes";
import LiveFireLanes from "./pages/LiveFireLanes";
import Qm360Lanes from "./pages/Qm360Lanes";
import IdtAdmin from "./pages/IdtAdmin";
import OdtAdmin from "./pages/OdtAdmin";
import LiveFireAdmin from "./pages/LiveFireAdmin";
import Qm360Admin from "./pages/Qm360Admin";
import NotFound from "./pages/NotFound";
// Helhetsprototyp — Pass 0 shells + Pass 2 prepare
import DukShell from "./pages/prototyp/DukShell";
import TabletShell from "./pages/prototyp/TabletShell";
import WizardShell from "./pages/prototyp/WizardShell";
import PreparePage from "./pages/prototyp/PreparePage";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  surfaceIntent,
  surfaceForPath,
  surfaceThemesForBrand,
} from "@/theme/surfaces";
import { useUserHubSync } from "@/hooks/useUserHubSync";
import { viewMetaForPath } from "@/theme/viewMeta";

const queryClient = new QueryClient();

const AppShell = () => {
  useUserHubSync();
  return null;
};

// Theme-toggle visas bara på root (/) och facilitator-panelen (/wizard).
// På duk/tablet/check-in är den oönskad chrome på en projektor-yta.
const ConditionalThemeToggle = () => {
  const { pathname } = useLocation();
  const show = pathname === "/" || pathname === "/wizard";
  return show ? <ThemeToggle /> : null;
};

// Scope:ar ytans mode på ett WRAPPER-element via data-mui-color-scheme.
// MUI genererar attribut-selektorer (`[data-mui-color-scheme="light"]`) vars
// CSS-variabler kaskaderar till subträdet — så detta tvingar ytans schema
// OBEROENDE av vad MUI sätter på <html> globalt.
// VIKTIGT: vi använder medvetet INTE setMode (skriver storage + triggar
// reconcile-flicker) och inte heller manuell html-attribut-manipulation
// (MUI:s provider återställer html-attributet → flicker). Scope = stabilt.
const ModeScope = ({
  mode,
  children,
}: {
  mode: "light" | "dark";
  children: React.ReactNode;
}) => {
  return (
    <div
      data-mui-color-scheme={mode}
      style={{
        minHeight: "100vh",
        colorScheme: mode,
        backgroundColor: "var(--mui-palette-background-default)",
        color: "var(--mui-palette-text-primary)",
      }}
    >
      {children}
    </div>
  );
};

// Ett route-styrt ThemeProvider: pathname → yt-tema (motion/densitet). Mode
// scope:as per yta via SurfaceScope (ovan), inte via provider-mode. Ligger
// inuti BrowserRouter så useLocation funkar; inga nästlade ThemeProviders.
const ThemedApp = () => {
  const { pathname, search } = useLocation();
  const surface = surfaceForPath(pathname);
  const params = new URLSearchParams(search);
  // ?contrast=high|medium → M3 high/medium contrast baseline (annars standard).
  const contrastParam = params.get("contrast");
  const contrast =
    contrastParam === "high" ? "high" : contrastParam === "medium" ? "medium" : "standard";
  // Saab-branding är default på alla vyer (2026-06-02). ?brand=m3 → teal-M3.
  const brand = params.get("brand") === "m3" ? "m3" : "saab";
  const baseTheme =
    brand === "saab"
      ? saabTheme
      : contrast === "high"
        ? m3ThemeHighContrast
        : contrast === "medium"
          ? m3ThemeMediumContrast
          : m3Theme;
  const theme = surface ? surfaceThemesForBrand(brand, contrast)[surface] : baseTheme;
  // ?mode=light|dark → överrider ytans default-mode (spot-check).
  const modeParam = params.get("mode");
  const modeOverride = modeParam === "light" || modeParam === "dark" ? modeParam : null;
  // Vilket mode ska scope:as på wrapper-elementet?
  //  • explicit ?mode vinner alltid
  //  • Saab: DARK som default på ALLA ytor (även annars-ljusa kiosk/prepare)
  //  • M3 yt-route: ytans egna intent-mode (light/dark)
  //  • M3 bas-route: null → ingen scope, ThemeToggle/provider styr (oförändrat)
  const scopeMode: "light" | "dark" | null =
    modeOverride ??
    (brand === "saab" ? "dark" : surface ? surfaceIntent[surface].mode : null);

  // Per-vy dokumenttitel + favicon (se theme/viewMeta.ts).
  useEffect(() => {
    const { title, svg } = viewMetaForPath(pathname);
    document.title = title === "Gunnery & Skills" ? title : `${title} · G&S`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }, [pathname]);
  const routes = (
    <>
      <ConditionalThemeToggle />
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
        <Route path="/idt/admin" element={<IdtAdmin />} />
        <Route path="/odt/admin" element={<OdtAdmin />} />
        <Route path="/live-fire/admin" element={<LiveFireAdmin />} />
        <Route path="/qm360/admin" element={<Qm360Admin />} />
        {/* Helhetsprototyp — skal-spår (spår 05) — drivs av sessions-tabellen */}
        <Route path="/duk" element={<DukShell />} />
        <Route path="/tablet" element={<TabletShell />} />
        <Route path="/tablet/prepare" element={<PreparePage />} />
        <Route path="/wizard" element={<WizardShell />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
  return (
    <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey="lanemaster-color-scheme">
      <CssBaseline enableColorScheme />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppShell />
        {scopeMode ? <ModeScope mode={scopeMode}>{routes}</ModeScope> : routes}
      </TooltipProvider>
    </ThemeProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemedApp />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
