

## Apply Multi-Accent Color Scheme (Material Design 3)

Replace the current amber/gold primary with a teal/cyan primary, keep green for status, and add purple for badges. Shift backgrounds to dark navy tones.

### New CSS Variables

| Variable | Current (amber) | New Value | Role |
|---|---|---|---|
| `--primary` | `38 92% 50%` | `174 72% 40%` | Teal — buttons, links, headings |
| `--primary-foreground` | `240 15% 4%` | `174 100% 4%` | Text on primary |
| `--accent` | `142 70% 45%` | `152 70% 45%` | Emerald green — status, "Active", "LIVE" |
| `--accent-foreground` | `240 15% 4%` | `152 100% 4%` | Text on accent |
| `--ring` | `38 92% 50%` | `174 72% 40%` | Focus rings → teal |
| `--background` | `240 15% 4%` | `220 25% 5%` | Dark navy base |
| `--foreground` | `45 10% 90%` | `210 20% 92%` | Slightly cooler white |
| `--card` | `240 12% 8%` | `220 22% 9%` | Navy card |
| `--card-foreground` | `45 10% 90%` | `210 20% 92%` | |
| `--popover` | `240 12% 8%` | `220 22% 9%` | |
| `--secondary` | `240 10% 14%` | `220 18% 14%` | |
| `--muted` | `240 10% 14%` | `220 18% 14%` | |
| `--muted-foreground` | `45 5% 50%` | `215 15% 50%` | |
| `--border` | `240 10% 18%` | `220 15% 18%` | |
| `--input` | `240 10% 18%` | `220 15% 18%` | |
| `--sidebar-*` | amber variants | teal/navy variants | Match new scheme |

### Files to Change

**1. `src/index.css`** — Update all CSS custom property values to the new palette above.

**2. `src/components/LaneCard.tsx`** — Add a purple badge for weapon type:
- Import `Badge` from `ui/badge`
- Weapon type label gets a purple style: `className="bg-purple-600/20 text-purple-400 border-purple-500/30"`

**3. `src/components/RFIDSimulator.tsx`** — No changes needed (uses `text-primary`, `border-primary/50` which auto-update).

**4. All other components** — No changes needed. They reference CSS variables (`text-primary`, `text-accent`, `bg-card`, etc.) which will automatically pick up the new colors.

### Summary
- One CSS file update for the full palette swap
- One component tweak to introduce the purple accent on weapon type badges
- Everything else updates automatically via CSS variables

