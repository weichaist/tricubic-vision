/**
 * debugClipAnalysis: re-runs the Gemini analysis for one clip and returns the
 * raw model output without writing alerts or applause. The admin portal calls
 * it from a log entry ("debug" button) to see what the model said.
 *
 * The admin portal signs in with Supabase, not Firebase, so the caller sends
 * its Supabase access token and must be an admin or manager.
 */
const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const os = require("os");
const path = require("path");
const {REGION, ALL_SECRETS} = require("./config");
const {fetchSafetyRules, getUserFromAccessToken} = require("./supabaseClient");
const {downloadFileFromUrl, createSafetyAnalysisPrompt, analyzeVideo} = require("./gemini");

const ALLOWED_ROLES = ["admin", "manager"];

exports.debugClipAnalysis = onCall({
  region: REGION,
  timeoutSeconds: 540, // 9 minutes
  memory: "4GiB", // Video processing needs the memory
  secrets: ALL_SECRETS,
}, async (request) => {
  const startTime = Date.now();

  try {
    const {videoUrl, locationUid = null, accessToken} = request.data || {};

    const caller = await getUserFromAccessToken(accessToken);
    if (!ALLOWED_ROLES.includes(caller.role)) {
      throw new Error("Only admins and managers can run a debug analysis");
    }
    const requestedCompanyUid = request.data && request.data.companyUid;
    if (requestedCompanyUid && caller.company_uid !== requestedCompanyUid) {
      throw new Error("You can only analyze clips of your own company");
    }
    const companyUid = requestedCompanyUid || caller.company_uid;

    if (!videoUrl) {
      throw new Error("videoUrl is required in request data");
    }

    logger.info("Processing debug clip analysis", {videoUrl, locationUid, companyUid});

    const fileName = `debug-clip-${Date.now()}.mp4`;
    const tempFilePath = path.join(os.tmpdir(), fileName);

    try {
      await downloadFileFromUrl(videoUrl, fileName, tempFilePath);
    } catch (downloadError) {
      logger.error("Error downloading video file", {error: downloadError.message, videoUrl});
      throw new Error("Failed to download video file", {cause: downloadError});
    }

    let safetyRules;
    try {
      safetyRules = await fetchSafetyRules(locationUid, companyUid);
      if (safetyRules.length === 0) {
        throw new Error("No safety rules found for analysis. Please add rules in the database.");
      }
      logger.info("Fetched safety rules from Supabase", {ruleCount: safetyRules.length});
    } catch (rulesError) {
      logger.error("Failed to fetch or validate rules from Supabase", {error: rulesError.message});
      throw new Error(`Cannot proceed with analysis: ${rulesError.message}`, {cause: rulesError});
    }

    const promptText = createSafetyAnalysisPrompt(safetyRules);
    const {response} = await analyzeVideo(tempFilePath, fileName, promptText);

    return {
      success: true,
      response: response,
      rulesCount: safetyRules.length,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error("Error with debug clip analysis", {error: error.message, stack: error.stack});
    return {
      success: false,
      error: error.message,
    };
  }
});
