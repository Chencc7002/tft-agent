import { normalizeAlias } from "../core/normalizer.js";
import { resolveGameConcept } from "./concept-resolver.js";

export const CONCEPT_CAPABILITY_MAP_VERSION = "concept-capability-map.v1";

const FAST9_CONCEPT_ID = "concept.strategy.fast9_nine_five";

const CONCEPT_CAPABILITIES = Object.freeze({
  [FAST9_CONCEPT_ID]: Object.freeze({
    conceptId: FAST9_CONCEPT_ID,
    queryCapability: "current_comp_strategy_candidates",
    tool: "comps_rankings",
    strategy: "fast9",
    candidateSemantics: "current_patch_strategy_candidates",
    resultPolicy: Object.freeze({
      type: "filter_comp_strategy",
      strategy: "fast9",
      requireStructuredStats: true,
      neverResolveToSingleComp: true
    }),
    evidenceContract: Object.freeze({
      type: "composition_rankings",
      source: "metatft",
      patchScope: "current",
      requiredFields: Object.freeze([
        "compId",
        "strategy",
        "stats.games",
        "stats.top4Rate",
        "stats.winRate",
        "stats.avgPlacement"
      ])
    })
  })
});

function array(value) {
  return Array.isArray(value) ? value : [];
}

function resolvedConceptId(entity) {
  if (entity?.expectedType !== "game_concept") return null;
  if (entity.resolvedId) return String(entity.resolvedId);
  return resolveGameConcept(entity.rawText).resolvedId;
}

export function resolveConceptCapability(taskFrame = {}) {
  const concepts = [
    ...array(taskFrame.subjects),
    ...array(taskFrame.candidates),
    ...array(taskFrame.concepts)
  ].filter((entity) => entity?.expectedType === "game_concept");
  const matches = concepts
    .map((entity) => ({
      entity,
      conceptId: resolvedConceptId(entity)
    }))
    .filter((entry) => CONCEPT_CAPABILITIES[entry.conceptId]);
  if (matches.length !== 1) return null;
  const match = matches[0];
  return {
    schemaVersion: CONCEPT_CAPABILITY_MAP_VERSION,
    ...structuredClone(CONCEPT_CAPABILITIES[match.conceptId]),
    mention: String(match.entity.rawText),
    normalizedMention: normalizeAlias(match.entity.rawText)
  };
}

export function getConceptCapability(conceptId) {
  const value = CONCEPT_CAPABILITIES[String(conceptId)];
  return value ? structuredClone(value) : null;
}

