import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { pathname } = useLocation();
  const [isLight, setIsLight] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      root.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  }, [isLight]);

  if (pathname !== "/") return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur px-3 py-1.5 shadow-lg">
      <Moon className="h-4 w-4 text-muted-foreground" />
      <Switch checked={isLight} onCheckedChange={setIsLight} aria-label="Toggle theme" />
      <Sun className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
