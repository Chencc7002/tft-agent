import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildConclusionEvidence, createCatalog, validateConclusionOutput } from "../src/index.js";

const resultFixture = JSON.parse(readFileSync(new URL("./fixtures/conclusion-fixture.json", import.meta.url), "utf8"));
const buildResult = (overrides = {}) => ({ ...structuredClone(resultFixture), ...overrides });

const catalog = createCatalog();
const evidence = buildConclusionEvidence({ result: buildResult(), catalog, input: "霞已有羊刀怎么补？" });

function validOutput(overrides = {}) {
  return {
    schemaVersion: "llm_conclusion.v1",
    status: "ok",
    headline: "围绕羊刀补齐无尽与巨杀",
    summary: "当前统计口径下，第一套完整出装的前四率最高，可作为优先参考。",
    reasons: [{ evidenceIds: ["build:1"], text: "该组合前四率为61.2%，样本1248场，均名3.86。" }],
    alternatives: [{ evidenceIds: ["build:2"], text: "若更看重登顶率，可参考第二套组合。" }],
    nextAction: "保留已有羊刀，再根据散件补齐另外两件装备。",
    riskNotice: null,
    ...overrides
  };
}

test("validateConclusionOutput accepts evidence-linked names and exact metrics", () => {
  const result = validateConclusionOutput(validOutput(), evidence, { catalog });
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.value.reasons[0].evidenceIds[0], "build:1");
});

test("validateConclusionOutput accepts only evidence-linked core-item claims", () => {
  const valid = validOutput({
    summary: "羊刀在当前前列方案中重复出现，可视为核心装备趋势（item-signal:1; build:1）；首套完整方案还包含无尽与巨杀，且stable为真。",
    reasons: [{ evidenceIds: ["item-signal:1"], text: "羊刀在两套推荐中都出现，出现率100.0%，是当前统计口径下的核心装备趋势（core=true）。" }]
  });
  const validResult = validateConclusionOutput(valid, evidence, { catalog });
  assert.equal(validResult.valid, true);
  assert.doesNotMatch(validResult.value.reasons[0].text, /core=/u);
  assert.doesNotMatch(validResult.value.summary, /(?:build|item-signal):/u);
  assert.doesNotMatch(validResult.value.summary, /stable/u);
  assert.match(validResult.value.summary, /被标记为稳定/u);

  const wrongLink = validOutput({
    reasons: [{ evidenceIds: ["build:1"], text: "羊刀是当前统计口径下的核心装备。" }]
  });
  assert.equal(validateConclusionOutput(wrongLink, evidence, { catalog }).valid, false);

  const promotedNonCore = validOutput({ summary: "无尽是当前前列方案的核心装备。" });
  assert.equal(validateConclusionOutput(promotedNonCore, evidence, { catalog }).valid, false);

  const absolute = validOutput({ nextAction: "羊刀是必备装备，优先合成。" });
  assert.equal(validateConclusionOutput(absolute, evidence, { catalog }).valid, false);

  const qualified = validOutput({ nextAction: "羊刀不是必备装备，仍需根据散件选择。" });
  assert.equal(validateConclusionOutput(qualified, evidence, { catalog }).valid, true);
});

test("validateConclusionOutput rejects unknown evidence, fabricated metrics, entities, and causal claims", () => {
  const cases = [
    validOutput({ reasons: [{ evidenceIds: ["build:99"], text: "样本1248场。" }] }),
    validOutput({ reasons: [{ evidenceIds: ["build:1"], text: "该组合前四率为99.9%。" }] }),
    validOutput({ headline: "改用“神秘刀”" }),
    validOutput({ summary: "这套装备导致胜率提升。" })
  ];
  for (const value of cases) {
    const result = validateConclusionOutput(value, evidence, { catalog });
    assert.equal(result.valid, false, JSON.stringify(value));
  }
});

test("validateConclusionOutput enforces low-sample and unresolved-comparison risk boundaries", () => {
  const lowEvidence = structuredClone(evidence);
  lowEvidence.recommendations[0].lowSample = true;
  lowEvidence.generationRules.mustMentionLowSample = true;
  assert.equal(validateConclusionOutput(validOutput(), lowEvidence, { catalog }).valid, false);
  assert.equal(validateConclusionOutput(validOutput({ riskNotice: "当前属于低样本结果，仅供参考。" }), lowEvidence, { catalog }).valid, true);
  assert.equal(validateConclusionOutput(validOutput({ riskNotice: "当前属于低样本结果。" }), evidence, { catalog }).valid, false);

  const staleEvidence = structuredClone(evidence);
  staleEvidence.generationRules.mustMentionStaleData = true;
  assert.equal(validateConclusionOutput(validOutput(), staleEvidence, { catalog }).valid, false);
  assert.equal(validateConclusionOutput(validOutput({ riskNotice: "数据可能不是最新，请注意时效。" }), staleEvidence, { catalog }).valid, true);

  const noWinner = structuredClone(evidence);
  noWinner.generationRules.mustAvoidWinnerClaim = true;
  assert.equal(validateConclusionOutput(validOutput({ summary: "羊刀胜出，是当前更优选择。" }), noWinner, { catalog }).valid, false);
});
