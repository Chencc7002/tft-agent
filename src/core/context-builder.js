import { DEFAULT_QUERY_OPTIONS, createCatalog } from "../data/static-data.js";

function sourceLabel(isUserProvided, preferenceProvided = false) {
  if (isUserProvided) return "current_input";
  return preferenceProvided ? "preference" : "system_default";
}

function fieldSource(parsedQuery, key, isUserProvided, preferenceProvided = false) {
  if (parsedQuery.sessionContext?.inheritedKeys?.includes(key)) return "conversation";
  return sourceLabel(isUserProvided, preferenceProvided);
}

function confidenceForSource(source) {
  return {
    current_input: 1,
    conversation: 0.96,
    preference: 0.9,
    default_context: 0.78,
    system_default: 1
  }[source] ?? 0.8;
}

function sourcedConstraint(key, value, source) {
  return { key, value, source, confidence: confidenceForSource(source) };
}

function hasSpecialItemScope(parsedQuery, catalog) {
  if ((parsedQuery.itemCategories ?? []).some((category) => category !== "ordinary_completed")) return true;
  const itemApiNames = [
    ...(parsedQuery.ownedItems ?? []),
    ...(parsedQuery.parser?.comparison?.itemApiNames ?? [])
  ];
  return itemApiNames.some((apiName) => {
    const category = catalog.itemByApiName.get(apiName)?.category;
    return category && category !== "ordinary_completed";
  });
}

export function buildQueryContext(parsedQuery, options = {}) {
  const catalog = options.catalog ?? createCatalog();
  const preferences = {
    ...DEFAULT_QUERY_OPTIONS,
    ...(options.preferences ?? {})
  };
  const comp = options.comp ?? parsedQuery.comp ?? null;
  const warnings = (parsedQuery.parser?.highConfidenceEntityResolutions ?? []).map((resolution) => (
    `已按高置信模糊匹配识别“${resolution.inputFragment}”为“${resolution.label ?? resolution.matchedAlias ?? resolution.apiName}”`
  ));

  const traitFilters = parsedQuery.traitFilters ?? [];
  if (comp?.status === "not_available") {
    warnings.push("当前条件下未找到达到稳定门槛的 Comp；以下结果未限制 Comp。");
  }

  const starLevel = parsedQuery.starLevel?.length ? parsedQuery.starLevel : [2];
  const itemCount = parsedQuery.itemCount ?? 3;
  const itemPolicy = parsedQuery.itemPolicy ?? preferences.itemPolicy;
  const itemCategories = parsedQuery.itemCategories ?? [];
  const rankFilter = parsedQuery.rankFilter ?? preferences.rankFilter;
  const days = parsedQuery.days ?? preferences.days;
  const patch = parsedQuery.patch ?? preferences.patch;
  const queue = parsedQuery.queue ?? preferences.queue;
  const specialItemScope = hasSpecialItemScope(parsedQuery, catalog);
  const minSamples = parsedQuery.minSamples ?? (specialItemScope ? 0 : preferences.minSamples);
  const sort = parsedQuery.sort ?? preferences.sort;

  const preferenceKeys = new Set(Object.keys(options.preferences ?? {}));
  const traitSource = parsedQuery.sessionContext?.inheritedKeys?.includes("traitFilters")
    ? "conversation"
      : parsedQuery.traitFilters?.length
        ? "current_input"
        : "system_default";
  const assumptions = [
    sourcedConstraint("unit", parsedQuery.unit, fieldSource(parsedQuery, "unit", Boolean(parsedQuery.unitAlias))),
    sourcedConstraint("star_level", starLevel, fieldSource(parsedQuery, "starLevel", Boolean(parsedQuery.starLevel?.length))),
    sourcedConstraint("item_count", itemCount, fieldSource(parsedQuery, "itemCount", parsedQuery.itemCount !== undefined)),
    sourcedConstraint("item_policy", itemPolicy, fieldSource(parsedQuery, "itemPolicy", Boolean(parsedQuery.itemPolicy), preferenceKeys.has("itemPolicy"))),
    sourcedConstraint("item_categories", itemCategories, fieldSource(parsedQuery, "itemCategories", Boolean(parsedQuery.itemCategories?.length))),
    sourcedConstraint("trait_filters", traitFilters, traitSource),
    sourcedConstraint("owned_items", parsedQuery.ownedItems ?? [], fieldSource(parsedQuery, "ownedItems", Boolean(parsedQuery.ownedItems?.length))),
    sourcedConstraint("excluded_items", parsedQuery.excludedItems ?? [], fieldSource(parsedQuery, "excludedItems", Boolean(parsedQuery.excludedItems?.length))),
    sourcedConstraint("patch", patch, fieldSource(parsedQuery, "patch", Boolean(parsedQuery.patch))),
    sourcedConstraint("days", days, fieldSource(parsedQuery, "days", parsedQuery.days !== undefined, preferenceKeys.has("days"))),
    sourcedConstraint("rank_filter", rankFilter, fieldSource(parsedQuery, "rankFilter", Boolean(parsedQuery.rankFilter?.length), preferenceKeys.has("rankFilter"))),
    sourcedConstraint(
      "min_samples",
      minSamples,
      parsedQuery.minSamples !== undefined
        ? fieldSource(parsedQuery, "minSamples", true, preferenceKeys.has("minSamples"))
        : specialItemScope
          ? "system_default"
          : fieldSource(parsedQuery, "minSamples", false, preferenceKeys.has("minSamples"))
    ),
    sourcedConstraint("sort", sort, fieldSource(parsedQuery, "sort", Boolean(parsedQuery.sort), preferenceKeys.has("sort")))
  ];
  const constraints = Object.fromEntries(assumptions.map(({ key, value, source, confidence }) => [
    key,
    { value, source, confidence }
  ]));
  if (comp) constraints.comp = { ...comp };

  return {
    rawInput: parsedQuery.rawInput,
    intent: parsedQuery.intent,
    unit: parsedQuery.unit,
    unitAlias: parsedQuery.unitAlias,
    starLevel,
    itemCount,
    traitFilters,
    comp,
    itemPolicy,
    itemCategories,
    ownedItems: parsedQuery.ownedItems ?? [],
    excludedItems: parsedQuery.excludedItems ?? [],
    comparison: parsedQuery.parser?.comparison ?? {
      requested: false,
      itemApiNames: [],
      ownedItemApiNames: []
    },
    rankFilter,
    days,
    patch,
    queue,
    minSamples,
    sort,
    assumptions,
    constraints,
    constraintSources: {
      ...Object.fromEntries(assumptions.map(({ key, source, confidence }) => [
        key,
        { source, confidence }
      ])),
      ...(comp ? { comp: { source: comp.source, confidence: comp.confidence, status: comp.status } } : {})
    },
    warnings,
    defaultContext: null,
    catalogVersion: catalog.version ?? "seed"
  };
}
