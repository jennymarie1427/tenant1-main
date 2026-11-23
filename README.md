# NavAR Tenant Portal

Tenant dashboard for NavAR: store profile, promotions and analytics. Built with React + Vite and Tailwind on the frontend, a small Node.js backend, and Supabase for auth and data.

## Requirements

- **Node.js 22 or newer** (the backend uses `node --env-file`). If you use nvm, run `nvm use` to pick up `.nvmrc`.
- A **Supabase** project. This is optional: without one, the app runs on demo data (see below).

## Quick start

```bash
# Installs the frontend and backend (npm workspaces)
npm install

# Frontend settings
cp frontend/.env.example frontend/.env.local

# Backend settings
cp backend/.env.example backend/.env

# Start frontend + backend together
npm run dev:all
```

Open http://localhost:5175.

On Windows PowerShell, use `Copy-Item` in place of `cp`.

### Demo mode

If `frontend/.env.local` has no Supabase values, the app falls back to local demo data, so you can preview the dashboards without any setup.

### Offline mode (for slow or no internet)

The portal runs on your computer, but its data, sign-in and emails come from Supabase in the cloud. To keep working when the connection is poor:

- Every time the portal loads while online, it saves a copy of your store, promotions and analytics in the browser.
- If the internet drops or is too slow, it shows that saved copy with an **Offline mode** banner (with the time it was saved). You can browse every page; changes can't be saved until you reconnect. It reloads by itself when the connection returns.
- Signing out deletes the saved copy.

**Before a presentation:** start the app while online, sign in as the tenant, and open the Dashboard, Promotions and Analytics (each Analytics range you want to show) once. Then leave the browser signed in. Sending promotion emails always needs internet.

## Features

- **Dashboard:** customer visits (navigation sessions to your store), unique visitors, visits from promotion emails, active promotions.
- **Store Profile:** logo, name, description, contact information, operating hours, payment methods, comfort room.
- **Promotions:** create, edit, activate and delete promotions; images are stored in Supabase Storage (`navar-images/promotions/<id>/image`). Promotions become **inactive automatically** after their end date (nightly job plus a check whenever the list loads).
- **Promotion emails:** turn on *Notify Registered Users* when creating a promotion to email NavAR app users who visited the mall (each promotion is emailed once). Each email is tracked as **Emailed / Opened (estimate) / Visits from email** (recipients who navigated to the store within 7 days).
- **Analytics:** visits over time (7 / 30 / 90 days), peak visit times, age and gender of visitors, promotion performance, CSV export.
- **Loading and connection states:** skeleton loading screens, an offline screen, an offline banner, and offline mode.

## Promotion email setup (Supabase)

Emails are sent by the `notify-promotion` edge function through Gmail SMTP. Add these in **Supabase dashboard → Edge Functions → Secrets**:

| Secret | Value |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` (Supabase blocks ports 25 and 587) |
| `SMTP_USER` | The sending Gmail address |
| `SMTP_PASS` | A Gmail **app password** (needs 2-Step Verification) |
| `SMTP_FROM` | `NavAR Promotions <the same Gmail address>` |

Gmail allows about 500 recipients a day per account. New gmail.com senders may land in spam at first; marking emails "Not spam" helps, and a custom domain with an email provider is the long-term fix.

### Edge functions (`supabase/functions/`)

| Function | Purpose |
| --- | --- |
| `notify-promotion` | Sends a promotion email to eligible visitors (`{ "promotion_id": 1 }`), plus `{ "mode": "health" }` (checks the SMTP login) and `{ "mode": "preview", "promotion_id": 1 }` (one sample to the sending Gmail). |
| `promotion-open` | Invisible image in each email; counts an open once per recipient. |
| `promotion-unsubscribe` | Unsubscribe link in each email; turns off promotion alerts for that user. |

### Database migrations (`supabase/migrations/`)

Every database change made for this portal is saved here in order (promotion images, email notifications and tracking, store analytics, auto-expiring promotions, and so on). They are already applied to the NavAR project; the files document what changed and can be re-applied to a new project in filename order.

## Environment variables

| File | Variable | What it is |
| --- | --- | --- |
| `frontend/.env.local` | `VITE_SUPABASE_URL` | Your Supabase project URL |
| `frontend/.env.local` | `VITE_SUPABASE_ANON_KEY` | Supabase **anon/public** key |
| `frontend/.env.local` | `VITE_ACCOUNT_ACCESS_API_URL` | Mall Admin API (default `http://localhost:3001`) |
| `backend/.env` | `PORT` | Backend port (default `3002`) |
| `backend/.env` | `FRONTEND_ORIGIN` | Allowed frontend origin (default `http://localhost:5175`) |
| `backend/.env` | `SUPABASE_URL` | Same Supabase project URL as the frontend |
| `backend/.env` | `SUPABASE_PUBLISHABLE_KEY` | Supabase public key (`SUPABASE_ANON_KEY` also works) |

> **Never** put a Supabase service-role or secret key in either file. The frontend and backend both refuse to start with one. Anything prefixed `VITE_` is bundled into the browser and is public.

Real `.env` / `.env.local` files are gitignored. Only the `.env.example` templates are committed.

## Ports

| Port | Service |
| --- | --- |
| 5175 | Frontend (Vite). The port is fixed so it can run alongside the other NavAR apps |
| 3002 | Backend (`backend/`). `/api/health` checks that it is running. Vite proxies `/api` here |
| 3001 | Mall Admin API, a **separate app not in this repo**. It is needed only for account invitations |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:all` | Frontend + backend together |
| `npm run dev` | Frontend only |
| `npm run dev:backend` | Backend only (restarts on changes) |
| `npm test` | Frontend + backend tests |
| `npm run build` | Production build into `frontend/dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint (frontend + backend) |

Run every command from the project root.

## Project structure

```
├── frontend/             React + Vite app (the tenant portal)
│   ├── src/
│   │   ├── App.jsx       Routing between login, invitations and dashboards
│   │   ├── pages/        Full-screen pages (Login, Tenant portal, password reset, invitations, demo)
│   │   ├── tenant-tabs/  Tabs inside the tenant dashboard + shared UI pieces
│   │   ├── components/   Reusable components
│   │   ├── lib/          Supabase client, API calls, data loading
│   │   └── styles/
│   ├── public/           Static files served as-is (logos, images)
│   ├── test/             Frontend unit tests (node:test)
│   ├── index.html
│   ├── vite.config.js
│   └── .env.example      Copy to .env.local
├── backend/              Node.js API (built-in modules only, no npm packages)
│   ├── server.js
│   ├── security.cjs
│   └── .env.example      Copy to .env
├── supabase/
│   ├── migrations/       Database changes applied to the NavAR project
│   └── functions/        Edge functions (promotion emails, open tracking, unsubscribe)
├── eslint.config.js
└── package.json          Workspace root: shared scripts and tooling
```

## Supabase setup

The app reads `app_user` and `promotions` through `frontend/src/lib/appData.js`. Each `app_user` row needs `user_role`, `user_name` and `user_auth_user_id`. `user_auth_user_id` must match the UUID in `auth.users`. Supported roles are `super_admin`, `mall_admin` and `tenant`.

Authenticated data reads go through the backend with the signed-in user's token, so **Row Level Security must be enabled** on your tables. Login, password changes and profile updates use the browser Supabase client.
