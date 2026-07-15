import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildConclusionEvidence,
  createCatalog,
  serializeConclusionEvidence
} from "../src/index.js";

const resultFixture = JSON.parse(readFileSync(new URL("./fixtures/conclusion-fixture.json", import.meta.url), "utf8"));
const buildResult = (overrides = {}) => ({ ...structuredClone(resultFixture), ...overrides });

const catalog = createCatalog();

test("buildConclusionEvidence creates a bounded whitelist pack with raw metrics", () => {
  const evidence = buildConclusionEvidence({
    result: buildResult({ source: { provider: "https://secret.example/api", cache: "live" } }),
    catalog,
    input: `API_KEY=sk-secretsecret C:\\Users\\secret 霞已有羊刀，剩下两件怎么带？${"x".repeat(400)}`
  });

  assert.equal(evidence.schemaVersion, "llm_conclusion_evidence.v1");
  assert.equal(evidence.request.inputSummary.length, 240);
  assert.equal(evidence.recommendations.length, 2);
  assert.equal(evidence.recommendations[0].evidenceId, "build:1");
  assert.equal(evidence.recommendations[0].stats.top4Rate, 0.612);
  assert.equal(evidence.recommendations[0].stats.games, 1248);
  assert.equal(evidence.itemSignals[0].kind, "item_core_signal");
  assert.equal(evidence.itemSignals[0].item.apiName, "TFT_Item_GuinsoosRageblade");
  assert.equal(evidence.itemSignals[0].appearances, 2);
  assert.equal(evidence.itemSignals[0].recommendationCount, 2);
  assert.equal(evidence.itemSignals[0].core, true);
  assert.equal(evidence.itemSignals[0].stable, true);
  assert.deepEqual(evidence.itemSignals[0].buildEvidenceIds, ["build:1", "build:2"]);
  assert.equal(evidence.query.lockedItems[0].apiName, "TFT_Item_GuinsoosRageblade");
  assert.ok(evidence.query.lockedItems[0].name);
  const serialized = serializeConclusionEvidence(evidence);
  assert.ok(Buffer.byteLength(serialized, "utf8") < 32 * 1024);
  assert.doesNotMatch(serialized, /secretsecret|secret\.example|C:\\\\Users|authorization|cachePath|endpoint/u);
  assert.match(serialized, /redacted-secret/u);
  assert.match(serialized, /redacted-path/u);
  assert.match(serialized, /redacted-url/u);
});

test("buildConclusionEvidence marks repeated items as low-sample core trends when linked builds are unstable", () => {
  const result = buildResult();
  result.rankedBuilds = result.rankedBuilds.map((build) => ({
    ...build,
    stats: { ...build.stats, games: 120 }
  }));
  const evidence = buildConclusionEvidence({ result, catalog, input: "霞怎么出装？" });
  assert.equal(evidence.itemSignals[0].core, true);
  assert.equal(evidence.itemSignals[0].stable, false);
  assert.equal(evidence.itemSignals[0].lowSample, true);
  assert.equal(evidence.generationRules.mustQualifyUnstableCore, true);
  assert.equal(evidence.generationRules.mustMentionLowSample, true);
});

test("buildConclusionEvidence only includes requested comparison options and preserves no-winner state", () => {
  const result = buildResult({
    type: "unit_item_comparison",
    query: {
      ...buildResult().query,
      intent: "unit_item_comparison",
      comparisonItems: ["TFT_Item_GuinsoosRageblade", "TFT_Item_InfinityEdge"],
      primaryMetric: "top4Rate"
    },
    comparison: {
      winner: null,
      primaryMetric: "top4Rate",
      decision: { winner: null, reason: "difference_too_small" },
      entries: [
        { apiName: "TFT_Item_GuinsoosRageblade", stable: true, qualified: true, stats: { games: 500, top4Rate: 0.6, winRate: 0.2, avgPlacement: 3.9 } },
        { apiName: "TFT_Item_InfinityEdge", stable: true, qualified: true, stats: { games: 480, top4Rate: 0.598, winRate: 0.201, avgPlacement: 3.91 } },
        { apiName: "TFT_Item_Deathblade", stable: true, qualified: true, stats: { games: 700, top4Rate: 0.7, winRate: 0.3, avgPlacement: 3.5 } }
      ]
    }
  });
  const evidence = buildConclusionEvidence({ result, catalog, input: "羊刀还是无尽？" });

  assert.equal(evidence.comparison.winner, null);
  assert.equal(evidence.comparison.options.length, 2);
  assert.equal(evidence.generationRules.mustAvoidWinnerClaim, true);
  assert.equal(evidence.comparison.options.some((entry) => entry.item.apiName === "TFT_Item_Deathblade"), false);
});

test("buildConclusionEvidence has a separate comp-ranking evidence shape", () => {
  const evidence = buildConclusionEvidence({
    result: {
      type: "comp_rankings",
      query: { intent: "comp_rankings", days: 3, rankFilter: ["MASTER"], minSamples: 500, metrics: ["top4_rate"] },
      rankings: {
        top4Rate: [{
          compId: "comp-a",
          name: "星神射手",
          stats: { games: 3200, top4Rate: 0.57, winRate: 0.14, avgPlacement: 4.02 },
          units: [{ apiName: "TFT17_Xayah", name: "霞", core: true, items: [] }],
          traits: [{ apiName: "TFT17_StarGuardian", filterId: "TFT17_StarGuardian_4", name: "星神", tier: 4 }]
        }]
      },
      references: [],
      warnings: [],
      source: { provider: "MetaTFT", updatedAt: "2026-07-14T00:00:00.000Z" },
      cache: { query: { hit: false } }
    },
    catalog,
    input: "当前版本什么阵容稳？"
  });
  assert.equal(evidence.recommendations[0].evidenceId, "comp:1");
  assert.equal(evidence.recommendations[0].rankingMetric, "top4Rate");
  assert.equal(evidence.recommendations[0].units[0].name, "霞");
});

test("buildConclusionEvidence summarizes only verified query-field changes from the previous turn", () => {
  const result = buildResult();
  const evidence = buildConclusionEvidence({
    result,
    catalog,
    input: "那吃鸡优先呢？",
    previousQuery: { ...result.query, sort: "win_first", days: 7 }
  });
  assert.deepEqual(evidence.request.preferenceChanges.map((entry) => entry.field), ["days", "sort"]);
  assert.equal(evidence.request.preferenceChanges.find((entry) => entry.field === "sort").after, "top4_first");
});

test("build completion is normalized to the three-item recommendation evidence contract", () => {
  const result = buildResult({
    type: "unit_build_completion",
    query: { ...buildResult().query, intent: "unit_build_completion" }
  });
  const evidence = buildConclusionEvidence({ result, catalog, input: "已有羊刀怎么补？" });
  assert.equal(evidence.request.intent, "unit_build_rankings");
  assert.equal(evidence.request.requestedIntent, "unit_build_completion");
  assert.equal(evidence.recommendations[0].evidenceId, "build:1");
});
