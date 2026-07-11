import { createRequire } from "node:module";
import { CURRENT_ITEM_LOCALIZATION_SOURCE } from "./item-localization-sources.js";

const require = createRequire(import.meta.url);
const currentSnapshot = require("./generated/item-localization.zh-CN.json");

function compact(values) {
  return [...new Set(values.filter(Boolean))];
}

function containsHan(value) {
  return /[\u3400-\u9fff]/u.test(String(value ?? ""));
}

function humanizeItemApiName(apiName) {
  return String(apiName ?? "")
    .replace(/^TFT\d*_Item_/, "")
    .replace(/^TFT_Item_/, "")
    .replace(/^TFT\d*_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
}

export function isVerifiedLocalizationName(value) {
  const name = String(value ?? "").trim();
  if (!name) return false;
  if (/^[?？\s\uFFFD]+$/u.test(name)) return false;
  return !name.includes("\uFFFD");
}

function normalizeTencentRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (response?.data && typeof response.data === "object") return Object.values(response.data);
  return [];
}

function normalizeRiotEnglishRows(response) {
  if (response?.data && typeof response.data === "object") return Object.values(response.data);
  return [];
}

export function buildOfficialItemLocalizationCatalog(cnResponse, enResponse, options = {}) {
  const source = options.source ?? CURRENT_ITEM_LOCALIZATION_SOURCE;
  const scopeApiNames = options.scopeApiNames
    ? new Set(options.scopeApiNames)
    : null;
  const cnByApiName = new Map();
  const enByApiName = new Map();

  for (const row of normalizeTencentRows(cnResponse)) {
    const apiName = String(row?.englishName ?? "").trim();
    if (!apiName) continue;
    cnByApiName.set(apiName, row);
  }
  for (const row of normalizeRiotEnglishRows(enResponse)) {
    const apiName = String(row?.id ?? "").trim();
    if (!apiName) continue;
    enByApiName.set(apiName, row);
  }

  const apiNames = scopeApiNames
    ? [...scopeApiNames]
    : [...new Set([...cnByApiName.keys(), ...enByApiName.keys()])];

  return apiNames.sort().map((apiName) => {
    const cnRow = cnByApiName.get(apiName);
    const enRow = enByApiName.get(apiName);
    const zhName = isVerifiedLocalizationName(cnRow?.name) ? String(cnRow.name).trim() : null;
    const verifiedEnName = isVerifiedLocalizationName(enRow?.name)
      ? String(enRow.name).trim()
      : null;
    const enName = verifiedEnName ?? humanizeItemApiName(apiName);
    const localized = Boolean(zhName);
    const officialEnglishFallback = !localized && Boolean(verifiedEnName);

    return {
      apiName,
      zhName,
      enName,
      source: localized
        ? source.cnSource
        : officialEnglishFallback
          ? source.enSource
          : "derived_api_token",
      sourceUrl: localized
        ? source.cnUrl
        : officialEnglishFallback
          ? source.enUrl
          : null,
      sourcePatch: localized
        ? String(cnResponse?.version ?? source.sourcePatch ?? "")
        : officialEnglishFallback
          ? String(enResponse?.version ?? source.enVersion ?? "")
          : null,
      tftPatch: String(options.tftPatch ?? source.tftPatch ?? ""),
      season: localized
        ? String(cnResponse?.season ?? source.sourceSeason ?? "")
        : null,
      sourceUpdatedAt: localized
        ? String(cnResponse?.time ?? source.sourceUpdatedAt ?? "")
        : null,
      confidence: localized || officialEnglishFallback ? 1 : 0.25,
      traceabilityStatus: localized
        ? "official_zh_cn"
        : officialEnglishFallback
          ? "official_en_fallback_pending_zh_cn"
          : "derived_api_token_pending_review",
      needsReview: !localized
    };
  });
}

export function createItemLocalizationMap(records = []) {
  return new Map((records ?? []).map((record) => [record.apiName, record]));
}

export const CURRENT_ITEM_LOCALIZATION = Object.freeze(currentSnapshot);
export const currentItemLocalizationByApiName = createItemLocalizationMap(currentSnapshot.items);

export function applyOfficialItemLocalization(item, options = {}) {
  if (!item?.apiName) return item;
  const localizationByApiName = options.localizationByApiName
    ?? currentItemLocalizationByApiName;
  const localization = localizationByApiName.get(item.apiName);
  if (!localization) return item;

  const localized = localization.traceabilityStatus === "official_zh_cn"
    && isVerifiedLocalizationName(localization.zhName);
  const displayName = localized
    ? localization.zhName
    : localization.enName ?? humanizeItemApiName(item.apiName);
  const existingShortName = item.shortName ?? null;
  const compactName = localized && (!existingShortName || !containsHan(existingShortName))
    ? localization.zhName
    : localized
      ? existingShortName
      : localization.enName ?? humanizeItemApiName(item.apiName);
  const priorCanonicalName = item.zhName ?? null;

  return {
    ...item,
    zhName: localized ? localization.zhName : null,
    displayName,
    shortName: compactName,
    aliases: compact([
      localization.zhName,
      localization.enName,
      priorCanonicalName,
      existingShortName,
      ...(item.aliases ?? [])
    ]),
    nameSource: localization.source,
    nameSourceUrl: localization.sourceUrl,
    namePatch: localization.sourcePatch,
    nameTftPatch: localization.tftPatch,
    nameConfidence: localization.confidence,
    nameStatus: localization.traceabilityStatus,
    nameNeedsReview: localization.needsReview,
    manualNameCandidate: item.manualNameCandidate
      ?? (priorCanonicalName && priorCanonicalName !== localization.zhName
        ? priorCanonicalName
        : null)
  };
}

export function mergeOfficialItemLocalization(items, options = {}) {
  return (items ?? []).map((item) => applyOfficialItemLocalization(item, options));
}
