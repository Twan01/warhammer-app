# Phase 125: About Tab - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 3 new/modified files
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/settings/AboutTab.tsx` | component | request-response (read-only) | `src/features/data-health/VersionInfoCard.tsx` | exact |
| `src/app/settings/page.tsx` | component | request-response | `src/app/settings/page.tsx` (self — small edit) | self |
| `tests/settings/AboutTab.test.tsx` | test | — | `tests/data-health/versionInfoCard.test.tsx` | exact |

---

## Pattern Assignments

### `src/features/settings/AboutTab.tsx` (component, read-only display)

**Analog:** `src/features/data-health/VersionInfoCard.tsx`

**Imports pattern** (lines 7-13):
```tsx
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdbMeta } from "@/hooks/useUdbMeta";
```
Note: `Database` icon and `Card*` components from VersionInfoCard are NOT needed — D-02 forbids card wrappers. Import only the four above.

**App version state + effect** (VersionInfoCard.tsx lines 50-57):
```tsx
const [appVersion, setAppVersion] = useState<string | null>(null);

useEffect(() => {
  getVersion().then(setAppVersion).catch(() => setAppVersion("unknown"));
}, []);
```

**Hook call + destructure** (VersionInfoCard.tsx lines 51-53):
```tsx
const { data: udbMeta, isLoading: udbMetaLoading } = useUdbMeta();
```

**Three-branch udbMeta render** (VersionInfoCard.tsx lines 93-100):
```tsx
{udbMetaLoading ? (
  <Skeleton className="w-16 h-4" />
) : udbMeta ? (
  `${udbMeta.unit_count ?? 0} units across ${udbMeta.faction_count ?? 0} factions`
) : (
  "Not imported"
)}
```

**App version null-guard (Skeleton while null)** (VersionInfoCard.tsx lines 78-82):
```tsx
{appVersion === null ? (
  <Skeleton className="w-16 h-4" />
) : (
  `v${appVersion}`
)}
```

**formatBuiltAt helper** (VersionInfoCard.tsx lines 32-43):
```tsx
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
This function is file-private in VersionInfoCard — not exported. Inline it verbatim at the top of AboutTab.tsx.

**Section heading typography** (inferred from JournalTab.tsx line 163 + VersionInfoCard InfoItem pattern):
```tsx
// Section sub-heading (muted, uppercase, tracked)
<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
  Unit Database
</h3>
// Primary heading (prominent)
<h2 className="text-lg font-semibold">HobbyForge</h2>
```

**Section layout wrapper** (JournalTab.tsx line 159 + VersionInfoCard structure):
```tsx
// Outer container — stacked sections with consistent gap
<div className="space-y-8">
  <section className="space-y-1">...</section>
  <section className="space-y-2">...</section>
  <section className="space-y-2">...</section>
</div>
```

**UdbMeta interface** (useUdbMeta.ts lines 14-20 — for TypeScript reference):
```ts
export interface UdbMeta {
  version: string;
  built_at: string;
  game_system: string;
  unit_count: number | null;
  faction_count: number | null;
}
// Hook returns: UdbMeta | null (rows[0] ?? null when table is empty)
```

---

### `src/app/settings/page.tsx` (small edit — replace placeholder content)

**Integration point** (page.tsx lines 39-44 — current placeholder to replace):
```tsx
<TabsContent value="about" className="mt-4">
  <h2 className="text-lg font-semibold">About HobbyForge</h2>
  <p className="text-muted-foreground text-sm">
    App version, data statistics, and attribution — coming in the next update.
  </p>
</TabsContent>
```
Replace the inner content with `<AboutTab />`. Add the import at the top of the file.

**Import to add** (following existing import pattern at page.tsx lines 1-3):
```tsx
import { AboutTab } from "@/features/settings/AboutTab";
```

**After edit, the TabsContent becomes:**
```tsx
<TabsContent value="about" className="mt-4">
  <AboutTab />
</TabsContent>
```

---

### `tests/settings/AboutTab.test.tsx` (new test file)

**Analog:** `tests/data-health/versionInfoCard.test.tsx`

**Module-level mock block** (versionInfoCard.test.tsx lines 10-22):
```tsx
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(() => Promise.resolve("0.4.14")),
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn(),
}));
```

**Import order after mocks** (versionInfoCard.test.tsx lines 24-27):
```tsx
import { useUdbMeta } from "@/hooks/useUdbMeta";
import { AboutTab } from "@/features/settings/AboutTab";

const mockUseUdbMeta = vi.mocked(useUdbMeta);
```

**beforeEach with default happy-path mock** (versionInfoCard.test.tsx lines 31-41):
```tsx
beforeEach(() => {
  mockUseUdbMeta.mockReturnValue({
    data: {
      version: "2026.05.20",
      built_at: "2026-05-20T10:00:00Z",
      game_system: "40k-10th",
      unit_count: 500,
      faction_count: 25,
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useUdbMeta>);
});
```

**waitFor pattern for async getVersion** (versionInfoCard.test.tsx lines 54-58):
```tsx
it("renders app version after getVersion resolves", async () => {
  render(<AboutTab />);
  await waitFor(() => {
    expect(screen.getByText(/0\.4\.14/)).toBeInTheDocument();
  });
});
```

**Null data (not imported) branch test** (versionInfoCard.test.tsx lines 98-107):
```tsx
it("shows 'Not imported yet' when udb meta is null", () => {
  mockUseUdbMeta.mockReturnValue({
    data: null,
    isLoading: false,
  } as unknown as ReturnType<typeof useUdbMeta>);

  render(<AboutTab />);
  expect(screen.getByText(/Not imported/)).toBeInTheDocument();
});
```

**Loading skeleton branch test** (versionInfoCard.test.tsx lines 86-95 — adapt for udbLoading):
```tsx
it("shows skeleton when udb meta is loading", () => {
  mockUseUdbMeta.mockReturnValue({
    data: undefined,
    isLoading: true,
  } as unknown as ReturnType<typeof useUdbMeta>);

  render(<AboutTab />);
  // Count/date text not present while loading
  expect(screen.queryByText(/units across/)).not.toBeInTheDocument();
});
```

**Imports line** (following versionInfoCard.test.tsx lines 6-8):
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
```

---

### `tests/settings/SettingsPage.test.tsx` (update existing — add mocks)

**Current mock block** (SettingsPage.test.tsx lines 5-7):
```tsx
vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
}));
```

**Add these two mocks** to prevent AboutTab async hook regressions (per Pitfall 4 in RESEARCH.md). Place immediately after the existing mock block:
```tsx
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(() => Promise.resolve("0.4.14")),
}));

vi.mock("@/hooks/useUdbMeta", () => ({
  useUdbMeta: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
  }),
}));
```

---

## Shared Patterns

### Skeleton for async data
**Source:** `src/features/data-health/VersionInfoCard.tsx` (lines 78-82, 93-95)
**Apply to:** All async branches in AboutTab

Two distinct cases:
1. `appVersion === null` (still fetching) → `<Skeleton className="w-16 h-4" />`
2. `udbMetaLoading === true` → stacked Skeletons for each stat line

```tsx
// Case 1: version loading
{appVersion === null ? (
  <Skeleton className="inline-block w-16 h-4 align-middle" />
) : (
  <span className="font-mono">{appVersion}</span>
)}

// Case 2: udb meta loading
{udbMetaLoading ? (
  <div className="space-y-1">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="h-4 w-32" />
  </div>
) : ...}
```

### Named function export convention
**Source:** All feature components in `src/features/**/*.tsx`
**Apply to:** `AboutTab.tsx`

```tsx
// Named export (not default)
export function AboutTab() { ... }
```

### Hook destructure naming
**Source:** `src/features/data-health/VersionInfoCard.tsx` (lines 51-53)
**Apply to:** AboutTab hook calls

```tsx
const { data: udbMeta, isLoading: udbMetaLoading } = useUdbMeta();
```
Alias `isLoading` to a descriptive name so multiple async sources can coexist without collision.

---

## No Analog Found

All files have strong analogs. No gaps.

---

## Metadata

**Analog search scope:** `src/features/data-health/`, `src/features/dashboard/`, `src/features/units/`, `src/hooks/`, `src/app/settings/`, `tests/data-health/`, `tests/settings/`
**Files scanned:** 7 (VersionInfoCard.tsx, DataHealthSummaryCard.tsx, page.tsx, useUdbMeta.ts, JournalTab.tsx, versionInfoCard.test.tsx, SettingsPage.test.tsx)
**Pattern extraction date:** 2026-06-10
