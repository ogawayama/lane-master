import * as XLSX from "xlsx";
import { z } from "zod";
import * as userHubService from "@/services/userHubService";

const adminApiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-panel`;

export const userSchema = z.object({
  id: z
    .union([z.literal(""), z.coerce.number().int().min(10000, "ID must be a 5-digit number").max(99999, "ID must be a 5-digit number")])
    .optional(),
  rfid: z.string().trim().max(120, "RFID is too long").optional(),
  name: z.string().trim().min(1, "Name is required").max(160, "Name is too long"),
});

export type Section = "idt" | "odt" | "live_fire" | "qm360";

export const weaponSchema = z.object({
  weapon_name: z.string().trim().min(1, "Weapon name is required").max(120, "Weapon name is too long"),
  weapon_type: z.string().trim().min(1, "Weapon type is required").max(80, "Weapon type is too long"),
  is_assigned: z.boolean().default(false),
});

export type EditableUser = z.infer<typeof userSchema>;
export type EditableWeapon = z.infer<typeof weaponSchema>;
export type UserRecord = {
  id: number;
  rfid: string | null;
  name: string;
  created_at: string;
};
export type WeaponRecord = {
  weapon_id: number;
  weapon_name: string;
  weapon_type: string;
  is_assigned: boolean;
  assigned_to_user_id: number | null;
  updated_at: string;
};
export type ImportMode = "skip" | "update";
export type ImportStatus = "create" | "update" | "skip" | "error";
export type UserImportPreviewRow = {
  rowNumber: number;
  values: EditableUser;
  status: ImportStatus;
  errors: string[];
  existingId?: number;
};

type AdminAction =
  | "fetch_users"
  | "create_user"
  | "update_user"
  | "delete_user"
  | "fetch_weapons"
  | "create_weapon"
  | "update_weapon"
  | "delete_weapon"
  | "reset_assignments"
  | "purge_all_users";

function normalizeUserPayload(values: EditableUser) {
  const rfidTrimmed = (values.rfid ?? "").trim();
  return {
    id: values.id === "" || values.id === undefined ? undefined : Number(values.id),
    rfid: rfidTrimmed ? rfidTrimmed : null,
    name: values.name.trim(),
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

async function callAdminApi<T>(action: AdminAction, payload: Record<string, unknown> = {}) {
  const response = await fetch(adminApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || "Admin request failed.");
  }
  return result as T;
}

export async function fetchUsers(search = "") {
  const data = await userHubService.listAll(search);
  return data.map((u) => ({
    id: u.id,
    rfid: u.rfid,
    name: u.name,
    created_at: u.created_at,
  })) as UserRecord[];
}

function parseUser(values: EditableUser) {
  const result = userSchema.safeParse(values);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(". "));
  }
  return normalizeUserPayload(result.data);
}

export async function createUser(values: EditableUser) {
  const payload = parseUser(values);
  const created = await userHubService.createUser(payload);
  return created as UserRecord;
}

export async function updateUser(id: number, values: EditableUser) {
  const payload = parseUser(values);
  const updated = await userHubService.updateUser(id, { name: payload.name, rfid: payload.rfid });
  return updated as UserRecord;
}

export async function deleteUser(id: number) {
  await userHubService.deleteUser(id);
}

export async function fetchWeapons(section: Section, search = "") {
  const result = await callAdminApi<{ data: WeaponRecord[] }>("fetch_weapons", { search, section });
  return result.data ?? [];
}

export async function createWeapon(section: Section, values: EditableWeapon) {
  const payload = { ...normalizeWeaponPayload(weaponSchema.parse(values)), section };
  const result = await callAdminApi<{ data: WeaponRecord }>("create_weapon", { values: payload });
  return result.data;
}

export async function updateWeapon(section: Section, weaponId: number, values: EditableWeapon) {
  const payload = { ...normalizeWeaponPayload(weaponSchema.parse(values)), section };
  const result = await callAdminApi<{ data: WeaponRecord }>("update_weapon", { weaponId, values: payload });
  return result.data;
}

export async function deleteWeapon(weaponId: number) {
  await callAdminApi("delete_weapon", { weaponId });
}

export async function resetAssignments(section: Section) {
  await callAdminApi("reset_assignments", { section });
}

export async function purgeAllUsers() {
  await userHubService.deleteAllUsers();
}

const DEMO_RFIDS = ["3649677676", "1576136972", "3910084941", "3915443597", "2731977834"];

export async function resetDemoMode() {
  // Keep the demo users but clear their RFID so the tags become unassigned.
  // Realtime sync will mirror the change locally.
  const { userHub } = await import("@/integrations/userhub/client");
  const { data, error: fetchError } = await userHub
    .from("users")
    .select("id")
    .in("rfid", DEMO_RFIDS);
  if (fetchError) throw new Error(fetchError.message);
  const ids = ((data as { id: number }[] | null) ?? []).map((r) => r.id);
  if (!ids.length) return;
  const { error } = await userHub
    .from("users")
    .update({ rfid: null })
    .in("id", ids);
  if (error) throw new Error(error.message);
}

export async function exportUsers(format: "csv" | "xlsx", rows: UserRecord[]) {
  const payload = toWorksheetRows(rows.map(({ id, rfid, name }) => ({ id, rfid, name })));
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
  const sample = [{ id: 10001, rfid: "RFID-10001", name: "Alex Johnson" }];
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
  const byId = new Map(existingUsers.map((user) => [user.id, user]));
  const byRfid = new Map(
    existingUsers
      .filter((user): user is UserRecord & { rfid: string } => !!user.rfid)
      .map((user) => [user.rfid.toLowerCase(), user]),
  );
  const seenIds = new Set<number>();
  const seenRfids = new Set<string>();

  return rawRows.map<UserImportPreviewRow>((row, index) => {
    const headers = formatHeaders(Object.keys(row));
    const candidate = {
      id: extractCell(row, headers, ["id", "user_id", "user id"]),
      rfid: extractCell(row, headers, ["rfid", "rfid tag", "tag", "badge"]),
      name: extractCell(row, headers, ["name", "full name", "fullname"]),
    };

    const parsed = userSchema.safeParse(candidate);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    const normalized: EditableUser = parsed.success
      ? { id: parsed.data.id === "" ? undefined : parsed.data.id, rfid: (parsed.data.rfid ?? "").trim(), name: parsed.data.name.trim() }
      : { id: candidate.id ? Number(candidate.id) : undefined, rfid: candidate.rfid, name: candidate.name };
    const idKey = typeof normalized.id === "number" ? normalized.id : undefined;
    const rfidKey = (normalized.rfid ?? "").toLowerCase();

    if (idKey !== undefined && seenIds.has(idKey)) errors.push("Duplicate ID in file.");
    if (rfidKey && seenRfids.has(rfidKey)) errors.push("Duplicate RFID in file.");
    if (idKey !== undefined) seenIds.add(idKey);
    if (rfidKey) seenRfids.add(rfidKey);

    const existingById = idKey !== undefined ? byId.get(idKey) : undefined;
    const existingByRfid = rfidKey ? byRfid.get(rfidKey) : undefined;
    if (existingById && existingByRfid && existingById.id !== existingByRfid.id) {
      errors.push("ID and RFID match different existing users.");
    }

    const existing = existingById ?? existingByRfid;
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
      if (row.existingId !== undefined) {
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
