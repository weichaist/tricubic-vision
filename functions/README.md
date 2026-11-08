# Tricubic Vision Cloud Functions

Firebase Cloud Functions (Node 22, 2nd gen) that connect the camera app to
Gemini and Supabase. See [docs/architecture.md](../docs/architecture.md) for the
full pipeline.

| Function | Type | Purpose |
| --- | --- | --- |
| `analyzeClipWithAI` | Firestore trigger on `clips/{clipId}` | Sends the clip and the site's active rules to Gemini; writes clips, alerts, applause and logs to Supabase |
| `writeAlertToSupabase` | Callable (camera app, Firebase Auth) | Records a sensor alert |
| `fetchUserFromSupabase` | Callable (camera app, Firebase Auth) | Returns the caller's own `users` row |
| `debugClipAnalysis` | Callable (admin portal, Supabase session of an admin/manager) | Re-runs the analysis for one clip and returns Gemini's raw answer |

Files: `config.js` (region, secrets, params), `supabaseClient.js` (Supabase
client and queries), `gemini.js` (prompt and Gemini calls), one file per function.

## Configuration

| Name | Kind | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Secret | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase service role (secret) key |
| `GEMINI_API_KEY` | Secret | Gemini API key ([Google AI Studio](https://aistudio.google.com/apikey)) |
| `GEMINI_MODEL` | Parameter (`functions/.env`) | Model id, default `gemini-2.5-pro` |

```bash
npm ci
firebase functions:secrets:set SUPABASE_URL
firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
```

Emulator: copy `.secret.local.example` to `.secret.local`, then `npm run serve`.

## Maintenance scripts

Not deployed. They use `GEMINI_API_KEY` from the environment.

```bash
GEMINI_API_KEY=... npm run gemini-files:list               # files left in the Gemini Files API
GEMINI_API_KEY=... npm run gemini-files:delete-all -- --yes  # delete them all
```

## Checks

```bash
npm run lint
```
