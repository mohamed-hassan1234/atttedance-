# Smart Examination Attendance Management System (SEAMS)

A full-stack MERN application (MongoDB, Express, React, Node.js) that digitizes
university examination attendance: ID lookup, automatic eligibility checks,
offline-first recording, auto-sync, and Admin/Invigilator dashboards.

This repository is a working implementation of the attached project
documentation ("Smart Examination Attendance Management System", Faculty of
Computer Science / Information Technology, July 2026).

For the full technical/functional specification written for AI coding agents,
see **[docs/SYSTEM_PROMPT.md](docs/SYSTEM_PROMPT.md)** — paste that file into
any AI agent (Claude, GPT, Cursor, etc.) to continue building or modifying
this system with full context.

## Project structure

```
exam-attendance-system/
├── backend/                 # Node.js + Express + MongoDB API
│   ├── server.js             # App entry point
│   ├── seedData.js           # Populates DB with roles, users, students, exams
│   └── src/
│       ├── config/db.js
│       ├── models/           # User, Examination, Student, AttendanceRecord, SyncLog
│       ├── controllers/
│       ├── routes/
│       ├── middleware/       # JWT auth + role-based access control
│       └── utils/
├── frontend/                 # React + Vite + Tailwind CSS
│   └── src/
│       ├── pages/             # Login, Dashboard, ScanAttendance, Exams, Students, Users, Reports
│       ├── components/        # Reusable UI (EligibilityStamp, Modal, Badge, StatCard...)
│       ├── context/AuthContext.jsx
│       ├── services/          # api.js (axios) + offlineQueue.js
│       └── layouts/AppLayout.jsx
└── docs/
    └── SYSTEM_PROMPT.md       # Advanced prompt / full spec for AI agents
```

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env       # edit MONGO_URI / JWT_SECRET if needed
npm install
npm run seed                # populates roles, users, students, exams, sample attendance
npm run dev                 # starts API on http://localhost:5000
```

You need a running MongoDB instance. Either install MongoDB locally, or run:

```bash
docker run -d -p 27017:27017 --name seams-mongo mongo:7
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev                 # starts app on http://localhost:5173
```

### Local HTTPS Dev Setup (phone QR camera testing)

The QR scanner uses the rear camera for live scanning. Live browser camera
access (`getUserMedia`) only works from a secure context: `https://...` or
`localhost`. Opening the app from a phone as `http://<your-lan-ip>:5173` will
block live camera access (Chrome and Safari both enforce this) before the app
code can start the stream — this is a browser platform rule, not an app bug.

**This is on by default** — `frontend/vite.config.js` uses
[`vite-plugin-mkcert`](https://github.com/liuweiGL/vite-plugin-mkcert), which
on every `npm run dev`:

1. Generates a local Certificate Authority (once) and a leaf certificate
   covering `localhost`, `127.0.0.1`, and this machine's current LAN IP(s) —
   auto-detected, so it keeps working if your laptop's IP changes networks.
2. Trusts that CA in this machine's own OS/browser store automatically, so
   `https://localhost:5173` and `https://<your-lan-ip>:5173` both load on
   *this* laptop with no warning.
3. Nothing is written into the repo — the CA and certs live in
   `~/.vite-plugin-mkcert` (outside the project), so there's never a private
   key to `.gitignore` or accidentally commit.

Step 1 and 2 are automatic. **Step 3 is the one manual, one-time step**: a
phone is a separate device with its own trust store, so it must import that
same CA root once:

1. Start the backend and frontend as usual:
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```
2. Get `~/.vite-plugin-mkcert/rootCA.pem` onto the phone — same Wi-Fi, then
   e.g. `python -m http.server 8000` from that folder and download it in the
   phone's browser, or email/AirDrop it.
3. Install it as a trusted CA certificate:
   - **Android**: Settings → Security → Encryption & credentials → Install a
     certificate → CA certificate → select the file (a screen lock must
     already be set). Fully restart Chrome afterward.
   - **iPhone**: open the file to install the profile (Settings → General →
     VPN & Device Management), then Settings → General → About → Certificate
     Trust Settings → enable full trust for it.
4. Open `https://<your-laptop-lan-ip>:5173` on the phone — padlock, no
   warning, live camera works.

If you'd rather skip HTTPS entirely for a quick local test, set
`VITE_HTTPS=false` in `frontend/.env` and use the plain `http://` URL — the
scanner falls back to a **Camera Scan (photo)** button (opens the phone's
native camera app, takes one photo, decodes the QR from it) since that path
doesn't need a secure context. Live continuous scanning still requires HTTPS.

### 3. Log in

After `npm run seed`, the console prints every account. The defaults are:

| Role        | Username | Password          |
|-------------|----------|-------------------|
| Admin       | admin1   | Admin@123         |
| Admin       | admin2   | Admin@123         |
| Invigilator | invig1   | Invigilator@123   |
| Invigilator | invig2   | Invigilator@123   |
| Invigilator | invig3   | Invigilator@123   |

Try scanning student IDs like `CS-2001` (eligible), `CS-2003` (fee not
cleared → not eligible), or `BUS-3001` on the seeded exams.

## Core features implemented

- **Secure JWT login** with Admin and Invigilator roles (FR-01)
- **Manual Student ID search** acting as the "scan" entry point (FR-05, FR-06)
- **Simulated University API** (`/api/students/lookup/:id`) returning name,
  faculty, department, fee status, photo (FR-07)
- **Eligibility engine**: faculty/department/exam-room match + optional fee
  check, run server-side on every attendance write (FR-08, FR-09, FR-10)
- **Duplicate-attendance prevention** via a unique Mongo index + application
  check (FR-12)
- **Offline mode**: when the browser goes offline, scans are queued in
  `localStorage` and the UI shows a persistent offline banner (FR-13)
- **Automatic synchronization**: the moment the browser regains connectivity,
  queued records are POSTed to `/api/attendance/sync` (FR-14)
- **Admin reports**: overview stats + attendance-by-department + CSV export
  (FR-16)

See `docs/SYSTEM_PROMPT.md` for the complete architecture, data model, API
reference, and design-system reference.
