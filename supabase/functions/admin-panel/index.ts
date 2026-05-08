import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-pin",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const VALID_SECTIONS = new Set(["idt", "odt", "live_fire", "qm360"]);

type Section = "idt" | "odt" | "live_fire" | "qm360";

type UserPayload = {
  id: number;
  rfid: string;
  name: string;
};

type WeaponPayload = {
  weapon_name: string;
  weapon_type: string;
  is_assigned?: boolean;
  section: Section;
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

function parseSection(value: unknown): Section {
  const s = String(value ?? "").trim();
  if (!VALID_SECTIONS.has(s)) throw new Error("Invalid section.");
  return s as Section;
}

function parseUserPayload(values: unknown): UserPayload {
  const payload = values as Record<string, unknown>;
  const idNum = Number(payload?.id);
  if (!Number.isInteger(idNum) || idNum <= 0) throw new Error("ID must be a positive integer.");
  return {
    id: idNum,
    rfid: normalizeText(payload?.rfid, "RFID", 120),
    name: normalizeText(payload?.name, "Name", 160),
  };
}

function parseWeaponPayload(values: unknown): WeaponPayload {
  const payload = values as Record<string, unknown>;
  return {
    weapon_name: normalizeText(payload?.weapon_name, "Weapon name", 120),
    weapon_type: normalizeText(payload?.weapon_type, "Weapon type", 80),
    is_assigned: Boolean(payload?.is_assigned),
    section: parseSection(payload?.section),
  };
}

async function resetAssignmentsForSection(section: Section) {
  const { error: laneError } = await supabase
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
    .eq("section", section);

  if (laneError) throw laneError;

  const { error: weaponError } = await supabase
    .from("weapons")
    .update({ is_assigned: false, assigned_to_user_id: null })
    .eq("section", section);

  if (weaponError) throw weaponError;
}

async function resetAllAssignments() {
  for (const sec of ["idt", "odt", "live_fire", "qm360"] as Section[]) {
    await resetAssignmentsForSection(sec);
  }
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
        // id is numeric — only filter text columns by ilike
        query = query.or(`rfid.ilike.${q},name.ilike.${q}`);
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
      const id = Number(body?.id);
      if (!Number.isInteger(id)) throw new Error("ID is invalid.");
      const values = parseUserPayload(body?.values);
      // Don't allow changing the PK on update
      const { id: _ignore, ...updates } = values;
      const { data, error } = await supabase.from("users").update(updates).eq("id", id).select("*").single();
      if (error) throw error;
      return json(200, { data });
    }

    if (action === "delete_user") {
      const id = Number(body?.id);
      if (!Number.isInteger(id)) throw new Error("ID is invalid.");
      await resetAllAssignments();
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (action === "fetch_weapons") {
      const section = parseSection(body?.section);
      let query = supabase
        .from("weapons")
        .select("*")
        .eq("section", section)
        .order("weapon_id", { ascending: true });
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
      const section = parseSection(body?.section);
      await resetAssignmentsForSection(section);
      return json(200, { ok: true });
    }

    if (action === "purge_all_users") {
      await resetAllAssignments();
      const { error } = await supabase.from("users").delete().not("id", "is", null);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(400, { error: "Unsupported admin action." });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string })?.message || "Unexpected admin error.";
    console.error("admin-panel error:", error);
    return json(400, { error: message });
  }
});
