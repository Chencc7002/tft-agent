import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhase5Evaluation } from "../eval/phase5-runner.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = resolve(ROOT, ".cache", "eval");
const JSON_REPORT_PATH = resolve(REPORT_DIR, "phase-5-capability-planner.json");
const MARKDOWN_REPORT_PATH = resolve(REPORT_DIR, "phase-5-capability-planner.md");

function markdown(report) {
  const metrics = report.metrics;
  const failures = [
    ...report.results.filter((result) => !result.passed),
    ...report.compositeResults.filter((result) => !result.passed)
  ];
  return [
    "# Phase 5 Capability Matching and Controlled Planner Evaluation",
    "",
    `- evaluation: \`${report.evaluationVersion}\``,
    `- dataset: \`${report.datasetVersion}\``,
    `- result: ${report.passed ? "PASS" : "FAIL"}`,
    `- tool selection accuracy: ${(metrics.toolSelectionAccuracy * 100).toFixed(2)}% (${metrics.toolSelectionCorrect}/${metrics.toolSelectionTotal})`,
    `- meaningless multi-step single-tool plans: ${metrics.meaninglessMultiStepPlans}`,
    `- unsupported correctly downgraded: ${metrics.unsupportedCorrect}/${metrics.unsupportedTotal}`,
    `- bounded composite plans: ${metrics.compositePassed}/${metrics.compositeTotal}`,
    "",
    "## Failures",
    "",
    ...(failures.length ? failures.map((result) => `- ${result.id}`) : ["- none"]),
    ""
  ].join("\n");
}

async function main() {
  const report = await runPhase5Evaluation();
  await mkdir(REPORT_DIR, { recursive: true });
  await Promise.all([
    writeFile(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(MARKDOWN_REPORT_PATH, markdown(report), "utf8")
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
