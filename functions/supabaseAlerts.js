/**
 * writeAlertToSupabase: writes a sensor alert (sudden start, stop or turn) to
 * the Supabase alerts table. Called by the camera app, which is signed in with
 * Firebase Auth.
 */
const {onCall} = require("firebase-functions/v2/https");
const {REGION, SUPABASE_SECRETS} = require("./config");
const {getSupabase} = require("./supabaseClient");

/**
 * Expected data format:
 * {
 *   name: string,          // Alert name/type
 *   details: object,       // JSON object with alert details
 *   user_uid: string,      // UUID of the user who triggered the alert
 *   location_uid: string,  // UUID of the user's location
 *   company_uid?: string,
 *   rule_uid?: string      // Rule the alert is filed under
 * }
 */
exports.writeAlertToSupabaseJP = onCall({region: REGION, secrets: SUPABASE_SECRETS}, async (request) => {
  const data = request.data || {};
  try {
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    if (!data.name || !data.user_uid || !data.location_uid) {
      throw new Error("Missing required fields: name, user_uid, and location_uid are required");
    }

    const supabase = getSupabase();

    const alertData = {
      name: data.name,
      details: data.details || {},
      user_uid: data.user_uid,
      location_uid: data.location_uid,
      company_uid: data.company_uid || null,
      rule_uid: data.rule_uid || null,
      // timestamp is set by the column default
    };

    const {data: result, error} = await supabase
        .from("alerts")
        .insert(alertData)
        .select();

    if (error) {
      throw new Error(`Failed to write alert to Supabase: ${error.message}`);
    }

    return {
      success: true,
      data: result[0],
      message: "Alert successfully recorded",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to record alert",
    };
  }
});
