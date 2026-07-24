import { createTaskFrame } from "../../src/understanding/task-frame.js";

export const PHASE6_TAKEOVER_DATASET_VERSION = "semantic-takeover-phase6.v1";

function entity(rawText, expectedType, resolvedId) {
  return { rawText, expectedType, resolvedId, confidence: 1 };
}

function frame(value) {
  return createTaskFrame({
    domain: "tft",
    action: value.action,
    subjects: value.subjects ?? [],
    candidates: value.candidates ?? [],
    concepts: value.concepts ?? [],
    constraints: value.constraints ?? {},
    goal: value.goal,
    expectedOutput: value.expectedOutput,
    confidence: 0.96,
    understandingStatus: "understood_and_supported"
  });
}

const champion = entity("霞", "champion", "TFT17_Xayah");
const itemA = entity("羊刀", "item", "TFT_Item_GuinsoosRageblade");
const itemB = entity("无尽", "item", "TFT_Item_InfinityEdge");
const composition = entity("星界霞", "composition", "comp:stargazer-xayah");
const concept = entity("九五", "game_concept", "game_concept:fast9");

const TEMPLATES = Object.freeze([
  {
    action: "search",
    legacyIntent: "unit_item_availability",
    tool: "semantic_search",
    entityType: "game_concept",
    make: (patch) => frame({
      action: "search",
      concepts: [concept],
      constraints: { patch },
      goal: "find_relevant_data",
      expectedOutput: ["results", "evidence"]
    })
  },
  {
    action: "rank",
    legacyIntent: "comp_rankings",
    tool: "comps_rankings",
    entityType: "composition",
    make: (patch) => frame({
      action: "rank",
      concepts: [composition],
      constraints: { patch },
      goal: "rank_options",
      expectedOutput: ["ranking", "evidence"]
    })
  },
  {
    action: "recommend",
    legacyIntent: "unit_build_rankings",
    tool: "unit_builds",
    entityType: "champion",
    make: (patch) => frame({
      action: "recommend",
      subjects: [champion],
      constraints: { patch },
      goal: "recommend_best_option",
      expectedOutput: ["recommendation", "evidence"]
    })
  },
  {
    action: "compare",
    legacyIntent: "unit_item_comparison",
    tool: "unit_builds",
    entityType: "item",
    make: (patch) => frame({
      action: "compare",
      subjects: [champion],
      candidates: [itemA, itemB],
      constraints: { patch },
      goal: "choose_best",
      expectedOutput: ["recommendation", "comparison", "evidence"]
    })
  },
  {
    action: "explain",
    legacyIntent: "item_details",
    tool: "item_details",
    entityType: "item",
    make: () => frame({
      action: "explain",
      subjects: [itemA],
      goal: "explain_concept_or_entity",
      expectedOutput: ["explanation", "evidence"]
    })
  },
  {
    action: "analyze",
    legacyIntent: "comp_trends",
    tool: "comps_trends",
    entityType: "composition",
    make: (patch) => frame({
      action: "analyze",
      concepts: [composition],
      constraints: { patch, trend: "up" },
      goal: "analyze_evidence",
      expectedOutput: ["analysis", "evidence"]
    })
  }
]);

export function buildPhase6TakeoverCases() {
  const styles = ["standard", "colloquial", "typo", "context"];
  return TEMPLATES.flatMap((template) => Array.from({ length: 20 }, (_, index) => {
    const patch = index % 2 ? "current" : "17.7";
    return {
      id: `${template.action}-${index + 1}`,
      action: template.action,
      legacyIntent: template.legacyIntent,
      expectedTool: template.tool,
      taskFrame: template.make(patch),
      slices: {
        action: template.action,
        entityType: template.entityType,
        style: styles[index % styles.length],
        version: patch,
        toolType: template.tool
      }
    };
  }));
}
