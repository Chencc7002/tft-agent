export const CONCLUSION_EVIDENCE_SCHEMA_VERSION = "llm_conclusion_evidence.v1";
export const MAX_CONCLUSION_EVIDENCE_BYTES = 32 * 1024;

const SUPPORTED_INTENTS = new Set([
  "unit_build_rankings",
  "unit_build_completion",
  "unit_best_3_items",
  "unit_item_comparison",
  "unit_item_rankings",
  "comp_rankings"
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function clipped(value, limit) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\b(?:https?|wss?):\/\/\S+/giu, "[redacted-url]")
    .replace(/\b(?:bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|(?:api[_ -]?key|authorization)\s*[:=]\s*\S+)/giu, "[redacted-secret]")
    .replace(/\b[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gu, "[redacted-path]")
    .trim()
    .slice(0, limit);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function itemRecord(apiName, catalog) {
  const item = catalog?.itemByApiName?.get?.(apiName);
  return {
    apiName: String(apiName),
    name: item?.preferredDisplayName ?? item?.shortName ?? item?.zhName ?? String(apiName)
  };
}

function unitRecord(apiName, catalog) {
  if (!apiName) return null;
  const unit = catalog?.unitByApiName?.get?.(apiName);
  return {
    apiName: String(apiName),
    name: unit?.zhName ?? unit?.shortName ?? String(apiName)
  };
}

function traitRecord(filterId, catalog) {
  const trait = catalog?.traitByFilterId?.get?.(filterId) ?? catalog?.traitByApiName?.get?.(filterId);
  return {
    apiName: trait?.apiName ?? String(filterId),
    filterId: String(filterId),
    name: trait?.zhName ?? trait?.shortName ?? String(filterId)
  };
}

function statsRecord(stats = {}) {
  return {
    games: finite(stats.games) ?? 0,
    top4Rate: finite(stats.top4Rate),
    winRate: finite(stats.winRate),
    avgPlacement: finite(stats.avgPlacement),
    ...(finite(stats.pickRate) !== null ? { pickRate: finite(stats.pickRate) } : {})
  };
}

function lowSampleFor(stats, query = {}) {
  const configured = Number(query.minSamples ?? 100);
  const minSamples = Number.isFinite(configured) && configured > 0 ? configured : 100;
  return Number(stats?.games ?? 0) < Math.max(200, minSamples * 2);
}

function sourceState(result) {
  const queryCache = result?.cache?.query ?? {};
  const cache = queryCache.stale
    ? "stale"
    : queryCache.hit
      ? "cache"
      : result?.source?.cache ?? "live";
  return {
    provider: clipped(result?.source?.provider ?? "MetaTFT", 40),
    cache,
    updatedAt: result?.source?.updatedAt ?? queryCache.updatedAt ?? null,
    patch: result?.source?.patch ?? result?.query?.patch ?? null
  };
}

function buildWarnings(result) {
  return unique([
    ...asArray(result?.warnings),
    ...asArray(result?.query?.warnings),
    ...asArray(result?.comparison?.warnings)
  ].map((warning) => clipped(warning, 240))).slice(0, 8);
}

function assumptionText(value) {
  if (typeof value === "string") return clipped(value, 160);
  if (!value || typeof value !== "object") return "";
  if (value.text) return clipped(value.text, 160);
  const key = value.key ?? value.name;
  const entry = value.value ?? value.values;
  if (!key) return "";
  return clipped(`${key}: ${Array.isArray(entry) ? entry.join("/") : entry ?? value.source ?? "default"}`, 160);
}

function buildQuery(result, catalog) {
  const query = result?.query ?? {};
  const starLevels = asArray(query.starLevel ?? query.starLevels).map(Number).filter(Number.isInteger);
  return {
    unit: unitRecord(query.unit, catalog),
    starLevels,
    itemPolicy: query.itemPolicy ?? null,
    lockedItems: asArray(query.lockedItems ?? query.ownedItems).slice(0, 3).map((apiName) => itemRecord(apiName, catalog)),
    excludedItems: asArray(query.excludedItems).slice(0, 8).map((apiName) => itemRecord(apiName, catalog)),
    comparisonItems: asArray(query.comparisonItems).slice(0, 5).map((apiName) => itemRecord(apiName, catalog)),
    traits: asArray(query.traitFilters).slice(0, 10).map((filterId) => traitRecord(filterId, catalog)),
    days: finite(query.days),
    patch: query.patch ?? null,
    rankFilter: asArray(query.rankFilter).slice(0, 10).map(String),
    minSamples: finite(query.minSamples),
    sort: query.sort ?? null,
    assumptions: asArray(query.assumptions).map(assumptionText).filter(Boolean).slice(0, 12)
  };
}

function preferenceValue(key, value, catalog) {
  if (key === "unit") return unitRecord(value, catalog);
  if (["lockedItems", "ownedItems", "excludedItems", "comparisonItems"].includes(key)) {
    return asArray(value).slice(0, 8).map((apiName) => itemRecord(apiName, catalog));
  }
  if (key === "traitFilters") return asArray(value).slice(0, 10).map((filterId) => traitRecord(filterId, catalog));
  if (Array.isArray(value)) return value.slice(0, 12);
  return value ?? null;
}

function buildPreferenceChanges(previousQuery, currentQuery, catalog) {
  if (!previousQuery || typeof previousQuery !== "object") return [];
  const fields = [
    "unit", "starLevel", "itemPolicy", "lockedItems", "ownedItems", "excludedItems", "comparisonItems",
    "traitFilters", "days", "rankFilter", "minSamples", "sort", "primaryMetric", "metrics"
  ];
  const changes = [];
  for (const field of fields) {
    const before = preferenceValue(field, previousQuery[field], catalog);
    const after = preferenceValue(field, currentQuery?.[field], catalog);
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    changes.push({ field, before, after });
    if (changes.length >= 10) break;
  }
  return changes;
}

function buildRecommendations(result, catalog) {
  return asArray(result?.rankedBuilds).slice(0, 3).map((build, index) => {
    const lowSample = Boolean(build.lowSample || build.comparisonStable === false || lowSampleFor(build.stats, result?.query));
    return {
      evidenceId: `build:${index + 1}`,
      rank: index + 1,
      items: asArray(build.items).slice(0, 3).map((apiName) => itemRecord(apiName, catalog)),
      stats: statsRecord(build.stats),
      stable: !lowSample,
      lowSample
    };
  });
}

function buildItemRankings(result, catalog) {
  return asArray(result?.itemRankings).slice(0, 3).map((entry, index) => {
    const lowSample = Boolean(entry.lowSample || lowSampleFor(entry.stats, result?.query));
    return {
      evidenceId: `item:${index + 1}`,
      rank: index + 1,
      item: itemRecord(entry.apiName, catalog),
      stats: statsRecord(entry.stats),
      stable: !lowSample,
      lowSample,
      coverage: finite(entry.coverage),
      commonPairings: asArray(entry.commonPairings).slice(0, 2).map((pairing) => ({
        items: asArray(pairing.items).slice(0, 3).map((apiName) => itemRecord(apiName?.apiName ?? apiName, catalog)),
        games: finite(pairing.games)
      }))
    };
  });
}

function buildComparison(result, catalog) {
  const comparison = result?.comparison;
  if (!comparison) return null;
  const allowed = new Set(asArray(result?.query?.comparisonItems));
  const input = asArray(comparison.rankedEntries ?? comparison.entries)
    .filter((entry) => allowed.size === 0 || allowed.has(entry.apiName))
    .slice(0, 5);
  const options = input.map((entry, index) => ({
    evidenceId: `comparison:${index + 1}`,
    rank: index + 1,
    item: itemRecord(entry.apiName, catalog),
    stats: statsRecord(entry.stats),
    stable: Boolean(entry.stable),
    qualified: Boolean(entry.qualified),
    lowSample: Boolean(entry.lowSample || !entry.stable),
    representativeItems: asArray(entry.representativeBuild?.items).slice(0, 3).map((apiName) => itemRecord(apiName, catalog))
  }));
  return {
    winner: comparison.winner ?? null,
    winnerEvidenceId: options.find((entry) => entry.item.apiName === comparison.winner)?.evidenceId ?? null,
    primaryMetric: comparison.primaryMetric ?? result?.query?.primaryMetric ?? null,
    mode: comparison.mode ?? null,
    decision: comparison.decision ? {
      winner: comparison.decision.winner ?? comparison.winner ?? null,
      reason: comparison.decision.reason ?? null
    } : null,
    overlap: comparison.overlap ? {
      games: finite(comparison.overlap.games),
      rate: finite(comparison.overlap.rate)
    } : null,
    options
  };
}

function buildCompRankings(result) {
  const records = [];
  const seen = new Set();
  for (const [metric, comps] of Object.entries(result?.rankings ?? {})) {
    for (const comp of asArray(comps)) {
      if (records.length >= 3) break;
      const key = String(comp.compId ?? comp.name ?? `${metric}:${records.length}`);
      if (seen.has(key)) continue;
      seen.add(key);
      records.push({
        evidenceId: `comp:${records.length + 1}`,
        rank: records.length + 1,
        rankingMetric: metric,
        compId: clipped(comp.compId ?? key, 120),
        name: clipped(comp.name ?? comp.compId ?? key, 120),
        stats: statsRecord(comp.stats),
        stable: !comp.lowSample,
        lowSample: Boolean(comp.lowSample),
        units: asArray(comp.units).slice(0, 9).map((unit) => ({
          apiName: String(unit.apiName),
          name: clipped(unit.name ?? unit.apiName, 80),
          starLevel: finite(unit.starLevel),
          core: Boolean(unit.core),
          items: asArray(unit.items).slice(0, 3).map((item) => ({
            apiName: String(item.apiName ?? item),
            name: clipped(item.name ?? item.apiName ?? item, 80)
          }))
        })),
        traits: asArray(comp.traits).slice(0, 8).map((trait) => ({
          apiName: String(trait.apiName ?? trait.filterId),
          filterId: String(trait.filterId ?? trait.apiName),
          name: clipped(trait.name ?? trait.apiName ?? trait.filterId, 80),
          tier: finite(trait.tier)
        }))
      });
    }
    if (records.length >= 3) break;
  }
  if (records.length === 0) {
    for (const comp of asArray(result?.references).slice(0, 3)) {
      records.push({
        evidenceId: `comp:${records.length + 1}`,
        rank: records.length + 1,
        rankingMetric: "reference",
        compId: clipped(comp.compId ?? comp.name, 120),
        name: clipped(comp.name ?? comp.compId, 120),
        stats: statsRecord(comp.stats),
        stable: false,
        lowSample: true,
        units: [],
        traits: []
      });
    }
  }
  return records;
}

export function buildConclusionEvidence({ result, catalog, input = "", locale = "zh-CN", previousQuery = null } = {}) {
  const resultIntent = result?.type ?? result?.query?.intent;
  if (!SUPPORTED_INTENTS.has(resultIntent)) {
    throw new Error(`Unsupported conclusion evidence intent: ${resultIntent ?? "(missing)"}`);
  }
  const intent = resultIntent === "unit_build_completion" || resultIntent === "unit_best_3_items"
    ? "unit_build_rankings"
    : resultIntent;

  const comparison = intent === "unit_item_comparison" ? buildComparison(result, catalog) : null;
  const recommendations = intent === "unit_item_rankings"
    ? buildItemRankings(result, catalog)
    : intent === "comp_rankings"
      ? buildCompRankings(result)
      : comparison?.options ?? buildRecommendations(result, catalog);
  const dataStatus = sourceState(result);
  const warnings = buildWarnings(result);
  const hasLowSample = recommendations.some((entry) => entry.lowSample);
  const unresolvedComparison = intent === "unit_item_comparison" && !comparison?.winner;
  const evidence = {
    schemaVersion: CONCLUSION_EVIDENCE_SCHEMA_VERSION,
    locale: locale === "en-US" ? "en-US" : "zh-CN",
    request: {
      intent,
      requestedIntent: resultIntent,
      userGoal: result?.query?.sort ?? result?.query?.primaryMetric ?? null,
      inputSummary: clipped(input, 240),
      preferenceChanges: buildPreferenceChanges(previousQuery, result?.query, catalog)
    },
    query: buildQuery(result, catalog),
    recommendations,
    comparison,
    warnings,
    dataStatus,
    generationRules: {
      factsMustComeFromEvidence: true,
      forbidCausalClaims: true,
      mustMentionLowSample: hasLowSample,
      mustMentionStaleData: dataStatus.cache === "stale",
      mustAvoidWinnerClaim: unresolvedComparison
    }
  };
  serializeConclusionEvidence(evidence);
  return evidence;
}

export function serializeConclusionEvidence(evidence) {
  const serialized = JSON.stringify(evidence);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > MAX_CONCLUSION_EVIDENCE_BYTES) {
    throw new Error(`Conclusion evidence exceeds ${MAX_CONCLUSION_EVIDENCE_BYTES} bytes`);
  }
  return serialized;
}
