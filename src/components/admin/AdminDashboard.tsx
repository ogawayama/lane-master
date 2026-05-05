import { useEffect, useState } from "react";
import { Download, Settings, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { WeaponFormDialog } from "@/components/admin/WeaponFormDialog";
import {
  createUser,
  createWeapon,
  deleteUser,
  deleteWeapon,
  downloadUserTemplate,
  exportUsers,
  exportWeapons,
  fetchUsers,
  fetchWeapons,
  importUsersFromPreview,
  parseUserImportFile,
  purgeAllUsers,
  resetAssignments,
  updateUser,
  updateWeapon,
  type EditableUser,
  type EditableWeapon,
  type ImportMode,
  type UserImportPreviewRow,
  type UserRecord,
  type WeaponRecord,
} from "@/services/adminService";

type Panel = "system" | null;

export function AdminDashboard() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [weapons, setWeapons] = useState<WeaponRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [weaponSearch, setWeaponSearch] = useState("");
  const [, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editingWeapon, setEditingWeapon] = useState<WeaponRecord | null>(null);
  const [importRows, setImportRows] = useState<UserImportPreviewRow[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("skip");

  const load = async () => {
    setLoading(true);
    try {
      const [nextUsers, nextWeapons] = await Promise.all([fetchUsers(userSearch), fetchWeapons(weaponSearch)]);
      setUsers(nextUsers);
      setWeapons(nextWeapons);
    } catch (error) {
      toast({ title: "Unable to load admin data", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          setUsers(await fetchUsers(userSearch));
        } catch {
          return;
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [userSearch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          setWeapons(await fetchWeapons(weaponSearch));
        } catch {
          return;
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [weaponSearch]);

  const withAction = async (action: () => Promise<void>, successMessage: string) => {
    setSaving(true);
    try {
      await action();
      await load();
      toast({ title: successMessage });
    } catch (error) {
      toast({ title: "Action failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
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

  const handleWeaponSave = async (values: EditableWeapon) => {
    await withAction(async () => {
      if (editingWeapon) await updateWeapon(editingWeapon.weapon_id, values);
      else await createWeapon(values);
      setWeaponDialogOpen(false);
      setEditingWeapon(null);
    }, editingWeapon ? "Weapon updated" : "Weapon created");
  };

  const handleImportFile = async (file: File, mode: ImportMode) => {
    setSaving(true);
    try {
      const preview = await parseUserImportFile(file, mode);
      setImportRows(preview);
    } catch (error) {
      toast({ title: "Import file error", description: error instanceof Error ? error.message : "Please try another file.", variant: "destructive" });
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

  return (
    <div className="min-h-screen bg-background px-6 py-6 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" aria-label="System and weapons" onClick={() => setActivePanel("system")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <Card className="border-border bg-card/80">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>User management</CardTitle>
              <CardDescription>Search, edit, bulk import, and export user records for USB-based admin workflows.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void downloadUserTemplate("xlsx")}><Download className="h-4 w-4" />Download template</Button>
              <Button variant="outline" onClick={() => void exportUsers("xlsx", users)}><Download className="h-4 w-4" />Export</Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import</Button>
              <Button onClick={() => { setEditingUser(null); setUserDialogOpen(true); }}>Add user</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Search by name, user ID, or RFID" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>RFID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length ? users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.user_id}</TableCell>
                      <TableCell>{[user.first_name, user.last_name].filter(Boolean).join(" ")}</TableCell>
                      <TableCell>{user.rfid}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingUser(user); setUserDialogOpen(true); }}>Edit</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-border bg-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                                <AlertDialogDescription>This also clears any active lane or weapon assignment linked to the user.</AlertDialogDescription>
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
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No users found.</TableCell></TableRow>
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
              <DialogDescription>Manage system actions and weapon inventory.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="system" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="system">System actions</TabsTrigger>
                <TabsTrigger value="weapons">Weapon inventory</TabsTrigger>
              </TabsList>
              <TabsContent value="system" className="mt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-secondary/30 p-5">
                    <div className="text-lg font-semibold">Reset lane and weapon assignments</div>
                    <p className="mt-2 text-sm text-muted-foreground">Clears all active lanes and makes every weapon available again.</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="mt-4" variant="outline">Reset assignments</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset all assignments?</AlertDialogTitle>
                          <AlertDialogDescription>This keeps users and weapons, but clears the live operational state.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void withAction(() => resetAssignments(), "Assignments reset")}>Reset</AlertDialogAction>
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
                </div>
              </TabsContent>
              <TabsContent value="weapons" className="mt-4">
                <Card className="border-border bg-card/80">
                  <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      
                      <Button variant="outline" onClick={() => void exportWeapons("xlsx", weapons)}><Download className="h-4 w-4" />Export Excel</Button>
                      <Button onClick={() => { setEditingWeapon(null); setWeaponDialogOpen(true); }}>Add weapon</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Search by weapon name or type" value={weaponSearch} onChange={(event) => setWeaponSearch(event.target.value)} />
                    <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[180px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {weapons.length ? weapons.map((weapon) => (
                            <TableRow key={weapon.weapon_id}>
                              <TableCell className="font-medium">#{weapon.weapon_id}</TableCell>
                              <TableCell>{weapon.weapon_name}</TableCell>
                              <TableCell>{weapon.weapon_type}</TableCell>
                              <TableCell>{weapon.is_assigned ? "Assigned" : "Available"}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setEditingWeapon(weapon); setWeaponDialogOpen(true); }}>Edit</Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">Delete</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="border-border bg-card">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this weapon?</AlertDialogTitle>
                                        <AlertDialogDescription>The weapon will also be removed from any lane currently showing it.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => void withAction(() => deleteWeapon(weapon.weapon_id), "Weapon removed")}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No weapons found.</TableCell></TableRow>
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
      <WeaponFormDialog open={weaponDialogOpen} weapon={editingWeapon} saving={saving} onOpenChange={(open) => { setWeaponDialogOpen(open); if (!open) setEditingWeapon(null); }} onSave={handleWeaponSave} />
      <ImportUsersDialog open={importOpen} loading={saving} rows={importRows} mode={importMode} onOpenChange={setImportOpen} onModeChange={setImportMode} onFileSelect={handleImportFile} onImport={handleImportApply} />
    </div>
  );
}
