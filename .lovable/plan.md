
# Align `users` table with User Hub

Make this project's `users` table byte-identical to User Hub's so the two can later share data via a second Supabase client. All existing user records (and any active assignments tied to them) will be wiped — fresh start.

## Target schema (identical to User Hub)

```text
users
  id          integer       PRIMARY KEY
  name        text          NOT NULL
  rfid        text          NOT NULL
  created_at  timestamptz   NOT NULL DEFAULT now()
```

No `user_id` (USR code), no `first_name`/`last_name`, no `updated_at`.

## Impact on other tables

These tables currently reference `users.id` as UUID and cache `first_name`/`last_name`. They must change too:

- `lane_assignments`: `user_id uuid` → `user_id integer`; drop `first_name`, `last_name`; add `name text`.
- `weapons`: `assigned_to_user_id uuid` → `integer`.
- `qm360_gear`: `assigned_to_user_id uuid` → `integer`.
- `qm360_assignments`: `user_id uuid` → `integer`.

All active assignments are reset as part of the wipe (lanes empty, weapons/gear unassigned).

## Migration steps

1. **Wipe dependent data** (so FK type changes are safe):
   - Reset all `lane_assignments` rows to empty (null user/weapon, status `empty`).
   - Set all `weapons.is_assigned = false`, `assigned_to_user_id = null`.
   - Delete all `qm360_assignments`.
   - Set all `qm360_gear.is_assigned = false`, `assigned_to_user_id = null`.
   - Delete all `users`.
2. **Alter schema**:
   - Drop `users.user_id`, `users.first_name`, `users.last_name`, `users.updated_at`.
   - Add `users.name text NOT NULL`.
   - Make `users.rfid` NOT NULL.
   - Drop UUID PK, add `id integer PRIMARY KEY` (plain integer, no sequence — IDs will come from User Hub).
   - Alter all referencing columns from `uuid` to `integer`.
   - Drop `lane_assignments.first_name`, `last_name`; add `name text`.
3. **Re-apply RLS policies** (kiosk read/write stays the same, just on the new column shape).

## Code changes

- **Types**: `src/integrations/supabase/types.ts` regenerates automatically after the migration.
- **Services** (`adminService.ts`, `assignmentService.ts`, `qm360Service.ts`, `realtimeService.ts`): swap `first_name`/`last_name` for `name`, drop `user_id` (USR code) field, treat `id` as number.
- **Edge function** `supabase/functions/admin-panel/index.ts`: same field rename in payload validation and queries; remove USR-code generation/handling.
- **UI**:
  - `RegistrationForm.tsx`: single "Name" input (replaces first/last).
  - `UserFormDialog.tsx`: single name field, drop USR-code field.
  - `AdminDashboard.tsx` + `ImportUsersDialog.tsx`: CSV columns become `id, name, rfid`; remove USR-code column.
  - `LaneCard.tsx`, `LoginScreen.tsx`, `LaneOverview.tsx`, lane/admin pages: render `name` instead of `${first_name} ${last_name}`.
- **Memory note**: update `mem://features/user-registration` (no more USR- auto-generation, no name splitting).

## What still needs to happen after this migration

This step only aligns the schema. The follow-up (Option A from the previous discussion) is to add a second Supabase client pointing at User Hub and route user CRUD there with dual-write back to this project. That's a separate change once you confirm this schema lands cleanly.

## Risks / things to confirm

- Integer `id` with no sequence means new users *must* be created in User Hub first (or we need to add a sequence here too). The Option A plan assumes User Hub is the source of truth, so no sequence is correct — but local-only registration on this kiosk will not work until the second client is wired up.
- All historical assignment records and user records are deleted. Not recoverable without a project revert.
- Tests referencing the old schema (`src/test/`) may need updating.
