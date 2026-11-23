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
│   │   ├── pages/        Full-screen pages (Login, Tenant, MallAdmin, SuperAdmin, …)
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
│   └── functions/        Edge functions (promotion emails, unsubscribe)
├── eslint.config.js
└── package.json          Workspace root: shared scripts and tooling
```

## Supabase setup

The app reads `app_user` and `promotions` through `frontend/src/lib/appData.js`. Each `app_user` row needs `user_role`, `user_name` and `user_auth_user_id`. `user_auth_user_id` must match the UUID in `auth.users`. Supported roles are `super_admin`, `mall_admin` and `tenant`.

Authenticated data reads go through the backend with the signed-in user's token, so **Row Level Security must be enabled** on your tables. Login, password changes and profile updates use the browser Supabase client.
