

## Add "Link to Existing User" Feature

When an unregistered RFID is scanned and the registration form appears, add a **"Link to Existing User"** option that lets staff search for an existing user by name and re-link them to the new RFID tag.

### Changes

**1. `src/services/assignmentService.ts`** — Add two functions:
- `searchUsersByName(query: string)`: Search `users` table by first/last name using `ilike`
- `relinkRfid(userId: string, newRfid: string)`: Update the user's `rfid` column with the new tag value

**2. `src/components/RegistrationForm.tsx`** — Add a toggle between two modes:
- **"Register New"** (current form, default)
- **"Link Existing"** — shows a search input, displays matching users in a list, and a "Link" button per result
- Both modes share the same cancel button and loading state
- When a user is linked, call `onLink(user)` callback

**3. `src/pages/LoginScreen.tsx`** — Handle the link flow:
- Pass a new `onLink` callback to `RegistrationForm`
- When triggered: call `relinkRfid`, then `assignLaneAndWeapon` with the found user, show the welcome message

