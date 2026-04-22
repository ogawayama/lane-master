import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { z } from "zod";

const db = supabase as any;

export const userSchema = z.object({
  user_id: z.string().trim().min(1, "User ID is required").max(80, "User ID is too long"),
  rfid: z.string().trim().min(1, "RFID is required").max(120, "RFID is too long"),
  first_name: z.string().trim().min(1, "First name is required").max(80, "First name is too long"),
  last_name: z.string().trim().max(80, "Last name is too long").optional().or(z.literal("")),
});

export const weaponSchema = z.object({
  weapon_name: z.string().trim().min(1, "Weapon name is required").max(120, "Weapon name is too long"),
  weapon_type: z.string().trim().min(1, "Weapon type is required").max(80, "Weapon type is too long"),
  is_assigned: z.boolean().default(false),
});

export type EditableUser = z.infer<typeof userSchema>;
export type EditableWeapon = z.infer<typeof weaponSchema>;
export type UserRecord = {
  id: string;
  user_id: string;
  rfid: string;
  first_name: string;
  last_name: string | null;
  created_at: string;
  updated_at?: string;
};
export type WeaponRecord = {
  weapon_id: number;
  weapon_name: string;
  weapon_type: string;
  is_assigned: boolean;
  assigned_to_user_id: string | null;
  updated_at: string;
};
export type ImportMode = "skip" | "update";
export type ImportStatus = "create" | "update" | "skip" | "error";
export type UserImportPreviewRow = {
  rowNumber: number;
  values: EditableUser;
  status: ImportStatus;
  errors: string[];
  existingId?: string;
};

function normalizeUserPayload(values: EditableUser) {
  return {
    user_id: values.user_id.trim(),
    rfid: values.rfid.trim(),
    first_name: values.first_name.trim(),
    last_name: values.last_name?.trim() || null,
  };
}

function normalizeWeaponPayload(values: EditableWeapon) {
  return {
    weapon_name: values.weapon_name.trim(),
    weapon_type: values.weapon_type.trim(),
    is_assigned: values.is_assigned,
  };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toWorksheetRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? ""])));
}

function formatHeaders(headers: string[]) {
  return headers.reduce<Record<string, string>>((acc, header) => {
    acc[header.trim().toLowerCase()] = header;
    return acc;
  }, {});
}

function extractCell(row: Record<string, unknown>, headers: Record<string, string>, options: string[]) {
  for (const option of options) {
    const key = headers[option];
    if (key && row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim();
    }
  }
  return "";
}

async function assertSuccess<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>, fallback: string) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message || fallback);
  return data;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInAdmin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/admin`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}/admin`,
  });
  if (result?.error) throw result.error;
  return result;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function isCurrentUserAdmin(session?: Session | null) {
  const activeSession = session ?? (await getSession());
  if (!activeSession?.user) return false;
  const { data, error } = await db.rpc("has_role", {
    _user_id: activeSession.user.id,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function isAdminBootstrapAvailable() {
  const { data, error } = await db.rpc("is_admin_bootstrap_available");
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function bootstrapFirstAdmin() {
  const { data, error } = await db.rpc("bootstrap_first_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function fetchUsers(search = "") {
  let query = supabase.from("users").select("*").order("created_at", { ascending: false });
  const trimmed = search.trim();
  if (trimmed) {
    const q = `%${trimmed}%`;
    query = query.or(`user_id.ilike.${q},rfid.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as UserRecord[];
}

export async function createUser(values: EditableUser) {
  const payload = normalizeUserPayload(userSchema.parse(values));
  const data = await assertSuccess(
    supabase.from("users").insert(payload).select("*").single(),
    "Unable to create user",
  );
  return data as UserRecord;
}

export async function updateUser(id: string, values: EditableUser) {
  const payload = normalizeUserPayload(userSchema.parse(values));
  const data = await assertSuccess(
    supabase.from("users").update(payload).eq("id", id).select("*").single(),
    "Unable to update user",
  );
  return data as UserRecord;
}

export async function deleteUser(id: string) {
  await assertSuccess(
    supabase
      .from("lane_assignments")
      .update({
        user_id: null,
        first_name: null,
        last_name: null,
        weapon_id: null,
        weapon_name: null,
        weapon_type: null,
        status: "empty",
        assigned_at: null,
      })
      .eq("user_id", id),
    "Unable to clear lane assignments",
  );

  await assertSuccess(
    supabase.from("weapons").update({ is_assigned: false, assigned_to_user_id: null }).eq("assigned_to_user_id", id),
    "Unable to reset weapon assignments",
  );

  await assertSuccess(supabase.from("users").delete().eq("id", id), "Unable to delete user");
}

export async function fetchWeapons(search = "") {
  let query = supabase.from("weapons").select("*").order("weapon_id", { ascending: true });
  const trimmed = search.trim();
  if (trimmed) {
    const q = `%${trimmed}%`;
    query = query.or(`weapon_name.ilike.${q},weapon_type.ilike.${q}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WeaponRecord[];
}

export async function createWeapon(values: EditableWeapon) {
  const payload = normalizeWeaponPayload(weaponSchema.parse(values));
  const data = await assertSuccess(
    supabase.from("weapons").insert(payload).select("*").single(),
    "Unable to create weapon",
  );
  return data as WeaponRecord;
}

export async function updateWeapon(weaponId: number, values: EditableWeapon) {
  const payload = normalizeWeaponPayload(weaponSchema.parse(values));
  const data = await assertSuccess(
    supabase.from("weapons").update(payload).eq("weapon_id", weaponId).select("*").single(),
    "Unable to update weapon",
  );
  return data as WeaponRecord;
}

export async function deleteWeapon(weaponId: number) {
  await assertSuccess(
    supabase.from("lane_assignments").update({ weapon_id: null, weapon_name: null, weapon_type: null }).eq("weapon_id", weaponId),
    "Unable to clear weapon from lanes",
  );
  await assertSuccess(supabase.from("weapons").delete().eq("weapon_id", weaponId), "Unable to delete weapon");
}

export async function resetAssignments() {
  await assertSuccess(
    supabase
      .from("lane_assignments")
      .update({
        user_id: null,
        first_name: null,
        last_name: null,
        weapon_id: null,
        weapon_name: null,
        weapon_type: null,
        status: "empty",
        assigned_at: null,
      })
      .not("lane_number", "is", null),
    "Unable to reset lanes",
  );
  await assertSuccess(
    supabase.from("weapons").update({ is_assigned: false, assigned_to_user_id: null }).not("weapon_id", "is", null),
    "Unable to reset weapons",
  );
}

export async function purgeAllUsers() {
  await resetAssignments();
  await assertSuccess(supabase.from("users").delete().not("id", "is", null), "Unable to purge users");
}

export async function exportUsers(format: "csv" | "xlsx", rows: UserRecord[]) {
  const payload = toWorksheetRows(rows.map(({ user_id, rfid, first_name, last_name }) => ({ user_id, rfid, first_name, last_name })));
  const sheet = XLSX.utils.json_to_sheet(payload);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Users");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `users-${Date.now()}.csv`);
    return;
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `users-${Date.now()}.xlsx`,
  );
}

export async function exportWeapons(format: "csv" | "xlsx", rows: WeaponRecord[]) {
  const payload = toWorksheetRows(rows.map(({ weapon_id, weapon_name, weapon_type, is_assigned }) => ({ weapon_id, weapon_name, weapon_type, is_assigned })));
  const sheet = XLSX.utils.json_to_sheet(payload);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Weapons");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `weapons-${Date.now()}.csv`);
    return;
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `weapons-${Date.now()}.xlsx`,
  );
}

export async function downloadUserTemplate(format: "csv" | "xlsx") {
  const sample = [{ user_id: "USR-1001", rfid: "RFID-1001", first_name: "Alex", last_name: "Johnson" }];
  const sheet = XLSX.utils.json_to_sheet(sample);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "UsersTemplate");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "users-template.csv");
    return;
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    "users-template.xlsx",
  );
}

export async function parseUserImportFile(file: File, mode: ImportMode) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The selected file is empty.");

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
  });

  if (!rawRows.length) throw new Error("No data rows were found in the selected file.");

  const existingUsers = await fetchUsers();
  const byUserId = new Map(existingUsers.map((user) => [user.user_id.toLowerCase(), user]));
  const byRfid = new Map(existingUsers.map((user) => [user.rfid.toLowerCase(), user]));
  const seenUserIds = new Set<string>();
  const seenRfids = new Set<string>();

  return rawRows.map<UserImportPreviewRow>((row, index) => {
    const headers = formatHeaders(Object.keys(row));
    const candidate = {
      user_id: extractCell(row, headers, ["user_id", "user id", "userid"]),
      rfid: extractCell(row, headers, ["rfid", "rfid tag", "tag", "badge"]),
      first_name: extractCell(row, headers, ["first_name", "first name", "firstname"]),
      last_name: extractCell(row, headers, ["last_name", "last name", "lastname"]),
    };

    const parsed = userSchema.safeParse(candidate);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    const normalized = parsed.success ? normalizeUserPayload(parsed.data) : normalizeUserPayload(candidate);
    const userIdKey = normalized.user_id.toLowerCase();
    const rfidKey = normalized.rfid.toLowerCase();

    if (seenUserIds.has(userIdKey)) errors.push("Duplicate user ID in file.");
    if (seenRfids.has(rfidKey)) errors.push("Duplicate RFID in file.");
    seenUserIds.add(userIdKey);
    seenRfids.add(rfidKey);

    const existingByUserId = byUserId.get(userIdKey);
    const existingByRfid = byRfid.get(rfidKey);
    if (existingByUserId && existingByRfid && existingByUserId.id !== existingByRfid.id) {
      errors.push("User ID and RFID match different existing users.");
    }

    const existing = existingByUserId ?? existingByRfid;
    let status: ImportStatus = existing ? (mode === "update" ? "update" : "skip") : "create";
    if (errors.length) status = "error";

    return {
      rowNumber: index + 2,
      values: normalized,
      status,
      errors,
      existingId: existing?.id,
    };
  });
}

export async function importUsersFromPreview(rows: UserImportPreviewRow[], mode: ImportMode) {
  const results = { created: 0, updated: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    if (row.errors.length) {
      results.errors += 1;
      continue;
    }

    if (row.status === "skip") {
      results.skipped += 1;
      continue;
    }

    try {
      if (row.existingId) {
        if (mode === "skip") {
          results.skipped += 1;
          continue;
        }
        await updateUser(row.existingId, row.values);
        results.updated += 1;
      } else {
        await createUser(row.values);
        results.created += 1;
      }
    } catch {
      results.errors += 1;
    }
  }

  return results;
}
