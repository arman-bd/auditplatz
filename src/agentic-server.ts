// Standalone script that runs the agentic audit and streams JSON lines to stdout
import { runAgenticAudit } from "./agentic-audit.js";
import { closeDB } from "../db/index.js";

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.error("Usage: npx tsx src/agentic-server.ts <prompt>");
  process.exit(1);
}

async function main() {
  try {
    await runAgenticAudit(prompt, (step) => {
      process.stdout.write(JSON.stringify(step) + "\n");
    });
  } finally {
    await closeDB();
  }
}

main().catch((err) => {
  process.stdout.write(
    JSON.stringify({
      role: "assistant",
      content: `Error: ${err.message}`,
      timestamp: new Date().toISOString(),
    }) + "\n"
  );
  closeDB().then(() => process.exit(1));
});
