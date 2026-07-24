import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhase65Evaluation } from "../eval/phase65-runner.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = resolve(ROOT, ".cache", "eval");
const JSON_REPORT_PATH = resolve(REPORT_DIR, "phase-6-5-semantic-correction.json");
const MARKDOWN_REPORT_PATH = resolve(REPORT_DIR, "phase-6-5-semantic-correction.md");

function percent(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

const report = await runPhase65Evaluation();
const markdown = [
  "# Phase 6.5 Semantic Correction Evaluation",
  "",
  `- result: ${report.passed ? "PASS" : "FAIL"}`,
  `- dataset: \`${report.datasetVersion}\``,
  `- cases/repetitions/runs: ${report.metrics.cases} / ${report.metrics.repetitions} / ${report.metrics.runs}`,
  `- classification accuracy: ${percent(report.metrics.classificationAccuracy)}`,
  `- route accuracy: ${percent(report.metrics.routeAccuracy)}`,
  `- arbitrary tool calls: ${report.metrics.arbitraryToolCalls}`,
  `- Pass@${report.metrics.repetitions}: ${percent(report.metrics.passAtK)}`,
  `- Pass^${report.metrics.repetitions}: ${percent(report.metrics.passPowerK)}`,
  "",
  "## Difference slices",
  "",
  ...Object.entries(report.slices).map(([kind, value]) => (
    `- ${kind}: ${percent(value.passRate)} (${value.runs} runs)`
  )),
  ""
].join("\n");
await mkdir(REPORT_DIR, { recursive: true });
await Promise.all([
  writeFile(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(MARKDOWN_REPORT_PATH, markdown, "utf8")
]);
console.log(JSON.stringify({
  passed: report.passed,
  gates: report.gates,
  metrics: report.metrics,
  slices: report.slices,
  jsonReport: JSON_REPORT_PATH,
  markdownReport: MARKDOWN_REPORT_PATH
}, null, 2));
if (!report.passed) process.exitCode = 1;

