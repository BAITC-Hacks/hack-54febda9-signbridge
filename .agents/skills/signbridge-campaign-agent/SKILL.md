---
name: signbridge-campaign-agent
description: Help develop and evaluate the SignBridge hackathon tariff-campaign agent, including data analysis, pilot strategy, implementation, and coordination across three developers.
---

# SignBridge campaign agent

Use this skill for work in this repository on the Beeline tariff marketing case. Read `context/PARTICIPANT_GUIDE.md` first when task details or constraints matter; it is the source of truth. The case data is synthetic and must not be treated as real operator data.

## Goal and contract

Build an `agent.py` with `Agent.act(env) -> list[dict]`. The agent selects up to 10 tariff campaigns using customer segments, target tariffs, and channels. It must run at least one pilot through `env.run_pilot` and use the observed results when deciding what to launch. `make_submission.py` produces the required `submission.csv`.

Treat these as hard limits: 10 campaigns; 5,000 customers per campaign; 15,000 total contacts including pilots; 100,000 total budget including pilots; at most 20 pilots, each with 10–200 customers; 10-minute runtime. Customers are counted once by their best campaign. Use only the documented environment interface and supplied data; do not inspect simulator internals or hidden judging effects. Handle pilot or model errors with a safe fallback. LLM use is optional; if used, read credentials from `OPENAI_API_KEY` and keep the agent functional when the API fails.

Optimize expected incremental ARPU net of contact costs. Account for pilot cost and uncertainty, avoid spending on weak or tiny audiences, and avoid counting duplicated reach as incremental benefit. The judging effects differ from mock effects, so prefer evidence-based/adaptive logic over constants tuned to one local run. Select channels based on their cost and expected effectiveness, rather than assuming one channel is always best.

## Three-developer collaboration

When the user asks to work as a three-person team and delegation is available, split independent work into these lanes:

1. **Data and evidence:** inspect the supplied CSVs and dictionaries; summarize useful historical patterns, data limitations, and candidate segment/tariff pairs. Do not edit the production agent unless assigned.
2. **Pilot and decision strategy:** design candidate ranking, pilot allocation, uncertainty handling, and contact/budget allocation. Return a concise proposal or pseudocode; avoid editing the same integration files as the implementer.
3. **Implementation and integration:** own `agent.py`, translate agreed evidence and strategy into the environment contract, and coordinate final artifacts (`submission.csv`, README, requirements if needed).

Assign one owner per file before parallel edits. The integration owner resolves recommendations, checks that campaign filters and names match the available environment values, and reports unresolved disagreements instead of silently combining incompatible assumptions. For a small or time-sensitive task, keep the team together and do not create unnecessary delegation.

## Working approach

- Inspect the guide and relevant data/schema before choosing a strategy. Use `change_tariff.csv` as historical evidence, not as a guaranteed forecast for the judging audience.
- Build candidate transitions from available tariffs and audience segments. Keep the pilot plan within budget and contact limits, leaving enough resources for final campaigns.
- Use pilot results to update candidate rankings. Treat small pilots as noisy; compare estimates with uncertainty and audience size, and reserve larger pilots for promising finalists when worthwhile.
- Return valid campaign dictionaries with existing target tariff and channel codes. Make filters as specific as supported and ensure campaigns do not waste contacts on already-covered customers.
- When implementation or submission readiness is requested, run `python local_eval.py` and `python make_submission.py`; use `python local_eval.py --runs 10` when robustness across seeds is requested or materially relevant. Report actual results and limitations, and do not claim a score that was not observed.
- Keep changes focused on the requested task. Do not add dependencies unless they materially help and can run in the judging environment.
