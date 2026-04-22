
## Build an Admin Panel for Users, Weapons, and Data Import/Export

### Recommendation

For your use case, I recommend supporting **both Excel (.xlsx) and CSV**:

- **CSV** should be the primary import/export format for USB workflows
  - simplest to move on/off a USB stick
  - opens in Excel on almost any computer
  - lightweight and reliable for bulk user data
- **Excel (.xlsx)** should also be supported
  - better for office staff
  - allows a cleaner template with headers, formatting, and validation guidance

Best practical setup:
- **Export users as CSV by default**
- Also offer **Export as Excel**
- Allow **Import from CSV or Excel**
- Use standard browser file download/upload so staff can save to or open files from a USB drive

Important limitation:
- a web app cannot directly browse a USB drive automatically
- the normal and reliable workflow is:
  1. click Export
  2. save file to USB drive
  3. edit file on another machine if needed
  4. plug USB back in
  5. click Import and choose the file

## What to build

### 1) Secure admin access
Add a protected admin area rather than exposing database controls in the kiosk UI.

Recommended approach:
- keep the kiosk screen as-is
- add a separate `/admin` route
- require real authentication for admin users
- add a dedicated **user roles table** and store admin privileges there
- only admins can access import/export, user management, weapon management, and purge actions

This avoids unsafe open access. Right now the database rules are effectively open for everyone, so the admin feature should also tighten backend access.

### 2) Admin dashboard structure
Create a clean admin panel with tabs or sections for:

#### Users
- list all users
- search by name, user ID, or RFID
- create user
- edit user
- relink RFID
- delete individual user
- bulk import users
- export users
- purge all users

#### Weapons
- list all weapons
- create weapon
- edit weapon name/type
- mark weapon availability
- remove weapon
- optionally reset all weapon assignments

#### System actions
- purge all users
- optionally purge all weapons
- reset lanes and assignments
- show confirmation dialogs for destructive actions

### 3) Import/export workflow
Build an import/export experience designed for admin staff:

#### Export
Provide buttons for:
- Export users as CSV
- Export users as Excel
- Export weapons as CSV
- Export weapons as Excel

Exports should use clear column names and consistent templates.

#### Import
Provide an upload area that accepts:
- `.csv`
- `.xlsx`

Import behavior:
- validate file structure before writing anything
- preview rows before confirming
- show errors per row
- support “skip duplicates” or “update existing users”
- clearly report how many rows were created, updated, skipped, or rejected

## Database and security changes

### 1) Add proper admin authorization
Create backend support for admin access using:
- `user_roles` table
- `app_role` enum
- `has_role()` security-definer function

This follows the secure pattern for role checks and avoids putting roles on the users table.

### 2) Tighten database policies
Current tables (`users`, `weapons`, `lane_assignments`) allow public full access. For an admin panel, update policies so:

- kiosk flows can still perform only the minimum actions they need
- admin-only operations require authenticated admin role
- destructive actions and bulk import/export are restricted to admins

### 3) Optional schema refinements
Review whether the current `users` table needs a few small improvements for admin workflows, such as:
- updated timestamp
- optional soft-delete support if you want safer deletion later
- stronger uniqueness/error handling around RFID and user_id

## Frontend implementation approach

### Routes
Add:
- `/admin/login` or reuse main auth flow
- `/admin`
- nested admin sections if needed

### Components
Create reusable admin UI pieces such as:
- data table for users and weapons
- edit/create dialogs
- import wizard
- export actions toolbar
- destructive confirmation dialogs
- status banners for import results

### UX details
- searchable and sortable tables
- clear empty states
- loading and success/error toasts
- confirmation before purge
- import template download button
- validation messages that explain exactly what is wrong in a file

## File-format recommendation

### Best recommendation: CSV + Excel
If your priority is “easy with USB”, this is the best mix.

#### CSV advantages
- easiest to transfer via USB
- smallest files
- works on nearly every PC
- easiest to recover if something goes wrong
- good for mass import/export

#### Excel advantages
- friendlier for non-technical staff
- can include a polished template
- better for manual editing and instructions
- supports multiple sheets if needed later

#### Suggested rule
- **Default export:** CSV
- **Also offer:** Excel
- **Primary import:** CSV and Excel both accepted

## USB workflow recommendation

The most practical USB-first flow is:

```text
Admin panel
  -> Export users.csv to Downloads
  -> Save/copy to USB drive
  -> Edit in Excel if needed
  -> Return to admin panel
  -> Import users.csv or users.xlsx from USB
  -> Review validation preview
  -> Confirm import
```

This is better than trying to do anything “direct USB native,” because browsers intentionally sandbox hardware/file access.

## Technical details

### Files likely to be added/updated
- `src/App.tsx` — add admin routes
- new admin pages/components under `src/pages` and `src/components`
- new service layer for admin CRUD, import, export, and purge actions
- new auth/admin guard utilities
- new database migration(s) for roles and RLS updates

### Data operations
Implement:
- CRUD for `users`
- CRUD for `weapons`
- admin-safe bulk delete/purge
- import parser for CSV/XLSX
- export generators for CSV/XLSX

### Validation
Use schema validation for imported rows and forms:
- required fields
- max lengths
- duplicate RFID detection
- duplicate user_id detection
- allowed weapon fields
- row-level error reporting

### Recommended import columns for users
Use a stable template like:
- `user_id`
- `rfid`
- `first_name`
- `last_name`

### Recommended weapon columns
- `weapon_name`
- `weapon_type`
- `is_assigned` only if you want controlled restore/import behavior

## Implementation order

1. Add secure admin authentication and admin-role backend support
2. Update database access rules for admin-safe operations
3. Add `/admin` route and basic dashboard shell
4. Build user management table and user edit/create dialogs
5. Build weapon management table and weapon edit/create dialogs
6. Add purge actions with confirmation
7. Add CSV export/import
8. Add Excel export/import
9. Add validation preview and row-level import reporting
10. Polish UX and test kiosk/admin separation

## Final recommendation

Yes, I suggest **supporting both CSV and Excel**, but if your main priority is **easy import/export using a USB drive**, then:

- use **CSV as the main operational format**
- keep **Excel as a convenience format**
- use simple **download/upload file selection**
- keep all destructive and bulk operations inside a protected admin panel

This will be the most reliable, easiest for staff, and safest long term.
