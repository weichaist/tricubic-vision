const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {REGION, ALL_SECRETS} = require("./config");
const {getSupabase, fetchSafetyRules} = require("./supabaseClient");
const {downloadFileFromUrl, createSafetyAnalysisPrompt, analyzeVideo} = require("./gemini");
const {logToSupabase} = require("./supabaseLogs");

/**
 * Saves clip data to Supabase clips table
 * @param {object} clipData - The clip data from Firestore
 * @param {string} clipId - The clip ID
 * @returns {Promise<void>} - Promise that resolves when saving is complete
 */
async function saveClipToSupabase(clipData, clipId) {
  try {
    const supabase = getSupabase();

    // Prepare clip data for Supabase
    const clipRecord = {
      video_url: clipData.video_url,
      user_uid: clipData.user_uid,
      location_uid: clipData.location_uid,
      company_uid: clipData.company_uid || null,
      length: clipData.length || null,
      title: clipData.title || null,
      thumbnail_url: clipData.thumbnail_url || null,
      recording_stop_timestamp: clipData.recording_stop_timestamp || null
    };

    logger.info("Saving clip to Supabase", {
      clipId,
      clipRecord: { ...clipRecord, video_url: "***" } // Hide URL in logs
    });

    // Insert the clip record
    const { data, error } = await supabase
      .from("clips")
      .insert(clipRecord)
      .select();

    if (error) {
      logger.error("Error saving clip to Supabase", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        clipId
      });
      throw new Error(`Failed to save clip to Supabase: ${error.message}`);
    }

    logger.info("Successfully saved clip to Supabase", {
      clipId,
      insertedRecord: data && data[0] && data[0].uid
    });

    return data && data[0];
  } catch (error) {
    logger.error("Exception saving clip to Supabase", {
      error: error.message,
      stack: error.stack,
      clipId
    });
    throw error;
  }
}

/**
 * Firebase function triggered when a new document is created in the 'clips' collection
 * This function will:
 * 1. Get the video file URL from the clip document
 * 2. Download the video file to a temporary location
 * 3. Upload the video file to AI service
 * 4. Send a prompt to analyze the video for safety compliance
 * 5. Log the response from AI service
 */
exports.analyzeClipWithAI = onDocumentCreated({
  document: "clips/{clipId}",
  region: REGION,
  timeoutSeconds: 540, // 9 minutes
  memory: "4GiB", // Video processing needs the memory
  secrets: ALL_SECRETS,
}, async (event) => {
  // Start timing the function execution
  const startTime = Date.now();

  try {
    // Get the document data
    const clipData = event.data.data();
    const clipId = event.params.clipId;

    // Check if we have the necessary data
    if (!clipData || !clipData["video_url"]) {
      logger.warn("Missing video URL in clip document", {clipId});
      throw new Error("Missing video URL in clip document");
    }

    // Check if the video length is sufficient
    if (clipData["length"] && clipData["length"] < 100) {
      logger.warn("Video length is too short for analysis", {
        clipId,
        length: clipData["length"]
      });
      throw new Error("Video length is too short for analysis (minimum 100ms required)");
    }

    logger.info("Processing new clip", {
      clipId,
      videoUrl: clipData["video_url"],
    });

    // Save clip data to Supabase clips table
    try {
      await saveClipToSupabase(clipData, clipId);
      logger.info("Clip data saved to Supabase successfully", { clipId });
    } catch (saveError) {
      logger.error("Failed to save clip to Supabase, but continuing with analysis", {
        error: saveError.message,
        clipId
      });
      // Don't throw here - we want to continue with analysis even if Supabase save fails
    }

    // Create temp directory for the video file
    const fileName = `clip-${clipId}.mp4`;
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const videoUrl = clipData["video_url"];

    // Download the video file
    try {
      await downloadFileFromUrl(videoUrl, fileName, tempFilePath);
    } catch (downloadError) {
      logger.error("Error downloading video file", {
        error: downloadError.message,
        clipId,
        videoUrl
      });
      throw new Error("Failed to download video file", {cause: downloadError});
    }

    // Get the list of safety rules to check from Supabase
    let safetyRules;
    try {
      // Get location_uid from clipData if available
      const locationUid = clipData.location_uid || null;
      const companyUid = clipData.company_uid || null;
      safetyRules = await fetchSafetyRules(locationUid, companyUid);

      // Check if we got any rules
      if (safetyRules.length === 0) {
        logger.warn("No safety rules found in Supabase, cannot proceed with analysis", { clipId });
        throw new Error("No safety rules found for analysis. Please add rules in the database.");
      }

      logger.info("Fetched safety rules from Supabase", {
        clipId,
        ruleCount: safetyRules.length,
        locationUid
      });
    } catch (rulesError) {
      logger.error("Failed to fetch or validate rules from Supabase", {
        error: rulesError.message,
        stack: rulesError.stack
      });
      throw new Error(`Cannot proceed with analysis: ${rulesError.message}`, {cause: rulesError});
    }

    // Create the prompt for AI analysis using our helper function
    const promptText = createSafetyAnalysisPrompt(safetyRules);

    try {
      logger.info("Starting video analysis process");
      const {response, model} = await analyzeVideo(tempFilePath, fileName, promptText);

      logger.info("Analysis complete", {
        clipId,
        response: response
      });

      // Parse the response and write alerts/applause
      await processRuleResults(response, clipData);

      const durationMs = Date.now() - startTime;

      await logToSupabase({
        functionName: "analyzeClipWithAI",
        status: "success",
        message: "Successfully analyzed clip with AI service",
        details: {
          responseLength: response.length,
          model,
          response: response,
          videoUrl: clipData.video_url,
        },
        clipId,
        userUid: clipData.user_uid || null,
        locationUid: clipData.location_uid || null,
        durationMs
      });

      return {
        success: true,
        clipId,
        analysis: response
      };
    } catch (videoError) {
      // Add context for the outer catch block
      videoError.clipId = clipId;
      videoError.analysisType = "video";
      throw videoError;
    }
  } catch (error) {
    // Get clipId from error object if it was added, or from event params
    const clipId = error.clipId || (event.params && event.params.clipId ? event.params.clipId : null);
    const errorType = error.analysisType ? `${error.analysisType} analysis` : "clip analysis";

    logger.error(`Error with ${errorType}`, {
      clipId,
      error: error.message,
      stack: error.stack
    });

    // Calculate execution duration
    const durationMs = Date.now() - startTime;

    // Log error to Supabase
    try {
      // Get additional error details if they exist
      const errorDetails = {
        error: error.message,
        stack: error.stack,
        videoUrl: event.data.data().video_url,
      };

      // Add any additional error context that might have been captured
      if (error.code) errorDetails.errorCode = error.code;
      if (error.status) errorDetails.errorStatus = error.status;
      if (error.analysisType) errorDetails.analysisType = error.analysisType;

      await logToSupabase({
        functionName: "analyzeClipWithAI",
        status: "error",
        message: `Error with ${errorType}`,
        details: errorDetails,
        clipId,
        userUid: (error.userUid ||
          (event.data && event.data.data() && event.data.data().user_uid)) || null,
        locationUid: (error.locationUid ||
          (event.data && event.data.data() && event.data.data().location_uid)) || null,
        durationMs
      });
    } catch (logError) {
      logger.error("Failed to log error to Supabase", logError);
    }

    return {
      success: false,
      clipId,
      error: error.message,
    };
  }
});

/**
 * Process the rule results from the AI analysis and write to appropriate tables
 * @param {string} response - The response from the AI analysis
 * @param {object} clipData - The clip data including user_uid and location_uid
 * @returns {Promise<void>} - Promise that resolves when processing is complete
 */
async function processRuleResults(response, clipData) {
  try {
    const supabase = getSupabase();

    // Try to parse the response as JSON
    let ruleResults;
    try {
      // Extract JSON from the response (it might be surrounded by text)
      const jsonMatch = response.match(/\[\s*{[\s\S]*}\s*\]/); // Match JSON array pattern
      if (jsonMatch) {
        ruleResults = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        ruleResults = JSON.parse(response);
      }
    } catch (parseError) {
      logger.error("Failed to parse AI response as JSON", {
        error: parseError.message,
        response: response
      });
      // Break the long error message into multiple lines
      const errorMsg = `Failed to parse AI response: ${parseError.message}`;
      const clipInfo = `for clip ${clipData.video_url}`;
      throw new Error(`${errorMsg}\n${clipInfo}`, {cause: parseError});
    }

    logger.info(`Successfully parsed ${ruleResults.length} rule results`);

    // Process each rule result
    const timestamp = new Date().toISOString();
    const userUid = clipData.user_uid || null;
    const locationUid = clipData.location_uid || null;

    // Arrays to collect alerts and applause for batch insertion
    const alertsToInsert = [];
    const applauseToInsert = [];
    for (const result of ruleResults) {
      // Validate the rule result structure
      if (!result.rule || typeof result.rule_apply !== "boolean" || typeof result.alert !== "boolean") {
        logger.warn("Invalid rule result structure", { result });
        continue;
      }

      // Determine if this is an alert or applause
      if (result.rule_apply === true) {
        if (result.alert === true) {
          // This is an alert - rule applies and was violated
          alertsToInsert.push({
            uid: crypto.randomUUID(),
            timestamp,
            name: result.rule,
            details: {
              explanation: result.details,
              clipId: clipData.uid || null,
              videoUrl: clipData.video_url || null
            },
            user_uid: userUid,
            location_uid: locationUid,
            company_uid: clipData.company_uid || null,
            rule_uid: result.rule_uid,
          });
        } else {
          // This is an applause - rule applies but was not violated
          applauseToInsert.push({
            uid: crypto.randomUUID(),
            timestamp,
            name: result.rule,
            details: {
              explanation: result.details,
              clipId: clipData.uid || null,
              videoUrl: clipData.video_url || null
            },
            user_uid: userUid,
            location_uid: locationUid,
            company_uid: clipData.company_uid || null,
            rule_uid: result.rule_uid,
          });
        }
      }
    }
    // Insert alerts in batch if any
    if (alertsToInsert.length > 0) {
      try {
        logger.info(`Inserting ${alertsToInsert.length} alerts to Supabase`);

        // Log the first alert for debugging
        logger.debug("First alert to insert:", {
          alert: JSON.stringify(alertsToInsert[0]),
          userUid,
          locationUid
        });

        const {error: alertError} = await supabase
          .from("alerts")
          .insert(alertsToInsert)
          .select();

        if (alertError) {
          logger.error("Error inserting alerts", {
            error: alertError.message,
            code: alertError.code,
            details: alertError.details,
            hint: alertError.hint
          });
        } else {
          logger.info(`Successfully inserted ${alertsToInsert.length} alerts`);
        }
      } catch (insertError) {
        logger.error("Exception during alert insertion", {
          error: insertError.message,
          stack: insertError.stack
        });

        // Try inserting one by one to identify problematic records
        logger.info("Attempting to insert alerts one by one");
        let successCount = 0;

        for (const alert of alertsToInsert) {
          try {
            const {error} = await supabase
              .from("alerts")
              .insert(alert);

            if (!error) {
              successCount++;
            }
          } catch (e) {
            logger.error("Failed to insert individual alert", {
              alert: alert.name,
              error: e.message
            });
          }
        }
        logger.info(`Inserted ${successCount}/${alertsToInsert.length} alerts individually`);
      }
    }

    // Insert applause in batch if any
    if (applauseToInsert.length > 0) {
      try {
        logger.info(`Inserting ${applauseToInsert.length} applause to Supabase`);

        // Log the first applause for debugging
        logger.debug("First applause to insert:", {
          applause: JSON.stringify(applauseToInsert[0]),
          userUid,
          locationUid
        });

        const {error: applauseError} = await supabase
          .from("applause")
          .insert(applauseToInsert)
          .select();

        if (applauseError) {
          logger.error("Error inserting applause", {
            error: applauseError.message,
            code: applauseError.code,
            details: applauseError.details,
            hint: applauseError.hint
          });
        } else {
          logger.info(`Successfully inserted ${applauseToInsert.length} applause`);
        }
      } catch (insertError) {
        logger.error("Exception during applause insertion", {
          error: insertError.message,
          stack: insertError.stack
        });

        // Try inserting one by one to identify problematic records
        logger.info("Attempting to insert applause one by one");
        let successCount = 0;

        for (const applause of applauseToInsert) {
          try {
            const {error} = await supabase
              .from("applause")
              .insert(applause);

            if (!error) {
              successCount++;
            }
          } catch (e) {
            logger.error("Failed to insert individual applause", {
              applause: applause.name,
              error: e.message
            });
          }
        }
        logger.info(`Inserted ${successCount}/${applauseToInsert.length} applause individually`);
      }
    }
    return {
      alertsInserted: alertsToInsert.length,
      applauseInserted: applauseToInsert.length
    };
  } catch (error) {
    logger.error("Error processing rule results", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
