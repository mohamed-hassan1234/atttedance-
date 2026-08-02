# SYSTEM PROMPT — Smart Examination Attendance Management System (SEAMS)

> **Purpose of this document:** This is a self-contained technical and
> functional specification of the SEAMS codebase, written so that any AI
> coding agent (Claude, GPT, Gemini, Cursor, etc.) can load it into context
> and immediately understand the system well enough to extend, debug, refactor,
> or reimplement it correctly — without needing to re-read every source file
> first. Paste this whole document as the first message/system prompt when
> asking an AI agent to work on this codebase.

---

## 1. What this system is

SEAMS replaces paper-based examination attendance sheets with a digital
workflow. An **Invigilator** looks up a student by Student ID (in place of
physically scanning an ID card), the system pulls that student's record from
what would be the university's official API (simulated here by a local
MongoDB collection seeded to look like an API response), automatically checks
whether the student is **eligible** to sit that specific exam (correct
faculty/department, correct exam, fees cleared if required), and records a
timestamped attendance entry. If the invigilator's device has no internet
connection, the scan is queued locally in the browser and is auto-synced to
the server the instant connectivity returns. Admins manage users, exams,
students, and view attendance reports.

This is a full implementation of a real academic project brief. It is not a
toy — it has real JWT auth, real role-based access control, a real duplicate-
prevention unique index, and a real offline queue.

## 2. Tech stack

| Layer      | Technology |
|-----------|------------|
| Frontend  | React 18 (Vite), React Router v6, Tailwind CSS, Axios, lucide-react icons |
| Backend   | Node.js, Express 4 |
| Database  | MongoDB via Mongoose 8 |
| Auth      | JSON Web Tokens (jsonwebtoken) + bcryptjs password hashing |
| Offline storage | Browser `localStorage` (frontend queue only — NOT used for auth tokens' security, just for queued attendance records) |

No TypeScript, no Redux, no server-side rendering — deliberately kept simple
and readable so any agent or junior developer can trace a request end to end.

## 3. Monorepo layout

```
exam-attendance-system/
├── backend/
│   ├── server.js                    # Express app entry point, mounts all routes
│   ├── seedData.js                  # Wipes + repopulates the whole DB (run with `npm run seed`)
│   ├── package.json
│   ├── .env.example                 # PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, CLIENT_URL
│   └── src/
│       ├── config/db.js             # mongoose.connect wrapper
│       ├── models/
│       │   ├── User.js              # role: 'admin' | 'invigilator', bcrypt pre-save hook
│       │   ├── Examination.js
│       │   ├── Student.js           # local cache of "university API" data
│       │   ├── AttendanceRecord.js  # unique index on (student, exam) = duplicate prevention
│       │   └── SyncLog.js
│       ├── controllers/
│       │   ├── authController.js    # login, getMe, changePassword
│       │   ├── userController.js    # Admin CRUD on User
│       │   ├── examController.js    # CRUD on Examination
│       │   ├── studentController.js # CRUD + lookupStudent (simulated University API)
│       │   ├── attendanceController.js # recordAttendance, syncOfflineRecords, checkEligibility
│       │   └── reportController.js  # getOverview, getByDepartment (aggregation pipeline)
│       ├── routes/                  # one file per resource, mounted under /api/<resource>
│       ├── middleware/
│       │   ├── auth.js              # protect() -> verifies JWT, loads req.user
│       │   ├── roleCheck.js         # authorize('admin', 'invigilator', ...)
│       │   └── errorHandler.js      # errorHandler + notFound, centralizes error JSON shape
│       └── utils/generateToken.js
└── frontend/
    ├── index.html
    ├── vite.config.js               # proxies /api -> http://localhost:5000 in dev
    ├── tailwind.config.js           # design tokens (see section 7)
    ├── .env.example                 # VITE_API_BASE_URL
    └── src/
        ├── main.jsx / App.jsx       # React Router route table
        ├── context/AuthContext.jsx  # login/logout, session bootstrap via GET /auth/me, isOnline tracking
        ├── services/
        │   ├── api.js               # axios instance, attaches Bearer token, 401 -> forces logout
        │   └── offlineQueue.js      # localStorage queue + syncQueue() -> POST /attendance/sync
        ├── layouts/AppLayout.jsx    # Sidebar (role-aware nav) + topbar + mobile bottom nav
        ├── components/              # ProtectedRoute, EligibilityStamp, Badge, Modal, StatCard, ConnectionBadge
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx        # renders AdminDashboard or InvigilatorDashboard based on role
            ├── ScanAttendance.jsx   # the core screen — exam selector + ID lookup + eligibility result
            ├── Exams.jsx            # Admin CRUD, Invigilators can view only
            ├── Students.jsx         # Admin-only CRUD (the "University API cache" management screen)
            ├── Users.jsx            # Admin-only CRUD, password reset, activate/deactivate
            └── Reports.jsx          # overview stats, by-department bars, filterable table, CSV export
```

## 4. Data model (MongoDB collections)

### User
```
fullName, username (unique), email (unique), password (hashed, select:false),
role: 'admin' | 'invigilator', isActive: Boolean, lastLogin: Date
```
Passwords are hashed with bcrypt in a `pre('save')` hook — controllers never
hash manually. `user.matchPassword(plain)` compares. `user.toSafeObject()`
strips the password before sending to the client.

### Examination
```
examName, courseCode, examDate, startTime, endTime, examRoom,
faculty, department, requireFeeCheck: Boolean,
status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled',
assignedInvigilators: [User._id], createdBy: User._id
```

### Student (local cache of the "University API")
```
studentId (unique, uppercase), fullName, faculty, department,
feeStatus: 'Cleared' | 'Not Cleared', photoUrl, email
```
In a real deployment, `GET /api/students/lookup/:studentId` would call the
university's actual HTTPS API instead of querying this Mongo collection. The
controller (`studentController.lookupStudent`) is intentionally isolated so
swapping in a real HTTP call later only touches one function.

### AttendanceRecord
```
student: ObjectId ref Student, studentIdSnapshot: String,
exam: ObjectId ref Examination, invigilator: ObjectId ref User,
timeStamp: Date, syncStatus: 'Synced' | 'Pending',
eligibilityStatus: 'Eligible' | 'Not Eligible', eligibilityReason: String,
recordedOffline: Boolean
```
**`{ student: 1, exam: 1 }` has a unique compound index** — this is the actual
mechanism behind FR-12 (duplicate attendance prevention). Even if application
logic is bypassed, MongoDB itself rejects a second record for the same
student+exam pair (surfaced to the client as HTTP 409).

### SyncLog
```
attendanceRecord: ObjectId ref AttendanceRecord, syncTime: Date,
syncResult: 'Success' | 'Failed', message: String
```
Created every time a record is written or synced — an audit trail matching
the "SYNC_LOG" table in the original documentation.

## 5. Authentication & authorization flow

1. `POST /api/auth/login` with `{ username, password }` → verifies password →
   returns `{ token, user }`. Token payload: `{ id, role }`, expires per
   `JWT_EXPIRES_IN` (default 8h).
2. Frontend stores `token` and `user` in `localStorage` and attaches
   `Authorization: Bearer <token>` to every request via an axios request
   interceptor (`services/api.js`).
3. Backend `middleware/auth.js` → `protect` verifies the JWT, loads the user
   from Mongo, rejects if the account is deactivated (`isActive: false`).
4. `middleware/roleCheck.js` → `authorize('admin')` / `authorize('admin',
   'invigilator')` gates specific routes after `protect` has run.
5. Any `401` response anywhere triggers a global logout + redirect to
   `/login` (axios response interceptor).

**Role capabilities:**
- **Admin**: full CRUD on Users, Examinations, Students; views all Reports;
  can also do everything an Invigilator can.
- **Invigilator**: views exams assigned to them (`GET /api/exams?mine=true`),
  looks up students, records attendance, syncs offline records. Cannot manage
  users/students or view cross-exam reports.

## 6. Eligibility & attendance logic (the heart of the system)

`attendanceController.checkEligibility(student, exam)` is the single source
of truth, used by both the online path (`recordAttendance`) and the offline
sync path (`syncOfflineRecords`), so eligibility is always evaluated
server-side — never trusted from the client:

```js
1. student.faculty !== exam.faculty        → Not Eligible
2. student.department !== exam.department  → Not Eligible
3. exam.requireFeeCheck && feeStatus !== 'Cleared' → Not Eligible
4. otherwise                                → Eligible
```

Attendance is still **recorded** even when a student is Not Eligible (with
`eligibilityStatus: 'Not Eligible'` and a human-readable `eligibilityReason`)
so Admins have a full audit trail of rejected attempts, matching the
documentation's requirement to log eligibility failures for reporting.

### Online recording flow
`POST /api/attendance { studentId, examId }` →
find Student → find Exam → check for an existing AttendanceRecord (409 if
found) → run `checkEligibility` → create AttendanceRecord (`syncStatus:
'Synced'`) → create SyncLog → return populated record.

### Offline flow (frontend)
1. `AuthContext` tracks `navigator.onLine` via the browser's `online`/
   `offline` events, exposed as `isOnline`.
2. `ScanAttendance.jsx`: if `!isOnline`, the scan is pushed into
   `offlineQueue.addToQueue({ studentId, examId })` (localStorage), and the UI
   shows a `Pending` eligibility stamp with a note that it will sync later.
   It attempts an offline student lookup only for display purposes; the queue
   entry is kept regardless of whether that lookup succeeds.
3. The moment `isOnline` flips back to `true`, a `useEffect` in
   `ScanAttendance.jsx` calls `offlineQueue.syncQueue()`, which POSTs the
   whole queue to `POST /api/attendance/sync`.
4. `attendanceController.syncOfflineRecords` loops each queued item, re-runs
   the same `checkEligibility` logic server-side (never trusts a client-side
   eligibility guess), creates the AttendanceRecord with
   `recordedOffline: true`, and returns a per-item result array.
5. Frontend removes successfully-synced items from the local queue; anything
   that failed stays queued for the next sync attempt.

**Important:** offline eligibility is always finalized on the server during
sync — the client never marks something "Eligible" on its own authority.

## 7. Design system (frontend visual language)

The UI's visual identity is an **"exam ledger / official seal"** aesthetic —
distinct from generic SaaS dashboards, appropriate for an academic
verification tool.

- **Color tokens** (see `frontend/tailwind.config.js`, `ledger.*` and
  `seal.*`): deep navy/ink (`ledger-950` `#0B1220` → `ledger-50` `#F7F8FB`)
  as the structural palette, with a muted gold **seal** accent
  (`#B8862E`) used sparingly for brand marks and admin badges. Status colors
  are semantic and match the original documentation's own spec: `eligible`
  green, `ineligible` red, `pending` amber.
- **Typography**: `Newsreader` (serif, `font-display`) for headings/brand —
  evokes an official academic register/ledger — paired with `Inter`
  (`font-body`) for UI text and `JetBrains Mono` (`font-mono`) for Student IDs
  and timestamps, reinforcing the "record-keeping" feel.
- **Signature element**: `components/EligibilityStamp.jsx` — a circular,
  double-bordered "ink stamp" badge that animates onto the screen
  (`stamp-in` keyframe in `index.css`) the instant a scan resolves. It is a
  deliberate metaphor for the physical attendance-sheet stamp/signature this
  system digitizes. Reused at small size in tables/badges and large size on
  the Scan screen.
- **Responsiveness**: sidebar navigation collapses to a fixed bottom nav bar
  below the `md` breakpoint (see `AppLayout.jsx`); all tables scroll
  horizontally on narrow viewports; forms in `Modal.jsx` stack to a single
  column.
- **Motion**: kept restrained — a stamp animation on eligibility results and
  a subtle fade-up on cards/lists; `prefers-reduced-motion` disables both.

If asked to redesign or restyle, preserve the semantic status colors
(green/red/amber) since they map directly to functional requirements FR-15 in
the original spec ("display attendance status... present, absent, pending
sync"), and preserve the stamp motif as the app's signature element unless
explicitly asked to replace it.

## 8. Full API reference

Base URL: `/api`. All routes except `/auth/login` and `/health` require
`Authorization: Bearer <token>`.

| Method & Path | Roles | Description |
|---|---|---|
| `GET /health` | Public | Health check |
| `POST /auth/login` | Public | `{ username, password }` → `{ token, user }` |
| `GET /auth/me` | Any | Current user profile |
| `PUT /auth/change-password` | Any | `{ currentPassword, newPassword }` |
| `GET /users` | Admin | List all users |
| `GET /users/:id` | Admin | Single user |
| `POST /users` | Admin | Create user `{ fullName, username, email, password, role }` |
| `PUT /users/:id` | Admin | Update `{ fullName, email, role, isActive }` |
| `PUT /users/:id/reset-password` | Admin | `{ newPassword }` |
| `DELETE /users/:id` | Admin | Soft-deactivates; `?hard=true` permanently deletes |
| `GET /exams` | Any | List exams; `?mine=true` filters to the logged-in invigilator; `?status=` filters by status |
| `GET /exams/:id` | Any | Single exam |
| `POST /exams` | Admin | Create exam |
| `PUT /exams/:id` | Admin | Update exam |
| `DELETE /exams/:id` | Admin | Delete exam |
| `GET /students/lookup/:studentId` | Any | Simulated University API — the scan/search endpoint |
| `GET /students` | Admin | List all cached students |
| `POST /students` | Admin | Create/cache a student record |
| `PUT /students/:id` | Admin | Update student record |
| `DELETE /students/:id` | Admin | Delete student record |
| `POST /attendance` | Any | `{ studentId, examId }` → records attendance (online path) |
| `POST /attendance/sync` | Any | `{ records: [{studentId, examId, timeStamp}] }` → bulk offline sync |
| `GET /attendance/exam/:examId` | Any | All attendance records for one exam |
| `GET /attendance` | Admin | All records; filters: `?exam=`, `?eligibilityStatus=`, `?syncStatus=` |
| `GET /reports/overview` | Admin | `{ totalExams, totalRecords, totalPresent, totalNotEligible, totalPending }` |
| `GET /reports/by-department` | Admin | Aggregated eligible/not-eligible counts grouped by faculty+department |

All responses follow `{ success: boolean, data?, message?, count? }`. Errors
are funneled through `middleware/errorHandler.js`, which normalizes Mongoose
`ValidationError`, `CastError`, and duplicate-key (`11000`) errors into clean
JSON with an appropriate HTTP status.

## 9. Seed data (`backend/seedData.js`)

Running `npm run seed` from `backend/` **wipes** the Users, Students, Exams,
AttendanceRecord, and SyncLog collections and recreates:

- 2 Admin accounts, 3 Invigilator accounts (usernames/emails/plain-text
  passwords are printed to the console at the end of the script — passwords
  are never recoverable from the DB once hashed, so this console output is
  the reference copy)
- 10 students across Computer Science, Business, and Engineering
  faculties/departments, with a mix of `Cleared`/`Not Cleared` fee statuses
- 4 examinations in different states (`ongoing`, `scheduled`, `completed`)
  assigned to different invigilators
- 6 sample AttendanceRecord entries covering all three states the UI needs to
  demonstrate: `Eligible`, `Not Eligible` (fee not cleared), and `Pending`
  sync — so dashboards, the Scan screen, and Reports are populated
  immediately without any manual data entry.

Default credentials (also printed by the script):

```
Admin         admin1       admin1@university.edu       Admin@123
Admin         admin2       admin2@university.edu       Admin@123
Invigilator   invig1       invig1@university.edu       Invigilator@123
Invigilator   invig2       invig2@university.edu       Invigilator@123
Invigilator   invig3       invig3@university.edu       Invigilator@123
```

## 10. Environment variables

**backend/.env**
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/exam_attendance_db
JWT_SECRET=change_this_to_a_long_random_secret_key
JWT_EXPIRES_IN=8h
CLIENT_URL=http://localhost:5173
```

**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## 11. Known simplifications (be aware of these if extending)

- The "University API" is simulated by the local `Student` collection rather
  than a real external HTTPS integration — `studentController.lookupStudent`
  is the seam where a real API call would be substituted.
- ID card scanning (barcode/QR/NFC) is represented by a text input field the
  invigilator types or a hardware scanner "types into" (most USB/Bluetooth ID
  scanners emit keystrokes) — there is no camera-based barcode decoding
  implemented client-side.
- The offline queue lives in `localStorage`, which is per-browser/per-device
  — sufficient for the documented "single invigilator device" scenario, but
  not a substitute for IndexedDB if very large offline batches are expected.
- File exports are CSV only (client-generated); PDF export mentioned in the
  original UI spec is not yet implemented.
- There is no automated test suite in this codebase yet.

## 12. How to extend this system correctly

- Always add new eligibility rules inside
  `attendanceController.checkEligibility` — both the online and offline sync
  paths call this one function, so rules never drift out of sync between the
  two flows.
- Any new protected route must chain `protect` then, if role-restricted,
  `authorize(...)` — see any file in `backend/src/routes/` for the pattern.
- New Mongoose models should follow the existing file layout: schema +
  `timestamps: true` + export via `module.exports = mongoose.model(...)`.
- New frontend pages should be added both to `App.jsx`'s route table and, if
  they need sidebar/mobile-nav entries, to `layouts/AppLayout.jsx`.
- Preserve the `{ success, data, message }` response envelope on every new
  API endpoint so the frontend's existing error-handling patterns keep
  working without special-casing.
