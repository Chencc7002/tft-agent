import test from "node:test";
import assert from "node:assert/strict";
import { createTaskFrame } from "../src/understanding/task-frame.js";
import { resolveTaskFrameContext } from "../src/understanding/context-resolver.js";
import { applyClarificationPolicy } from "../src/understanding/ambiguity-policy.js";
import { runPhase4Evaluation } from "../eval/phase4-runner.mjs";

test("phase 4 resolves plural references and records condition origins", () => {
  const previous = createTaskFrame({
    action: "compare",
    subjects: [{ rawText: "霞", expectedType: "champion", resolvedId: "xayah", confidence: 1 }],
    candidates: [
      { rawText: "羊刀", expectedType: "item", resolvedId: "guinsoo", confidence: 1 },
      { rawText: "无尽", expectedType: "item", resolvedId: "infinity", confidence: 1 }
    ],
    constraints: { patch: "current" },
    goal: "choose_best",
    understandingStatus: "understood_and_supported",
    confidence: 0.9
  });
  const current = createTaskFrame({
    action: "compare",
    goal: "choose_best",
    ambiguities: [{ code: "missing_context", affectsResult: true }],
    understandingStatus: "understood_but_missing_context",
    confidence: 0.8
  });
  const resolution = resolveTaskFrameContext(current, {
    input: "这两个哪个好",
    conversation: [{ taskFrame: previous }],
    defaults: { queue: "ranked" }
  });
  assert.deepEqual(resolution.taskFrame.candidates.map((value) => value.resolvedId), ["guinsoo", "infinity"]);
  assert.equal(resolution.fieldSources.constraints.patch, "conversation");
  assert.equal(resolution.fieldSources.constraints.queue, "system_default");
  const clarification = applyClarificationPolicy(resolution.taskFrame, resolution);
  assert.equal(clarification.needsClarification, false);
  assert.equal(clarification.strategy, "context_resolved");
});
test("phase 4 asks one relevant question and restates the understood goal when context is absent", () => {
  const current = createTaskFrame({
    action: "compare",
    goal: "choose_best",
    ambiguities: [{ code: "missing_context", affectsResult: true }],
    understandingStatus: "understood_but_missing_context",
    confidence: 0.8
  });
  const resolution = resolveTaskFrameContext(current, {
    input: "这两个哪个好",
    conversation: []
  });
  const clarification = applyClarificationPolicy(resolution.taskFrame, resolution);
  assert.equal(clarification.needsClarification, true);
  assert.equal(clarification.strategy, "ask_one_key_question");
  assert.match(clarification.question, /choose_best|比较/u);
  assert.equal(Object.hasOwn(clarification, "suggestions"), false);
});

test("phase 4 evaluation enforces reference and clarification gates", async () => {
  const report = await runPhase4Evaluation();
  assert.equal(report.passed, true);
  assert.ok(report.metrics.multiTurnReferenceAccuracy >= 0.9);
  assert.ok(report.metrics.unnecessaryClarificationRate < 0.05);
  assert.equal(report.metrics.oneKeyQuestionRate, 1);
});
