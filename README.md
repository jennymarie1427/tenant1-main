# React + Vite

## Local development

Run `npm run dev` in this folder and open `http://localhost:5175`. The port is fixed so it can run alongside the other apps. Start a second terminal in `backend` and run `npm run dev` (Node.js 22+). The backend runs at `http://localhost:3002`; `/api/health` checks that it is running. Vite proxies `/api` to this backend. Authenticated data reads use the backend with the signed-in user token and Supabase RLS. Login, password changes, and profile updates use the existing browser Supabase client.

Copy `backend/.env.example` to `backend/.env` when setting up another computer, and supply a Supabase public/anon key for the same project as the frontend. Never put a service-role or secret key in the Tenant backend or frontend. The backend uses built-in Node.js modules and needs no additional packages.

## Supabase setup

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
The app reads `app_user` and `promotions` through `src/lib/appData.js`. Each `app_user` row needs `user_role`, `user_name`, and `user_auth_user_id`; `user_auth_user_id` must match the UUID in `auth.users`. Supported roles are `super_admin`, `mall_admin`, and `tenant`.

Without Supabase environment variables, the app uses local demo data so the dashboards remain previewable.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
