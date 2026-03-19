

## RFID Login & Lane Assignment System

### Overview
A two-screen real-time system for RFID-based login, lane assignment, and weapon assignment at a shooting range. Uses a premium dark military-tech UI with amber/yellow accents.

### Realtime Approach
Use **Supabase** with Realtime subscriptions on the `lane_assignments` and `weapons` tables. Both screens subscribe to changes and update instantly.

### Database (Supabase)

**Tables:**
1. **users** — id, user_id, rfid (unique), first_name, last_name, created_at
2. **weapons** — weapon_id, weapon_name (unique), weapon_type, is_assigned, assigned_to_user_id, updated_at. Seeded with 5 weapons (Falcon A/RK95, Falcon B/RK95, Eagle X/Colt M4, Hawk D/Colt M4, Eagle A/Colt M4)
3. **lane_assignments** — id, lane_number (unique), user_id, first_name, last_name, weapon_id, weapon_name, weapon_type, status (empty/occupied), assigned_at, updated_at. Seeded with 5 empty lanes.

RLS policies allowing authenticated and anon access for this kiosk-style app.

### Routing
- `/` — Login Screen (Screen 1)
- `/lanes` — Lane Overview Screen (Screen 2)

### Screen 1: Login Screen
- Hidden auto-focused RFID input field that captures keyboard input (RFID reader acts as keyboard)
- On Enter: look up RFID in users table
  - **Found + already assigned**: Show existing assignment message
  - **Found + not assigned**: Assign next available lane (order: 3,1,5,2,4) and next available weapon, show welcome message
  - **Not found**: Show registration form (user_id, first_name, last_name) with RFID pre-filled, then assign on submit
- Error states for no lanes/no weapons available
- RFID input auto-refocuses after every action
- **RFID Simulator**: A small button to simulate scanning a test RFID for development/testing

### Screen 2: Lane Overview
- 5 horizontal lane cards in a row
- Real-time Supabase subscription on `lane_assignments`
- Empty lanes show "Waiting for assignment" with lane number
- Occupied lanes show user name, weapon info, green active indicator
- Animated transitions when lanes change state
- Header toggles between "Waiting for users" and "All lanes assigned"

### Lane Fill Order
Hardcoded priority: [3, 1, 5, 2, 4]. First available lane in this order gets assigned.

### Weapon Assignment
Assigned in order of weapon_id from available (unassigned) weapons.

### Admin Reset
- Button on Login Screen (with confirmation dialog)
- Clears all lane_assignments to empty, marks all weapons unassigned
- Triggers real-time update on Lane Overview

### UI Design
- Very dark background (#0a0a0f or similar)
- Amber/yellow accent (#f59e0b)
- Green active indicator on occupied lanes
- Large typography, rounded cards, smooth animations (framer-motion)
- 16:9 optimized layout
- Connection status indicator for realtime sync

### Components
- `LoginScreen` — RFID input, message display, RFID simulator
- `RegistrationForm` — New user registration
- `LaneOverview` — 5-lane display with realtime subscription
- `LaneCard` — Individual lane card (empty/occupied states)
- `services/assignmentService.ts` — Lane/weapon assignment logic
- `services/realtimeService.ts` — Supabase realtime subscriptions
- `RFIDSimulator` — Dev tool for testing without hardware

### Testing Support
- Demo seed data (sample users with RFIDs)
- RFID scan simulator button
- Connection status indicator

