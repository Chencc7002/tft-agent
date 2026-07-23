# Agent Upgrade Progress

## Current

- phase: 2
- status: completed
- branch: codex/wechat-mobile-chat
- baseline_commit: d9416b0
- latest_verified_commit: 2d16226

## Completed gates

- phase: 0
- tests: baseline `npm test` — 561 total / 541 passed / 0 failed / 20 skipped; final `npm test` — 564 total / 544 passed / 0 failed / 20 skipped; dataset tests — 3 passed / 0 failed
- metrics: 300 total and unique inputs; 0 privacy violations; 90% non-standard style; every required failure label and phenomenon covered
- report: `docs/reports/phase-0-baseline.md`, `docs/reports/phase-0-baseline.json`

- phase: 1
- tests: final Node 18 `npm test` — 580 total / 560 passed / 0 failed / 20 skipped; targeted — 70 total / 69 passed / 0 failed / 1 skipped; bundled Node 24 targeted — 22 passed / 0 failed / 0 skipped; small-window/comps/SQLite smokes passed
- metrics: `core-agent-cases.v1` — 50 passed / 0 failed / 0 skipped; task, intent, clarification, tool selection and tool input validity 100%; expected fallback 4%; expected timeout 2%
- report: `docs/reports/phase-1-agent-runtime.md`, `docs/reports/phase-1-agent-runtime.json`

- phase: 2
- tests: final `npm test` — 589 total / 569 passed / 0 failed / 20 skipped; targeted TaskFrame/parser/context/shadow — 10 passed / 0 failed / 0 skipped
- metrics: `natural-language-agent-phase0.v1` — action 96.00%; domain 97.67%; unsupported understanding 100%; input/output/latency budgets 100%
- report: `docs/reports/phase-2-semantic-parser.md`, `docs/reports/phase-2-semantic-parser.json`

## Current work

- objective: phase 2 complete; preserve its shadow-only behavior and begin phase 3 entity/concept linking
- files: `src/understanding/`, semantic shadow integration, phase-2 evaluation, tests, protocol and phase reports
- assumptions: existing deterministic business rules and IntentEnvelope remain authoritative; the untracked master-plan file remains user-owned and untouched

## Blockers

- blocker: none
- evidence: no master-plan blocking condition has been triggered
- user_input_needed: none

## Next

- next_step: phase 3 — separate canonical entity and game-concept linking from semantic action parsing while reusing current aliases, pinyin, fuzzy candidates, semantic retrieval and current-patch catalog
- required_checks: current-patch core entity Top-1 at least 97%, slang/alias Top-3 recall at least 98%, nonexistent false-hit rate below 2%, full regression and updated offline reports
