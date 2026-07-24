import { validateToolInput } from "./tools/contracts.js";
import { resolveConceptCapability } from "../understanding/concept-capability-map.js";

export const EXECUTION_PLAN_SCHEMA_VERSION = "execution-plan.v1";
export const EXECUTION_PLAN_VALIDATION_VERSION = "execution-plan-validation.v1";

const MAX_EXECUTION_STEPS = 3;
const ALLOWED_RESULT_POLICIES = new Set(["identity", "filter_comp_strategy"]);

function array(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeArguments(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? structuredClone(value)
    : {};
}

function sanitizeStep(step = {}) {
  return {
    id: String(step.id ?? ""),
    tool: String(step.tool ?? ""),
    arguments: sanitizeArguments(step.arguments),
    dependsOn: array(step.dependsOn).map(String),
    evidenceContract: step.evidenceContract && typeof step.evidenceContract === "object"
      ? structuredClone(step.evidenceContract)
      : null
  };
}

function hasCycle(steps) {
  const graph = new Map(steps.map((step) => [step.id, step.dependsOn]));
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return steps.some((step) => visit(step.id));
}

function trustedReadOnlyTool(definition) {
  return Boolean(
    definition
    && definition.trustTier === "first_party"
    && definition.readOnly === true
    && definition.sideEffect === "none"
    && definition.requiresApproval === false
  );
}

export function validateExecutionPlan(plan, options = {}) {
  const errors = [];
  const registry = options.registry;
  const budget = {
    maxSteps: Math.min(
      MAX_EXECUTION_STEPS,
      Math.max(1, Number(options.budget?.maxSteps ?? MAX_EXECUTION_STEPS))
    ),
    maxToolCalls: Math.min(
      MAX_EXECUTION_STEPS,
      Math.max(0, Number(options.budget?.maxToolCalls ?? MAX_EXECUTION_STEPS))
    ),
    maxPlanTokens: Math.max(64, Number(options.budget?.maxPlanTokens ?? 800))
  };
  if (plan?.schemaVersion !== EXECUTION_PLAN_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${EXECUTION_PLAN_SCHEMA_VERSION}`);
  }
  if (!["legacy_equivalent", "semantic_correction"].includes(plan?.route)) {
    errors.push("route must be legacy_equivalent or semantic_correction");
  }
  const steps = array(plan?.steps).map(sanitizeStep);
  if (steps.length < 1 || steps.length > budget.maxSteps) {
    errors.push(`steps must contain 1-${budget.maxSteps} entries`);
  }
  if (steps.length > budget.maxToolCalls) errors.push("tool call budget exceeded");
  const ids = new Set();
  for (const step of steps) {
    if (!step.id || ids.has(step.id)) errors.push("step ids must be unique and non-empty");
    ids.add(step.id);
    const definition = registry?.get?.(step.tool);
    if (!definition) {
      errors.push(`tool is not registered: ${step.tool}`);
      continue;
    }
    if (!trustedReadOnlyTool(definition)) {
      errors.push(`tool is not an allowlisted first-party read-only tool: ${step.tool}`);
    }
    try {
      validateToolInput(step.arguments, definition.inputSchema, step.tool);
    } catch (error) {
      errors.push(
        `invalid arguments for ${step.tool}: ${error?.details?.errors?.join(", ") ?? error.message}`
      );
    }
    if (
      !step.evidenceContract
      || step.evidenceContract.type !== definition.evidenceType
      || !array(step.evidenceContract.requiredFields).length
    ) {
      errors.push(`invalid evidence contract for ${step.tool}`);
    }
  }
  for (const step of steps) {
    for (const dependency of step.dependsOn) {
      if (!ids.has(dependency) || dependency === step.id) {
        errors.push(`invalid dependency ${dependency} for ${step.id}`);
      }
    }
  }
  if (hasCycle(steps)) errors.push("plan dependencies must be acyclic");
  const resultPolicy = plan?.resultPolicy ?? { type: "identity" };
  if (!ALLOWED_RESULT_POLICIES.has(resultPolicy.type)) {
    errors.push(`result policy is not allowlisted: ${resultPolicy.type ?? "missing"}`);
  }
  if (resultPolicy.type === "filter_comp_strategy") {
    if (resultPolicy.strategy !== "fast9") errors.push("unsupported composition strategy");
    if (resultPolicy.neverResolveToSingleComp !== true) {
      errors.push("concept candidate policy must not resolve to a single composition");
    }
    if (!steps.some((step) => step.tool === "comps_rankings")) {
      errors.push("strategy candidate validation requires comps_rankings");
    }
  }
  const estimatedTokens = Math.ceil(JSON.stringify({
    schemaVersion: EXECUTION_PLAN_SCHEMA_VERSION,
    route: plan?.route,
    steps,
    resultPolicy
  }).length / 3);
  if (estimatedTokens > budget.maxPlanTokens) errors.push("execution plan token budget exceeded");
  return {
    schemaVersion: EXECUTION_PLAN_VALIDATION_VERSION,
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? {
      schemaVersion: EXECUTION_PLAN_SCHEMA_VERSION,
      route: plan.route,
      sourceTaskPlanVersion: plan.sourceTaskPlanVersion ?? null,
      conceptMapping: plan.conceptMapping ?? null,
      steps,
      resultPolicy: structuredClone(resultPolicy),
      finalEvidenceContract: structuredClone(plan.finalEvidenceContract ?? null)
    } : null,
    budget,
    estimatedTokens
  };
}

function defaultEvidenceContract(definition) {
  return {
    type: definition.evidenceType,
    source: definition.source,
    requiredFields: ["source", "updatedAt"]
  };
}

function taskPlanCandidate(taskPlanning, registry) {
  return {
    schemaVersion: EXECUTION_PLAN_SCHEMA_VERSION,
    route: "legacy_equivalent",
    sourceTaskPlanVersion: taskPlanning.plan.planVersion,
    conceptMapping: null,
    steps: taskPlanning.plan.steps.map((step) => {
      const definition = registry.get(step.tool);
      return {
        id: step.id,
        tool: step.tool,
        arguments: structuredClone(step.arguments),
        dependsOn: [...(step.dependsOn ?? [])],
        evidenceContract: defaultEvidenceContract(definition)
      };
    }),
    resultPolicy: { type: "identity" },
    finalEvidenceContract: {
      required: true,
      allowModelGeneratedStatistics: false
    }
  };
}

function conceptCandidate(taskFrame, taskPlanning, mapping, registry) {
  const constraints = taskFrame.constraints ?? {};
  const definition = registry.get(mapping.tool);
  const args = Object.fromEntries(
    ["days", "patch", "queue", "rank", "minSamples", "metrics", "limit"]
      .filter((key) => constraints[key] !== undefined && constraints[key] !== null)
      .map((key) => [key, structuredClone(constraints[key])])
  );
  if (!args.patch) args.patch = "current";
  return {
    schemaVersion: EXECUTION_PLAN_SCHEMA_VERSION,
    route: "semantic_correction",
    sourceTaskPlanVersion: taskPlanning.plan.planVersion,
    conceptMapping: {
      schemaVersion: mapping.schemaVersion,
      conceptId: mapping.conceptId,
      queryCapability: mapping.queryCapability,
      candidateSemantics: mapping.candidateSemantics,
      mention: mapping.mention
    },
    steps: [{
      id: "retrieve_current_candidates",
      tool: mapping.tool,
      arguments: args,
      dependsOn: [],
      evidenceContract: {
        ...structuredClone(mapping.evidenceContract),
        type: definition.evidenceType
      }
    }],
    resultPolicy: structuredClone(mapping.resultPolicy),
    finalEvidenceContract: {
      required: true,
      conceptId: mapping.conceptId,
      requireStructuredStats: true,
      allowModelGeneratedStatistics: false
    }
  };
}

export function compileExecutionPlan(taskFrame, capabilityMatch, taskPlanning, options = {}) {
  if (
    taskFrame?.schemaVersion !== "task-frame.v1"
    || taskFrame.understandingStatus !== "understood_and_supported"
    || capabilityMatch?.status !== "understood_and_supported"
    || taskPlanning?.validation?.valid !== true
    || !taskPlanning?.plan
  ) {
    return {
      status: "understood_but_unsupported",
      plan: null,
      validation: {
        schemaVersion: EXECUTION_PLAN_VALIDATION_VERSION,
        valid: false,
        errors: ["semantic planning gates did not pass"]
      }
    };
  }
  const registry = options.registry;
  const mapping = resolveConceptCapability(taskFrame);
  const candidate = mapping
    ? conceptCandidate(taskFrame, taskPlanning, mapping, registry)
    : taskPlanCandidate(taskPlanning, registry);
  const validation = validateExecutionPlan(candidate, options);
  return {
    status: validation.valid ? "understood_and_supported" : "understood_but_unsupported",
    plan: validation.value,
    validation,
    conceptMapping: mapping
  };
}

