import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runAudit, analyzeWithAI } from "./agent.js";
import { closeDB } from "../db/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  M&H Wearables — Business Audit Tool");
  console.log("═══════════════════════════════════════════════════════");

  // Run rule-based audit against PostgreSQL
  const report = await runAudit();

  console.log(`\n📋 Audit Complete: ${report.summary.totalFindings} findings`);
  console.log(`   Critical: ${report.summary.bySeverity["critical"] || 0}`);
  console.log(`   High:     ${report.summary.bySeverity["high"] || 0}`);
  console.log(`   Medium:   ${report.summary.bySeverity["medium"] || 0}`);
  console.log(`   Low:      ${report.summary.bySeverity["low"] || 0}`);

  // Save raw findings
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, "audit-findings.json"), JSON.stringify(report, null, 2));
  console.log(`\n💾 Raw findings saved to data/audit-findings.json`);

  // AI analysis
  const aiReport = await analyzeWithAI(report);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  AI AUDIT REPORT");
  console.log("═══════════════════════════════════════════════════════\n");
  console.log(aiReport);

  writeFileSync(join(DATA_DIR, "audit-report.md"), aiReport);
  console.log(`\n\n💾 AI report saved to data/audit-report.md`);

  await closeDB();
}

main().catch(async (err) => {
  console.error(err);
  await closeDB();
  process.exit(1);
});
