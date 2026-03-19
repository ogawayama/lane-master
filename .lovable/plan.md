

## Unified Name Input with Autocomplete

Merge both registration modes into a single, streamlined flow: one name input field that searches the database as you type. If a match is found, the user can select it to link the new RFID. If no match, they proceed to register as a new user.

### How It Works

1. User scans an unknown RFID tag
2. A single input appears: **"Enter name"**
3. As they type (debounced ~300ms), the system searches `users` by first/last name using `ilike`
4. A dropdown shows matching users (if any) — clicking one triggers the **Link** flow
5. If no match or they want a new user, they press **"Register as New"** — the input value is split on the first space into `first_name` / `last_name` (no space = empty last name)

### Changes

**`src/services/assignmentService.ts`**
- Existing `searchUsersByName` already works — no changes needed (uses `ilike` on both name columns)

**`src/components/RegistrationForm.tsx`**
- Replace the two-mode toggle UI with a single text input
- Add debounced search (300ms) that calls `searchUsersByName` on every keystroke
- Show a dropdown list of matching users below the input (with "Link" action)
- Show a "Register as New" button when input has text
- On register: split input value on first space → `first_name` + `last_name`

**`src/pages/LoginScreen.tsx`**
- No changes needed — `onRegister` and `onLink` callbacks already handle both flows

### Name Splitting Logic
```
"John"       → first_name: "John",  last_name: ""
"John Smith" → first_name: "John",  last_name: "Smith"
"Mary Jane Watson" → first_name: "Mary", last_name: "Jane Watson"
```

