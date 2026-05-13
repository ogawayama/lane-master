import { userHub, type UserHubUser } from "@/integrations/userhub/client";
import { supabase } from "@/integrations/supabase/client";

export type { UserHubUser };

// ---------- Mirror helpers ----------

/**
 * Upsert a User Hub user into this project's local `users` table so
 * existing FK references (lane_assignments, weapons, qm360_*) keep working.
 */
export async function mirrorUser(user: UserHubUser): Promise<void> {
  // Coerce empty / placeholder rfid to null so we don't collide with the UNIQUE(rfid) constraint
  // and so cleared demo users appear unassigned locally.
  const raw = user.rfid?.trim() ?? "";
  const rfid = !raw || raw.startsWith("__cleared_") ? null : raw;
  const { error } = await supabase
    .from("users")
    .upsert(
      { id: user.id, name: user.name, rfid },
      { onConflict: "id" },
    );
  // Mirror is best-effort; the User Hub is the source of truth.
  // Don't throw — a failed mirror must not break registration / lookups.
  if (error) console.warn("mirrorUser failed (non-fatal):", error.message);
}

/**
 * Remove a user from the local mirror, first clearing any active assignment
 * that references them so FK / business rules stay consistent.
 */
export async function unmirrorUser(id: number): Promise<void> {
  // Free any lane this user is on.
  await supabase
    .from("lane_assignments")
    .update({
      user_id: null,
      name: null,
      weapon_id: null,
      weapon_name: null,
      weapon_type: null,
      status: "empty",
      assigned_at: null,
    })
    .eq("user_id", id);

  // Free any weapon assigned to them.
  await supabase
    .from("weapons")
    .update({ is_assigned: false, assigned_to_user_id: null })
    .eq("assigned_to_user_id", id);

  // Free any qm360 gear assigned to them.
  await supabase
    .from("qm360_gear")
    .update({ is_assigned: false, assigned_to_user_id: null })
    .eq("assigned_to_user_id", id);

  await supabase.from("qm360_assignments").delete().eq("user_id", id);

  // Drop the mirror row.
  await supabase.from("users").delete().eq("id", id);
}

// ---------- User Hub reads ----------

export async function lookupByRfid(rfid: string): Promise<UserHubUser | null> {
  const { data } = await userHub
    .from("users")
    .select("*")
    .eq("rfid", rfid)
    .maybeSingle();
  if (data) await mirrorUser(data as UserHubUser);
  return (data as UserHubUser) ?? null;
}

export async function lookupById(id: number): Promise<UserHubUser | null> {
  const { data } = await userHub
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (data) await mirrorUser(data as UserHubUser);
  return (data as UserHubUser) ?? null;
}

export async function searchByName(query: string): Promise<UserHubUser[]> {
  const q = `%${query}%`;
  const { data } = await userHub
    .from("users")
    .select("*")
    .ilike("name", q)
    .order("name", { ascending: true })
    .limit(10);
  return (data as UserHubUser[] | null) ?? [];
}

export async function listAll(search = ""): Promise<UserHubUser[]> {
  let query = userHub.from("users").select("*").order("created_at", { ascending: false });
  if (search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(`rfid.ilike.${q},name.ilike.${q}`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as UserHubUser[] | null) ?? [];
}

// ---------- User Hub writes ----------

async function generateUniqueUserId(): Promise<number> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = Math.floor(10000 + Math.random() * 90000);
    const { data, error } = await userHub
      .from("users")
      .select("id")
      .eq("id", candidate)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }
  throw new Error("Could not generate a unique 5-digit ID. Try again.");
}

export async function createUser(values: {
  id?: number | null;
  name: string;
  rfid?: string | null;
}): Promise<UserHubUser> {
  const id = values.id ?? (await generateUniqueUserId());
  const rfid = values.rfid && values.rfid.trim() ? values.rfid.trim() : null;
  const { data, error } = await userHub
    .from("users")
    .insert({ id, name: values.name, rfid })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const created = data as UserHubUser;
  await mirrorUser(created);
  return created;
}

export async function updateUser(
  id: number,
  values: { name?: string; rfid?: string | null },
): Promise<UserHubUser> {
  const payload: Record<string, unknown> = {};
  if (values.name !== undefined) payload.name = values.name;
  if (values.rfid !== undefined) payload.rfid = values.rfid && values.rfid.trim() ? values.rfid.trim() : null;
  const { data, error } = await userHub
    .from("users")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const updated = data as UserHubUser;
  await mirrorUser(updated);
  return updated;
}

export async function deleteUser(id: number): Promise<void> {
  const { error } = await userHub.from("users").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await unmirrorUser(id);
}

export async function deleteAllUsers(): Promise<void> {
  // Fetch all ids first so we can clean up local mirror per-user.
  const { data, error } = await userHub.from("users").select("id");
  if (error) throw new Error(error.message);
  const ids = ((data as { id: number }[] | null) ?? []).map((row) => row.id);

  // Delete from User Hub.
  const { error: delError } = await userHub
    .from("users")
    .delete()
    .not("id", "is", null);
  if (delError) throw new Error(delError.message);

  // Clean local mirror + assignments.
  for (const id of ids) {
    await unmirrorUser(id);
  }
}

// ---------- Initial backfill + realtime ----------

export async function backfillMirror(): Promise<void> {
  try {
    const all = await listAll();
    if (!all.length) return;
    await supabase
      .from("users")
      .upsert(
        all.map((u) => {
          const raw = u.rfid?.trim() ?? "";
          const rfid = !raw || raw.startsWith("__cleared_") ? null : raw;
          return { id: u.id, name: u.name, rfid };
        }),
        { onConflict: "id" },
      );
  } catch (error) {
    console.error("User Hub backfill failed:", error);
  }
}

export function subscribeUserHubSync() {
  return userHub
    .channel("userhub-users")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      async (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id?: number };
          if (typeof oldRow?.id === "number") await unmirrorUser(oldRow.id);
        } else {
          const newRow = payload.new as UserHubUser;
          if (newRow?.id) await mirrorUser(newRow);
        }
      },
    )
    .subscribe();
}
