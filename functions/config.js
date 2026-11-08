/**
 * Shared configuration for all functions.
 *
 * Secrets are stored in Cloud Secret Manager:
 *   firebase functions:secrets:set SUPABASE_URL
 *   firebase functions:secrets:set SUPABASE_SERVICE_ROLE_KEY
 *   firebase functions:secrets:set GEMINI_API_KEY
 *
 * For the emulator, put the same names in functions/.secret.local.
 * GEMINI_MODEL is a plain parameter; override it in functions/.env.
 */
const {defineSecret, defineString} = require("firebase-functions/params");

// Region every function is deployed to. The camera app (FIREBASE_FUNCTIONS_REGION)
// and the admin portal (NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION) must use the same one.
const REGION = "asia-northeast1";

const SUPABASE_URL = defineSecret("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = defineSecret("SUPABASE_SERVICE_ROLE_KEY");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const GEMINI_MODEL = defineString("GEMINI_MODEL", {
  default: "gemini-2.5-pro",
  description: "Gemini model used to analyze clips",
});

const SUPABASE_SECRETS = [SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY];
const ALL_SECRETS = [...SUPABASE_SECRETS, GEMINI_API_KEY];

module.exports = {
  REGION,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  SUPABASE_SECRETS,
  ALL_SECRETS,
};
