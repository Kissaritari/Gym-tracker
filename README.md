# Gym app requirements

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/kissaritaris-projects/v0-gym-app-requirements)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/ZKujApCIw5c)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/kissaritaris-projects/v0-gym-app-requirements](https://vercel.com/kissaritaris-projects/v0-gym-app-requirements)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/ZKujApCIw5c](https://v0.app/chat/projects/ZKujApCIw5c)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Local setup and workout data

Run `npm run test:services` for read-only live checks of Supabase authentication, REST API, login/signup CORS, and configured Neon/Groq services. See [service health checks](docs/service-health.md) for environment setup, JSON output, strict mode, and the checks' limits. Normal `npm test` remains offline and deterministic.

Authentication requires `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) or `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Set them in `.env.local` for local development and in the hosting environment before building. Restart local development or rebuild/redeploy after changing these public variables. The browser and confirmation callback must use the same Supabase project. Enable the Email provider and account signup in Supabase Auth, and allow your app's `/auth/callback` URL in its redirect settings. Accounts created through the legacy `/auth/login` and `/auth/signup` Neon routes are separate from homepage Supabase accounts.

Install dependencies with `pnpm install --frozen-lockfile`, then run `pnpm dev`. Use the pnpm version pinned in `package.json` (via Corepack, or `npx pnpm@10.34.6`). After changing dependencies, run `pnpm install` and commit both `package.json` and `pnpm-lock.yaml` so Vercel can install with its frozen-lockfile check.

The homepage uses Supabase authentication and saves programs, planned exercises, workout sessions, and exercise logs to Supabase. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. For a new Supabase database, run `scripts/01-create-tables.sql`, `scripts/02-seed-exercises.sql`, and `scripts/04-supabase-workout-integrity.sql`. For an existing Supabase database, run only `scripts/04-supabase-workout-integrity.sql` before deploying this version; it installs permissions, planned-exercise log identities, and the atomic program-creation function. Existing databases do not need reseeding.

Choose a program in the library, select a day, and press **Start day workout**. Select any exercise to enter reps and weight for its sets, then press **Complete exercise** to save. **Finish workout** saves the session to history. Unfinished sessions can be resumed from Sessions. Custom programs require at least one exercise and use the database-generated program ID.

The legacy `/dashboard` and `/workout` routes use Neon. Configure `NEON_DATABASE_URL` (or `DATABASE_URL`) for those routes. For a new Neon database, run these SQL files in order:

1. `scripts/01-neon-create-tables.sql`
2. `scripts/02-neon-seed-exercises.sql`
3. `scripts/03-neon-add-more-programs.sql`
4. `scripts/04-neon-link-program-exercises.sql`
5. `scripts/05-neon-workout-integrity.sql`

For an existing Neon database, run step 5 before deploying this version to add the authentication session table and planned-exercise log identities. Run step 4 if default programs are missing exercises. Both scripts preserve existing data and can be rerun. The authentication migration preserves names from databases using the older `name` column. Historical logs without a planned-exercise identity are restored only when they identify a single unambiguous exercise occurrence.

Run `npm test` for workout selection, resume, ownership, authentication, RLS permissions, transaction rollback, and failure recovery tests. Database tests use embedded PostgreSQL and do not access your live databases.

## AI builder and workout recovery

Apply `scripts/05-supabase-generated-programs.sql` after the Supabase scripts above (also for existing installations). It adds an atomic, authenticated import function for generated programs, preserving workout days, exercise order, sets, reps, and rest periods.

For the homepage AI builder, set server-only `GROQ_API_KEY` and `GROQ_MODEL` to your Groq API key and an available text-generation model ID in your account. Do not prefix these variables with `NEXT_PUBLIC_`. Restart or redeploy after setting them. Users can generate a preview from their training preferences, review it, then save it to their Supabase program library. Generation uses the existing exercise catalog; missing configuration and provider errors appear in the builder without saving a partial program.

Email confirmations return to the homepage. Workout drafts stay mounted while switching tabs and are stored per user and session in the browser's session storage. Resume an unfinished session in the same browser tab to recover entered sets after a reload; only completed exercises are saved to the database and available on other devices. If browser storage is unavailable, the workout warns before leaving with unsaved entries. Completed sessions have a **View details** button for saved reps and weights.
