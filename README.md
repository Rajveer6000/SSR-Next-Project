# Scroll Cards App

This repo is now a small monorepo with separate frontend and backend packages.

## Structure
- `frontend/` — Next.js 16 App Router UI (Tailwind v4, turbopack-ready).
- `backend/` — Express + TypeScript API server scaffold.

## Getting Started
1. Install deps (workspace-aware): `pnpm install`
2. Run both dev servers in parallel: `pnpm dev:all`
   - Frontend: http://localhost:3000
   - Backend:  http://localhost:4000
3. Or run individually:
   - `pnpm dev:frontend`
   - `pnpm dev:backend`

## Build & Run
- Build everything: `pnpm build`
- Start frontend only (after build): `pnpm start`
- Start backend (after build): `pnpm start:backend`

## Backend API (demo)
- `GET /health` — uptime/status probe.
- `GET /api/cards` — sample data to replace with real sources.

## Environment
- Frontend env: `frontend/.env.local`
- Backend env: `backend/.env` (supports `PORT`, defaults to 4000).

Remember: Next.js 16 has breaking changes; consult `node_modules/next/dist/docs/` when adding features.
