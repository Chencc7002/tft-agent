import { createTaskFrame } from "../../src/understanding/task-frame.js";

export const PHASE4_CONTEXT_DATASET_VERSION = "context-resolution-phase4.v1";

function entity(rawText, expectedType, resolvedId) {
  return { rawText, expectedType, resolvedId, confidence: 1 };
}
function frame(value = {}) {
  return createTaskFrame({
    domain: "tft",
    action: value.action ?? "compare",
    subjects: value.subjects ?? [],
    candidates: value.candidates ?? [],
    concepts: value.concepts ?? [],
    constraints: value.constraints ?? {},
    goal: value.goal ?? "choose_best",
    expectedOutput: value.expectedOutput ?? ["recommendation", "evidence"],
    ambiguities: value.ambiguities ?? [],
    confidence: 0.94,
    understandingStatus: value.understandingStatus ?? "understood_and_supported"
  });
}

const champion = entity("霞", "champion", "TFT17_Xayah");
const guinsoo = entity("羊刀", "item", "TFT_Item_GuinsoosRageblade");
const infinity = entity("无尽", "item", "TFT_Item_InfinityEdge");
const titanic = entity("巨九", "item", "TFT_Item_TitanicHydra");
const composition = entity("星界霞", "composition", "comp:stargazer-xayah");

export function buildPhase4ContextCases() {
  const cases = [];
  const pluralInputs = ["这两个哪个好", "那两个继续比", "这俩按吃鸡率看"];
  for (let index = 0; index < 30; index += 1) {
    cases.push({
      id: `plural-${index + 1}`,
      group: "multi_turn_reference",
      input: pluralInputs[index % pluralInputs.length],
      current: frame({
        ambiguities: [{ code: "missing_context", affectsResult: true }],
        understandingStatus: "understood_but_missing_context"
      }),
      conversation: [{
        taskFrame: frame({ subjects: [champion], candidates: [guinsoo, infinity] })
      }],
      expected: {
        candidateIds: [guinsoo.resolvedId, infinity.resolvedId],
        subjectIds: [champion.resolvedId],
        needsClarification: false
      }
    });
  }

  const specificInputs = ["那巨九呢", "再看巨九呢", "还有巨九怎么样"];
  for (let index = 0; index < 30; index += 1) {
    cases.push({
      id: `specific-${index + 1}`,
      group: "multi_turn_reference",
      input: specificInputs[index % specificInputs.length],
      current: frame({ subjects: [], candidates: [titanic] }),
      conversation: [{
        taskFrame: frame({ subjects: [champion], candidates: [guinsoo] })
      }],
      expected: {
        candidateIds: [guinsoo.resolvedId, titanic.resolvedId],
        subjectIds: [champion.resolvedId],
        needsClarification: false
      }
    });
  }

  for (let index = 0; index < 20; index += 1) {
    cases.push({
      id: `composition-${index + 1}`,
      group: "multi_turn_reference",
      input: index % 2 ? "还是刚才那套" : "那套继续分析",
      current: frame({ action: "analyze", goal: "analyze_evidence" }),
      conversation: [{
        taskFrame: frame({
          action: "recommend",
          concepts: [composition],
          goal: "recommend_best_option"
        })
      }],
      expected: {
        conceptIds: [composition.resolvedId],
        needsClarification: false
      }
    });
  }

  for (let index = 0; index < 20; index += 1) {
    cases.push({
      id: `condition-source-${index + 1}`,
      group: "condition_source",
      input: index % 2 ? "那继续看" : "再看呢",
      current: frame({ constraints: { days: 3 } }),
      conversation: [{
        taskFrame: frame({ constraints: { patch: "current", rankFilter: ["diamond_plus"] } })
      }],
      defaults: { queue: "ranked" },
      expected: {
        needsClarification: false,
        constraintSources: {
          days: "explicit",
          patch: "conversation",
          rankFilter: "conversation",
          queue: "system_default"
        }
      }
    });
  }

  for (let index = 0; index < 10; index += 1) {
    cases.push({
      id: `missing-${index + 1}`,
      group: "necessary_clarification",
      input: index % 2 ? "这两个哪个好" : "还是刚才那套",
      current: frame({
        ambiguities: [{ code: "missing_context", affectsResult: true }],
        understandingStatus: "understood_but_missing_context"
      }),
      conversation: [],
      expected: {
        needsClarification: true,
        oneKeyQuestion: true
      }
    });
  }

  for (let index = 0; index < 10; index += 1) {
    cases.push({
      id: `fresh-${index + 1}`,
      group: "no_clarification",
      input: "霞的羊刀和无尽哪个好",
      current: frame({ subjects: [champion], candidates: [guinsoo, infinity] }),
      conversation: [],
      expected: {
        candidateIds: [guinsoo.resolvedId, infinity.resolvedId],
        subjectIds: [champion.resolvedId],
        needsClarification: false
      }
    });
  }
  return cases;
}
