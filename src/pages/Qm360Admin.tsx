import { useEffect, useState } from "react";
import { Download, Pencil, RefreshCw, Settings, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ImportUsersDialog } from "@/components/admin/ImportUsersDialog";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import {
  createUser,
  deleteUser,
  downloadUserTemplate,
  exportUsers,
  fetchUsers,
  importUsersFromPreview,
  parseUserImportFile,
  purgeAllUsers,
  resetDemoMode,
  updateUser,
  type EditableUser,
  type ImportMode,
  type UserImportPreviewRow,
  type UserRecord,
} from "@/services/adminService";
import {
  createGear,
  deleteGear,
  fetchGear,
  resetQm360Assignments,
  updateGear,
  type GearItem,
  type GearType,
} from "@/services/qm360Service";

const HEADING = "QM 360 Admin";
const THEME_HSL = "28 95% 58%";

export default function Qm360Admin() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [gearSearch, setGearSearch] = useState("");
  const [activePanel, setActivePanel] = useState<"system" | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editingGear, setEditingGear] = useState<GearItem | null>(null);
  const [gearDialogOpen, setGearDialogOpen] = useState(false);
  const [gearForm, setGearForm] = useState<{ gear_type: GearType; gear_number: string }>({ gear_type: "PDD", gear_number: "" });
  const [importRows, setImportRows] = useState<UserImportPreviewRow[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("skip");

  const load = async () => {
    try {
      const [u, g] = await Promise.all([fetchUsers(userSearch), fetchGear(gearSearch)]);
      setUsers(u);
      setGear(g);
    } catch (e) {
      toast({ title: "Unable to load admin data", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    const t = window.setTimeout(() => { void fetchUsers(userSearch).then(setUsers).catch(() => {}); }, 250);
    return () => window.clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => { void fetchGear(gearSearch).then(setGear).catch(() => {}); }, 250);
    return () => window.clearTimeout(t);
  }, [gearSearch]);

  const withAction = async (action: () => Promise<void>, msg: string) => {
    setSaving(true);
    try {
      await action();
      await load();
      toast({ title: msg });
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUserSave = async (values: EditableUser) => {
    await withAction(async () => {
      if (editingUser) await updateUser(editingUser.id, values);
      else await createUser(values);
      setUserDialogOpen(false);
      setEditingUser(null);
    }, editingUser ? "User updated" : "User created");
  };

  const openGearCreate = () => {
    setEditingGear(null);
    setGearForm({ gear_type: "PDD", gear_number: "" });
    setGearDialogOpen(true);
  };

  const openGearEdit = (g: GearItem) => {
    setEditingGear(g);
    setGearForm({ gear_type: g.gear_type, gear_number: String(g.gear_number) });
    setGearDialogOpen(true);
  };

  const handleGearSave = async () => {
    const num = parseInt(gearForm.gear_number, 10);
    if (!Number.isFinite(num) || num < 0) {
      toast({ title: "Enter a valid number", variant: "destructive" });
      return;
    }
    await withAction(async () => {
      if (editingGear) await updateGear(editingGear.id, { gear_type: gearForm.gear_type, gear_number: num });
      else await createGear({ gear_type: gearForm.gear_type, gear_number: num });
      setGearDialogOpen(false);
      setEditingGear(null);
    }, editingGear ? "Gear updated" : "Gear created");
  };

  const handleImportFile = async (file: File, mode: ImportMode) => {
    setSaving(true);
    try {
      const preview = await parseUserImportFile(file, mode);
      setImportRows(preview);
    } catch (e) {
      toast({ title: "Import file error", description: e instanceof Error ? e.message : "Please try another file.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImportApply = async () => {
    await withAction(async () => {
      const result = await importUsersFromPreview(importRows, importMode);
      setImportOpen(false);
      setImportRows([]);
      toast({
        title: "Import complete",
        description: `${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors.`,
      });
    }, "Users import applied");
  };

  const themeStyle = { ["--primary" as string]: THEME_HSL, ["--ring" as string]: THEME_HSL } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background px-6 py-6 text-foreground" style={themeStyle}>
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="border-border bg-card/80">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-primary">{HEADING}</CardTitle>
              <Button variant="outline" size="icon" aria-label="System and gear" onClick={() => setActivePanel("system")}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void exportUsers("xlsx", users)}><Download className="h-4 w-4" />Export</Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import</Button>
              </div>
              <Button onClick={() => { setEditingUser(null); setUserDialogOpen(true); }}>Add user</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by name or user ID"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pr-9"
                />
                {userSearch && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Clear search"
                    onClick={() => setUserSearch("")}
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button type="button" variant="outline" size="icon" aria-label="Refresh users" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>RFID</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length ? users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.user_id}</TableCell>
                      <TableCell>{[user.first_name, user.last_name].filter(Boolean).join(" ")}</TableCell>
                      <TableCell>{user.rfid}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" aria-label="Edit user" onClick={() => { setEditingUser(user); setUserDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="outline" aria-label="Delete user">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-border bg-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                                <AlertDialogDescription>This also clears any active gear assignment linked to the user.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void withAction(() => deleteUser(user.id), "User removed")}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No users found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={activePanel === "system"} onOpenChange={(open) => !open && setActivePanel(null)}>
          <DialogContent className="max-w-5xl border-border bg-card">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>Manage system actions and gear inventory.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="system" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="system">System actions</TabsTrigger>
                <TabsTrigger value="gear">Gear inventory</TabsTrigger>
              </TabsList>
              <TabsContent value="system" className="mt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-secondary/30 p-5">
                    <div className="text-lg font-semibold">Reset gear assignments</div>
                    <p className="mt-2 text-sm text-muted-foreground">Clears all active gear pickups and makes every PDD/SAT item available again.</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="mt-4" variant="outline">Reset assignments</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset all gear assignments?</AlertDialogTitle>
                          <AlertDialogDescription>This keeps users and gear inventory, but clears the live gear pickup state.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void withAction(() => resetQm360Assignments(), "Assignments reset")}>Reset</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><Trash2 className="h-4 w-4 text-destructive" />Purge all users</div>
                    <p className="mt-2 text-sm text-muted-foreground">Removes every user from the database and clears assignments before deletion.</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="mt-4" variant="destructive">Purge users</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Purge all users?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently deletes every user record. Export a backup before continuing.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void withAction(() => purgeAllUsers(), "All users removed")}>Purge</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 p-5">
                    <div className="text-lg font-semibold">User import template</div>
                    <p className="mt-2 text-sm text-muted-foreground">Download the Excel template used for bulk importing users.</p>
                    <Button className="mt-4" variant="outline" onClick={() => void downloadUserTemplate("xlsx")}><Download className="h-4 w-4" />Download template</Button>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 p-5">
                    <div className="text-lg font-semibold">Reset demo mode</div>
                    <p className="mt-2 text-sm text-muted-foreground">Clears the RFID values for the predefined demo user tags.</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="mt-4" variant="outline">Reset demo mode</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset demo mode?</AlertDialogTitle>
                          <AlertDialogDescription>This clears the RFID values for the 5 predefined demo tags so they can be reassigned.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void withAction(() => resetDemoMode(), "Demo mode reset")}>Reset</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="gear" className="mt-4">
                <Card className="border-border bg-card/80">
                  <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={openGearCreate}>Add gear</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Search by type or number" value={gearSearch} onChange={(e) => setGearSearch(e.target.value)} />
                    <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[180px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gear.length ? gear.map((g) => (
                            <TableRow key={g.id}>
                              <TableCell className="font-medium">{g.gear_type}</TableCell>
                              <TableCell className="font-['Share_Tech_Mono']">{String(g.gear_number).padStart(3, "0")}</TableCell>
                              <TableCell>{g.is_assigned ? "Assigned" : "Available"}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openGearEdit(g)}>Edit</Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">Delete</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="border-border bg-card">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this gear item?</AlertDialogTitle>
                                        <AlertDialogDescription>If currently assigned, the assignment must be cleared first.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => void withAction(() => deleteGear(g.id), "Gear removed")}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No gear found.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <UserFormDialog open={userDialogOpen} user={editingUser} saving={saving} onOpenChange={(open) => { setUserDialogOpen(open); if (!open) setEditingUser(null); }} onSave={handleUserSave} />
      <ImportUsersDialog open={importOpen} loading={saving} rows={importRows} mode={importMode} onOpenChange={setImportOpen} onModeChange={setImportMode} onFileSelect={handleImportFile} onImport={handleImportApply} />

      <Dialog open={gearDialogOpen} onOpenChange={(open) => { setGearDialogOpen(open); if (!open) setEditingGear(null); }}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>{editingGear ? "Edit gear" : "Add gear"}</DialogTitle>
            <DialogDescription>Manage a single PDD or SAT gear item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={gearForm.gear_type} onValueChange={(v) => setGearForm((f) => ({ ...f, gear_type: v as GearType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDD">PDD</SelectItem>
                  <SelectItem value="SAT">SAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number</Label>
              <Input type="number" min={0} value={gearForm.gear_number} onChange={(e) => setGearForm((f) => ({ ...f, gear_number: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setGearDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleGearSave()} disabled={saving}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
