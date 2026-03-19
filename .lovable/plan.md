

## Fix: "Link Existing" Input Losing Focus

### Root Cause
Line 158 in `LoginScreen.tsx` has `onClick={focusInput}` on the outermost `<div>`. Every click anywhere—including clicks on the search input in "Link Existing" mode—immediately refocuses the hidden RFID input field, stealing focus from the form.

### Fix

**`src/pages/LoginScreen.tsx`** — Make the `onClick` handler conditional:
- Only call `focusInput()` when `state !== "register"`, so clicking inside the registration/link form doesn't steal focus.

Single line change on line 158.

