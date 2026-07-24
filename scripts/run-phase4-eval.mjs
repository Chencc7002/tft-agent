import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhase4Evaluation } from "../eval/phase4-runner.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = resolve(ROOT, ".cache", "eval");
const JSON_REPORT_PATH = resolve(REPORT_DIR, "phase-4-context-clarification.json");
const MARKDOWN_REPORT_PATH = resolve(REPORT_DIR, "phase-4-context-clarification.md");

export function phase4Markdown(report) {
  const metrics = report.metrics;
  const failures = report.results.filter((result) => !result.passed);
  return [
    "# Phase 4 Context Resolution and Clarification Evaluation",
    "",
    `- evaluation: \`${report.evaluationVersion}\``,
    `- dataset: \`${report.datasetVersion}\``,
    `- result: ${report.passed ? "PASS" : "FAIL"}`,
    `- multi-turn reference accuracy: ${(metrics.multiTurnReferenceAccuracy * 100).toFixed(2)}% (${metrics.referenceCorrect}/${metrics.referenceTotal})`,
    `- unnecessary clarification rate: ${(metrics.unnecessaryClarificationRate * 100).toFixed(2)}% (${metrics.unnecessaryClarifications}/${metrics.nonClarificationTotal})`,
    `- one-key-question compliance: ${(metrics.oneKeyQuestionRate * 100).toFixed(2)}% (${metrics.oneKeyQuestionCorrect}/${metrics.necessaryClarificationTotal})`,
    `- explicit/conversation/default condition source accuracy: ${(metrics.conditionSourceAccuracy * 100).toFixed(2)}%`,
    "",
    "## Failures",
    "",
    ...(failures.length ? failures.map((result) => `- ${result.id}: ${result.input}`) : ["- none"]),
    ""
  ].join("\n");
}

async function main() {
  const report = await runPhase4Evaluation();
  await mkdir(REPORT_DIR, { recursive: true });
  await Promise.all([
    writeFile(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(MARKDOWN_REPORT_PATH, phase4Markdown(report), "utf8")
  ]);
  console.log(JSON.stringify({
    passed: report.passed,
    gates: report.gates,
    metrics: report.metrics,
    jsonReport: JSON_REPORT_PATH,
    markdownReport: MARKDOWN_REPORT_PATH
  }));
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
