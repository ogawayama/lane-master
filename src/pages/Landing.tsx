import { Link } from "react-router-dom";

const links = [
  { to: "/idt", label: "IDT" },
  { to: "/odt", label: "ODT" },
  { to: "/live-fire", label: "Live Fire" },
  { to: "/qm360", label: "QM360" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-foreground mb-12 tracking-tight">
        Range Control
      </h1>
      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group relative flex items-center justify-center h-32 rounded-lg border border-primary/30 bg-card text-card-foreground text-2xl font-semibold tracking-wide transition-all hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
          >
            <span className="text-primary group-hover:text-primary">
              {link.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
