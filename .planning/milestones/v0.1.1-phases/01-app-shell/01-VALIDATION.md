---
phase: 1
slug: app-shell
status: compliant
nyquist_compliant: true
created: 2026-05-02
audited: 2026-05-02
---

# Phase 1 — Validation Strategy

> Retroactive Nyquist audit (State B — SUMMARY.md present, no prior VALIDATION.md).
> Phase shipped 2026-04-30. Gap closure tests added 2026-05-02.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~13 seconds (baseline after gap closure: 187 tests) |

---

## Sampling Rate

Phase 1 is complete and shipped. Retroactive validation — sampling is one-time.

- **Gap closure tests added:** `tests/app-shell/AppSidebar.test.tsx`, `tests/app-shell/QueryProvider.test.tsx`
- **Full suite must remain green after gap closure**

---

## Per-Requirement Coverage Map

| Req | Description | Classification | Test / Evidence |
|-----|-------------|---------------|-----------------|
| SETUP-01 | Tauri 2 + React 19 + TS + Vite + Tailwind v4 scaffold | MANUAL-ONLY | Runtime: `pnpm tauri dev` opens window — verified in 01-03 checkpoint Step 3 |
| SETUP-02 | Sidebar with 6 nav entries, active state, collapse toggle | **COVERED** | `tests/app-shell/AppSidebar.test.tsx` (4 tests green) |
| SETUP-03 | TanStack Router wires all 6 routes | MANUAL-ONLY | Navigation requires live Tauri/browser render — verified in 01-03 checkpoint Step 4 |
| SETUP-04 | Dark-mode FOUC fix (inline script before stylesheet) | MANUAL-ONLY | Visual/timing behavior; `index.html` script position verified by grep in 01-01 plan — human confirmed no flash in 01-03 checkpoint Step 3 |
| SETUP-05 | TanStack Query desktop defaults (staleTime/gcTime/refetchOnWindowFocus) | **COVERED** | `tests/app-shell/QueryProvider.test.tsx` (5 tests green) |
| SETUP-06 | SQL capability grants (sql:allow-load/select/execute/close) | MANUAL-ONLY | Tauri IPC capability system — not testable in jsdom; JSON contents verified by grep in 01-02 plan |
| SETUP-07 | `create_dir_all` before tauri-plugin-sql init (SETUP-07) | MANUAL-ONLY | Rust code — not testable in jsdom; source order verified by grep in 01-02 plan |
| SETUP-08 | Folder structure (`src/app`, `src/features`, etc.) | MANUAL-ONLY | File system presence — not unit testable; directory existence verified by CI shell checks in 01-01 plan |
| SETUP-09 | SQLite file appears at `%APPDATA%\com.hobbyforge.app\hobbyforge.db` on first launch | MANUAL-ONLY | Production runtime + filesystem inspection — human confirmed in 01-03 checkpoint Step 6 |
| SETUP-10 | `plugins.sql.preload: ["sqlite:hobbyforge.db"]` in tauri.conf.json | MANUAL-ONLY | Tauri config check — JSON contents verified by node JSON.parse script in 01-02 plan |
| POLISH-06 | All 18 shadcn/ui components batch-installed | MANUAL-ONLY | File presence (`src/components/ui/*.tsx`) — verified by shell `test -f` checks in 01-01 plan |

*Status: ✅ covered · MANUAL-ONLY (justified) — verified in human checkpoint*

---

## Gap Closure (Retroactive)

Two requirements had no automated test prior to this audit:

| Gap | New Test File | Tests Added |
|-----|---------------|-------------|
| SETUP-02 | `tests/app-shell/AppSidebar.test.tsx` | 4 — nav labels, HobbyForge heading, collapse toggle aria-label, `data-collapsed=false` default |
| SETUP-05 | `tests/app-shell/QueryProvider.test.tsx` | 5 — children render, staleTime 300000, gcTime 600000, refetchOnWindowFocus false, retry 1 |

Both files pass green with `npx vitest run tests/app-shell/` (9/9, ~2.7s).

---

## Manual-Only Justifications

All MANUAL-ONLY classifications are permanent — these are runtime or infrastructure behaviors that cannot be reproduced in jsdom:

- **SETUP-01, SETUP-03, SETUP-09**: Require Tauri process + OS window — no jsdom equivalent
- **SETUP-04**: FOUC is a rendering race condition — only observable in a real browser with CSS loading
- **SETUP-06, SETUP-07**: Tauri capability IPC and Rust code — outside the JS test boundary
- **SETUP-08, SETUP-10, POLISH-06**: File/directory/config presence — verified by CI artifact checks, not unit tests

---

## Validation Sign-Off

- [x] All testable requirements have automated coverage
- [x] Manual-only classifications are justified (runtime / OS / Rust / file-system behaviors)
- [x] Gap closure tests pass: 9/9 green
- [x] Full suite green after gap closure: 187 passed, 18 skipped (Phase 10 stubs)
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant 2026-05-02
