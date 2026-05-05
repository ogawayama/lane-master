import { Link } from "react-router-dom";

const links = [
  {
    to: "/idt",
    label: "IDT",
    classes:
      "border-[hsl(var(--primary)/0.4)] text-primary hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_30px_hsl(var(--primary)/0.35)]",
  },
  {
    to: "/odt",
    label: "ODT",
    classes:
      "border-[hsl(140_80%_45%/0.4)] text-[hsl(140_80%_55%)] hover:border-[hsl(140_80%_55%)] hover:bg-[hsl(140_80%_45%/0.1)] hover:shadow-[0_0_30px_hsl(140_80%_55%/0.35)]",
  },
  {
    to: "/live-fire",
    label: "Live Fire",
    classes:
      "border-[hsl(0_85%_55%/0.4)] text-[hsl(0_85%_60%)] hover:border-[hsl(0_85%_60%)] hover:bg-[hsl(0_85%_55%/0.1)] hover:shadow-[0_0_30px_hsl(0_85%_60%/0.35)]",
  },
  {
    to: "/qm360",
    label: "QM 360",
    classes:
      "border-[hsl(28_95%_55%/0.4)] text-[hsl(28_95%_60%)] hover:border-[hsl(28_95%_60%)] hover:bg-[hsl(28_95%_55%/0.1)] hover:shadow-[0_0_30px_hsl(28_95%_60%/0.35)]",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-foreground mb-12 tracking-tight">
        GC IDT
      </h1>
      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`group relative flex items-center justify-center h-32 rounded-lg border bg-card text-2xl font-semibold tracking-wide transition-all ${link.classes}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
