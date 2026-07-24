import test from "node:test";
import assert from "node:assert/strict";
import { createStructuredToolDefinitions } from "../src/agent/tools/definitions.js";
import { ToolRegistry } from "../src/agent/tools/registry.js";
import { planTask } from "../src/agent/task-planner.js";
import {
  DEFAULT_PHASE6_ROLLOUT_POLICY,
  TAKEOVER_ACTION_ORDER,
  createTakeoverDecision,
  finalizeTakeoverTrace,
  validateTakeoverPolicy
} from "../src/agent/takeover-controller.js";
import { createTaskFrame } from "../src/understanding/task-frame.js";
import { matchTaskCapabilities } from "../src/understanding/capability-matcher.js";
import { runPhase6Evaluation } from "../eval/phase6-runner.mjs";

const champion = { rawText: "霞", expectedType: "champion", resolvedId: "TFT17_Xayah", confidence: 1 };

function recommendationFrame() {
  return createTaskFrame({
    action: "recommend",
    subjects: [champion],
    constraints: { patch: "current" },
    goal: "recommend_best_option",
    expectedOutput: ["recommendation", "evidence"],
    confidence: 0.96,
    understandingStatus: "understood_and_supported"
  });
}

async function decisionFor(overrides = {}) {
  const registry = new ToolRegistry(createStructuredToolDefinitions());
  const taskFrame = recommendationFrame();
  const match = matchTaskCapabilities(taskFrame, registry);
  const taskPlanning = await planTask(taskFrame, match, { registry });
  return createTakeoverDecision({
    taskFrame,
    clarificationPolicy: { needsClarification: false },
    capabilityMatch: match,
    taskPlanning,
    shadowDifference: {},
    legacyTools: ["unit_builds"],
    requestKey: "stable-request",
    policy: DEFAULT_PHASE6_ROLLOUT_POLICY,
    ...overrides
  });
}

test("takeover policy enforces the documented action order", () => {
  assert.equal(validateTakeoverPolicy(DEFAULT_PHASE6_ROLLOUT_POLICY).valid, true);
  const invalid = structuredClone(DEFAULT_PHASE6_ROLLOUT_POLICY);
  invalid.search.rolloutPercent = 0;
  invalid.rank.rolloutPercent = 10;
  const validation = validateTakeoverPolicy(invalid);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("previous action")));
  assert.deepEqual(TAKEOVER_ACTION_ORDER, ["search", "rank", "recommend", "compare", "explain", "analyze"]);
});

test("takeover requires shadow agreement and exact registered-tool compatibility", async () => {
  const active = await decisionFor();
  assert.equal(active.route, "semantic");
  assert.equal(active.mode, "active");

  const difference = await decisionFor({
    shadowDifference: { actionChanged: true }
  });
  assert.equal(difference.route, "legacy_fallback");
  assert.equal(difference.reason, "shadow_difference");

  const mismatch = await decisionFor({ legacyTools: ["comps_rankings"] });
  assert.equal(mismatch.route, "legacy_fallback");
  assert.equal(mismatch.reason, "plan_not_compatible_with_legacy");

  const unresolvedFrame = recommendationFrame();
  unresolvedFrame.subjects[0].resolvedId = null;
  const unresolved = await decisionFor({ taskFrame: unresolvedFrame });
  assert.equal(unresolved.route, "legacy_fallback");
  assert.equal(unresolved.reason, "unresolved_execution_entity");
  assert.equal(unresolved.trace.failureLayer, "entity");
});

test("run traces localize tool and conclusion failures without exposing raw content", async () => {
  const decision = await decisionFor();
  const toolFailure = finalizeTakeoverTrace(decision, {
    toolStatus: "failed",
    toolError: "operation_failed",
    conclusionStatus: "not_started"
  });
  assert.equal(toolFailure.failureLayer, "tool");
  assert.equal(toolFailure.stages.tool.error, "operation_failed");

  const conclusionFailure = finalizeTakeoverTrace(decision, {
    toolStatus: "completed",
    conclusionStatus: "failed",
    conclusionError: "evidence_validation_failed"
  });
  assert.equal(conclusionFailure.failureLayer, "conclusion");
  assert.doesNotMatch(JSON.stringify(conclusionFailure), /霞/u);
});

test("phase 6 evaluation repeats every action five times and enforces rollout gates", async () => {
  const report = await runPhase6Evaluation();
  assert.equal(report.passed, true);
  assert.equal(report.metrics.repetitions, 5);
  assert.ok(report.metrics.effectiveAnswerRate >= 0.9);
  assert.ok(report.metrics.wrongToolCallRate < 0.01);
  assert.ok(report.metrics.passAtK >= 0.9);
  assert.ok(report.metrics.passPowerK >= 0.9);
});
