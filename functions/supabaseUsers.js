/**
 * fetchUserFromSupabase: returns the Supabase users row for the signed-in
 * camera app user. The app signs in with Firebase Auth; the row is matched by
 * email, so the Firebase account and the Supabase users row must share it.
 */
const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {REGION, SUPABASE_SECRETS} = require("./config");
const {getSupabase} = require("./supabaseClient");

/**
 * Expected data format:
 * {
 *   email: string    // Email of the signed-in user
 * }
 *
 * Returns the users row (uid, company_uid, location_uid, email, first_name,
 * last_name, role, created_at) or null when no row matches.
 */
exports.fetchUserFromSupabaseJP = onCall({region: REGION, secrets: SUPABASE_SECRETS}, async (request) => {
  const data = request.data || {};

  try {
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    if (!data.email) {
      throw new Error("Missing required field: email is required");
    }

    // Callers may only look up their own row
    const tokenEmail = (request.auth.token && request.auth.token.email) || "";
    if (tokenEmail.toLowerCase() !== String(data.email).toLowerCase()) {
      throw new Error("You can only fetch your own user data");
    }

    const supabase = getSupabase();

    logger.info("Fetching user from Supabase", {uid: request.auth.uid});

    const {data: result, error} = await supabase
        .from("users")
        .select("*")
        .eq("email", data.email)
        .single();

    if (error) {
      // No matching row
      if (error.code === "PGRST116") {
        logger.info("User not found in Supabase", {uid: request.auth.uid});
        return {
          success: true,
          data: null,
          message: "User not found",
        };
      }

      logger.error("Error fetching user from Supabase", error);
      throw new Error(`Failed to fetch user from Supabase: ${error.message}`);
    }

    logger.info("Successfully fetched user from Supabase", {uid: result.uid});

    return {
      success: true,
      data: result,
      message: "User successfully fetched",
    };
  } catch (error) {
    logger.error("Function execution failed", {error: error.message});

    return {
      success: false,
      error: error.message,
      message: "Failed to fetch user",
    };
  }
});
