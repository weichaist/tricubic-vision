# Tricubic Vision admin portal

Next.js 16 web app for managers: manage sites (拠点), rules and accounts, and
review what the AI found. The UI is in Japanese.

## Features

- Sign-in with Supabase Auth (email and password; no self sign-up).
- 探知結果 (dashboard): sites and rules with alert, applause and log counts.
- 拠点管理 (sites): list, add, delete. Each site has tables of alerts, applause
  (ブラボー) and analysis logs with date and rule filters, pagination and CSV
  export.
- Rating each alert and applause ⭕ / 🔼 / ❌ — see
  [docs/evaluation-system.md](../../docs/evaluation-system.md).
- From a log entry, re-run the Gemini analysis of a clip and see the raw answer
  (Cloud Function `debugClipAnalysis`, admins and managers only).
- ルール管理 (rules): plain-language safety rules per site or company-wide,
  active or inactive. Active rules are what Gemini checks.
- アカウント管理 (accounts): list users and create accounts (admins only).

## Configure

```bash
npm ci
cp .env.example .env.local
```

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (local: `http://127.0.0.1:57321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (secret) key. Server-only, used by `POST /api/users` to create accounts |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app config (Firebase console → Project settings → Your apps → Web) |
| `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION` | Cloud Functions region (default `asia-northeast1`) |

Supabase values: Project Settings → API, or `supabase status` for the local stack.

## Run

```bash
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Database types

`database.types.ts` is generated from the schema in `../../supabase/migrations`.
After changing the schema:

```bash
# from the repository root, with the local stack running
supabase gen types typescript --local --schema public > apps/admin/database.types.ts
```
