# Use User Hub as the source of truth for users

This project keeps all of its own data (lanes, weapons, qm360 gear, assignments) in its current Lovable Cloud backend. Only the **users** table is sourced from the **User Hub** project ([open](/projects/bdcd8a58-4368-4f46-91b3-a889bd8b3920)).

## Approach

Add a **second Supabase client** pointing at User Hub. Use it for every user read and write. Keep the existing local `users` table as a **mirror** so that all the existing foreign keys (`lane_assignments.user_id`, `weapons.assigned_to_user_id`, `qm360_gear.assigned_to_user_id`, `qm360_assignments.user_id`) keep working without any further schema change.

```text
            ┌────────────────────┐
RFID scan ─►│ User Hub (source)  │  ← all user CRUD
            └─────────┬──────────┘
                      │ on success
                      ▼
            ┌────────────────────┐
            │ This project       │  ← lanes / weapons / gear
            │  users (mirror)    │     reference users.id
            └────────────────────┘
```

## What gets added

### 1. Second Supabase client

New file `src/integrations/userhub/client.ts` that creates a separate `createClient` instance using hard-coded User Hub URL + anon key (publishable, safe in code):

- URL: `https://lafsigvzpefmmmapuiog.supabase.co`
- Anon key: the publishable key from User Hub's `.env`

It uses `auth: { persistSession: false }` so it does not collide with this project's auth session in `localStorage`.

A small wrapper module `src/services/userHubService.ts` exposes:
- `lookupByRfid(rfid)`
- `lookupById(id)`
- `searchByName(query)`
- `listAll()`
- `create({ name, rfid })` — User Hub auto-generates `id`
- `update(id, { name?, rfid? })`
- `remove(id)`

### 2. Mirror logic

A helper `mirrorUser(user)` in the same service upserts the User Hub record into this project's `users` table by `id`. It is called:
- after every successful lookup (so a freshly-created User Hub user is usable immediately for assignment)
- after every create/update from admin
- on a `realtime` subscription to User Hub's `users` table, so deletes/edits made elsewhere propagate

A helper `unmirrorUser(id)` deletes the local mirror row, but only after first clearing any active assignment that references it (same wipe pattern already used in `resetAssignments`).

### 3. Service rewires

- `src/services/assignmentService.ts`
  - `lookupUserByRfid` → calls `userHubService.lookupByRfid` then `mirrorUser`
  - `searchUsersByName` → User Hub
  - `registerUser` → `userHubService.create` then `mirrorUser`
  - `relinkRfid` → `userHubService.update`
  - Everything else (lanes, weapons, assignments) keeps using the local `supabase` client unchanged.

- `src/services/adminService.ts` and `supabase/functions/admin-panel/index.ts`
  - All `fetch_users / create_user / update_user / delete_user / purge_all_users` actions move off the edge function and call `userHubService` directly from the client (User Hub is publicly writable via anon key, same posture as this kiosk).
  - The edge function keeps weapons + reset actions only.
  - Import preview / CSV import call `userHubService.create / update`, then mirror.

### 4. Realtime sync

Add a one-time subscription on app boot (in `src/services/realtimeService.ts` or a new `useUserHubSync` hook mounted in `App.tsx`):

```ts
userHub.channel('users').on('postgres_changes',
  { event: '*', schema: 'public', table: 'users' },
  (payload) => mirror or unmirror based on payload.eventType
).subscribe()
```

This keeps the mirror current even when a different project edits User Hub.

### 5. Initial backfill

On first load after this change, run a one-shot `userHubService.listAll()` → upsert into local `users` so the kiosk works even before anyone scans.

## What does NOT change

- Database schema in this project (already aligned in the previous step).
- Lanes / weapons / qm360 logic and tables.
- RLS policies.
- The `admin-panel` edge function for non-user actions.
- Authentication for admin pages.

## Risks / things to confirm

- **User Hub RLS**: this plan assumes User Hub's `users` table allows anon `select/insert/update/delete` (it appears to be a public kiosk-style app, same as this one). If it does not, user CRUD from the kiosk will fail and we will need either an edge function in User Hub or service-role access via a secret.
- **Delete propagation**: if a user is deleted in User Hub while they hold an active lane, the mirror sync will first clear that lane assignment and unassign their weapon. That side effect is intentional but worth flagging.
- **Two Realtime channels**: one against this project (already present for lanes/weapons), one against User Hub for users. Slightly more network, no functional issue.
- **Offline / network**: every RFID scan now requires a round-trip to User Hub. The local mirror means lane/weapon state still renders, but a *new* unknown RFID cannot be resolved without network.
