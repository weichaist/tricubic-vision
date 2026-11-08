/**
 * Video analysis with Gemini, shared by analyzeClipWithAI and debugClipAnalysis.
 */
const logger = require("firebase-functions/logger");
const {GoogleGenAI, FileState} = require("@google/genai");
const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const {GEMINI_API_KEY, GEMINI_MODEL} = require("./config");

const GENERATION_CONFIG = {
  temperature: 0.0,
  topP: 0.1,
  maxOutputTokens: 50000,
  systemInstruction: "常に日本語で回答してください。",
};

/**
 * Returns a Gemini client and the configured model id.
 * @returns {{ai: GoogleGenAI, model: string}}
 */
function getGemini() {
  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set (see README.md)");
  }
  return {ai: new GoogleGenAI({apiKey}), model: GEMINI_MODEL.value()};
}

/**
 * Downloads a file from a URL to a local path using axios
 * @param {string} url - The URL of the file
 * @param {string} fileName - The file name
 * @param {string} destPath - Optional specific destination path
 * @returns {Promise<string>} - The path to the downloaded file
 */
async function downloadFileFromUrl(url, fileName, destPath = null) {
  try {
    if (!url || !url.startsWith("http")) {
      throw new Error(`Invalid URL: ${url}`);
    }

    logger.info("Downloading file", {url, fileName});

    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
      timeout: 30000, // 30 seconds
      maxContentLength: 100 * 1024 * 1024, // 100MB
    });

    const filePath = destPath || path.join(os.tmpdir(), fileName);
    await fs.promises.writeFile(filePath, response.data);
    logger.info("File downloaded successfully", {filePath, size: response.data.length});
    return filePath;
  } catch (error) {
    logger.error("Error downloading file", {
      url,
      error: error.message,
      code: error.code,
      status: error.response ? error.response.status : undefined,
    });
    throw new Error(`Failed to download file: ${error.message}`, {cause: error});
  }
}

/**
 * Creates a prompt for AI to analyze safety compliance
 * @param {Array<{uid: string, name: string, details: string|null}>} rules - Safety rules to check
 * @returns {string} - The prompt for AI analysis
 */
function createSafetyAnalysisPrompt(rules) {
  const rulesList = rules.map((rule) => {
    const details = rule.details ? ` (${rule.details})` : "";
    return ` rule_uid: ${rule.uid} - ${rule.name}${details}`;
  }).join("\n");

  return `**Analyze Forklift Operator Safety Compliance**

**Context:** You are an AI safety assistant analyzing video footage of forklift operations.
Your task is to meticulously review the provided video clip against a list of specific safety rules.

**Inputs:**
1.  **[VIDEO INPUT]:**
2.  **[LIST OF RULES]:
${rulesList}

**Important:** Each rule above includes both the name and details. When returning the "rule" field in your response,
include the complete text after "rule_uid: XXX - " (including any details in parentheses).

**Task:**
For **each rule** in the provided list:
1.  Carefully examine the **entire video** content.
2.  Determine if the actions or situations shown in the video are relevant to the rule (\`rule_apply\`).
3.  If the rule applies, determine if the operator violated the rule based *only* on the visual evidence
    in the video (\`alert\`).
4.  Provide a concise explanation justifying your findings (\`details\`).

**Output Format:**
Generate a JSON list containing one object for each rule. Each object must have the following structure:

\`\`\`json
[
  {
    "rule_uid": "string",       // The unique identifier of the rule.
    "rule": "string",      // The complete rule text including name and details (everything after "rule_uid: XXX - ").
    "rule_apply": boolean, // true if the video content is relevant to checking this rule, false otherwise.
    "alert": boolean,      // true if rule_apply is true AND the operator violated the rule in the video.
                           // false otherwise.
    "details": "string"    // Explanation based *strictly* on video evidence. State why the rule applies/doesn't
                           // apply and why it was violated/not violated. If rule_apply is false, explain why
                           // the video content isn't relevant.
  }
  // ... one object for each rule in the input list
]
\`\`\``;
}

/**
 * Uploads a local video to the Gemini Files API, asks the model to check it
 * against the prompt, and deletes the uploaded file afterwards.
 * The local file is deleted once it has been uploaded.
 * @param {string} localPath - Path of the downloaded video
 * @param {string} displayName - Display name for the uploaded file
 * @param {string} promptText - Prompt from createSafetyAnalysisPrompt
 * @returns {Promise<{response: string, model: string}>} Raw model output
 */
async function analyzeVideo(localPath, displayName, promptText) {
  const {ai, model} = getGemini();
  let file;

  try {
    logger.info("Uploading to AI service...");
    file = await ai.files.upload({
      file: localPath,
      config: {mimeType: "video/mp4", displayName},
    });
    logger.info("File uploaded to AI service", {fileName: file.name});

    try {
      await fs.promises.unlink(localPath);
      logger.info("Temp file cleaned up");
    } catch (cleanupError) {
      logger.error("Error cleaning up temp file", {error: cleanupError});
    }

    // Wait until the file has been processed
    logger.info("Waiting for file to be processed...");
    let processed = await ai.files.get({name: file.name});
    while (processed.state === FileState.PROCESSING) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      processed = await ai.files.get({name: file.name});
    }
    if (processed.state !== FileState.ACTIVE) {
      throw new Error(`File processing failed for ${file.name}`);
    }
    logger.info("File is ready for processing", {fileUri: processed.uri, mimeType: processed.mimeType});

    logger.info("Getting analysis from AI service...", {model, promptTextLength: promptText.length});
    const result = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [
          {text: promptText},
          {fileData: {mimeType: processed.mimeType, fileUri: processed.uri}},
        ],
      }],
      config: GENERATION_CONFIG,
    });

    const response = result.text || "";
    logger.info("Received response from AI service", {responseLength: response.length});
    return {response, model};
  } catch (error) {
    logger.error("Error with video analysis", {
      model,
      error: error.message,
      errorStatus: error.status || "unknown",
    });
    throw error;
  } finally {
    // Delete the uploaded file to free up Files API storage
    if (file && file.name) {
      try {
        await ai.files.delete({name: file.name});
        logger.info("Deleted file from AI service", {fileName: file.name});
      } catch (deleteError) {
        logger.error("Error deleting file from AI service", {
          error: deleteError.message,
          fileName: file.name,
        });
      }
    }
  }
}

module.exports = {
  downloadFileFromUrl,
  createSafetyAnalysisPrompt,
  analyzeVideo,
};
