import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditableWeapon, WeaponRecord } from "@/services/adminService";

interface WeaponFormDialogProps {
  open: boolean;
  weapon?: WeaponRecord | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: EditableWeapon) => Promise<void>;
}

const emptyWeapon: EditableWeapon = { weapon_name: "", weapon_type: "", is_assigned: false };

export function WeaponFormDialog({ open, weapon, saving, onOpenChange, onSave }: WeaponFormDialogProps) {
  const [form, setForm] = useState<EditableWeapon>(emptyWeapon);

  useEffect(() => {
    if (!open) return;
    setForm(
      weapon
        ? {
            weapon_name: weapon.weapon_name,
            weapon_type: weapon.weapon_type,
            is_assigned: weapon.is_assigned,
          }
        : emptyWeapon,
    );
  }, [open, weapon]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{weapon ? "Edit weapon" : "Add weapon"}</DialogTitle>
          <DialogDescription>Keep names and types consistent with the live range inventory.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input placeholder="Weapon name" value={form.weapon_name} onChange={(event) => setForm((current) => ({ ...current, weapon_name: event.target.value }))} />
          <Input placeholder="Weapon type" value={form.weapon_type} onChange={(event) => setForm((current) => ({ ...current, weapon_type: event.target.value }))} />
          <label className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.is_assigned}
              onChange={(event) => setForm((current) => ({ ...current, is_assigned: event.target.checked }))}
            />
            Mark as currently assigned
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => void onSave(form)} disabled={saving}>{saving ? "Saving..." : weapon ? "Save changes" : "Create weapon"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
