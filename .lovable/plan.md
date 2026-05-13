## Problem

When scanning a new RFID tag, registration sometimes fails with "Registration failed. User ID or RFID may already exist", even though the tag is genuinely new.

The error message is misleading. The User Hub insert actually succeeds — what fails is mirroring the new row into this project's local `users` table.

## Root causes (verified against the live DB and network logs)

1. **Stale trigger on local `users` table.** A trigger `update_users_updated_at` calls `update_updated_at_column()`, which sets `NEW.updated_at`. But `public.users` has no `updated_at` column. Any UPDATE path (including the UPDATE half of an `upsert` on conflict) errors out with `record "new" has no field "updated_at"` (Postgres `42703`). This is visible in the captured network logs as the 400 on the mirror upsert.

2. **Unique constraint on `rfid` collides with empty strings / stale rows.** The local mirror has `UNIQUE (rfid)` and at least one legacy row (`Pelle`) with `rfid = ""`. When the realtime sync or a backfill tries to mirror another row whose rfid normalises to `""`, the upsert returns `23505` (visible as the 409 in network logs) and `mirrorUser` throws.

3. **Error swallowing makes the message wrong.** `assignmentService.registerUser` wraps everything in `try/catch` and returns `null` on any error, so any mirror failure is reported to the user as "User ID or RFID may already exist", regardless of the real cause.

## Fix

### Database migration

- Drop the stale trigger so updates to local `users` no longer crash:
  `DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;`
- Normalise legacy empty rfid values to NULL so the UNIQUE constraint stops colliding:
  `UPDATE public.users SET rfid = NULL WHERE rfid = '';`

(We don't need `updated_at` on the mirror — User Hub is the source of truth and the column wasn't being read anywhere.)

### Code changes

- **`src/services/userHubService.ts`**
  - In `mirrorUser`, coerce `rfid: ""` to `null` before upserting, mirroring what `createUser`/`updateUser` already do. This protects against any other source of empty-string rfids.
  - Make `mirrorUser` non-fatal: log and swallow upsert errors rather than throwing. The hub is the source of truth; a mirror hiccup must not break a successful registration. Realtime will retry.

- **`src/services/assignmentService.ts`**
  - In `registerUser`, propagate the underlying error message instead of returning a bare `null`. Return either the user or an `{ error: string }` shape (or rethrow) so the kiosk can show something accurate.

- **`src/pages/Qm360Screen.tsx`** and **`src/pages/LoginScreen.tsx`**
  - Update `handleRegister` to surface the real error string when registration fails, instead of the hard-coded "User ID or RFID may already exist" line.

### Verification

- Scan a brand-new RFID tag → registration succeeds, no 400/409 in network panel.
- Re-scan the same tag → goes straight to the existing-user assignment flow.
- Scan a tag while the legacy `Pelle` row still exists → no UNIQUE-constraint collision after the migration normalises empty rfids.
- Backfill on app load no longer logs the `updated_at` 400.

## Out of scope

- No changes to the Login Screen or Lane Overview business logic.
- No changes to User Hub schema; all DB changes are in this project's mirror.
