import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Self-hostade fonter — offline-säkra (ingen Google Fonts-CDN), och
// "Roboto Mono" refererades tidigare utan att någonsin laddas.
import "@fontsource/rajdhani/400.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/share-tech-mono/400.css";
import "@fontsource/roboto-mono/400.css";
import "@fontsource/roboto-mono/500.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
