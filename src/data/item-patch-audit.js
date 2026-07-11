import { findItemAvailabilityOverride } from "./item-availability-overrides.js";
import { isVerifiedLocalizationName } from "./item-localization.js";

function itemApiName(value) {
  if (typeof value === "string") return value;
  return value?.apiName ?? value?.items ?? value?.itemName ?? value?.item ?? null;
}
function itemApiNames(values) {
  return new Set((values ?? []).map(itemApiName).filter(Boolean));
}

function localizationMap(values) {
  if (values instanceof Map) return values;
  return new Map((values ?? []).map((value) => [value.apiName, value]));
}

export function auditItemPatchChanges(options = {}) {
  const patch = options.patch ?? "current";
  const previousIds = itemApiNames(options.previousItems);
  const currentIds = itemApiNames(options.currentItems);
  const previousLocalization = localizationMap(options.previousLocalization);
  const currentLocalization = localizationMap(options.currentLocalization);

  const added = [...currentIds]
    .filter((apiName) => !previousIds.has(apiName))
    .sort();
  const removed = [...previousIds]
    .filter((apiName) => !currentIds.has(apiName))
    .sort()
    .map((apiName) => {
      const override = findItemAvailabilityOverride(apiName, patch);
      return {
        apiName,
        observation: "missing_from_current_metatft_snapshot",
        availabilityDecision: override ? "explicit_override" : "manual_review_required",
        availabilityChanged: false,
        availabilitySource: override?.source ?? null
      };
    });
  const missingLocalization = [...currentIds]
    .filter((apiName) => {
      const record = currentLocalization.get(apiName);
      return !record || !isVerifiedLocalizationName(record.zhName);
    })
    .sort()
    .map((apiName) => ({
      apiName,
      enName: currentLocalization.get(apiName)?.enName ?? null,
      status: "pending_zh_cn_review"
    }));
  const nameChanges = [...currentIds]
    .filter((apiName) => previousIds.has(apiName))
    .map((apiName) => ({
      apiName,
      before: previousLocalization.get(apiName)?.zhName ?? null,
      after: currentLocalization.get(apiName)?.zhName ?? null,
      beforePatch: previousLocalization.get(apiName)?.sourcePatch ?? null,
      afterPatch: currentLocalization.get(apiName)?.sourcePatch ?? null
    }))
    .filter((entry) => entry.before !== entry.after)
    .sort((a, b) => a.apiName.localeCompare(b.apiName));

  return {
    patch,
    counts: {
      previous: previousIds.size,
      current: currentIds.size,
      added: added.length,
      removed: removed.length,
      missingLocalization: missingLocalization.length,
      nameChanges: nameChanges.length
    },
    added,
    removed,
    missingLocalization,
    nameChanges,
    availabilityPolicy: "item-availability-overrides-only"
  };
}
