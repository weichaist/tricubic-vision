/**
 * Lists the files stored in the Gemini Files API for this API key, with the
 * total size. analyzeClipWithAI deletes each upload when it is done, so this
 * should normally be empty; Gemini also expires files after 48 hours.
 *
 *   GEMINI_API_KEY=... npm run gemini-files:list
 */
const {createClient, listAllFiles} = require("./geminiFiles");

async function checkAIFiles() {
  const ai = createClient();
  console.log("Checking Gemini Files API...");

  const files = await listAllFiles(ai);
  console.log(`\n=== Total: ${files.length} files ===\n`);

  const displayLimit = 20;
  files.slice(0, displayLimit).forEach((file, index) => {
    const size = file.sizeBytes ? `${(Number(file.sizeBytes) / 1024 / 1024).toFixed(2)} MB` : "N/A";
    console.log(`${index + 1}. Name: ${file.name}`);
    console.log(`   Display Name: ${file.displayName || "N/A"}`);
    console.log(`   State: ${file.state || "N/A"}`);
    console.log(`   Size: ${size}`);
    console.log(`   Created: ${file.createTime || "N/A"}`);
    console.log("");
  });
  if (files.length > displayLimit) {
    console.log(`... and ${files.length - displayLimit} more files\n`);
  }

  const totalSizeBytes = files.reduce((sum, file) => sum + Number(file.sizeBytes || 0), 0);
  if (totalSizeBytes > 0) {
    console.log(`Total storage used: ${(totalSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
  }

  return {totalFiles: files.length, files};
}

if (require.main === module) {
  checkAIFiles()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Check failed:", error.message);
        process.exit(1);
      });
}

module.exports = {checkAIFiles};
