## Welcome message redesign

Update the success state in `src/pages/LoginScreen.tsx` (and apply the same changes to any other section login screens that render their own success block: `OdtScreen.tsx`, `LiveFireScreen.tsx`, `Qm360Screen.tsx` — I'll verify and mirror only where needed).

### New layout (top → bottom)

1. **"Welcome [name]"** — large heading (bigger than current text, e.g. `text-4xl md:text-5xl font-bold`).
2. **"Pick up your weapon and proceed to your lane"** — subheading (`text-xl text-muted-foreground`). For Live Fire section, keep the existing "tablet" wording substitution.
3. **Weapon + Lane cards** — kept as-is, but lane number rendered without zero-padding (just `result.lane`, no `padStart`).
4. **Confirm button** — primary full-width button labeled "Confirm". Clicking it (or pressing Enter) immediately closes the welcome message and returns to idle.
5. **Countdown** — "Closing in Xs" text below the button, counting down from 10. When it reaches 0, the welcome auto-closes (same as today's 6s timeout, extended to 10s).

### Behavior changes

- Auto-dismiss timer: **6s → 10s**.
- Add a `useEffect` while `state === "success"` that runs a 1s interval to decrement a `countdown` state from 10 to 0, then dismisses.
- Add a `handleConfirm` function that clears the timeout/interval and resets to idle (same logic as today's auto-clear).
- Enter-key handling: the hidden RFID input currently captures Enter to submit a scan. While `state === "success"`, the Enter key should instead trigger Confirm. Implement by checking state in `handleKeyDown` — if success, call `handleConfirm` instead of `handleScan`. Keep the input focused so Enter is captured globally.
- The Confirm button gets `autoFocus` when success renders (or we rely on the hidden input handler — using the existing focused input is simpler and avoids losing RFID focus behavior).

### Technical notes

- Lane padding removed only in the success display — admin/lanes views unchanged.
- Countdown stored as a `useState<number>(10)` reset whenever entering success state.
- Cleanup: clear interval on unmount and on state change away from success.
- Use design tokens (`text-primary`, `bg-primary`, `text-muted-foreground`) — no hardcoded colors.
