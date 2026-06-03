Show the "Register New" button only when a search has finished and returned zero matching users, otherwise render only "Cancel".

## Changes
- `src/components/RegistrationForm.tsx`
  - Conditionally render the "Register New" button: only show it when `searched && results.length === 0 && name.trim()`.
  - When hidden, make "Cancel" the sole button, full-width.
  - When visible, keep the existing side-by-side layout with "Cancel".