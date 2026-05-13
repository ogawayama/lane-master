## Problem

`resetDemoMode` updates the User Hub `users` table with `rfid: null`, but the User Hub schema has `rfid` as **NOT NULL** (this project's local mirror allows null, but the Hub does not). Result: `null value in column "rfid" of relation "users" violates not-null constraint`.

We can't migrate the Hub schema from this project, so we have to write a value the Hub accepts. The earlier `Pelle` row already exists in the Hub with `rfid = ""`, which confirms empty string is allowed there and there's no UNIQUE constraint on `rfid` in the Hub.

## Fix

**`src/services/adminService.ts` — `resetDemoMode`**

Change the update payload from `{ rfid: null }` to `{ rfid: "" }` so the Hub accepts it:

```ts
const { error } = await userHub.from("users").update({ rfid: "" }).in("id", ids);
```

The local mirror is unaffected: realtime sync flows through `mirrorUser`, which already coerces `""` → `null` before upserting into the local `users` table (which has UNIQUE(rfid) and treats blank as unset). So locally the demo users end up with `rfid = NULL`, exactly as requested, and the Hub stores blank strings.

No other call site needs to change — `updateUser` in `userHubService.ts` already coerces blank to null on its way to the Hub for normal admin edits, but that path hits the same NOT NULL issue if used to clear an RFID. We're not touching it in this fix because the user only reported demo reset; if they hit the same error clearing RFID via the user form later, we'll apply the same coercion change there.

## Verification

- Open an admin panel → Reset demo mode → success toast, no error.
- Demo users still appear in the user list.
- Their RFID column is empty (blank in admin / null locally).
- Re-scanning one of the demo RFIDs is treated as a new tag (registration flow), as expected.

## Out of scope

- Hub-side schema change to make `rfid` nullable.
- Adjusting the regular admin "clear RFID" flow.
