# Phase 6.5 Semantic Correction Acceptance

- result: PASS
- baseline commit: `ea7617c`
- dataset: `semantic-gap-phase65.v1`
- cases/repetitions/runs: 120 / 3 / 360
- classification accuracy: 100.00%
- route accuracy: 100.00%
- arbitrary tool calls: 0
- Pass@3: 100.00%
- Pass^3: 100.00%

## Difference slices

- trusted correction: 60/60
- equivalent: 60/60
- low confidence: 120/120
- entity conflict: 60/60
- new capability: 60/60

## Safety and compatibility

- `legacy_equivalent`, `legacy_fallback`, the legacy parser, and `RetrievalPlan` remain available.
- `semantic_correction` requires TaskFrame, concept resolution, capability matching, bounded TaskPlan, validated ExecutionPlan, budget, and evidence contracts to pass.
- ExecutionPlan permits only registered first-party read-only tools with `sideEffect: none`.
- 九五 resolves to a current-patch fast-nine composition candidate query and structured ranking evidence; it never resolves to one hard-coded composition.
- Video tools and arbitrary tool execution remain disabled.

## Verification

- `npm run eval:phase4`: 120/120
- `npm run eval:phase5`: 190/190
- `npm run eval:phase6`: 600/600
- `npm run eval:phase65`: 360/360
- `node --test`: 620 total / 600 passed / 0 failed / 20 conditionally skipped

