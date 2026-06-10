# Phase 125: About Tab - Research

**Researched:** 2026-06-10
**Domain:** React component composition — read-only informational display using existing hooks and Tauri API
**Confidence:** HIGH

## Summary

Phase 125 replaces the About tab placeholder in `SettingsPage` with a purpose-built `AboutTab` component. All data access patterns already exist and are proven in production: `getVersion()` from `@tauri-apps/api/app` is used in three components, and `useUdbMeta()` supplies the unit count, faction count, and `built_at` fields directly. No new hooks, queries, routes, or database changes are required.

The component is a pure read-only display. The only async work is fetching the app version (a one-time `useEffect`) and waiting for the `useUdbMeta()` React Query result (staleTime: Infinity — already cached after first render). Both loading states must be covered with `Skeleton` elements using the established project pattern.

The `formatBuiltAt()` helper in `VersionInfoCard.tsx` is a private function (not exported). The AboutTab must inline an equivalent or extract it to a shared utility. Given the function is five lines and already well-understood, inlining it in `AboutTab.tsx` is simpler and keeps the component self-contained.

**Primary recommendation:** Build `src/features/settings/AboutTab.tsx` as a single self-contained component, inline it into the existing `TabsContent value="about"` block in `src/app/settings/page.tsx`, and add a `tests/settings/AboutTab.test.tsx` covering all three requirement behaviors.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Three stacked sections in vertical flow: (1) App Identity at top — app name + version, (2) Data Stats in middle — counts and data freshness, (3) Credits/Attribution at bottom.
- **D-02:** No card wrappers — use simple heading + content pairs.
- **D-03:** Display exactly what ABT-02 requires: total unit count, faction count, and Wahapedia data date (built_at from udb_meta). No schema version or diagnostic flags.
- **D-04:** Handle "no data imported" state gracefully — show "Not imported yet" message when udb_meta has no row.
- **D-05:** Wahapedia attribution as the primary credit — clear statement that unit/rules data comes from Wahapedia. Desktop app, no clickable links needed.
- **D-06:** Tech stack listing: Tauri 2, React, TypeScript, SQLite. Compact list, not detailed breakdown.
- **D-07:** Include "HobbyForge" app name and a brief one-line description at the top of the About section.
- **D-08:** Purpose-built `AboutTab` component (not reuse of VersionInfoCard). Reuse same data hooks: `getVersion()` and `useUdbMeta()`.
- **D-09:** Single file: `src/features/settings/AboutTab.tsx`. Inline in the Settings page TabsContent for the "about" tab.

### Claude's Discretion

- Exact wording of attribution text and tech stack list
- Typography choices (text sizes, muted vs regular colors)
- Whether to show game system label alongside data stats
- Loading skeleton layout for async data (version + udb_meta)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ABT-01 | About tab displays app version (from package.json/tauri.conf.json) | `getVersion()` from `@tauri-apps/api/app` returns the version string from `tauri.conf.json` (currently "0.4.14"). Pattern established in VersionInfoCard and DataHealthSummaryCard. |
| ABT-02 | About tab displays data stats (unit count, faction count, Wahapedia data date) | `useUdbMeta()` returns `{ unit_count, faction_count, built_at }` directly. Null-safe display needed when udb_meta has no row (D-04). |
| ABT-03 | About tab displays credits with Wahapedia attribution and tech stack info | Static JSX — no data dependency. Render attribution text + compact tech stack list per D-05/D-06. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| App version display | Frontend (UI component) | Tauri API bridge | `getVersion()` calls the Tauri app plugin; result is local state in the component |
| Data stats (unit/faction count, built_at) | Frontend (React Query) | SQLite (hobbyforge.db) | `useUdbMeta()` reads `udb_meta` table; already cached at Infinity staleTime |
| Credits/attribution text | Frontend (UI component) | — | Static JSX, no data dependency |
| Tab integration | Frontend (Settings page) | — | Replace placeholder TabsContent in `src/app/settings/page.tsx` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/api` | ^2.0.0 [VERIFIED: package.json] | `getVersion()` — reads app version from tauri.conf.json | Project standard; already used in 3 components |
| `useUdbMeta` | (internal hook) | Fetches unit_count, faction_count, built_at from udb_meta | Project standard; staleTime Infinity, always cached |
| shadcn/ui `Skeleton` | (project-bundled) | Loading placeholder for async data | Project standard; used in VersionInfoCard and elsewhere |
| Lucide React | (project-bundled) | Icons (optional — only if a section header icon adds clarity) | Project icon library |

### No New Dependencies

This phase installs zero external packages. All required capabilities are already present in the project.

## Package Legitimacy Audit

No packages are installed in this phase. Section not applicable.

## Architecture Patterns

### System Architecture Diagram

```
SettingsPage (src/app/settings/page.tsx)
  └─ TabsContent value="about"
       └─ <AboutTab />  (new — src/features/settings/AboutTab.tsx)
            ├─ [local state] appVersion  ←  getVersion() via useEffect
            └─ [React Query] udbMeta     ←  useUdbMeta() (staleTime: Infinity)
                 ↓
            Render three sections:
            1. App Identity  (appVersion → Skeleton while null)
            2. Data Stats    (udbMeta → Skeleton while loading, "Not imported" when null)
            3. Credits       (static JSX — no async dependency)
```

### Recommended File Layout

```
src/features/settings/
  AboutTab.tsx          ← new: the complete About tab component

tests/settings/
  SettingsPage.test.tsx ← existing: add About tab smoke test
  AboutTab.test.tsx     ← new: unit tests for ABT-01, ABT-02, ABT-03
```

No new subdirectories needed.

### Pattern 1: App Version via getVersion()

Established pattern — `useEffect` + `useState`, identical across VersionInfoCard and DataHealthSummaryCard.

```tsx
// Source: src/features/data-health/VersionInfoCard.tsx (lines 55-57)
const [appVersion, setAppVersion] = useState<string | null>(null);

useEffect(() => {
  getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
}, []);
```

While `appVersion` is `null`, render `<Skeleton className="w-16 h-4" />`.

### Pattern 2: udb_meta "no row" guard

`useUdbMeta()` returns `data: null` (not undefined) when `udb_meta` has no rows. The query returns `rows[0] ?? null`. The component must check `data === null` (after `isLoading` is false) to show the "Not imported yet" message.

```tsx
// Source: src/features/data-health/VersionInfoCard.tsx (lines 93-100)
{udbMetaLoading ? (
  <Skeleton className="w-16 h-4" />
) : udbMeta ? (
  `${udbMeta.unit_count ?? 0} units across ${udbMeta.faction_count ?? 0} factions`
) : (
  "Not imported"
)}
```

### Pattern 3: Date formatting (inline — formatBuiltAt is not exported)

`formatBuiltAt` in `VersionInfoCard.tsx` is a file-private function. The AboutTab must inline an equivalent:

```tsx
// Source: src/features/data-health/VersionInfoCard.tsx (lines 32-43)
function formatBuiltAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
```

No need to extract to `src/lib/` — this stays local unless a future phase needs it in three or more places.

### Anti-Patterns to Avoid

- **Reusing VersionInfoCard:** D-08 explicitly prohibits this. VersionInfoCard is card-wrapped, includes DB schema version and game system label — none of that belongs in the About tab.
- **Adding a QueryClientProvider to test:** SettingsPage tests (the existing pattern) mock hooks at module level. AboutTab tests must follow the same pattern: `vi.mock("@/hooks/useUdbMeta", ...)` and `vi.mock("@tauri-apps/api/app", ...)`.
- **Clickable links:** D-05 — desktop app, no clickable links in attribution.
- **Diagnostic flags or schema version:** D-03 — those belong on the Data Health page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading app version | Custom Rust command or package.json fetch | `getVersion()` from `@tauri-apps/api/app` | Tauri 2 API is the canonical source; already used in 3 components |
| Data stats queries | New SQL query or new hook | `useUdbMeta()` | Hook already exists and returns exactly the needed fields |
| Date formatting | Custom date library install | Inline `toLocaleDateString()` | One-liner using browser-native API; same as VersionInfoCard |

## Common Pitfalls

### Pitfall 1: Forgetting the null data state

**What goes wrong:** Component renders `udbMeta.unit_count` without checking `udbMeta !== null`, causing a runtime TypeError when no data has been imported.

**Why it happens:** `useUdbMeta` returns `data: null` (not undefined) when the table is empty. Standard destructuring guard `if (!data)` catches this, but developers sometimes skip it for "simple" displays.

**How to avoid:** Follow the three-branch render: `isLoading` → Skeleton, `data === null` → "Not imported yet", `data` → formatted values.

**Warning signs:** TypeScript `strict` mode will flag `udbMeta.unit_count` if `udbMeta` is typed as `UdbMeta | null | undefined` — don't use non-null assertion operators here.

### Pitfall 2: appVersion === null (not the same as "unknown")

**What goes wrong:** Treating `null` (initial state, still loading) and `"unknown"` (getVersion failed) as the same case.

**Why it happens:** Both look like "no data." But `null` should render a Skeleton while `"unknown"` should render the string "unknown".

**How to avoid:** Check `appVersion === null` for the Skeleton branch; render `v${appVersion}` for all string values (including "unknown").

### Pitfall 3: Mocking @tauri-apps/api/app in tests

**What goes wrong:** Tests throw `TypeError: getVersion is not a function` because jsdom has no Tauri bridge.

**Why it happens:** `@tauri-apps/api/app` calls the native Tauri IPC bridge which doesn't exist in jsdom.

**How to avoid:** Mock the module at the top of the test file:
```ts
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("0.4.14"),
}));
```

### Pitfall 4: Settings page test regressions

**What goes wrong:** Existing `SettingsPage.test.tsx` tests fail after AboutTab is integrated because AboutTab renders async hooks not mocked in the settings page test file.

**Why it happens:** The settings page tests render the full `<SettingsPage>` which now includes `<AboutTab>`. The tab content renders even for non-active tabs in shadcn Tabs.

**How to avoid:** After integrating AboutTab into the settings page, add `vi.mock("@/hooks/useUdbMeta", ...)` and `vi.mock("@tauri-apps/api/app", ...)` to `SettingsPage.test.tsx`, or mock `AboutTab` itself at the module level.

## Code Examples

### Full AboutTab skeleton (implementation guide)

```tsx
// Source pattern: VersionInfoCard.tsx + DataHealthSummaryCard.tsx
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdbMeta } from "@/hooks/useUdbMeta";

function formatBuiltAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AboutTab() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { data: udbMeta, isLoading: udbLoading } = useUdbMeta();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
  }, []);

  return (
    <div className="space-y-8">
      {/* Section 1: App Identity */}
      <section className="space-y-1">
        <h2 className="text-lg font-semibold">HobbyForge</h2>
        <p className="text-sm text-muted-foreground">
          Your personal Warhammer hobby command center.
        </p>
        <p className="text-sm">
          Version{" "}
          {appVersion === null ? (
            <Skeleton className="inline-block w-16 h-4 align-middle" />
          ) : (
            <span className="font-mono">{appVersion}</span>
          )}
        </p>
      </section>

      {/* Section 2: Data Stats */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Unit Database
        </h3>
        {udbLoading ? (
          <div className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : udbMeta ? (
          <div className="text-sm space-y-1">
            <p>{udbMeta.unit_count ?? 0} units across {udbMeta.faction_count ?? 0} factions</p>
            <p className="text-muted-foreground">
              Data date: {formatBuiltAt(udbMeta.built_at)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not imported yet.</p>
        )}
      </section>

      {/* Section 3: Credits */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Attribution
        </h3>
        <p className="text-sm">
          Unit and rules data sourced from{" "}
          <span className="font-medium">Wahapedia</span>.
        </p>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1">Built with</p>
          <p>Tauri 2 · React · TypeScript · SQLite</p>
        </div>
      </section>
    </div>
  );
}
```

### Test mock pattern for AboutTab

```tsx
// Source: tests/settings/SettingsPage.test.tsx (established pattern)
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("0.4.14"),
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(),
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useRulesSyncMeta()` | `useUdbMeta()` | Phase 107 | 11 consumers migrated; single source of truth for data stats |

**No deprecated patterns apply to this phase.**

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `formatBuiltAt` is not exported from VersionInfoCard and must be inlined | Code Examples | Low — if it were exported, inlining is still correct; extraction would be a minor DRY improvement only |
| A2 | shadcn Tabs renders non-active TabsContent into the DOM (not lazy) — meaning AboutTab hooks fire even when Preferences tab is active | Common Pitfalls (Pitfall 4) | Medium — if Tabs lazy-renders, SettingsPage test regressions won't occur; but the mock is still correct practice |

**If this table is empty:** N/A — two low-risk assumptions documented above.

## Open Questions

1. **Should SettingsPage tests mock AboutTab at module level or add individual hook mocks?**
   - What we know: SettingsPage.test.tsx currently mocks only `useAppSettings`. AboutTab will add two more async dependencies.
   - What's unclear: Whether to mock `AboutTab` wholesale (`vi.mock("@/features/settings/AboutTab", () => ({ AboutTab: () => <div>About</div> }))`) or add granular hook mocks to the settings page test.
   - Recommendation: Granular hook mocks (useUdbMeta + getVersion) keep the settings page test realistic; AboutTab module mock is acceptable if the test file grows complex. Planner should specify one approach.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tauri-apps/api/app` | ABT-01 (getVersion) | Yes [VERIFIED: package.json] | ^2.0.0 | — |
| `useUdbMeta` hook | ABT-02 (data stats) | Yes [VERIFIED: src/hooks/useUdbMeta.ts] | n/a (internal) | — |
| shadcn Skeleton | Loading states | Yes [VERIFIED: used in VersionInfoCard] | n/a (bundled) | — |
| Vitest + RTL | Testing | Yes [VERIFIED: existing test suite] | 4 / 16 | — |

**Missing dependencies with no fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config inline) |
| Quick run command | `pnpm test -- tests/settings/AboutTab.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ABT-01 | About tab shows app version | unit | `pnpm test -- tests/settings/AboutTab.test.tsx` | No — Wave 0 |
| ABT-01 | Skeleton shown while appVersion is null | unit | `pnpm test -- tests/settings/AboutTab.test.tsx` | No — Wave 0 |
| ABT-02 | Shows unit count + faction count + data date when udbMeta loaded | unit | `pnpm test -- tests/settings/AboutTab.test.tsx` | No — Wave 0 |
| ABT-02 | Shows "Not imported yet" when udbMeta is null | unit | `pnpm test -- tests/settings/AboutTab.test.tsx` | No — Wave 0 |
| ABT-03 | Shows Wahapedia attribution text | unit | `pnpm test -- tests/settings/AboutTab.test.tsx` | No — Wave 0 |
| ABT-03 | Shows tech stack list (Tauri, React, TypeScript, SQLite) | unit | `pnpm test -- tests/settings/AboutTab.test.tsx` | No — Wave 0 |
| (regression) | SettingsPage About tab trigger visible + existing tests pass | unit | `pnpm test -- tests/settings/SettingsPage.test.tsx` | Yes — update |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/settings/AboutTab.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/settings/AboutTab.test.tsx` — covers ABT-01, ABT-02, ABT-03 (new file)
- [ ] Update `tests/settings/SettingsPage.test.tsx` — add mocks for `useUdbMeta` and `@tauri-apps/api/app` to prevent About tab regressions

## Security Domain

This phase renders no user input, makes no mutations, and exposes no external data. The About tab is read-only: it reads app version (from Tauri's own config) and data counts (from a pre-populated internal table). No ASVS categories apply. Input validation (V5) is not applicable as there is no form or user-supplied data.

## Sources

### Primary (HIGH confidence)

- `src/features/data-health/VersionInfoCard.tsx` — getVersion() pattern, formatBuiltAt(), three-branch udbMeta render, Skeleton usage [VERIFIED: codebase]
- `src/features/dashboard/DataHealthSummaryCard.tsx` — getVersion() + useUdbMeta() usage [VERIFIED: codebase]
- `src/hooks/useUdbMeta.ts` — hook interface and return shape [VERIFIED: codebase]
- `src/app/settings/page.tsx` — current About tab placeholder location (lines 39-44) [VERIFIED: codebase]
- `tests/settings/SettingsPage.test.tsx` — established mock pattern for settings tests [VERIFIED: codebase]
- `package.json` — @tauri-apps/api version ^2.0.0, app version 0.4.14 [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- Tauri 2 `@tauri-apps/api/app` getVersion() behavior — inferred from three existing usages in codebase [ASSUMED based on consistent usage pattern]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, verified in codebase
- Architecture: HIGH — single component integration, all patterns established
- Pitfalls: HIGH — identified from direct code inspection of existing patterns and test file structure
- Testing: HIGH — follows exact same pattern as existing SettingsPage tests

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stable patterns; only risk is a major shadcn or Tauri API change)
