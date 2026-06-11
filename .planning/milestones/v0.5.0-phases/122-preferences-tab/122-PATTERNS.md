# Phase 122: Preferences Tab - Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 12 (5 new, 7 modified)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/settings/GeneralPreferencesSection.tsx` | component | request-response | `src/features/settings/HobbyDefaultsSection.tsx` | exact |
| `src/features/settings/LanguageSetting.tsx` | component | request-response | `src/features/settings/MissionFormatEditor.tsx` | exact |
| `src/features/settings/CurrencySetting.tsx` | component | request-response | `src/features/settings/MissionFormatEditor.tsx` | exact |
| `src/features/settings/DefaultFactionSetting.tsx` | component | request-response | `src/features/settings/MissionFormatEditor.tsx` | role-match |
| `src/features/settings/ReadinessTargetSetting.tsx` | component | request-response | `src/features/settings/PipelineLabelsEditor.tsx` | role-match |
| `src/hooks/useCurrencyPreference.ts` | hook | request-response | `src/hooks/useAppSettings.ts` | role-match |
| `src/app/settings/page.tsx` | page | request-response | (self — modify in place) | exact |
| `src/stores/localeStore.ts` | store | CRUD | (remove or gut) | N/A |
| `src/components/common/LocaleToggle.tsx` | component | request-response | (self — modify in place) | exact |
| `src/context/ActiveFactionContext.tsx` | provider | request-response | (self — modify in place) | exact |
| `src/hooks/useArmyReadiness.ts` | hook | CRUD | (self — modify in place) | exact |
| `tests/settings/GeneralPreferencesSection.test.tsx` | test | N/A | `tests/settings/HobbyDefaultsSection.test.tsx` | exact |
| `tests/settings/useCurrencyPreference.test.ts` | test | N/A | `tests/settings/useAppSettings.test.ts` | exact |

## Pattern Assignments

### `src/features/settings/GeneralPreferencesSection.tsx` (component, request-response)

**Analog:** `src/features/settings/HobbyDefaultsSection.tsx`

**Imports pattern** (lines 1-5):
```typescript
import { Separator } from "@/components/ui/separator";
import { useAppSettings } from "@/hooks/useAppSettings";
import { PipelineLabelsEditor } from "./PipelineLabelsEditor";
import { ChecklistDefaultsEditor } from "./ChecklistDefaultsEditor";
import { MissionFormatEditor } from "./MissionFormatEditor";
```

**Core section wrapper pattern** (lines 7-26):
```typescript
export function HobbyDefaultsSection() {
  const { data: settings = {} } = useAppSettings();

  return (
    <div className="space-y-6">
      <Separator />
      <div>
        <h3 className="text-base font-semibold">Hobby Defaults</h3>
        <p className="text-muted-foreground text-sm">
          Customize workflow defaults that apply across the app.
        </p>
      </div>
      <PipelineLabelsEditor settings={settings} />
      <Separator />
      <ChecklistDefaultsEditor settings={settings} />
      <Separator />
      <MissionFormatEditor settings={settings} />
    </div>
  );
}
```

**Key adaptation:** Replace child editors with `LanguageSetting`, `CurrencySetting`, `DefaultFactionSetting`, `ReadinessTargetSetting`. No `<Separator />` before heading since this section goes ABOVE HobbyDefaultsSection. Use heading "App Preferences".

---

### `src/features/settings/LanguageSetting.tsx` (component, request-response)

**Analog:** `src/components/common/LocaleToggle.tsx` (for segmented button UI) + `src/features/settings/MissionFormatEditor.tsx` (for auto-save pattern)

**Imports pattern** (from MissionFormatEditor lines 1-4):
```typescript
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";
```

**Auto-save pattern** (from MissionFormatEditor lines 11-19):
```typescript
const updateSetting = useUpdateSetting();

updateSetting.mutate(
  { key: "default_mission_format", value: trimmed },
  { onError: () => toast.error("Could not save setting. Try again.") },
);
```

**Segmented button UI** (from LocaleToggle lines 50-73):
```typescript
<div className="flex border border-border rounded-md overflow-hidden">
  <Button
    variant={locale === "en" ? "secondary" : "ghost"}
    size="sm"
    className="flex-1 rounded-none h-7 text-xs"
    onClick={() => {
      if (locale !== "en") handleLocaleSwitch("en");
    }}
  >
    EN
  </Button>
  <Button
    variant={locale === "fr" ? "secondary" : "ghost"}
    size="sm"
    className="flex-1 rounded-none h-7 text-xs"
    onClick={() => {
      if (locale !== "fr") handleLocaleSwitch("fr");
    }}
  >
    FR
  </Button>
</div>
```

**Locale invalidation pattern** (from LocaleToggle lines 14-23):
```typescript
function handleLocaleSwitch(next: Locale) {
  setLocale(next);
  queryClient.invalidateQueries({ queryKey: ["udb-factions"] });
  queryClient.invalidateQueries({ queryKey: ["udb-units"] });
  queryClient.invalidateQueries({ queryKey: ["udb-unit-detail"] });
  queryClient.invalidateQueries({ queryKey: ["wahapedia-factions"] });
  queryClient.invalidateQueries({ queryKey: ["datasheets-by-faction"] });
  queryClient.invalidateQueries({ queryKey: ["datasheets-with-points"] });
  queryClient.invalidateQueries({ queryKey: ["datasheet"] });
}
```

**Key adaptation:** Combine the auto-save `useUpdateSetting` call with the 7-key invalidation in `onSuccess`. Extract the 7 query keys to a shared const array to avoid duplication between this component and the refactored LocaleToggle.

---

### `src/features/settings/CurrencySetting.tsx` (component, request-response)

**Analog:** `src/features/settings/MissionFormatEditor.tsx`

**Core auto-save pattern** (same as above — MissionFormatEditor lines 6-19):
```typescript
export function MissionFormatEditor({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();
  const currentValue = settings["default_mission_format"] ?? "";

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim();
    updateSetting.mutate(
      { key: "default_mission_format", value: trimmed },
      { onError: () => toast.error("Could not save setting. Try again.") },
    );
  }
  // ...
```

**Key adaptation:** Replace `Input` with shadcn `Select`. Use `onValueChange` instead of `onBlur`. Dropdown options: EUR, GBP, USD, CAD, AUD, JPY.

---

### `src/features/settings/DefaultFactionSetting.tsx` (component, request-response)

**Analog:** `src/features/settings/MissionFormatEditor.tsx` (auto-save pattern)

**Props pattern** (MissionFormatEditor lines 6-9):
```typescript
export function MissionFormatEditor({
  settings,
}: {
  settings: AppSettingsMap;
}) {
```

**Key adaptation:** Use shadcn `Select` populated from `useFactions()`. Include a "None" option that clears the setting (empty string or removes key). Read current value from `settings["default_faction_id"]`.

---

### `src/features/settings/ReadinessTargetSetting.tsx` (component, request-response)

**Analog:** `src/features/settings/PipelineLabelsEditor.tsx` (complex editor with auto-save)

**Props + update pattern** (PipelineLabelsEditor lines 7-12):
```typescript
export function PipelineLabelsEditor({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();
```

**Blur-based save for input** (PipelineLabelsEditor lines 24-37):
```typescript
function handleBlur(bucket: PipelineBucket, value: string) {
  const trimmed = value.trim();
  // ...
  updateSetting.mutate(
    { key: "pipeline_labels", value: JSON.stringify(existing) },
    { onError: () => toast.error("Could not save setting. Try again.") },
  );
}
```

**Key adaptation:** Button group for preset values (500/1000/1500/2000) using `Button` with `variant={active ? "secondary" : "ghost"}` (matching LocaleToggle segmented pattern). Plus a number `Input` for custom value, saved on blur. Read current value from `settings["army_readiness_target"]`, default to 2000.

---

### `src/hooks/useCurrencyPreference.ts` (hook, request-response)

**Analog:** `src/hooks/useAppSettings.ts`

**Hook pattern** (useAppSettings lines 10-15):
```typescript
export function useAppSettings() {
  return useQuery<AppSettingsMap>({
    queryKey: APP_SETTINGS_KEY,
    queryFn: getAppSettings,
  });
}
```

**Key adaptation:** This is a derived convenience hook, not a direct query hook. It calls `useAppSettings()` internally and extracts/maps the currency preference:
```typescript
// Pattern from RESEARCH.md — no analog needed, simple derivation
export function useCurrencyPreference() {
  const { data: settings } = useAppSettings();
  const currency = settings?.["currency"] ?? "GBP";
  const locale = CURRENCY_LOCALE_MAP[currency] ?? "en-GB";
  return { locale, currency };
}
```

---

### `src/app/settings/page.tsx` (page, modify)

**Current file** (lines 20-34) — replace placeholder text block:
```typescript
<TabsContent value="preferences" className="mt-4">
  {isLoading ? (
    <Skeleton className="h-4 w-48" />
  ) : isError ? (
    <p className="text-destructive text-sm">
      Could not load settings. Restart the app to try again.
    </p>
  ) : (
    <>
      <h2 className="text-lg font-semibold">Preferences</h2>
      <p className="text-muted-foreground text-sm">
        Language, currency, default faction, and points target — coming in the next update.
      </p>
      <HobbyDefaultsSection />
    </>
  )}
</TabsContent>
```

**Key adaptation:** Replace the `<h2>` + placeholder `<p>` with `<GeneralPreferencesSection />`, keeping `<HobbyDefaultsSection />` below it.

---

### `src/components/common/LocaleToggle.tsx` (component, modify)

**Current file** (lines 1-76) — migrate from `useLocaleStore` to `useAppSettings`.

**Key changes:**
- Replace `import { useLocaleStore, type Locale } from "@/stores/localeStore"` with imports from `useAppSettings` + `useUpdateSetting`
- Read locale from `useAppSettings()` with select/memo instead of Zustand
- Write locale via `useUpdateSetting` instead of `setLocale`
- Keep the same 7-key invalidation in `onSuccess`

---

### `src/context/ActiveFactionContext.tsx` (provider, modify)

**Current localStorage init pattern** (lines 42-53):
```typescript
const [activeFactionId, setActiveFactionId] = useState<number | null>(() => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null || stored === "") return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
});
```

**Key adaptation:** Add a `useEffect` that reads `default_faction_id` from `useAppSettings()` on mount. If localStorage has no value but `app_settings` does, use the DB value. Keep localStorage as synchronous boot cache to prevent flash (per Pitfall 6 in RESEARCH.md).

---

### `src/hooks/useArmyReadiness.ts` (hook, modify)

**Current localStorage pattern** (lines 32-57):
```typescript
export function useArmyReadinessTarget(): readonly [
  ArmyReadinessTarget,
  (next: ArmyReadinessTarget) => void,
] {
  const [target, setTarget] = useState<ArmyReadinessTarget>(() => {
    try {
      const raw = window.localStorage.getItem(TARGET_STORAGE_KEY);
      const parsed = Number(raw);
      return (ARMY_READINESS_TARGETS as readonly number[]).includes(parsed)
        ? (parsed as ArmyReadinessTarget)
        : 2000;
    } catch {
      return 2000;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TARGET_STORAGE_KEY, String(target));
    } catch {
      /* storage may be blocked */
    }
  }, [target]);

  return [target, setTarget] as const;
}
```

**Key adaptation:** Replace localStorage read/write with `useAppSettings()` read + `useUpdateSetting()` write. Add `sessionOverride` state per D-11 so the dashboard card can override without persisting. The Settings page writes the persisted default; the card sets session-only override.

---

### `tests/settings/GeneralPreferencesSection.test.tsx` (test, new)

**Analog:** `tests/settings/HobbyDefaultsSection.test.tsx`

**Mock setup pattern** (lines 1-66):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = vi.fn();

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
  useUpdateSetting: vi.fn(() => ({ mutate: mockMutate })),
}));

import { useAppSettings } from "@/hooks/useAppSettings";

function mockSettings(data: Record<string, string> = {}) {
  vi.mocked(useAppSettings).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useAppSettings>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings();
});
```

**Test structure pattern** (lines 68-73):
```typescript
describe("HobbyDefaultsSection", () => {
  it("renders Hobby Defaults heading", () => {
    render(<HobbyDefaultsSection />);
    expect(
      screen.getByText("Hobby Defaults"),
    ).toBeInTheDocument();
  });
```

**Mutation assertion pattern** (lines 119-123):
```typescript
expect(mockMutate).toHaveBeenCalledWith(
  expect.objectContaining({ key: "default_checklist" }),
  expect.anything(),
);
```

**Key adaptation:** Mock `useFactions` for the faction dropdown test. Test each control: language toggle saves `locale` key, currency select saves `currency` key, faction select saves `default_faction_id` key, readiness buttons save `army_readiness_target` key.

---

### `tests/settings/useCurrencyPreference.test.ts` (test, new)

**Analog:** `tests/settings/useAppSettings.test.ts`

**Hook test pattern** (lines 1-23):
```typescript
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/db/queries/appSettings", () => ({
  getAppSettings: vi.fn().mockResolvedValue({}),
  upsertAppSetting: vi.fn().mockResolvedValue(undefined),
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}
```

**Key adaptation:** Mock `getAppSettings` to return `{ currency: "EUR" }` and verify `useCurrencyPreference()` returns `{ locale: "fr-FR", currency: "EUR" }`. Test default (no setting) returns `{ locale: "en-GB", currency: "GBP" }`.

---

## Shared Patterns

### Auto-Save via useUpdateSetting
**Source:** `src/hooks/useAppSettings.ts` lines 17-25 + `src/features/settings/MissionFormatEditor.tsx` lines 11-19
**Apply to:** All 4 setting controls (LanguageSetting, CurrencySetting, DefaultFactionSetting, ReadinessTargetSetting)
```typescript
const updateSetting = useUpdateSetting();

updateSetting.mutate(
  { key: "setting_key", value: newValue },
  { onError: () => toast.error("Could not save setting. Try again.") },
);
```

### Settings Editor Props
**Source:** `src/features/settings/MissionFormatEditor.tsx` lines 6-9
**Apply to:** All 4 setting controls
```typescript
export function EditorComponent({
  settings,
}: {
  settings: AppSettingsMap;
}) {
```

### Settings Section Wrapper
**Source:** `src/features/settings/HobbyDefaultsSection.tsx` lines 7-26
**Apply to:** `GeneralPreferencesSection.tsx`
```typescript
export function SectionComponent() {
  const { data: settings = {} } = useAppSettings();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Section Title</h3>
        <p className="text-muted-foreground text-sm">Description.</p>
      </div>
      <ChildEditor settings={settings} />
      <Separator />
      <ChildEditor settings={settings} />
    </div>
  );
}
```

### Editor Row Layout
**Source:** `src/features/settings/PipelineLabelsEditor.tsx` lines 43-49
**Apply to:** All 4 setting controls (two-column label+control layout)
```typescript
<div className="space-y-3">
  <div>
    <p className="text-sm font-semibold">Setting Label</p>
    <p className="text-xs text-muted-foreground">Description text.</p>
  </div>
  {/* Control goes here */}
</div>
```

### Test Mock Setup for Settings
**Source:** `tests/settings/HobbyDefaultsSection.test.tsx` lines 1-66
**Apply to:** `GeneralPreferencesSection.test.tsx`
```typescript
const mockMutate = vi.fn();

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
  useUpdateSetting: vi.fn(() => ({ mutate: mockMutate })),
}));

function mockSettings(data: Record<string, string> = {}) {
  vi.mocked(useAppSettings).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useAppSettings>);
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files have close analogs in the codebase |

## Metadata

**Analog search scope:** `src/features/settings/`, `src/hooks/`, `src/stores/`, `src/components/common/`, `src/context/`, `src/app/settings/`, `tests/settings/`
**Files scanned:** 15
**Pattern extraction date:** 2026-06-11
