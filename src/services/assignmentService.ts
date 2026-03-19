import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const LANE_PRIORITY = [3, 1, 5, 2, 4];

export type User = Tables<"users">;
export type Weapon = Tables<"weapons">;
export type LaneAssignment = Tables<"lane_assignments">;

export interface AssignmentResult {
  success: boolean;
  message: string;
  user?: User;
  lane?: number;
  weapon?: Weapon;
}

export async function lookupUserByRfid(rfid: string): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("rfid", rfid)
    .maybeSingle();
  return data;
}

export async function getExistingAssignment(userId: string): Promise<LaneAssignment | null> {
  const { data } = await supabase
    .from("lane_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "occupied")
    .maybeSingle();
  return data;
}

export async function getNextAvailableLane(): Promise<number | null> {
  const { data: lanes } = await supabase
    .from("lane_assignments")
    .select("lane_number, status");

  if (!lanes) return null;

  const occupiedLanes = new Set(
    lanes.filter((l) => l.status === "occupied").map((l) => l.lane_number)
  );

  for (const lane of LANE_PRIORITY) {
    if (!occupiedLanes.has(lane)) return lane;
  }
  return null;
}

export async function getNextAvailableWeapon(): Promise<Weapon | null> {
  const { data } = await supabase
    .from("weapons")
    .select("*")
    .eq("is_assigned", false)
    .order("weapon_id", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function assignLaneAndWeapon(user: User): Promise<AssignmentResult> {
  // Check existing assignment first
  const existing = await getExistingAssignment(user.id);
  if (existing) {
    const { data: weapon } = await supabase
      .from("weapons")
      .select("*")
      .eq("weapon_id", existing.weapon_id!)
      .maybeSingle();
    return {
      success: true,
      message: `Welcome back ${user.first_name}. You are already assigned to lane ${existing.lane_number} with weapon ${existing.weapon_name}.`,
      user,
      lane: existing.lane_number,
      weapon: weapon ?? undefined,
    };
  }

  const lane = await getNextAvailableLane();
  if (lane === null) {
    return { success: false, message: "All lanes are assigned." };
  }

  const weapon = await getNextAvailableWeapon();
  if (!weapon) {
    return { success: false, message: "No weapons available." };
  }

  // Assign weapon
  await supabase
    .from("weapons")
    .update({ is_assigned: true, assigned_to_user_id: user.id })
    .eq("weapon_id", weapon.weapon_id);

  // Assign lane
  await supabase
    .from("lane_assignments")
    .update({
      user_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      weapon_id: weapon.weapon_id,
      weapon_name: weapon.weapon_name,
      weapon_type: weapon.weapon_type,
      status: "occupied",
      assigned_at: new Date().toISOString(),
    })
    .eq("lane_number", lane);

  return {
    success: true,
    message: `Welcome ${user.first_name}. Pick up weapon ${weapon.weapon_name} and proceed to lane ${lane}.`,
    user,
    lane,
    weapon,
  };
}

export async function registerUser(data: {
  user_id: string;
  rfid: string;
  first_name: string;
  last_name?: string;
}): Promise<User | null> {
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      user_id: data.user_id,
      rfid: data.rfid,
      first_name: data.first_name,
      last_name: data.last_name || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Registration error:", error);
    return null;
  }
  return user;
}

export async function resetAllAssignments(): Promise<void> {
  // Clear all lane assignments
  await supabase
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
    .in("lane_number", [1, 2, 3, 4, 5]);

  // Mark all weapons as unassigned
  await supabase
    .from("weapons")
    .update({ is_assigned: false, assigned_to_user_id: null })
    .gte("weapon_id", 0);
}

export async function fetchAllLanes(): Promise<LaneAssignment[]> {
  const { data } = await supabase
    .from("lane_assignments")
    .select("*")
    .order("lane_number", { ascending: true });
  return data || [];
}

export async function searchUsersByName(query: string): Promise<User[]> {
  const q = `%${query}%`;
  const { data } = await supabase
    .from("users")
    .select("*")
    .or(`first_name.ilike.${q},last_name.ilike.${q}`)
    .order("first_name", { ascending: true })
    .limit(10);
  return data || [];
}

export async function relinkRfid(userId: string, newRfid: string): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .update({ rfid: newRfid })
    .eq("id", userId)
    .select()
    .single();
  return data;
}
