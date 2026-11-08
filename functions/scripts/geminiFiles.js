/**
 * Helpers for the Gemini Files API maintenance scripts.
 */
const {GoogleGenAI} = require("@google/genai");

/**
 * Retries an API call with exponential backoff on 429/500/503.
 * @param {Function} fn - Async function to call
 * @param {number} maxRetries - Attempts before giving up
 * @param {number} baseDelay - First delay in ms
 * @returns {Promise<*>} Result of fn
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      const isRetryableError = [429, 500, 503].includes(error.status);
      if (isLastAttempt || !isRetryableError) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Attempt ${i + 1} failed with ${error.status}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Creates a Gemini client from the GEMINI_API_KEY environment variable.
 * @returns {GoogleGenAI}
 */
function createClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY in the environment, e.g. GEMINI_API_KEY=... npm run gemini-files:list");
  }
  return new GoogleGenAI({apiKey});
}

/**
 * Lists every file in the Files API, page by page.
 * @param {GoogleGenAI} ai - Gemini client
 * @returns {Promise<Array<object>>} All files
 */
async function listAllFiles(ai) {
  const pager = await retryWithBackoff(() => ai.files.list({config: {pageSize: 100}}));
  const files = [...pager.page];
  let batch = 1;
  console.log(`Batch ${batch}: ${pager.page.length} files`);
  while (pager.hasNextPage()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const page = await retryWithBackoff(() => pager.nextPage());
    batch++;
    console.log(`Batch ${batch}: ${page.length} files`);
    files.push(...page);
  }
  return files;
}

module.exports = {retryWithBackoff, createClient, listAllFiles};
