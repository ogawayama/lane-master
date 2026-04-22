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

const emptyUser: EditableUser = { user_id: "", rfid: "", first_name: "", last_name: "" };

export function UserFormDialog({ open, user, saving, onOpenChange, onSave }: UserFormDialogProps) {
  const [form, setForm] = useState<EditableUser>(emptyUser);

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? {
            user_id: user.user_id,
            rfid: user.rfid,
            first_name: user.first_name,
            last_name: user.last_name ?? "",
          }
        : emptyUser,
    );
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>Use the same fields as the USB import template.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input placeholder="User ID" value={form.user_id} onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))} />
          <Input placeholder="RFID" value={form.rfid} onChange={(event) => setForm((current) => ({ ...current, rfid: event.target.value }))} />
          <Input placeholder="First name" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} />
          <Input placeholder="Last name" value={form.last_name ?? ""} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => void onSave(form)} disabled={saving}>{saving ? "Saving..." : user ? "Save changes" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
