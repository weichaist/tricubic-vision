/**
 * Tricubic Vision Cloud Functions
 *
 * - analyzeClipWithAI     Firestore trigger on clips/{clipId}: sends the clip and
 *                         the site's rules to Gemini, writes alerts/applause/logs
 *                         to Supabase.
 * - writeAlertToSupabase  Callable (camera app): records a sensor alert.
 * - fetchUserFromSupabase Callable (camera app): returns the signed-in user's row.
 * - debugClipAnalysis     Callable (admin portal): re-runs the analysis for one
 *                         clip and returns the raw model output.
 */
const {initializeApp} = require("firebase-admin/app");
initializeApp();

const supabaseAlerts = require("./supabaseAlerts");
const supabaseUsers = require("./supabaseUsers");
const clipAnalysis = require("./clipAnalysis");
const debugClipAnalysis = require("./debugClipAnalysis");

exports.writeAlertToSupabase = supabaseAlerts.writeAlertToSupabaseJP;
exports.fetchUserFromSupabase = supabaseUsers.fetchUserFromSupabaseJP;
exports.analyzeClipWithAI = clipAnalysis.analyzeClipWithAI;
exports.debugClipAnalysis = debugClipAnalysis.debugClipAnalysis;
