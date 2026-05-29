import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useColorScheme } from "@mui/material/styles";
import { Switch } from "@/components/ui/switch";

/**
 * ThemeToggle (M3-anpassad 2026-05-28).
 *
 * Kopplad till MUI:s useColorScheme() så MUI-komponenter får rätt
 * scheme. Speglar även html.light-klassen för eventuella shadcn-rester.
 *
 * Visas på alla sidor UTOM /duk (duken är en projektor, alltid dark
 * IRL — i dev-läge ärver den apptemat men har ingen toggle synlig).
 */
export function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  // useColorScheme returnerar undefined på första render (SSR-säker).
  // Default = mode från CssVarsProvider (dark per defaultMode).
  const isLight = mode === "light";

  // Synka BÅDE:
  //  1. data-mui-color-scheme-attribute → MUI-komponenter (CssVarsProvider
  //     sätter inte attributet på mount; bara vid mode-ändring)
  //  2. html.light-klassen → shadcn-cascade
  // Hand-rolled eftersom MUI:s defaultMode="dark" inte initialiserar
  // attributet — vilket gör att :root[data-mui-color-scheme='dark']
  // CSS-selektorn aldrig matchar by default.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const scheme = isLight ? "light" : "dark";
    root.setAttribute("data-mui-color-scheme", scheme);
    if (isLight) {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [isLight]);

  // Duken är projektor — i produktion ska toggle inte synas där.
  // Under aktiv dev/test: visa även på /duk så scheme kan jämföras.
  // TODO: re-add `if (useLocation().pathname.startsWith("/duk")) return null;`
  // innan testdriving med riktiga testpersoner.

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur px-3 py-1.5 shadow-lg">
      <Moon className="h-4 w-4 text-muted-foreground" />
      <Switch
        checked={isLight}
        onCheckedChange={(val) => setMode(val ? "light" : "dark")}
        aria-label="Toggle theme"
      />
      <Sun className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
