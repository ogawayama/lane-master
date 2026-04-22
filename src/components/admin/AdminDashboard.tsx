import { useEffect, useMemo, useState } from "react";
import { Download, LogOut, RefreshCw, Shield, Trash2, Upload, Users2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface AdminDashboardProps {
  email: string;
  onSignOut: () => Promise<void>;
}

export function AdminDashboard({ email, onSignOut }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [weapons, setWeapons] = useState<WeaponRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [weaponSearch, setWeaponSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editingWeapon, setEditingWeapon] = useState<WeaponRecord | null>(null);
  const [importRows, setImportRows] = useState<UserImportPreviewRow[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("skip");

  const stats = useMemo(
    () => ({
      users: users.length,
      weapons: weapons.length,
      assigned: weapons.filter((weapon) => weapon.is_assigned).length,
    }),
    [users, weapons],
  );

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
        <header className="flex flex-col gap-4 rounded-lg border border-border bg-card/80 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Admin console
            </div>
            <h1 className="mt-4 text-4xl font-bold">Range operations hub</h1>
            <p className="mt-2 text-muted-foreground">Signed in as {email}. Export files for USB transfer, manage the live roster, and keep the inventory aligned.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noreferrer">Open kiosk</a>
            </Button>
            <Button variant="ghost" onClick={() => void onSignOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Users", String(stats.users), "Registered in the system", <Users2 className="h-4 w-4 text-primary" key="users" />],
            ["Weapons", String(stats.weapons), "Tracked in the inventory", <Wrench className="h-4 w-4 text-primary" key="weapons" />],
            ["Assigned", String(stats.assigned), "Currently active on the range", <Shield className="h-4 w-4 text-primary" key="assigned" />],
          ].map(([title, value, description, icon]) => (
            <Card key={String(title)} className="border-border bg-card/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{title}</CardTitle>
                {icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{value}</div>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 bg-secondary/70">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="weapons">Weapons</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="border-border bg-card/80">
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>User management</CardTitle>
                  <CardDescription>Search, edit, bulk import, and export user records for USB-based admin workflows.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void downloadUserTemplate("csv")}><Download className="h-4 w-4" />CSV template</Button>
                  <Button variant="outline" onClick={() => void downloadUserTemplate("xlsx")}><Download className="h-4 w-4" />Excel template</Button>
                  <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import</Button>
                  <Button variant="outline" onClick={() => void exportUsers("csv", users)}><Download className="h-4 w-4" />Export CSV</Button>
                  <Button variant="outline" onClick={() => void exportUsers("xlsx", users)}><Download className="h-4 w-4" />Export Excel</Button>
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
          </TabsContent>

          <TabsContent value="weapons" className="space-y-4">
            <Card className="border-border bg-card/80">
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Weapon inventory</CardTitle>
                  <CardDescription>Track names, types, and assignment state for every range weapon.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void exportWeapons("csv", weapons)}><Download className="h-4 w-4" />Export CSV</Button>
                  <Button variant="outline" onClick={() => void exportWeapons("xlsx", weapons)}><Download className="h-4 w-4" />Export Excel</Button>
                  <Button onClick={() => { setEditingWeapon(null); setWeaponDialogOpen(true); }}>Add weapon</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Search by weapon name or type" value={weaponSearch} onChange={(event) => setWeaponSearch(event.target.value)} />
                <div className="overflow-hidden rounded-lg border border-border">
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

          <TabsContent value="system" className="space-y-4">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <CardTitle>System actions</CardTitle>
                <CardDescription>Use these destructive tools carefully. They affect the live kiosk experience immediately.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
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
                        <AlertDialogAction onClick={() => void withAction(resetAssignments, "Assignments reset")}>Reset</AlertDialogAction>
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
                        <AlertDialogAction onClick={() => void withAction(purgeAllUsers, "All users removed")}>Purge</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <UserFormDialog open={userDialogOpen} user={editingUser} saving={saving} onOpenChange={(open) => { setUserDialogOpen(open); if (!open) setEditingUser(null); }} onSave={handleUserSave} />
      <WeaponFormDialog open={weaponDialogOpen} weapon={editingWeapon} saving={saving} onOpenChange={(open) => { setWeaponDialogOpen(open); if (!open) setEditingWeapon(null); }} onSave={handleWeaponSave} />
      <ImportUsersDialog open={importOpen} loading={saving} rows={importRows} mode={importMode} onOpenChange={setImportOpen} onModeChange={setImportMode} onFileSelect={handleImportFile} onImport={handleImportApply} />
    </div>
  );
}
