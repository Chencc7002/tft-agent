import { performance } from "node:perf_hooks";
import { compileExecutionPlan } from "../src/agent/execution-plan.js";
import { createStructuredToolDefinitions } from "../src/agent/tools/definitions.js";
import { ToolRegistry } from "../src/agent/tools/registry.js";
import { planTask } from "../src/agent/task-planner.js";
import {
  classifySemanticDifference,
  createTakeoverDecision
} from "../src/agent/takeover-controller.js";
import { matchTaskCapabilities } from "../src/understanding/capability-matcher.js";
import { createTaskFrame } from "../src/understanding/task-frame.js";
import {
  buildPhase65SemanticGapCases,
  PHASE65_SEMANTIC_GAP_DATASET_VERSION
} from "./datasets/semantic-gap-phase65-cases.mjs";

export const PHASE65_EVALUATION_VERSION = "semantic-correction-phase65.v1";

function championFrame(confidence = 0.97) {
  return createTaskFrame({
    action: "recommend",
    subjects: [{
      rawText: "霞",
      expectedType: "champion",
      resolvedId: "TFT17_Xayah",
      confidence: 1
    }],
    constraints: { patch: "current" },
    goal: "recommend_best_option",
    expectedOutput: ["recommendation", "evidence"],
    confidence,
    understandingStatus: "understood_and_supported"
  });
}

function fast9Frame() {
  return createTaskFrame({
    action: "recommend",
    concepts: [{
      rawText: "九五",
      expectedType: "game_concept",
      resolvedId: "concept.strategy.fast9_nine_five",
      confidence: 1
    }],
    constraints: { patch: "current", limit: 3 },
    goal: "recommend_best_option",
    expectedOutput: ["recommendation", "composition_candidates", "evidence"],
    confidence: 0.97,
    understandingStatus: "understood_and_supported"
  });
}

function expectedRoute(kind) {
  if (kind === "trusted_correction") return "semantic_correction";
  if (kind === "equivalent") return "semantic";
  return "legacy_fallback";
}

async function executeCase(testCase, repetition, registry) {
  const startedAt = performance.now();
  const useFast9 = ["trusted_correction", "new_capability"].includes(testCase.expectedDifference);
  const frame = testCase.expectedDifference === "low_confidence"
    ? championFrame(0.4)
    : useFast9 ? fast9Frame() : championFrame();
  const capabilityMatch = matchTaskCapabilities(frame, registry);
  const taskPlanning = await planTask(frame, capabilityMatch, { registry });
  const executionPlanning = compileExecutionPlan(
    frame,
    capabilityMatch,
    taskPlanning,
    { registry }
  );
  const legacyTools = useFast9 ? ["comps_rankings"] : ["unit_builds"];
  const shadowDifference = testCase.expectedDifference === "equivalent"
    || testCase.expectedDifference === "entity_conflict"
    || testCase.expectedDifference === "low_confidence"
    ? {}
    : {
      actionChanged: true,
      clarificationChanged: testCase.expectedDifference === "trusted_correction",
      legacy: {
        action: "rank",
        needsClarification: testCase.expectedDifference === "trusted_correction"
      }
    };
  const input = {
    taskFrame: frame,
    clarificationPolicy: { needsClarification: false },
    capabilityMatch,
    taskPlanning,
    executionPlanning,
    shadowDifference,
    legacyTools,
    legacyUnsupported: testCase.expectedDifference === "trusted_correction",
    legacyEntities: testCase.expectedDifference === "entity_conflict"
      ? [{ expectedType: "champion", resolvedId: "TFT17_Rakan" }]
      : [],
    requestKey: `${testCase.id}:stable`
  };
  const classification = classifySemanticDifference(input);
  const decision = createTakeoverDecision(input);
  const actualTools = executionPlanning.plan?.steps?.map((step) => step.tool) ?? [];
  const trustedTool = actualTools.every((tool) => {
    const definition = registry.get(tool);
    return definition?.trustTier === "first_party"
      && definition.readOnly
      && definition.sideEffect === "none"
      && !definition.requiresApproval;
  });
  const passed = classification.kind === testCase.expectedDifference
    && decision.route === expectedRoute(testCase.expectedDifference)
    && executionPlanning.validation?.valid === true
    && trustedTool;
  return {
    id: testCase.id,
    repetition,
    expectedDifference: testCase.expectedDifference,
    actualDifference: classification.kind,
    route: decision.route,
    tools: actualTools,
    trustedTool,
    latencyMs: Math.max(0, performance.now() - startedAt),
    inputTokens: Math.ceil(JSON.stringify(frame).length / 3),
    outputTokens: Number(executionPlanning.validation?.estimatedTokens ?? 0),
    passed
  };
}

export async function runPhase65Evaluation(options = {}) {
  const cases = options.cases ?? buildPhase65SemanticGapCases();
  const repetitions = Math.max(3, Number(options.repetitions ?? 3));
  const registry = options.registry ?? new ToolRegistry(createStructuredToolDefinitions());
  const results = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    for (const testCase of cases) {
      results.push(await executeCase(testCase, repetition, registry));
    }
  }
  const byCase = new Map();
  for (const result of results) {
    if (!byCase.has(result.id)) byCase.set(result.id, []);
    byCase.get(result.id).push(result);
  }
  const passAtK = [...byCase.values()].filter((values) => values.some((value) => value.passed)).length / byCase.size;
  const passPowerK = [...byCase.values()].filter((values) => values.every((value) => value.passed)).length / byCase.size;
  const classificationAccuracy = results.filter((result) => (
    result.actualDifference === result.expectedDifference
  )).length / results.length;
  const routeAccuracy = results.filter((result) => (
    result.route === expectedRoute(result.expectedDifference)
  )).length / results.length;
  const arbitraryToolCalls = results.filter((result) => !result.trustedTool).length;
  const metrics = {
    cases: cases.length,
    repetitions,
    runs: results.length,
    classificationAccuracy,
    routeAccuracy,
    arbitraryToolCalls,
    passAtK,
    passPowerK,
    averageLatencyMs: results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length,
    totalInputTokens: results.reduce((sum, result) => sum + result.inputTokens, 0),
    totalOutputTokens: results.reduce((sum, result) => sum + result.outputTokens, 0)
  };
  const slices = Object.fromEntries([
    ...new Set(cases.map((testCase) => testCase.expectedDifference))
  ].map((kind) => {
    const values = results.filter((result) => result.expectedDifference === kind);
    return [kind, {
      runs: values.length,
      passRate: values.filter((result) => result.passed).length / values.length
    }];
  }));
  const gates = {
    semanticGapCases: cases.length >= 100,
    repetitions: repetitions >= 3,
    classification: classificationAccuracy === 1,
    routing: routeAccuracy === 1,
    arbitraryTools: arbitraryToolCalls === 0,
    stability: passAtK >= 0.95 && passPowerK >= 0.9,
    fast9Correction: slices.trusted_correction?.passRate === 1
  };
  return {
    schemaVersion: "phase65-evaluation-report.v1",
    evaluationVersion: PHASE65_EVALUATION_VERSION,
    datasetVersion: PHASE65_SEMANTIC_GAP_DATASET_VERSION,
    passed: Object.values(gates).every(Boolean),
    gates,
    metrics,
    slices,
    results
  };
}

