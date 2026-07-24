export const TAKEOVER_DECISION_VERSION = "semantic-takeover-decision.v1";
export const AGENT_TRACE_VERSION = "agent-route-trace.v1";
export const TAKEOVER_ACTION_ORDER = Object.freeze([
  "search",
  "rank",
  "recommend",
  "compare",
  "explain",
  "analyze"
]);

export const DEFAULT_PHASE6_ROLLOUT_POLICY = Object.freeze(Object.fromEntries(
  TAKEOVER_ACTION_ORDER.map((action) => [action, Object.freeze({
    offlinePassed: true,
    shadowPassed: true,
    rolloutPercent: 100
  })])
));

function array(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(array(values).filter(Boolean).map(String))];
}

function hashBucket(value) {
  let hash = 2166136261;
  for (const character of String(value ?? "default")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export function validateTakeoverPolicy(policy = DEFAULT_PHASE6_ROLLOUT_POLICY) {
  const errors = [];
  let priorExpanded = true;
  for (const action of TAKEOVER_ACTION_ORDER) {
    const entry = policy?.[action] ?? {};
    const percent = Number(entry.rolloutPercent ?? 0);
    if (typeof entry.offlinePassed !== "boolean") errors.push(`${action}.offlinePassed must be boolean`);
    if (typeof entry.shadowPassed !== "boolean") errors.push(`${action}.shadowPassed must be boolean`);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      errors.push(`${action}.rolloutPercent must be between 0 and 100`);
    }
    if (percent > 0 && (!entry.offlinePassed || !entry.shadowPassed)) {
      errors.push(`${action} cannot receive traffic before offline and shadow gates pass`);
    }
    if (percent > 0 && !priorExpanded) {
      errors.push(`${action} cannot receive traffic before the previous action reaches 100%`);
    }
    priorExpanded = priorExpanded && percent === 100;
  }
  return { valid: errors.length === 0, errors };
}

function countEntityState(frame) {
  const entities = [
    ...array(frame?.subjects),
    ...array(frame?.candidates),
    ...array(frame?.concepts)
  ];
  return {
    total: entities.length,
    resolved: entities.filter((entity) => entity?.resolvedId).length,
    unresolved: entities.filter((entity) => !entity?.resolvedId).length,
    types: unique(entities.map((entity) => entity?.expectedType))
  };
}

function traceFor(input = {}) {
  const frame = input.taskFrame ?? {};
  const entity = countEntityState(frame);
  const clarification = input.clarificationPolicy ?? {};
  const capability = input.capabilityMatch ?? {};
  const planning = input.taskPlanning ?? {};
  return {
    schemaVersion: AGENT_TRACE_VERSION,
    action: frame.action ?? "unknown",
    stages: {
      parsing: {
        status: frame.schemaVersion === "task-frame.v1" ? "completed" : "failed",
        schemaVersion: frame.schemaVersion ?? null,
        understandingStatus: frame.understandingStatus ?? null,
        confidence: Number(frame.confidence ?? 0)
      },
      entity: {
        status: entity.unresolved === 0 ? "completed" : "degraded",
        ...entity
      },
      context: {
        status: clarification.needsClarification ? "blocked" : "completed",
        references: array(frame.contextReferences).length,
        strategy: clarification.strategy ?? null
      },
      planning: {
        status: planning.validation?.valid === true ? "completed" : "blocked",
        tools: array(planning.plan?.steps).map((step) => step.tool),
        steps: array(planning.plan?.steps).length,
        estimatedTokens: Number(planning.validation?.estimatedTokens ?? 0)
      },
      tool: { status: "pending", error: null },
      conclusion: { status: "pending", error: null }
    },
    failureLayer: null
  };
}

function fallback(input, reason, failureLayer, mode = "fallback") {
  const trace = traceFor(input);
  trace.failureLayer = failureLayer;
  if (failureLayer && trace.stages[failureLayer]) trace.stages[failureLayer].status = "fallback";
  return {
    schemaVersion: TAKEOVER_DECISION_VERSION,
    route: "legacy_fallback",
    mode,
    action: input.taskFrame?.action ?? "unknown",
    reason,
    rolloutBucket: hashBucket(input.requestKey),
    plannedTools: unique(array(input.taskPlanning?.plan?.steps).map((step) => step.tool)),
    legacyTools: unique(input.legacyTools),
    trace
  };
}

export function createTakeoverDecision(input = {}) {
  const policy = input.policy ?? DEFAULT_PHASE6_ROLLOUT_POLICY;
  const policyValidation = validateTakeoverPolicy(policy);
  if (!policyValidation.valid) return fallback(input, "invalid_rollout_policy", "planning");
  const action = input.taskFrame?.action;
  if (!TAKEOVER_ACTION_ORDER.includes(action)) {
    return fallback(input, "action_not_enabled", "parsing");
  }
  const gate = policy[action];
  if (!gate.offlinePassed) return fallback(input, "offline_gate_failed", "parsing", "shadow");
  if (!gate.shadowPassed) return fallback(input, "shadow_gate_failed", "parsing", "shadow");
  const difference = input.shadowDifference ?? {};
  if (difference.actionChanged || difference.domainChanged || difference.clarificationChanged) {
    return fallback(input, "shadow_difference", "parsing");
  }
  if (input.clarificationPolicy?.needsClarification) {
    return fallback(input, "clarification_required", "context");
  }
  if (input.capabilityMatch?.status !== "understood_and_supported") {
    return fallback(input, "unsupported_capability", "planning");
  }
  if (input.taskPlanning?.validation?.valid !== true || !input.taskPlanning?.plan) {
    return fallback(input, "invalid_task_plan", "planning");
  }
  const plannedTools = unique(input.taskPlanning.plan.steps.map((step) => step.tool)).sort();
  const entityState = countEntityState(input.taskFrame);
  if (entityState.unresolved > 0 && !plannedTools.every((tool) => tool === "semantic_search")) {
    return fallback(input, "unresolved_execution_entity", "entity");
  }
  const legacyTools = unique(input.legacyTools).sort();
  if (JSON.stringify(plannedTools) !== JSON.stringify(legacyTools)) {
    return fallback(input, "plan_not_compatible_with_legacy", "planning");
  }
  const rolloutBucket = hashBucket(input.requestKey);
  if (Number(gate.rolloutPercent) <= rolloutBucket) {
    return fallback(input, "outside_rollout_bucket", null, "canary");
  }
  const trace = traceFor(input);
  return {
    schemaVersion: TAKEOVER_DECISION_VERSION,
    route: "semantic",
    mode: Number(gate.rolloutPercent) === 100 ? "active" : "canary",
    action,
    reason: "gates_passed",
    rolloutBucket,
    plannedTools,
    legacyTools,
    trace
  };
}

export function finalizeTakeoverTrace(decision, outcome = {}) {
  const trace = structuredClone(decision?.trace ?? traceFor({}));
  const toolStatus = String(outcome.toolStatus ?? "completed");
  const conclusionStatus = String(outcome.conclusionStatus ?? (
    toolStatus === "completed" ? "completed" : "not_started"
  ));
  trace.stages.tool = {
    status: toolStatus,
    error: outcome.toolError ? String(outcome.toolError) : null
  };
  trace.stages.conclusion = {
    status: conclusionStatus,
    error: outcome.conclusionError ? String(outcome.conclusionError) : null
  };
  if (outcome.failureLayer) trace.failureLayer = String(outcome.failureLayer);
  else if (!["completed", "cache_hit"].includes(toolStatus)) trace.failureLayer = "tool";
  else if (conclusionStatus !== "completed") trace.failureLayer = "conclusion";
  trace.metrics = {
    latencyMs: Math.max(0, Number(outcome.latencyMs ?? 0)),
    inputTokens: Math.max(0, Number(outcome.inputTokens ?? 0)),
    cachedInputTokens: Math.max(0, Number(outcome.cachedInputTokens ?? 0)),
    outputTokens: Math.max(0, Number(outcome.outputTokens ?? 0))
  };
  return trace;
}
