import {
  buildPhase5CapabilityCases,
  buildPhase5CompositeCases,
  PHASE5_CAPABILITY_DATASET_VERSION
} from "./datasets/capability-planning-phase5-cases.mjs";
import { createStructuredToolDefinitions } from "../src/agent/tools/definitions.js";
import { ToolRegistry } from "../src/agent/tools/registry.js";
import { planTask } from "../src/agent/task-planner.js";
import { matchTaskCapabilities } from "../src/understanding/capability-matcher.js";

export const PHASE5_EVALUATION_VERSION = "capability-planner-phase5.v1";

export async function runPhase5Evaluation(options = {}) {
  const registry = options.registry ?? new ToolRegistry(createStructuredToolDefinitions());
  const cases = options.cases ?? buildPhase5CapabilityCases();
  const results = [];
  for (const testCase of cases) {
    const match = matchTaskCapabilities(testCase.taskFrame, registry);
    const planning = await planTask(testCase.taskFrame, match, {
      registry,
      budget: { maxSteps: 3, maxToolCalls: 3, maxPlannerTokens: 600 }
    });
    const actualTool = planning.plan?.steps?.[0]?.tool ?? null;
    const passed = testCase.expectedTool === null
      ? match.status === "understood_but_unsupported" && planning.plan === null
      : match.mode === "single_tool"
        && planning.plannerInvoked === false
        && planning.plan?.steps?.length === 1
        && actualTool === testCase.expectedTool;
    results.push({
      id: testCase.id,
      group: testCase.group,
      expectedTool: testCase.expectedTool,
      actualTool,
      matchStatus: match.status,
      plannerInvoked: planning.plannerInvoked,
      planSteps: planning.plan?.steps?.length ?? 0,
      passed
    });
  }

  const compositeResults = [];
  for (const testCase of options.compositeCases ?? buildPhase5CompositeCases()) {
    const match = matchTaskCapabilities(testCase.taskFrame, registry, {
      compositeTools: testCase.expectedTools
    });
    let plannerCalls = 0;
    const planning = await planTask(testCase.taskFrame, match, {
      registry,
      budget: { maxSteps: 3, maxToolCalls: 3, maxPlannerTokens: 600 },
      planner: async () => {
        plannerCalls += 1;
        return {
          planVersion: "task-plan.v1",
          steps: [
            {
              id: "resolve_comp",
              tool: "unit_comp_candidates",
              arguments: { unit: "TFT17_Xayah", mention: "comp:stargazer-xayah" },
              dependsOn: []
            },
            {
              id: "recommend_items",
              tool: "unit_builds",
              arguments: { unit: "TFT17_Xayah" },
              dependsOn: ["resolve_comp"]
            }
          ]
        };
      }
    });
    const actualTools = planning.plan?.steps?.map((step) => step.tool) ?? [];
    compositeResults.push({
      id: testCase.id,
      expectedTools: testCase.expectedTools,
      actualTools,
      plannerCalls,
      passed: planning.validation?.valid === true
        && plannerCalls === 1
        && JSON.stringify(actualTools) === JSON.stringify(testCase.expectedTools)
    });
  }

  const supported = results.filter((result) => result.expectedTool !== null);
  const selectionCorrect = supported.filter((result) => result.passed).length;
  const singleToolMultiStep = supported.filter((result) => result.planSteps !== 1).length;
  const unsupported = results.filter((result) => result.expectedTool === null);
  const metrics = {
    total: results.length + compositeResults.length,
    toolSelectionTotal: supported.length,
    toolSelectionCorrect: selectionCorrect,
    toolSelectionAccuracy: supported.length ? selectionCorrect / supported.length : 1,
    singleToolTotal: supported.length,
    meaninglessMultiStepPlans: singleToolMultiStep,
    unsupportedTotal: unsupported.length,
    unsupportedCorrect: unsupported.filter((result) => result.passed).length,
    compositeTotal: compositeResults.length,
    compositePassed: compositeResults.filter((result) => result.passed).length
  };
  const gates = {
    toolSelectionAccuracy: metrics.toolSelectionAccuracy >= 0.95,
    singleToolDirect: metrics.meaninglessMultiStepPlans === 0,
    unsupportedHonest: metrics.unsupportedCorrect === metrics.unsupportedTotal,
    compositeBounded: metrics.compositePassed === metrics.compositeTotal
  };
  return {
    evaluationVersion: PHASE5_EVALUATION_VERSION,
    datasetVersion: PHASE5_CAPABILITY_DATASET_VERSION,
    passed: Object.values(gates).every(Boolean),
    gates,
    metrics,
    results,
    compositeResults
  };
}
