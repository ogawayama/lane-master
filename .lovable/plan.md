## Problem

The Hub's `users.rfid` column is **NOT NULL AND UNIQUE** (`users_rfid_key`). Setting all five demo users to `""` in one update collides on the second row.

We can't change the Hub schema from this project, so each cleared row needs a value that is non-null and unique.

## Fix

**`src/services/adminService.ts` — `resetDemoMode`**

Update the demo users one at a time, writing a unique placeholder per user instead of a shared blank:

```ts
for (const id of ids) {
  const placeholder = `__cleared_${id}_${Date.now()}`;
  const { error } = await userHub
    .from("users")
    .update({ rfid: placeholder })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
```

The local mirror needs the placeholder to read as "blank" so the user truly looks unassigned and the tag becomes scannable as a new RFID. Two options, picking the second because it keeps the source of truth honest about "this was cleared":

**`src/services/userHubService.ts` — `mirrorUser`**

Treat any rfid starting with the `__cleared_` prefix as null when mirroring:

```ts
const raw = user.rfid?.trim() ?? "";
const rfid = !raw || raw.startsWith("__cleared_") ? null : raw;
```

Apply the same coercion in `backfillMirror` and in `lookupByRfid` (a literal scan of `__cleared_…` should never match a user — `.eq("rfid", scanned)` won't match real scans anyway, so no extra guard needed there).

## Verification

- Reset demo mode → success, no UNIQUE / NOT NULL errors.
- Demo users still listed; their RFID column shows the placeholder in raw Hub data but appears blank in the local admin (mirror = null).
- Re-scanning a former demo tag goes through the registration flow.
- Re-running reset is idempotent (each call generates a fresh `Date.now()` suffix, so no collision on repeat).

## Out of scope

- Hiding the placeholder string from the Hub-side admin UI (different project).
- Making the Hub's rfid column nullable.
