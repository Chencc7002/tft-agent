import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhase6Evaluation } from "../eval/phase6-runner.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = resolve(ROOT, ".cache", "eval");
const JSON_REPORT_PATH = resolve(REPORT_DIR, "phase-6-semantic-takeover.json");
const MARKDOWN_REPORT_PATH = resolve(REPORT_DIR, "phase-6-semantic-takeover.md");

function markdown(report) {
  const metrics = report.metrics;
  const actionLines = Object.entries(report.slices.action).map(([action, value]) => (
    `- ${action}: quality ${(value.quality * 100).toFixed(2)}%, fallback ${(value.fallbackRate * 100).toFixed(2)}%, latency P95 ${value.p95LatencyMs.toFixed(3)}ms, output Token P95 ${value.p95OutputTokens}`
  ));
  return [
    "# Phase 6 Semantic Takeover Evaluation",
    "",
    `- evaluation: \`${report.evaluationVersion}\``,
    `- dataset: \`${report.datasetVersion}\``,
    `- result: ${report.passed ? "PASS" : "FAIL"}`,
    `- effective-answer rate: ${(metrics.effectiveAnswerRate * 100).toFixed(2)}% (${metrics.supportedEffective}/${metrics.runs})`,
    `- wrong-tool-call rate: ${(metrics.wrongToolCallRate * 100).toFixed(2)}% (${metrics.wrongToolCalls}/${metrics.runs})`,
    `- shadow difference rate: ${(metrics.shadowDifferenceRate * 100).toFixed(2)}% (${metrics.shadowDifferences}/${metrics.runs})`,
    `- fallback rate at full rollout: ${(metrics.fallbackRate * 100).toFixed(2)}%`,
    `- Pass@${metrics.repetitions}: ${(metrics.passAtK * 100).toFixed(2)}%`,
    `- Pass^${metrics.repetitions}: ${(metrics.passPowerK * 100).toFixed(2)}%`,
    `- latency P50/P95: ${metrics.latency.p50Ms.toFixed(3)}ms / ${metrics.latency.p95Ms.toFixed(3)}ms`,
    `- input Token P50/P95: ${metrics.tokens.inputP50} / ${metrics.tokens.inputP95}`,
    `- cached input Token P50/P95: ${metrics.tokens.cachedInputP50} / ${metrics.tokens.cachedInputP95}`,
    `- output Token P50/P95: ${metrics.tokens.outputP50} / ${metrics.tokens.outputP95}`,
    "",
    "## Action slices",
    "",
    ...actionLines,
    "",
    "## Canary checks",
    "",
    ...Object.entries(report.canary).map(([action, value]) => (
      `- ${action}: ${value.semantic} semantic / ${value.fallback} legacy fallback at ${value.rolloutPercent}%`
    )),
    ""
  ].join("\n");
}

async function main() {
  const report = await runPhase6Evaluation();
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
