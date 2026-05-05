import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-pin",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const adminPin = Deno.env.get("ADMIN_PANEL_PIN") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

type UserPayload = {
  user_id: string;
  rfid: string;
  first_name: string;
  last_name?: string | null;
};

type WeaponPayload = {
  weapon_name: string;
  weapon_type: string;
  is_assigned?: boolean;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeText(value: unknown, field: string, maxLength: number) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${field} is required.`);
  if (normalized.length > maxLength) throw new Error(`${field} is too long.`);
  return normalized;
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("Value is too long.");
  return normalized;
}

function parseUserPayload(values: unknown): UserPayload {
  const payload = values as Record<string, unknown>;
  return {
    user_id: normalizeText(payload?.user_id, "User ID", 80),
    rfid: normalizeText(payload?.rfid, "RFID", 120),
    first_name: normalizeText(payload?.first_name, "First name", 80),
    last_name: normalizeOptionalText(payload?.last_name, 80),
  };
}

function parseWeaponPayload(values: unknown): WeaponPayload {
  const payload = values as Record<string, unknown>;
  return {
    weapon_name: normalizeText(payload?.weapon_name, "Weapon name", 120),
    weapon_type: normalizeText(payload?.weapon_type, "Weapon type", 80),
    is_assigned: Boolean(payload?.is_assigned),
  };
}

function requirePin(pin: string | null | undefined) {
  if (!adminPin) throw new Error("Admin PIN secret is not configured.");
  if (!pin || pin !== adminPin) throw new Error("Invalid PIN.");
}

async function resetAssignments() {
  const { error: laneError } = await supabase
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
    .not("lane_number", "is", null);

  if (laneError) throw laneError;

  const { error: weaponError } = await supabase
    .from("weapons")
    .update({ is_assigned: false, assigned_to_user_id: null })
    .not("weapon_id", "is", null);

  if (weaponError) throw weaponError;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const action = String(body?.action ?? "");
    const search = String(body?.search ?? "").trim();

    if (action === "fetch_users") {
      let query = supabase.from("users").select("*").order("created_at", { ascending: false });
      if (search) {
        const q = `%${search}%`;
        query = query.or(`user_id.ilike.${q},rfid.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json(200, { data: data ?? [] });
    }

    if (action === "create_user") {
      const values = parseUserPayload(body?.values);
      const { data, error } = await supabase.from("users").insert(values).select("*").single();
      if (error) throw error;
      return json(200, { data });
    }

    if (action === "update_user") {
      const id = normalizeText(body?.id, "User ID", 120);
      const values = parseUserPayload(body?.values);
      const { data, error } = await supabase.from("users").update(values).eq("id", id).select("*").single();
      if (error) throw error;
      return json(200, { data });
    }

    if (action === "delete_user") {
      const id = normalizeText(body?.id, "User ID", 120);
      await resetAssignments();
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (action === "fetch_weapons") {
      let query = supabase.from("weapons").select("*").order("weapon_id", { ascending: true });
      if (search) {
        const q = `%${search}%`;
        query = query.or(`weapon_name.ilike.${q},weapon_type.ilike.${q}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json(200, { data: data ?? [] });
    }

    if (action === "create_weapon") {
      const values = parseWeaponPayload(body?.values);
      const { data, error } = await supabase.from("weapons").insert(values).select("*").single();
      if (error) throw error;
      return json(200, { data });
    }

    if (action === "update_weapon") {
      const weaponId = Number(body?.weaponId);
      if (!Number.isInteger(weaponId)) throw new Error("Weapon ID is invalid.");
      const values = parseWeaponPayload(body?.values);
      const { data, error } = await supabase.from("weapons").update(values).eq("weapon_id", weaponId).select("*").single();
      if (error) throw error;
      return json(200, { data });
    }

    if (action === "delete_weapon") {
      const weaponId = Number(body?.weaponId);
      if (!Number.isInteger(weaponId)) throw new Error("Weapon ID is invalid.");
      const { error: laneError } = await supabase
        .from("lane_assignments")
        .update({ weapon_id: null, weapon_name: null, weapon_type: null })
        .eq("weapon_id", weaponId);
      if (laneError) throw laneError;
      const { error } = await supabase.from("weapons").delete().eq("weapon_id", weaponId);
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (action === "reset_assignments") {
      await resetAssignments();
      return json(200, { ok: true });
    }

    if (action === "purge_all_users") {
      await resetAssignments();
      const { error } = await supabase.from("users").delete().not("id", "is", null);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(400, { error: "Unsupported admin action." });
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "Unexpected admin error." });
  }
});
