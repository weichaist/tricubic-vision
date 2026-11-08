/**
 * Deletes every file stored in the Gemini Files API for this API key, to free
 * up the storage quota (for example after many analyses failed half-way).
 *
 *   GEMINI_API_KEY=... npm run gemini-files:delete-all -- --yes
 */
const {createClient, listAllFiles, retryWithBackoff} = require("./geminiFiles");

async function cleanupAllAIFiles() {
  const ai = createClient();
  console.log("Listing Gemini Files API files...");
  const files = await listAllFiles(ai);
  console.log(`Found ${files.length} files`);

  let totalDeleted = 0;
  let totalErrors = 0;

  for (const file of files) {
    try {
      await retryWithBackoff(() => ai.files.delete({name: file.name}));
      totalDeleted++;
      console.log(`Deleted ${file.name} (${file.displayName || "no display name"})`);
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      totalErrors++;
      console.error(`Failed to delete ${file.name}: ${error.message}`);
    }
  }

  console.log(`Cleanup complete. Deleted: ${totalDeleted}, errors: ${totalErrors}`);
  return {totalDeleted, totalErrors};
}

if (require.main === module) {
  if (!process.argv.includes("--yes")) {
    console.error("This deletes ALL files in the Gemini Files API for GEMINI_API_KEY. Re-run with --yes to confirm.");
    process.exit(1);
  }
  cleanupAllAIFiles()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Cleanup failed:", error.message);
        process.exit(1);
      });
}

module.exports = {cleanupAllAIFiles};
