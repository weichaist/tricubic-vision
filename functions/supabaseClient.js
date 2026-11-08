/**
 * Supabase client and queries shared by the functions.
 *
 * The functions use the service role key, so they bypass Row Level Security.
 * Only call these from code paths that have already checked the caller.
 */
const logger = require("firebase-functions/logger");
const {createClient} = require("@supabase/supabase-js");
const {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY} = require("./config");

let client = null;

/**
 * Returns a Supabase client authenticated with the service role key.
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
function getSupabase() {
  if (client) return client;

  const supabaseUrl = SUPABASE_URL.value();
  const supabaseKey = SUPABASE_SERVICE_ROLE_KEY.value();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase configuration. Set the SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY secrets (see README.md).");
  }

  client = createClient(supabaseUrl, supabaseKey, {
    auth: {autoRefreshToken: false, persistSession: false},
  });
  return client;
}

/**
 * Fetches the active safety rules for a company/location.
 * Rules with no location apply to every location of the company.
 * @param {string|null} locationUid - Location UID to filter by
 * @param {string|null} companyUid - Company UID to filter by
 * @returns {Promise<Array<{uid: string, name: string, details: string|null}>>}
 */
async function fetchSafetyRules(locationUid = null, companyUid = null) {
  const supabase = getSupabase();

  let query = supabase.from("rules").select("uid, name, details");

  if (companyUid) {
    query = query.eq("company_uid", companyUid);
  }
  // Include both rules for this location and rules without a location
  if (locationUid) {
    query = query.or(`location_uid.eq.${locationUid},location_uid.is.null`);
  }

  query = query.eq("status", "active");

  const {data, error} = await query;

  if (error) {
    logger.error("Error fetching rules from Supabase", error);
    throw new Error(`Failed to fetch rules from Supabase: ${error.message}`);
  }

  if (!data || data.length === 0) {
    logger.warn("No active rules found in Supabase", {locationUid, companyUid});
    return [];
  }

  return data.map((rule) => ({uid: rule.uid, name: rule.name, details: rule.details}));
}

/**
 * Checks a Supabase access token (sent by the admin portal) and returns the
 * caller's row from the users table.
 * @param {string|undefined} accessToken - Supabase session access token
 * @returns {Promise<object>} The users row
 */
async function getUserFromAccessToken(accessToken) {
  if (!accessToken) {
    throw new Error("Authentication required");
  }

  const supabase = getSupabase();
  const {data: authData, error: authError} = await supabase.auth.getUser(accessToken);
  if (authError || !authData || !authData.user) {
    throw new Error("Invalid or expired session");
  }

  const {data: profile, error: profileError} = await supabase
      .from("users")
      .select("*")
      .eq("uid", authData.user.id)
      .maybeSingle();

  if (profileError || !profile) {
    throw new Error("User profile not found");
  }

  return profile;
}

module.exports = {
  getSupabase,
  fetchSafetyRules,
  getUserFromAccessToken,
};
