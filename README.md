# Hospital Management System (HMS)

Role-based hospital operations platform: department routing, patient registration, visits, triage, doctor consultations, structured prescribing, pharmacy dispensing, accounts, admin, HR, and IT support. Built to match the existing UI design system (screenshots) and extended for all planned pages.

## Stack

- **Next.js** App Router, TypeScript
- **Tailwind CSS** (v4), design tokens in `src/styles/theme.css`
- **Supabase** (Auth, Postgres, Storage, Realtime)
- **React Hook Form**, **Zod**, **TanStack Query**
- Reusable UI: Button, Card, Modal, StatusBadge, PageHeader; layout: Sidebar, Topbar, BottomNav (mobile)

## Quick start

```bash
npm install
cp .env.example .env.local   # add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Login** (department selector for mock session) to reach the dashboard.

## Setup (full)

See **[docs/SETUP.md](docs/SETUP.md)** for:

- Environment variables (Supabase, optional SESSION_SECRET)
- Database migrations and seed (roles/permissions, medications)
- Auth (Supabase Auth + staff_profiles trigger)
- Design system and build order

## Routes

- **Public:** `/`, `/about`, `/departments`, `/appointments`, `/contact`, `/login`, `/signup`, `/forgot-password`, `/patient-verify`, `/access-denied`
- **Dashboard:** `/dashboard`, `/frontdesk` (patients, new, [id], visits, billing), `/doctors` (queue, consultations, history, consultations/[id]), `/nurses` (triage, medication-administration, observation, handover-notes), `/pharmacy` (pending-prescriptions, inventory, stock-movements, restock-requests), `/accounts` (invoices, receive-payment, payments-history, expenses, daily-reports), `/store`, `/admin` (department-monitoring, reports, approvals, audit-logs), `/hr` (staff-directory, roles-permissions), `/it` (tickets, user-access, system-logs), `/support`, `/notifications`, `/profile` (security, activity)
- **API:** `/api/health`

## Security

- Protected routes and department-based redirect in middleware.
- Security headers applied in middleware.
- RLS enabled on all main tables; policies in migrations.
- Audit log table and helpers in `src/lib/security/audit.ts`.
- No service-role key in client; use only in server.

## Commands

```bash
npm run dev
npm run build
npm run lint
```
