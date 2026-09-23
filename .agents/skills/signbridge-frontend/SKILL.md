---
name: signbridge-frontend
description: Build and maintain the SignBridge agent's component-based web demo with React, TypeScript, Rsbuild, Ant Design 6, Tailwind, and FSD. Use for frontend screens, API integration, and frontend tooling in this repository.
---

# SignBridge frontend

The frontend explains a local run of the tariff-campaign agent. Keep the submitted `context/agent.py` independent of the UI. The Python server exposes `GET /api/run?seed=N` and `GET /api/robustness?runs=N`; use these same-origin endpoints through a typed API client. Treat every displayed score as a **synthetic mock result**, never an official judging prediction.

## Architecture

- Use React, TypeScript, and Rsbuild. Organize `src/` by FSD layers: `app` for providers/bootstrap, `pages` for routes, `widgets` for composed dashboard sections, `features` for user actions, `entities` for run/robustness domain data, and `shared` for API client and reusable UI/utilities. Add only segments that have a real purpose.
- Components are presentational and pure. Keep fetching, normalization, and orchestration in entity API/model hooks or feature model code. Do not call `fetch` directly from page/widget UI.
- For each entity, put endpoint functions and raw response types in `api/`, domain types/mappers and one React Query hook per operation in `model/`, and entity-scoped presentation in `ui/` if needed. Each used segment has an `index.ts` barrel; the entity root `index.ts` re-exports segment barrels. Import entities through `@/entities/<name>`.
- Order imports: external packages, then internal `@/` modules by FSD layer, then relative modules. Separate groups with blank lines.

## UI and interaction

- Build for a compact native web view as well as a desktop browser: responsive layout, keyboard access, readable loading/error states, and no dependence on opening extra windows.
- Use Ant Design 6 components for the main layout, form controls, tables, statistics, status, and feedback. Import icons from their full module paths. Use Ant Design `Divider` for separators.
- Use Tailwind utility classes for layout and styling. Avoid JSX inline styles except for genuinely runtime-computed values. Keep the existing user-facing explanations of ARPU, pilots, seed, uncertainty, and the mock-score limitation.
- Preserve API meanings and financial units. A pilot's observed percent is a noisy relative revenue change, not a success probability. The total is gross incremental ARPU minus all contact costs; duplicate customers count once for benefit.

## Tooling and delivery

- Provide `npm run dev`, `npm run build`, and `npm run preview`; also provide lint and format scripts. Use ESLint import ordering and Prettier. If adding Husky/lint-staged, keep hooks cross-platform and avoid editor-specific setup.
- Make the Python demo server serve the production Rsbuild output and the same API routes; document local and Docker launch paths in the root README.
- After frontend edits, run build and lint/format checks as appropriate. Recheck that the browser view still explains actual agent behavior; never hard-code a result as though it came from the judging environment.

The project skill [`signbridge-campaign-agent`](../signbridge-campaign-agent/SKILL.md) governs Git sync, task chronology, and commit approval for changes in this repository.
