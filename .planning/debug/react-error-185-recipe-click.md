---
status: awaiting_human_verify
trigger: "Bug 1 — React error #185 on recipe click; Bug 2 — Windows desktop shortcut doesn't launch app"
created: 2026-05-07T00:00:00Z
updated: 2026-05-07T00:01:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED (both bugs)
  Bug 1: useEffect in RecipeDetailSheet has [steps] dependency; steps defaults to new [] on every render while query loads, causing setStepPhotoUrls to be called every render → infinite loop → error #185.
  Bug 2: Desktop shortcut (.lnk) stored on OneDrive has cloud-file reparse attributes (0x80000 + 0x100000) set, making it a cloud-only stub. Windows fails to execute it as a shortcut launch. Root cause: OneDrive synced the .lnk file and marked it cloud-only.
test: n/a — both confirmed by code/file inspection
expecting: n/a
next_action: await human verification of Bug 1 fix; provide Bug 2 instructions

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: (1) Clicking a recipe card in the paints/recipes list view should open the recipe detail. (2) Windows desktop shortcut should launch the app.
actual: (1) React crashes with "Minified React error #185" when clicking a recipe card in the list. (2) Desktop shortcut doesn't work (app doesn't launch).
errors: "Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
reproduction: (1) Navigate to paints page, click on any recipe card in the list. (2) Double-click Windows desktop shortcut.
started: Not sure when it started.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: component calling another component as a function instead of JSX
  evidence: all recipe components use JSX syntax correctly, no direct function calls to components
  timestamp: 2026-05-07

- hypothesis: SheetDescription receiving non-text children causing React error
  evidence: error #185 is "Maximum update depth exceeded" not a DOM nesting error; SheetDescription issue would produce different error
  timestamp: 2026-05-07

- hypothesis: Bug 2 caused by missing/wrong executable name (productName vs Cargo package name)
  evidence: shortcut target is hobbyforge-scaffold.exe, that file exists at C:\Users\antoi\AppData\Local\HobbyForge\hobbyforge-scaffold.exe. Binary name is correct.
  timestamp: 2026-05-07

- hypothesis: Bug 2 caused by unsigned executable being SmartScreen-blocked
  evidence: file has no Zone.Identifier (not blocked); issue is OneDrive cloud-file attributes on the .lnk itself
  timestamp: 2026-05-07

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-05-07
  checked: React error #185 definition
  found: Error #185 = "Maximum update depth exceeded" — infinite render loop, not component-as-function error
  implication: need to find setState call in useEffect with unstable dependency

- timestamp: 2026-05-07
  checked: RecipeDetailSheet.tsx lines 150-170
  found: useEffect([steps]) calls setStepPhotoUrls(new Map()) when stepsWithPhotos.length === 0. When steps = [] (default while query loads), every render creates a new [] reference, so React sees dependency changed, fires effect, sets state, re-renders, new [], fires effect... infinite loop.
  implication: This is the root cause of Bug 1. Fix: guard the setStepPhotoUrls(new Map()) call so it only fires when the map is non-empty, OR depend on steps.length/recipe?.id instead of steps reference.

- timestamp: 2026-05-07
  checked: Desktop shortcut at C:\Users\antoi\OneDrive\Bureau\HobbyForge.lnk
  found: Target = C:\Users\antoi\AppData\Local\HobbyForge\hobbyforge-scaffold.exe (exists). But file Attributes = 1572896 which decodes to Archive + FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS (0x80000) + FILE_ATTRIBUTE_RECALL_ON_OPEN (0x100000) — OneDrive cloud-only file state.
  implication: The .lnk file is marked as a cloud-only OneDrive placeholder. Windows cannot execute a shortcut that is a cloud stub — it needs to be a local file. This is why the shortcut doesn't work.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  Bug 1: RecipeDetailSheet.tsx useEffect with [steps] dependency. When recipe is clicked and query is loading, steps = [] (new array reference each render from default value syntax). Effect fires every render because [] !== [] by reference. Effect calls setStepPhotoUrls(new Map()) unconditionally when stepsWithPhotos.length === 0. This state update triggers re-render → new [] → effect fires → infinite loop → React error #185.
  Bug 2: Desktop shortcut HobbyForge.lnk is stored on OneDrive (C:\Users\antoi\OneDrive\Bureau) and has been marked as a cloud-only file (FILE_ATTRIBUTE_RECALL_ON_OPEN set). Windows cannot execute cloud-stub .lnk files. The fix is to recreate the shortcut outside OneDrive scope, or use "Always keep on this device" in OneDrive to force local availability.
fix: |
  Bug 1: In RecipeDetailSheet.tsx, guard the setStepPhotoUrls(new Map()) call so it only fires when stepPhotoUrls is non-empty (avoiding the no-op state update that drives the loop). Alternatively, change the dependency to [recipe?.id, steps.length] to use stable primitives.
  Bug 2: Recreate the desktop shortcut by running the app installer again, or manually create a new shortcut pointing to C:\Users\antoi\AppData\Local\HobbyForge\hobbyforge-scaffold.exe outside of OneDrive sync scope.
verification: Build passes (pnpm build). Awaiting human verification in running app.
files_changed: [src/features/recipes/RecipeDetailSheet.tsx]
