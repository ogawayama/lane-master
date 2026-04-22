import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportMode, UserImportPreviewRow } from "@/services/adminService";

interface ImportUsersDialogProps {
  open: boolean;
  loading: boolean;
  rows: UserImportPreviewRow[];
  mode: ImportMode;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: ImportMode) => void;
  onFileSelect: (file: File, mode: ImportMode) => Promise<void>;
  onImport: () => Promise<void>;
}

export function ImportUsersDialog({
  open,
  loading,
  rows,
  mode,
  onOpenChange,
  onModeChange,
  onFileSelect,
  onImport,
}: ImportUsersDialogProps) {
  const [fileName, setFileName] = useState("");

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        return acc;
      },
      { create: 0, update: 0, skip: 0, error: 0 } as Record<"create" | "update" | "skip" | "error", number>,
    );
  }, [rows]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setFileName("");
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-hidden border-border bg-card sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import users</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file from your computer or USB drive, then review each row before applying it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Duplicate handling</div>
              <select
                value={mode}
                onChange={(event) => onModeChange(event.target.value as ImportMode)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="skip">Skip duplicates</option>
                <option value="update">Update existing users</option>
              </select>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
              <Upload className="h-5 w-5 text-primary" />
              <span>{fileName || "Choose CSV or XLSX"}</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setFileName(file.name);
                  void onFileSelect(file, mode);
                }}
              />
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="rounded-md border border-border bg-background px-3 py-2">
                  <div className="uppercase tracking-[0.2em] text-muted-foreground">{key}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="max-h-[55vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>RFID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map((row) => (
                      <TableRow key={`${row.rowNumber}-${row.values.user_id}-${row.values.rfid}`}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.values.user_id}</TableCell>
                        <TableCell>{row.values.rfid}</TableCell>
                        <TableCell>{[row.values.first_name, row.values.last_name].filter(Boolean).join(" ")}</TableCell>
                        <TableCell className="uppercase tracking-[0.2em] text-xs">{row.status}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.errors.join(" ") || "Ready"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No file loaded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Close</Button>
          <Button onClick={() => void onImport()} disabled={loading || rows.length === 0}>Apply import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
