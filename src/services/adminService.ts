import * as XLSX from "xlsx";
import { z } from "zod";

const adminApiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-panel`;

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
  const result = await callAdminApi<{ data: UserRecord[] }>("fetch_users", { search });
  return result.data ?? [];
}

export async function createUser(values: EditableUser) {
  const payload = normalizeUserPayload(userSchema.parse(values));
  const result = await callAdminApi<{ data: UserRecord }>("create_user", { values: payload });
  return result.data;
}

export async function updateUser(id: string, values: EditableUser) {
  const payload = normalizeUserPayload(userSchema.parse(values));
  const result = await callAdminApi<{ data: UserRecord }>("update_user", { id, values: payload });
  return result.data;
}

export async function deleteUser(id: string) {
  await callAdminApi("delete_user", { id });
}

export async function fetchWeapons(search = "") {
  const result = await callAdminApi<{ data: WeaponRecord[] }>("fetch_weapons", { search });
  return result.data ?? [];
}

export async function createWeapon(values: EditableWeapon) {
  const payload = normalizeWeaponPayload(weaponSchema.parse(values));
  const result = await callAdminApi<{ data: WeaponRecord }>("create_weapon", { values: payload });
  return result.data;
}

export async function updateWeapon(weaponId: number, values: EditableWeapon) {
  const payload = normalizeWeaponPayload(weaponSchema.parse(values));
  const result = await callAdminApi<{ data: WeaponRecord }>("update_weapon", { weaponId, values: payload });
  return result.data;
}

export async function deleteWeapon(weaponId: number) {
  await callAdminApi("delete_weapon", { weaponId });
}

export async function resetAssignments() {
  await callAdminApi("reset_assignments");
}

export async function purgeAllUsers() {
  await callAdminApi("purge_all_users");
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
