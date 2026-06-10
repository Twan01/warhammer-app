# Phase 124: Data Management Tab - Validation

**Created:** 2026-06-10
**Source:** RESEARCH.md ## Validation Architecture

---

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + React Testing Library 16.3.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/settings/` |
| Full suite command | `pnpm test` |

---

## Phase Requirements - Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Plan |
|--------|----------|-----------|-------------------|-------------|------|
| DAT-01 | Data tab renders Data Health link section with button | unit | `pnpm test -- tests/settings/DataManagementTab.test.tsx` | No (Wave 0) | 124-02 |
| DAT-01 | Clicking "Open Data Health" calls `useNavigate` with `{ to: "/data-health" }` | unit | same file | No (Wave 0) | 124-02 |
| DAT-02 | Factory Reset button is present and styled destructive | unit | same file | No (Wave 0) | 124-02 |
| DAT-02 | Confirmation dialog opens on click; Reset button disabled until phrase typed | unit | same file | No (Wave 0) | 124-02 |
| DAT-02 | Correct phrase enables button; invoke("factory_reset") + relaunch() called on confirm | unit | same file | No (Wave 0) | 124-02 |
| DAT-02 | Error toast shown and dialog not relaunched if invoke throws | unit | same file | No (Wave 0) | 124-02 |
| DAT-03 | Export calls `save()` dialog with JSON filter and `writeTextFile` | unit | same file | No (Wave 0) | 124-02 |
| DAT-03 | Export cancelled if save dialog returns null | unit | same file | No (Wave 0) | 124-02 |
| DAT-04 | Import calls `open()` dialog, reads file, calls upsertAppSetting per key | unit | same file | No (Wave 0) | 124-02 |
| DAT-04 | Import shows error toast if JSON is malformed | unit | same file | No (Wave 0) | 124-02 |
| DAT-04 | Import shows error toast if version field missing | unit | same file | No (Wave 0) | 124-02 |
| DAT-04 | Import invalidates APP_SETTINGS_KEY cache on success | unit | same file | No (Wave 0) | 124-02 |

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

## Wave 0 Gaps

- [ ] `tests/settings/DataManagementTab.test.tsx` — covers all DAT-01 through DAT-04 behaviors (created in Plan 124-02 Task 2)

*(Existing `tests/settings/SettingsPage.test.tsx` covers the tab shell; new test file covers the new tab content component.)*
