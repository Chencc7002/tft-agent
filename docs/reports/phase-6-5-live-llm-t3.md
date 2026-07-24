# Phase 6.5 Real LLM T3 Acceptance

- result: PASS
- executed at: `2026-07-24T06:52:16.612Z`
- provider/model: `chat` / `deepseek-v4-flash`
- dataset: `live-llm-t3-independent.v2`
- cases/repetitions/requests: 120 / 3 / 360
- exact Few-shot overlap: 0
- request success: 100.00%
- controlled provider fallback: 0.56% (2/360; gate ≤1%)
- Pass@3: 99.17% (gate ≥95%)
- Pass^3: 95.83% (gate ≥90%)
- entity mention recall / Top-1: 100.00% / 100.00%
- tool selection: 98.06%
- clarification: 99.17%
- domain / action / status: 100.00% / 100.00% / 98.61%

## Coverage

The independent release set contains 20 cases each for slang, typo, multi-turn context, comparison, unknown entities, and unsupported/out-of-domain requests. No release input is an exact match for a retrieved Few-shot example.

## Token and latency

- cached / uncached / output / total tokens: 434,552 / 37,648 / 65,669 / 537,869
- tokens per request P50 / P95: 1,481 / 1,576
- latency average / P50 / P95: 1,645.18 / 1,616.60 / 2,034.26 ms
- wall time: 148,802.88 ms
- token budget pass: 100%
- latency budget pass: 100%

One invalid-structure retry is permitted. Each attempt remains capped at 1,200 output tokens; the request-level output budget reserves 2,400 tokens for at most two attempts. Invalid responses that remain invalid use the retained deterministic fallback and are separately capped at 1%.

## Category slices

- slang: pass 96.67%, entity 100.00%, tool 96.67%, clarification 100.00%
- typo: pass 98.33%, entity 100.00%, tool 98.33%, clarification 100.00%
- context: pass 93.33%, entity 100.00%, tool 93.33%, clarification 95.00%
- comparison: pass 100.00%, entity 100.00%, tool 100.00%, clarification 100.00%
- unknown entity: pass 100.00%, entity 100.00%, tool 100.00%, clarification 100.00%
- unsupported: pass 100.00%, entity 100.00%, tool 100.00%, clarification 100.00%

T3 now permits a future real canary, but this work did not start or deploy one.

