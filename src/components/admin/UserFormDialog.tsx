import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditableUser, UserRecord } from "@/services/adminService";

interface UserFormDialogProps {
  open: boolean;
  user?: UserRecord | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: EditableUser) => Promise<void>;
}

type FormState = { id: string; rfid: string; name: string };
const emptyForm: FormState = { id: "", rfid: "", name: "" };

export function UserFormDialog({ open, user, saving, onOpenChange, onSave }: UserFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? { id: String(user.id), rfid: user.rfid, name: user.name }
        : emptyForm,
    );
  }, [open, user]);

  const handleSave = () => {
    void onSave({
      id: Number(form.id),
      rfid: form.rfid,
      name: form.name,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>ID, name, and RFID are all required.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            placeholder="ID (integer)"
            inputMode="numeric"
            value={form.id}
            disabled={!!user}
            onChange={(event) => setForm((current) => ({ ...current, id: event.target.value.replace(/\D/g, "") }))}
          />
          <Input placeholder="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input placeholder="RFID" value={form.rfid} onChange={(event) => setForm((current) => ({ ...current, rfid: event.target.value }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : user ? "Save changes" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
