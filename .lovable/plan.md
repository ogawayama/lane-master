## Problem

After the last fix, `mirrorUser` swallows errors instead of throwing. That's correct, but `lookupUserByRfid` then does:

```ts
const hubUser = await userHubService.lookupByRfid(rfid);  // found in User Hub
if (!hubUser) return null;
const { data } = await supabase.from("users").select("*").eq("id", hubUser.id).maybeSingle();
return data;  // null if mirror upsert silently failed
```

If the mirror upsert fails (e.g. UNIQUE rfid collision with the legacy `Pelle` empty-string row, or any other transient mirror error), `data` is `null`, the kiosk thinks the RFID is unknown, and pushes the user into the registration flow. Registration then tries to create a User Hub row with an RFID that already exists there → "RFID already exists" error.

So the symptom (known tag → register prompt → "already exists") is the same root cause class as before: the local mirror is treated as authoritative when it should not be.

## Fix

**`src/services/assignmentService.ts` — `lookupUserByRfid`**

Treat User Hub as the source of truth. If the hub returns a user, return that user, falling back to a synthesized local-shape object when the mirror row is missing:

```ts
const hubUser = await userHubService.lookupByRfid(rfid);
if (!hubUser) return null;
const { data } = await supabase.from("users").select("*").eq("id", hubUser.id).maybeSingle();
return data ?? { id: hubUser.id, name: hubUser.name, rfid: hubUser.rfid, created_at: hubUser.created_at };
```

Apply the same pattern in `relinkRfid` (already uses hub then re-reads mirror) so it never returns null when the hub update succeeded.

**Database migration — clean up the legacy collision source**

The Hub row `Pelle` (id 60228) has `rfid = ""`. The mirror has `UNIQUE(rfid)` and an existing `""` row, so any backfill/realtime mirror of another empty-rfid hub row 409s. Normalise on the Hub side is out of scope (different project), but on this project's mirror we already converted `""` → `NULL` last migration. Re-run that normalisation defensively and additionally update the local Pelle row's rfid to NULL if it still shows `""` (the GET log shows it does on the *Hub* side; the mirror upsert is what's failing). No new schema needed.

Also: the backfill upsert sends `rfid: ""` straight from the hub payload without coercion — fix `backfillMirror` in `userHubService.ts` to coerce empty strings to `null` before upserting, same as `mirrorUser` does. This kills the recurring 409 in network logs.

## Verification

- Scan an existing tag (e.g. `2731977834` → User 1) → goes straight to assignment flow, no registration prompt.
- Scan an unknown tag → registration flow, succeeds.
- Network panel: no more 409 from the backfill upsert on app load.

## Out of scope

- Hub-side data cleanup (Pelle's empty rfid in the Hub project).
- Any UI changes.
