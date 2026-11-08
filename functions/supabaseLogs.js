/**
 * Supabase Logs Firebase Cloud Function
 *
 * This module provides functions to log function execution status to Supabase.
 */

const logger = require("firebase-functions/logger");
const {getSupabase} = require("./supabaseClient");

/**
 * Logs function execution status to Supabase
 *
 * @param {Object} logData - Log data
 * @param {string} logData.functionName - Name of the function being logged
 * @param {string} logData.status - Status of execution ('success' or 'error')
 * @param {string} logData.message - Log message
 * @param {Object} [logData.details] - Additional details (will be stored as JSONB)
 * @param {string} [logData.userUid] - User UID if applicable
 * @param {string} [logData.clipId] - Clip ID if applicable
 * @param {string} [logData.locationUid] - Location UID if applicable
 * @param {number} [logData.durationMs] - Execution duration in milliseconds
 * @returns {Promise<Object>} - Result of the logging operation
 */
async function logToSupabase(logData) {
  try {
    // Validate required fields
    if (!logData.functionName || !logData.status || !logData.message) {
      logger.warn("Missing required fields for logging", {
        hasName: !!logData.functionName,
        hasStatus: !!logData.status,
        hasMessage: !!logData.message,
      });
      return {
        success: false,
        error: "Missing required fields for logging",
      };
    }

    // Validate status
    if (!["success", "error"].includes(logData.status)) {
      logger.warn("Invalid status for logging", {
        status: logData.status,
      });
      return {
        success: false,
        error: "Status must be 'success' or 'error'",
      };
    }

    const supabase = getSupabase();

    // Prepare log data
    const logEntry = {
      function_name: logData.functionName,
      status: logData.status,
      message: logData.message,
      details: logData.details || {},
      user_uid: logData.userUid || null,
      clip_id: logData.clipId || null,
      location_uid: logData.locationUid || null,
      duration_ms: logData.durationMs || null,
    };

    logger.info("Writing log to Supabase", {functionName: logEntry.function_name, status: logEntry.status});

    // Insert the log into Supabase
    const {data: result, error} = await supabase
        .from("logs")
        .insert(logEntry)
        .select();

    if (error) {
      logger.error("Error writing log to Supabase", error);
      return {
        success: false,
        error: `Failed to write log to Supabase: ${error.message}`,
      };
    }

    logger.info("Successfully wrote log to Supabase");

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    logger.error("Error in logToSupabase", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  logToSupabase,
};
