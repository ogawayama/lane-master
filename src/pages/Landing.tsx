import { Link } from "react-router-dom";

const sections = [
  {
    base: "/idt",
    label: "IDT",
    classes:
      "border-[hsl(var(--primary)/0.4)] text-primary hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_30px_hsl(var(--primary)/0.35)]",
  },
  {
    base: "/odt",
    label: "ODT",
    classes:
      "border-[hsl(140_80%_45%/0.4)] text-[hsl(140_80%_55%)] hover:border-[hsl(140_80%_55%)] hover:bg-[hsl(140_80%_45%/0.1)] hover:shadow-[0_0_30px_hsl(140_80%_55%/0.35)]",
  },
  {
    base: "/live-fire",
    label: "Live Fire",
    classes:
      "border-[hsl(0_85%_55%/0.4)] text-[hsl(0_85%_60%)] hover:border-[hsl(0_85%_60%)] hover:bg-[hsl(0_85%_55%/0.1)] hover:shadow-[0_0_30px_hsl(0_85%_60%/0.35)]",
  },
  {
    base: "/qm360",
    label: "QM 360",
    classes:
      "border-[hsl(28_95%_55%/0.4)] text-[hsl(28_95%_60%)] hover:border-[hsl(28_95%_60%)] hover:bg-[hsl(28_95%_55%/0.1)] hover:shadow-[0_0_30px_hsl(28_95%_60%/0.35)]",
  },
];

const subLinks = [
  { suffix: "", label: "Self Service" },
  { suffix: "/lanes", label: "Lanes" },
  { suffix: "/admin", label: "Admin" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-foreground mb-12 tracking-tight">
        THE EHCOSYSTEM
      </h1>
      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl">
        {sections.map((section) => (
          <div
            key={section.base}
            className={`rounded-lg border bg-card p-6 transition-all ${section.classes}`}
          >
            <h2 className={`text-2xl font-semibold tracking-wide mb-4 text-center`}>
              {section.label}
            </h2>
            <div className="flex flex-col gap-2">
              {subLinks.map((sub) => (
                <a
                  key={sub.suffix}
                  href={`${section.base}${sub.suffix}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-2 px-4 rounded border border-border bg-background/40 text-foreground hover:bg-background/80 transition-colors text-sm font-medium"
                >
                  {sub.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
