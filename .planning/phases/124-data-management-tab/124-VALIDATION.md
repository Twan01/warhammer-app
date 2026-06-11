# Phase 124: Data Management Tab - Validation

**Created:** 2026-06-10
**Audited:** 2026-06-10
**Source:** RESEARCH.md ## Validation Architecture

---

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16.3.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/settings/DataManagementTab.test.tsx` |
| Full suite command | `pnpm test` |

---

## Phase Requirements - Test Map

| Req ID | Behavior | Test Type | Automated Command | Covered? | Test File |
|--------|----------|-----------|-------------------|----------|-----------|
| DAT-01 | Data tab renders Data Health link section with button | unit | `pnpm test -- tests/settings/DataManagementTab.test.tsx` | Yes | line 74 |
| DAT-01 | Clicking "Open Data Health" calls `useNavigate` with `{ to: "/data-health" }` | unit | same file | Yes | line 81 |
| DAT-02 | Factory Reset button is present and styled destructive | unit | same file | Yes | line 89 |
| DAT-02 | Confirmation dialog opens on click; Reset button disabled until phrase typed | unit | same file | Yes | lines 94, 101 |
| DAT-02 | Correct phrase enables button; invoke("factory_reset") + localStorage.clear() + relaunch() called on confirm | unit | same file | Yes | line 114 |
| DAT-02 | Error toast shown and dialog not relaunched if invoke throws | unit | same file | Yes | line 131 |
| DAT-03 | Export calls `save()` dialog with JSON filter and `writeTextFile` | unit | same file | Yes | line 146 |
| DAT-03 | Export cancelled if save dialog returns null | unit | same file | Yes | line 166 |
| DAT-04 | Import calls `open()` dialog, reads file, calls upsertAppSetting per key | unit | same file | Yes | line 180 |
| DAT-04 | Import shows error toast if JSON is malformed | unit | same file | Yes | line 197 |
| DAT-04 | Import shows error toast if version field missing | unit | same file | Yes | line 210 |
| DAT-04 | Import invalidates APP_SETTINGS_KEY cache on success | unit | same file | Yes | line 193 |

---

## Mock Strategy

Mirrors `tests/data-health/backupCard.test.tsx` pattern:

```typescript
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mockSave, open: mockOpen }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeTextFile: mockWriteTextFile, readTextFile: mockReadTextFile }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mockRelaunch }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));
```

---

## Sampling Rate

- **Per task commit:** `pnpm test -- tests/settings/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## Audit Result

**Status: COMPLETE** — All 12 requirements covered by 12 passing tests.

- `tests/settings/DataManagementTab.test.tsx` — 12/12 tests pass
- DAT-01: 2/2 behaviors verified (render + navigation)
- DAT-02: 5/5 behaviors verified (render, dialog, disable gate, full flow with localStorage.clear, error handling)
- DAT-03: 2/2 behaviors verified (export flow, cancel handling)
- DAT-04: 3/3 behaviors verified (import + upsert + cache invalidation, malformed JSON, missing version)

No gaps remain. No additional tests needed.
