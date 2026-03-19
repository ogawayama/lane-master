

## Fix: Registration Form Input Focus + Simplify Registration

### Root Cause
The hidden RFID input has a `setInterval` that re-focuses it every 2 seconds. When the registration form opens, this interval keeps stealing focus from the form's input fields, making them impossible to type in.

### Changes

**1. `src/pages/LoginScreen.tsx`**
- Stop the auto-focus interval when `state === "register"` so the registration form inputs work normally.
- Resume auto-focus when leaving the register state.

**2. `src/components/RegistrationForm.tsx`**
- Remove the `User ID` input field from the form.
- Auto-generate a `user_id` (e.g., `USR-` + random 6 chars) inside `handleSubmit` before calling `onRegister`.

These two changes fix the typing issue and simplify registration to just first name and last name.

