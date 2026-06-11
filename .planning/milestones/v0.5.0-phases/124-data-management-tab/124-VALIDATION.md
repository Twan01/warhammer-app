---
nyquist_compliant: true
audited: 2026-06-11
test_count: 17
gaps_filled: 5
---

# Phase 124: Data Management Tab - Validation

**Created:** 2026-06-10
**Audited:** 2026-06-11
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
| DAT-02 | Confirmation phrase is case-sensitive — lowercase "reset" keeps button disabled | unit | same file | Yes | line 280 |
| DAT-03 | Export calls `save()` dialog with JSON filter and `writeTextFile` | unit | same file | Yes | line 146 |
| DAT-03 | Export cancelled if save dialog returns null | unit | same file | Yes | line 166 |
| DAT-03 | Export shows error toast when writeTextFile throws | unit | same file | Yes | line 264 |
| DAT-04 | Import calls `open()` dialog, reads file, calls upsertAppSetting per key | unit | same file | Yes | line 180 |
| DAT-04 | Import shows error toast if JSON is malformed | unit | same file | Yes | line 197 |
| DAT-04 | Import shows error toast if version field missing | unit | same file | Yes | line 210 |
| DAT-04 | Import invalidates APP_SETTINGS_KEY cache on success | unit | same file | Yes | line 193 |
| DAT-04 | Import filters out keys not in ALLOWED_IMPORT_KEYS allowlist | unit | same file | Yes | line 226 |
| DAT-04 | Import rejects invalid values (bad locale, invalid currency, negative target) | unit | same file | Yes | line 248 |
| DAT-04 | Import does nothing when file picker is cancelled | unit | same file | Yes | line 271 |

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

**Status: COMPLETE** -- All 17 requirements covered by 17 passing tests.

- `tests/settings/DataManagementTab.test.tsx` -- 17/17 tests pass
- DAT-01: 2/2 behaviors verified (render + navigation)
- DAT-02: 5/5 behaviors verified (render, dialog, disable gate, full flow with localStorage.clear, error handling, case-sensitive phrase)
- DAT-03: 3/3 behaviors verified (export flow, cancel handling, error handling)
- DAT-04: 7/7 behaviors verified (import + upsert + cache invalidation, malformed JSON, missing version, allowlist filtering, value validation, cancel handling)

### Gaps Filled (2026-06-11 Nyquist audit)
| Gap | Test | Status |
|-----|------|--------|
| Import allowlist filtering not tested | "Import ignores keys not in the ALLOWED_IMPORT_KEYS allowlist" | FILLED |
| Import value validation not tested | "Import rejects invalid locale value and does not upsert it" | FILLED |
| Export error path not tested | "Export shows error toast when writeTextFile throws" | FILLED |
| Import cancel not tested | "Import does nothing when file picker is cancelled" | FILLED |
| Case-sensitive phrase not tested | "Reset App button stays disabled when lowercase 'reset' is typed" | FILLED |
