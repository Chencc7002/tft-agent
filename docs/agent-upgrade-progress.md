# Agent Upgrade Progress

## Current

- phase: 1
- status: in_progress
- branch: codex/wechat-mobile-chat
- baseline_commit: d9416b0
- latest_verified_commit: d9416b0

## Completed gates

- phase: 0
- tests: baseline `npm test` — 561 total / 541 passed / 0 failed / 20 skipped; final `npm test` — 564 total / 544 passed / 0 failed / 20 skipped; dataset tests — 3 passed / 0 failed
- metrics: 300 total and unique inputs; 0 privacy violations; 90% non-standard style; every required failure label and phenomenon covered
- report: `docs/reports/phase-0-baseline.md`, `docs/reports/phase-0-baseline.json`

## Current work

- objective: implement Agent Runtime v1, shared Tool Registry/Executor, production wrapping, and the minimum offline evaluation layer
- files: planned `src/agent/`, integration points in retrieval/recommendation/server, `eval/`, tests and reports
- assumptions: existing modified conclusion-layer files belong to the user and remain untouched; local query events may be read only for privacy-clean aggregate/sample extraction

## Blockers

- blocker: none
- evidence: no master-plan blocking condition has been triggered
- user_input_needed: none

## Next

- next_step: write Runtime state, budget and event contract tests before production integration
- required_checks: Runtime/tool unit tests, HTTP integration tests, `npm run eval:agent`, smoke tests, Node 24 SQLite verification, full `npm test`
