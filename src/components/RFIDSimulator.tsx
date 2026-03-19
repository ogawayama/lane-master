import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

const TEST_RFIDS = [
  { label: "Joakim (USR001)", rfid: "RFID-TEST-001" },
  { label: "Erik (USR002)", rfid: "RFID-TEST-002" },
  { label: "Anna (USR003)", rfid: "RFID-TEST-003" },
  { label: "Unknown Tag", rfid: "RFID-NEW-999" },
];

interface RFIDSimulatorProps {
  onSimulate: (rfid: string) => void;
}

export function RFIDSimulator({ onSimulate }: RFIDSimulatorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 rounded-xl border border-border bg-card p-3 shadow-xl space-y-2 min-w-[200px]">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Simulate RFID Scan
          </div>
          {TEST_RFIDS.map((t) => (
            <Button
              key={t.rfid}
              variant="secondary"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => {
                onSimulate(t.rfid);
                setOpen(false);
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}
      <Button
        size="icon"
        variant="outline"
        className="h-12 w-12 rounded-full border-primary/50 text-primary hover:bg-primary/10"
        onClick={() => setOpen(!open)}
      >
        <Zap className="h-5 w-5" />
      </Button>
    </div>
  );
}
