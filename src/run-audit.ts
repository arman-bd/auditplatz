import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { auditContracts } from "./auditors/contracts.js";
import { auditPayroll } from "./auditors/payroll.js";
import { auditFinancials } from "./auditors/financial.js";
import { analyzeWithAI } from "./agent.js";
import { closeDB } from "../db/index.js";
import type { AuditFinding, AuditReport } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

mkdirSync(DATA_DIR, { recursive: true });

const command = process.argv[2];

interface AuditResult {
  audit: string;
  ranAt: string;
  findings: AuditFinding[];
  summary: { total: number; bySeverity: Record<string, number> };
}

function summarize(findings: AuditFinding[]) {
  const bySeverity: Record<string, number> = {};
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  return { total: findings.length, bySeverity };
}

async function runSingle(name: string, fn: () => Promise<AuditFinding[]>) {
  console.log(`Running ${name} audit...`);
  const findings = await fn();
  const result: AuditResult = {
    audit: name,
    ranAt: new Date().toISOString(),
    findings,
    summary: summarize(findings),
  };
  writeFileSync(join(DATA_DIR, `audit-${name}.json`), JSON.stringify(result, null, 2));
  console.log(`  ${findings.length} findings → data/audit-${name}.json`);
  return result;
}

async function main() {
  switch (command) {
    case "contracts": {
      await runSingle("contracts", auditContracts);
      break;
    }
    case "payroll": {
      await runSingle("payroll", auditPayroll);
      break;
    }
    case "financial": {
      await runSingle("financial", auditFinancials);
      break;
    }
    case "all": {
      const [c, p, f] = await Promise.all([
        runSingle("contracts", auditContracts),
        runSingle("payroll", auditPayroll),
        runSingle("financial", auditFinancials),
      ]);
      // Also save combined report
      const allFindings = [...c.findings, ...p.findings, ...f.findings];
      const combined: AuditReport = {
        companyName: "M&H Wearables GmbH",
        auditPeriod: { start: "2025-01-01", end: "2025-12-31" },
        generatedAt: new Date().toISOString(),
        findings: allFindings,
        summary: {
          totalFindings: allFindings.length,
          bySeverity: summarize(allFindings).bySeverity,
          byCategory: (() => {
            const m: Record<string, number> = {};
            for (const f of allFindings) m[f.category] = (m[f.category] || 0) + 1;
            return m;
          })(),
        },
      };
      writeFileSync(join(DATA_DIR, "audit-findings.json"), JSON.stringify(combined, null, 2));
      console.log(`\nCombined: ${allFindings.length} findings`);
      break;
    }
    case "report": {
      // Load combined findings
      const reportPath = join(DATA_DIR, "audit-findings.json");
      if (!existsSync(reportPath)) {
        console.error("No audit findings. Run audits first.");
        process.exit(1);
      }
      const report: AuditReport = JSON.parse(readFileSync(reportPath, "utf-8"));
      const aiReport = await analyzeWithAI(report);
      writeFileSync(join(DATA_DIR, "audit-report.md"), aiReport);
      console.log("AI report saved to data/audit-report.md");
      break;
    }
    default:
      console.log("Usage: npx tsx src/run-audit.ts [contracts|payroll|financial|all|report]");
      process.exit(1);
  }

  await closeDB();
}

main().catch(async (err) => {
  console.error(err);
  await closeDB();
  process.exit(1);
});
