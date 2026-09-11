# CampusPulse — Role Login + Personalization Edition

CampusPulse is a responsive campus issue reporting and tracking prototype built for a front-end hackathon.

## What's included
- Separate Student and Admin login portals
- Student login rule: enter a college register number containing the lowercase `a`; the first-time password is the same register number with `a` changed to uppercase `A`
  - Example: `23a001` → password `23A001`
- After first login, each student can change their password from Settings and use the new password on future logins
- Admin can change the password from the Profile panel
- Student can edit profile name, department, year and profile picture
- Settings drawer with Appearance, Profile and Security tabs
- 3 display modes: Bright, Dim, Dark
- 12 color palettes: Sky Blue, Lavender, Maroon, Mint, Coral, Amber, Violet, Teal, Rose, Indigo, Orange, Forest
- Palette and display mode persist with localStorage
- Settings drawer closes after choosing a display/palette option, clicking outside, or pressing Escape
- Interactive micro-animations, hover states, button feedback and login error shake
- Role-aware navigation: students cannot see Admin controls; admins cannot submit student reports
- Student sees only their own reports; Admin sees all reports
- Loading, empty, error, retry, refresh and double-submit protection
- localStorage fallback when json-server/API is unavailable
- Responsive layout designed for the 375px judge stress test

## Authentication
- Students sign in with a register number matching `####a####` (example format: `2501a4427`). On first access, the prototype verifies the register-number-based first-access password and then asks the student to create a password.
- Admins choose their own username using alphabets only on first access, then create their own password. Later admin logins require the exact created username and password.
- There are no demo credentials displayed in the login screens.


> The student register-number rule is a prototype/demo authentication mechanism. Production authentication must use a real backend, hashed passwords, sessions/tokens and server-side authorization.

## Run
```bash
npm install
npm run server
```
Open a second terminal:
```bash
npm run dev
```
Then open the Vite URL shown in the terminal.

## Recommended judge demo
1. Open CampusPulse and show the separate Student/Admin portal tabs.
2. Log in as Student with `23a001` / `23A001`.
3. Open Settings → Profile and show the editable profile picture/details.
4. Open Settings → Appearance and show the 12 palettes + Bright/Dim/Dark modes.
5. Submit a Wi-Fi complaint.
6. Log out and enter the Admin portal.
7. Change that complaint Pending → In Progress → Resolved.
8. Log out and log in as the Student again to show the updated status.
9. Open Settings → Security and explain that the user can change their password.
10. Resize to 375px and demonstrate the responsive layout.

## Important security note
This is a front-end hackathon prototype. Hiding UI controls and checking roles in React is useful for the demo, but it is **not sufficient for production security**. A real system must enforce authorization on the backend/database as well.

## AI disclosure
If AI assistance is used during the hackathon, disclose it according to the event rules and be prepared to explain and modify the code.


## Updated authentication flow
- Students must use a register number in the `DDDDaDDDD` format, e.g. `2501a4427`.
- On first login, the temporary password is the same register number with `a` changed to `A` (demo: `2501A4427`), then the student creates a new password.
- Admin first access: choose an alphabet-only username, then create a personal password.
- Subsequent logins use the saved password.
- This is prototype authentication only. Production authentication should be handled server-side with secure password hashing, authorization, and institutional SSO/2FA.
- Student complaints are scoped strictly to the logged-in register number; admins can view all complaints.
- A matching issue is blocked after 20 existing reports and shows `This issue has already been reported.` without submitting another copy.
- Admin-only complaint filters include Priority (Low/Medium/High) and Progress (Pending/In Progress/Resolved).
- Login pages include animated college-themed floating icons; portal dashboards include their animated message in the header.

## Feedback
- Students can open the animated Feedback button in the header, submit a 1–5 star rating and comments.
- Admins can open Feedback Review from the header or Admin Control Center to review student ratings and comments.
