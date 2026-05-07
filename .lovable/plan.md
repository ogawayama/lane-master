# QM 360 — Gear Pickup Flow

QM 360 stops using lanes and weapons. Instead, every user who scans in is assigned one **PDD** item and one **SAT** item from a gear inventory. IDT, ODT, and Live Fire keep their existing lane/weapon logic untouched.

## What the user sees

**QM 360 Self Service (`/qm360`)**
- Same RFID scan screen as today.
- On a successful scan, message becomes:
  - `Welcome {First Name}. Pick up your gear: PDD {nnn} and SAT {nnn}.`
- Re-scan of an already-checked-in user shows the same gear they already hold (idempotent).
- "Reset" clears all QM 360 gear assignments only.

**QM 360 Lanes view (`/qm360/lanes`)** — repurposed as the live gear board:
- Header: `QM 360 — GEAR PICKUP`
- Grid of cards, one per currently checked-in user, each showing:
  ```text
  Welcome {First Name} {Last Name}
  Pick up your gear:
    PDD {nnn}
    SAT {nnn}
  ```
- Empty state when nobody is checked in.
- Realtime updates via Supabase Realtime on the new gear-assignment table.

**QM 360 Admin (`/qm360/admin`)**
- Users tab unchanged.
- Settings dialog "Weapon inventory" tab is replaced with a **Gear inventory** tab managing two lists:
  - PDD items (number, status: available / assigned)
  - SAT items (number, status: available / assigned)
- Add / edit / delete gear items, plus Excel export.
- "Reset assignments" clears all QM 360 gear (no lanes touched).

## Data model

New tables (QM 360 only — IDT/ODT/Live Fire stay on `lane_assignments` + `weapons`):

`qm360_gear`
- `id uuid pk`
- `gear_type text` — `'PDD'` or `'SAT'` (validated by trigger)
- `gear_number int` — e.g. 10, 117 — unique per `gear_type`
- `is_assigned bool default false`
- `assigned_to_user_id uuid null`
- `created_at`, `updated_at`

`qm360_assignments`
- `id uuid pk`
- `user_id uuid` — references `users.id` logically (no FK, per project rules)
- `pdd_gear_id uuid` → `qm360_gear.id`
- `sat_gear_id uuid` → `qm360_gear.id`
- `assigned_at timestamptz default now()`
- unique on `user_id` (one active assignment per user)

RLS mirrors existing kiosk-style policies (public read/update, admin insert/delete) and realtime is enabled on `qm360_assignments` and `qm360_gear`.

Seed migration inserts a starter set of PDD and SAT numbers (e.g. PDD 001–010, SAT 101–110) so the flow works immediately; admin can edit afterwards.

## Code changes

- `src/services/qm360Service.ts` (new): `lookupUserByRfid` (reuse), `getOrCreateGearAssignment(user)`, `fetchActiveGearAssignments()`, `resetQm360Assignments()`, gear CRUD.
- `src/services/realtimeService.ts`: add `subscribeQm360Assignments(onUpdate)`.
- `src/pages/Qm360Screen.tsx`: stop using shared `LoginScreen`; new component reusing the same scan UI but calling `getOrCreateGearAssignment` and rendering the new success message.
- `src/pages/Qm360Lanes.tsx`: stop using `LaneOverview`; render the gear board described above with realtime subscription.
- `src/pages/Qm360Admin.tsx` + a new `Qm360AdminDashboard` (or a `variant="gear"` branch in `AdminDashboard`): swap the Weapons tab for a Gear tab, wire reset to `resetQm360Assignments`.
- `src/components/admin/GearFormDialog.tsx` (new): add/edit a PDD or SAT item.
- `src/services/adminService.ts`: add gear export + reset helpers for QM 360.

IDT, ODT, Live Fire pages, services, and admin remain untouched.

## Out of scope

- No changes to weapon/lane data for the other three sections.
- No migration of existing QM 360 weapon rows — they're simply unused (we can delete them in the same migration if you want; default plan: leave them in place, harmless).
