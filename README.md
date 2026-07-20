# Candi Care CRM — Cold Calls

A lightweight CRM for working cold-call leads, built with **React + Vite** and
backed by **Supabase** (Auth + Postgres with Row Level Security).

## Features

- **Auth** — email/password sign in & sign up via Supabase Auth. A database
  trigger auto-creates a `profiles` row (default role `agent`) on sign up.
- **Leads list** — searchable, filterable table of every contact (by name,
  call status, and assigned agent).
- **Call mode** — work one contact at a time with a queue, progress bar, full
  lead details, a notes field, and one-tap outcome buttons. Each outcome writes
  a `call_activity` record and updates the lead's status, notes, and owner.
- **Dashboard** — overall conversion rate, lead-status breakdown, an agent
  leaderboard (who worked which leads), and a recent-activity feed.
- **Audit trail** — lead edits are captured in `audit_log` by an existing
  database trigger; call outcomes are captured in `call_activity`.

## Tech stack

| Layer      | Choice                                   |
| ---------- | ---------------------------------------- |
| Frontend   | React 18, Vite 5, React Router 6         |
| Backend    | Supabase (Postgres, Auth, RLS)           |
| Data client| `@supabase/supabase-js`                  |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Build for production:

```bash
npm run build
npm run preview
```

## Configuration

The app reads its Supabase credentials from Vite env vars, with a fallback baked
into `src/lib/supabase.js` so it runs out of the box against the existing
project. To point it at your own project, copy `.env.example` to `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
```

> The publishable/anon key is a **public** client-side credential — it is meant
> to ship in the browser bundle. All access is enforced server-side by Row Level
> Security, so exposing it is safe.

## Supabase schema (already provisioned)

The project `central-llamadas-crm` already has these tables with RLS and
triggers configured:

- **`profiles`** — `id` (→ `auth.users`), `full_name`, `role` (`admin`/`agent`).
  Auto-populated on sign up by the `handle_new_user` trigger.
- **`leads`** — contact + enrollment data (`previous_plan`, `new_plan`, `sep`,
  `enroll_date`, `enroll_status`, `amount`, `hra`) plus `call_status`, `notes`,
  and ownership columns (`assigned_to`, `created_by`, `updated_by`).
- **`call_activity`** — one row per logged call: `lead_id`, `agent_id`,
  `outcome`, `notes`. RLS requires `agent_id = auth.uid()` on insert.
- **`audit_log`** — field-level change history for leads, written by the
  `log_lead_changes` trigger.

### Call outcomes

`interested`, `notinterested`, `noanswer`, `callback`, `voicemail`
(leads start as `pending`). A lead is considered **converted** when its status
is `interested`.

## Project structure

```
src/
├── lib/supabase.js          # Supabase client + outcome metadata
├── context/AuthContext.jsx  # session + profile provider
├── components/              # Layout, ProtectedRoute, badges, icons
└── pages/
    ├── Login.jsx            # sign in / sign up
    ├── Leads.jsx           # filterable leads table
    ├── CallMode.jsx        # one-at-a-time calling flow
    └── Dashboard.jsx       # conversion + agent performance
```
