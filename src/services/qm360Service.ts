import { supabase } from "@/integrations/supabase/client";
import type { User } from "./assignmentService";

export type GearType = "PDD" | "SAT";

export interface GearItem {
  id: string;
  gear_type: GearType;
  gear_number: number;
  is_assigned: boolean;
  assigned_to_user_id: string | null;
}

export interface GearAssignment {
  id: string;
  user_id: string;
  pdd_gear_id: string;
  sat_gear_id: string;
  assigned_at: string;
}

export interface ActiveGearAssignment {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  pdd_number: number;
  sat_number: number;
  assigned_at: string;
}

export interface GearAssignResult {
  success: boolean;
  message: string;
  pdd?: number;
  sat?: number;
}

async function pickAvailableGear(type: GearType): Promise<GearItem | null> {
  const { data } = await supabase
    .from("qm360_gear" as never)
    .select("*")
    .eq("gear_type", type)
    .eq("is_assigned", false)
    .order("gear_number", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as GearItem | null) ?? null;
}

export async function getOrCreateGearAssignment(user: User): Promise<GearAssignResult> {
  const { data: existing } = await supabase
    .from("qm360_assignments" as never)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const a = existing as GearAssignment;
    const { data: gears } = await supabase
      .from("qm360_gear" as never)
      .select("*")
      .in("id", [a.pdd_gear_id, a.sat_gear_id]);
    const list = (gears ?? []) as GearItem[];
    const pdd = list.find((g) => g.gear_type === "PDD")?.gear_number;
    const sat = list.find((g) => g.gear_type === "SAT")?.gear_number;
    return {
      success: true,
      message: `Welcome back ${user.first_name}. Pick up your gear: PDD ${String(pdd).padStart(3, "0")} and SAT ${String(sat).padStart(3, "0")}.`,
      pdd,
      sat,
    };
  }

  const pdd = await pickAvailableGear("PDD");
  const sat = await pickAvailableGear("SAT");
  if (!pdd || !sat) {
    return { success: false, message: "No gear available." };
  }

  const { error: insertErr } = await supabase.from("qm360_assignments" as never).insert({
    user_id: user.id,
    pdd_gear_id: pdd.id,
    sat_gear_id: sat.id,
  });
  if (insertErr) {
    return { success: false, message: "Failed to assign gear." };
  }

  await supabase
    .from("qm360_gear" as never)
    .update({ is_assigned: true, assigned_to_user_id: user.id })
    .in("id", [pdd.id, sat.id]);

  return {
    success: true,
    message: `Welcome ${user.first_name}. Pick up your gear: PDD ${String(pdd.gear_number).padStart(3, "0")} and SAT ${String(sat.gear_number).padStart(3, "0")}.`,
    pdd: pdd.gear_number,
    sat: sat.gear_number,
  };
}

export async function fetchActiveGearAssignments(): Promise<ActiveGearAssignment[]> {
  const { data: assignments } = await supabase
    .from("qm360_assignments" as never)
    .select("*")
    .order("assigned_at", { ascending: true });
  const list = (assignments ?? []) as GearAssignment[];
  if (list.length === 0) return [];

  const userIds = list.map((a) => a.user_id);
  const gearIds = list.flatMap((a) => [a.pdd_gear_id, a.sat_gear_id]);

  const [{ data: users }, { data: gears }] = await Promise.all([
    supabase.from("users").select("id, first_name, last_name").in("id", userIds),
    supabase.from("qm360_gear" as never).select("*").in("id", gearIds),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const gearMap = new Map(((gears ?? []) as GearItem[]).map((g) => [g.id, g]));

  return list.map((a) => {
    const u = userMap.get(a.user_id);
    return {
      id: a.id,
      user_id: a.user_id,
      first_name: u?.first_name ?? null,
      last_name: u?.last_name ?? null,
      pdd_number: gearMap.get(a.pdd_gear_id)?.gear_number ?? 0,
      sat_number: gearMap.get(a.sat_gear_id)?.gear_number ?? 0,
      assigned_at: a.assigned_at,
    };
  });
}

export async function resetQm360Assignments(): Promise<void> {
  await supabase.from("qm360_assignments" as never).delete().not("id", "is", null);
  await supabase
    .from("qm360_gear" as never)
    .update({ is_assigned: false, assigned_to_user_id: null })
    .not("id", "is", null);
}

export async function fetchGear(search = ""): Promise<GearItem[]> {
  let q = supabase.from("qm360_gear" as never).select("*").order("gear_type").order("gear_number");
  const { data } = await q;
  let list = ((data ?? []) as GearItem[]);
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter(
      (g) => g.gear_type.toLowerCase().includes(s) || String(g.gear_number).includes(s)
    );
  }
  return list;
}

export async function createGear(values: { gear_type: GearType; gear_number: number }) {
  const { error } = await supabase.from("qm360_gear" as never).insert(values);
  if (error) throw error;
}

export async function updateGear(id: string, values: { gear_type: GearType; gear_number: number }) {
  const { error } = await supabase.from("qm360_gear" as never).update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteGear(id: string) {
  const { error } = await supabase.from("qm360_gear" as never).delete().eq("id", id);
  if (error) throw error;
}
