# Stack Research

**Domain:** Local-first Windows desktop — Visual overhaul + 2 new tracking features (Tauri 2 + React 19 + Tailwind v4 + SQLite)
**Researched:** 2026-05-02 (v2.1 Visual Command milestone)
**Confidence:** HIGH — verified against package.json, Cargo.toml, globals.css, and official docs

---

## v2.1 Stack Decision: 2 New npm Packages, 2 New Rust Crates, 0 Stack Changes

The existing stack handles 4 of 6 features without additions. Two new features require new packages: the Hobby Journal photo storage needs `@tauri-apps/plugin-fs` on both JS and Rust sides, and the animated stat counters need `@number-flow/react`. The collapsible sidebar, gallery view, faction theming, and spending tracker are all solved by existing packages.

### Feature-by-Feature Dependency Analysis

| Feature | New Package Needed? | Justification |
|---------|--------------------|-|
| Faction Dynamic Theming | NO | CSS-only: add faction classes to `globals.css`, override `--faction-accent` per `.faction-*` class on `<html>`. Pattern already in use via `.dark` theming. |
| Dashboard Command Center (animated counters) | YES — `@number-flow/react` | Motion library covers animation but `AnimateNumber` is Motion+ (paid). `@number-flow/react` is MIT, free, zero-dependency, 6k stars, used by X and Dub.co. Purpose-built for this exact use case. |
| Collapsible Icon Sidebar | NO | shadcn/ui `<Sidebar collapsible="icon">` covers this natively. No new dependency. |
| Collection Gallery View | NO | CSS Grid with Tailwind is sufficient for a fixed-column card grid. No masonry needed (all cards same height). Status ring is an inline SVG component. |
| Hobby Journal (photo storage) | YES — `@tauri-apps/plugin-fs` + `tauri-plugin-fs` Rust crate | File I/O is not in the current stack. Tauri's official FS plugin is the correct, sandboxed approach. |
| Spending Tracker | NO | Pure SQLite + existing TanStack Query + shadcn Table/Card. No charting library needed. |

---

## New Packages for v2.1

### 1. `@number-flow/react` — Animated Stat Counters

**Why:** Dashboard Command Center requires animated number transitions when stats update (total units, painted %, etc.). The current stack has `tw-animate-css` and Motion (`motion/react` / `framer-motion`), but neither provides a purpose-built number counter component without a paid subscription (Motion+ for `AnimateNumber`). `@number-flow/react` is MIT-licensed, 1.4kB, zero-dependency, built on Intl.NumberFormat + Web Animations API, and React 19 compatible.

**Why not Motion `AnimateNumber`:** Requires Motion+ membership (paid, one-time). The underlying animation primitive (`useAnimate` + `useMotionValue`) can replicate it but is 30+ lines of boilerplate per counter. `@number-flow/react` is the standard recommendation in the shadcn ecosystem (listed on allshadcn.com) and does exactly this job in 1 line.

**Why not countup.js / react-countup:** Older, heavier, no Intl formatting support. `@number-flow/react` is the 2025 standard.

| Property | Value |
|----------|-------|
| Package | `@number-flow/react` |
| Version | `^0.5.9` (latest stable, April 2025) |
| License | MIT |
| Size | ~1.4kB |
| React 19 | Yes |
| Dependencies | Zero |

### 2. `@tauri-apps/plugin-fs` — Hobby Journal Photo Storage

**Why:** Hobby Journal requires storing photo files (JPEG/PNG) per unit on the local filesystem. The current stack has no file I/O capability — `tauri-plugin-sql` only handles SQLite, and `@tauri-apps/api` does not include file system access. `tauri-plugin-fs` is the official Tauri plugin and the only sandboxed, permission-scoped approach for reading/writing binary files in Tauri 2.

**Storage location:** `BaseDirectory.AppData` (resolves to `C:\Users\{user}\AppData\Roaming\hobbyforge\photos\` on Windows). This is the correct directory for persistent user data in a desktop app. Files organized as `photos/{unit_id}/{timestamp}_{filename}`.

**What it provides:**
- `writeFile(path, data, { baseDir: BaseDirectory.AppData })` — write binary image data
- `readFile(path, { baseDir: BaseDirectory.AppData })` — read binary image data back as `Uint8Array`
- `remove(path, ...)` — delete photo on journal entry delete
- `mkdir(path, { recursive: true, ... })` — create unit photo subdirectory on first upload
- `exists(path, ...)` — check before read

**Rust side also needed:** The `tauri-plugin-fs` Rust crate must be added to `Cargo.toml` and registered in `lib.rs`.

| Property | Value |
|----------|-------|
| npm package | `@tauri-apps/plugin-fs` |
| npm version | `^2.4.5` (latest, April 2025) |
| Cargo crate | `tauri-plugin-fs` |
| Cargo version | `"2"` (matches npm major) |
| License | MIT or Apache-2.0 |
| React 19 | N/A (Tauri plugin, not React) |

---

## Faction Dynamic Theming — CSS-Only, No New Package

This is a CSS architecture decision, not a library addition. The existing Tailwind v4 + `@theme inline` setup already supports runtime theming via CSS custom properties. The pattern is already implemented for dark mode in `globals.css`.

**How it works (verified against official Tailwind v4 docs and current globals.css):**

The existing `globals.css` uses the `@theme inline` pattern:
```css
@theme inline {
  --color-accent: hsl(var(--accent));
}
```

Because `@theme inline` embeds the variable reference directly into utility classes (rather than a static value), changing `--accent` at runtime via a class on `<html>` or via `document.documentElement.style.setProperty()` immediately updates all `text-accent`, `bg-accent`, `border-accent` utilities.

**Implementation pattern:**
```css
/* globals.css additions — no new packages */

:root {
  /* Default faction: no faction selected, use zinc neutral */
  --faction-accent: 240 3.7% 55%;
  --faction-accent-foreground: 0 0% 98%;
}

/* Faction overrides — toggled by setting class on <html> element */
html.faction-space-marines {
  --faction-accent: 213 94% 45%;       /* Ultramarine blue */
  --faction-accent-foreground: 0 0% 98%;
}

html.faction-necrons {
  --faction-accent: 147 63% 43%;       /* Necron green */
  --faction-accent-foreground: 0 0% 98%;
}

html.faction-chaos-space-marines {
  --faction-accent: 0 72% 45%;         /* Chaos red */
  --faction-accent-foreground: 0 0% 98%;
}

html.faction-tau {
  --faction-accent: 185 60% 45%;       /* T'au sept teal */
  --faction-accent-foreground: 0 0% 98%;
}

@theme inline {
  /* Add to existing @theme inline block */
  --color-faction-accent: hsl(var(--faction-accent));
  --color-faction-accent-foreground: hsl(var(--faction-accent-foreground));
}
```

**React side:** A single Zustand atom or React context stores `selectedFactionId`. A `useFactionTheme` hook reads it and calls `document.documentElement.className = 'dark faction-' + slug` on change. No rerender of the component tree required — CSS cascade handles it.

**Why `@theme inline` (not plain `@theme`):** `@theme inline` is what the existing codebase uses (line 68 of globals.css). It embeds `var(--faction-accent)` directly into Tailwind utilities so the variable is resolved at the element's location, not at `:root`. This is correct for scoped per-element overrides and matches the dark mode pattern already in use.

**Confidence:** HIGH — verified against actual globals.css which already uses this exact pattern for 20+ color tokens.

---

## Collapsible Icon Sidebar — shadcn/ui Built-in, No New Package

`shadcn/ui` already ships a Sidebar component with `collapsible="icon"` support. The existing codebase likely has a custom sidebar — this feature replaces or wraps it with `<Sidebar collapsible="icon">`. The `SidebarProvider` manages collapsed state. `SidebarTrigger` (a button) toggles it. `group-data-[collapsible=icon]:hidden` on `SidebarGroupLabel` hides text in icon mode.

**Known bug (shadcn issue #6302, #8037, fixed in PR #8077):** In collapsed icon mode, `SidebarGroupLabel` elements are hidden with `opacity-0` but still capture mouse events. Fix is in the latest shadcn codebase — run `npx shadcn@latest add sidebar` to pull the patched version.

---

## Collection Gallery View — CSS Grid + Inline SVG, No New Package

A fixed-column card grid (3–4 columns) is pure Tailwind CSS Grid (`grid grid-cols-3 gap-4`). No masonry library is needed because all gallery cards will be the same height (unit name, faction badge, status ring, painted % text). Variable-height masonry is only needed when cards contain arbitrary content.

**Painting-status ring:** An inline SVG circle with `stroke-dashoffset` animation. This is a ~20-line custom component — no external library. The pattern is well-documented and the exact stroke calculation (`circumference = 2πr`, `dashoffset = circumference * (1 - pct / 100)`) is standard.

---

## Spending Tracker — Existing Stack, No New Package

Cost data stored in SQLite (new `cost_log` table or columns on existing tables). Aggregations (per-faction total, per-unit cost, running total) are SQLite GROUP BY queries. Display is a shadcn Table + summary Cards. No charting library needed — a simple stacked horizontal bar showing budget vs. spend is achievable with Tailwind width utilities.

---

## Hobby Journal — Architecture Notes (beyond plugin-fs)

**Photo display:** Images read via `readFile()` as `Uint8Array`, converted to `Blob`, then `URL.createObjectURL(blob)` for use in `<img src>`. No external image library needed.

**Thumbnail generation:** Two options:
1. **Browser Canvas API (recommended):** Draw full image to an offscreen `<canvas>` at 200×200, export as JPEG via `canvas.toBlob()`. Zero dependencies, runs in the browser process. Fast enough for hobby photos.
2. **Rust `image` crate:** Add `image = "0.25"` to Cargo.toml, write a Tauri command that reads the file, calls `image::imageops::thumbnail(img, 200, 200)`, writes `{name}_thumb.jpg`. More correct for EXIF-aware rotation but adds compile time and a Rust dependency. Overkill for v2.1.

**Recommendation:** Canvas API for v2.1. Add the `image` crate only if EXIF rotation issues surface in testing.

**Session timer:** A `setInterval`-based timer in a React component (or a Zustand atom) tracking elapsed seconds. No library. Store total session duration as seconds in SQLite `hobby_sessions.duration_seconds`.

---

## Confirmed Existing Stack (No Changes Required)

| Technology | Installed Version | v2.1 Role |
|------------|------------------|-----------|
| Tauri 2 | ^2.0.0 | Desktop shell — unchanged |
| React 19 | ^19.0.0 | UI — unchanged |
| TypeScript | ^5.6.3 | Types — new types for journal, spending, faction |
| Tailwind CSS | 4.2.4 | Styling — add faction theme classes to globals.css |
| @tauri-apps/plugin-sql | ^2.4.0 | SQLite for spending tracker + journal metadata |
| @tanstack/react-query | ^5.100.6 | Queries for all new features |
| @tanstack/react-router | ^1.168.26 | New routes: `/journal/:unitId`, `/spending` |
| zustand | ^5.0.12 | Faction theme store (`useFactionTheme`) |
| lucide-react | ^0.460.0 | Icons for gallery, journal, spending views |
| sonner | ^2.0.7 | Toast on save/upload actions |
| react-hook-form + zod | ^7.74.0 / ^4.4.1 | Journal entry form, spending log form |
| shadcn/ui | CLI v4 | Sidebar (upgrade), Cards, Table, Sheet — already installed |

---

## Installation for v2.1

```bash
# New npm packages
npm install @number-flow/react @tauri-apps/plugin-fs
```

```toml
# src-tauri/Cargo.toml additions
[dependencies]
tauri-plugin-fs = "2"
```

```rust
// src-tauri/src/lib.rs — register plugin
.plugin(tauri_plugin_fs::init())
```

```json
// src-tauri/capabilities/default.json — add fs permissions
{
  "permissions": [
    "fs:default",
    "fs:allow-appdata-read-recursive",
    "fs:allow-appdata-write-recursive"
  ]
}
```

```bash
# Upgrade shadcn sidebar to pick up icon-mode bug fix
npx shadcn@latest add sidebar
```

---

## What NOT to Add for v2.1

| Avoid | Why Not | Use Instead |
|-------|---------|-------------|
| `motion` / `framer-motion` | Already have `tw-animate-css` for CSS transitions. Motion is 30kB+ and adds complexity for what are simple number rolls and hover effects. | `@number-flow/react` for counters; CSS transitions for hover/entrance |
| `react-masonry-css` / `masonic` | Gallery cards are uniform height — masonry is solving a problem that doesn't exist here. | CSS Grid with `grid-cols-3` |
| `sharp` / `wasm-vips` | Node-based image processing, incompatible with Tauri WebView. WASM variant adds 20MB+. | Browser Canvas API for thumbnails |
| `recharts` / `chart.js` | Spending Tracker data (per-unit costs, totals) fits in a table + summary card. No time-series or complex chart needed. | shadcn Table + Tailwind width-based bar |
| `react-dropzone` | One photo per session. A simple `<input type="file" accept="image/*">` with `onChange` is sufficient. | Native file input |
| Image CDN / S3 / Cloudflare | Local-first constraint. Photos live on the user's disk in AppData. | `tauri-plugin-fs` + `BaseDirectory.AppData` |
| `next-themes` (for faction theming) | `next-themes` manages light/dark. Faction theming is a separate axis — adding it to `next-themes` creates coupling and complexity. | Zustand atom + `classList` manipulation |
| Any ORM (Drizzle, Prisma) | Still a dead-end in Tauri production builds. Raw `tauri-plugin-sql` continues to work well. | Raw typed query functions |

---

## Alternatives Considered

| Recommended | Alternative | Why Alternative Was Rejected |
|-------------|-------------|------------------------------|
| `@number-flow/react` | `motion` `useMotionValue` + `animate` | 30+ lines of boilerplate per counter; Motion library is large for this single use case |
| `@number-flow/react` | `react-countup` | Older API, no Intl formatting, last major release 2022 |
| Canvas API for thumbnails | Rust `image` crate | Canvas is zero-dependency and sufficient; `image` crate adds compile time and Rust complexity |
| CSS Grid | `react-masonry-css` | Masonry is for variable-height content; gallery cards are uniform height |
| Inline SVG ring | `rc-progress` / `react-circular-progressbar` | 20-line custom SVG is simpler than adding a dependency for one component |
| `document.documentElement.classList` | `next-themes` for faction | `next-themes` is for light/dark axis; faction is a different concern; Zustand already manages app state |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@number-flow/react ^0.5.9` | React 19 | Confirmed — uses Web Animations API, no React internals coupling |
| `@tauri-apps/plugin-fs ^2.4.5` | Tauri 2, `@tauri-apps/api ^2.0.0` | npm major must match Cargo crate major (both `2`) |
| `tauri-plugin-fs = "2"` (Rust) | `tauri = "2"` | Same major version requirement |
| shadcn Sidebar (latest) | Tailwind v4, shadcn new-york/zinc | Bug fix for icon-mode pointer events included in latest CLI output |
| Faction CSS classes on `<html>` | Tailwind v4 `@theme inline` | `@theme inline` is confirmed pattern in existing globals.css (line 68) |

---

## Sources

- `package.json` — confirmed installed versions [HIGH confidence]
- `src-tauri/Cargo.toml` — confirmed no FS plugin present [HIGH confidence]
- `src/styles/globals.css` — confirmed `@theme inline` pattern in use (line 68), dark mode via `.dark` class [HIGH confidence]
- [Tailwind CSS v4 Theme docs](https://tailwindcss.com/docs/theme) — `@theme` vs `@theme inline` behavior verified [HIGH confidence]
- [Tauri v2 File System plugin docs](https://v2.tauri.app/plugin/file-system/) — BaseDirectory.AppData, permissions, binary file APIs [HIGH confidence]
- [npmjs.com @tauri-apps/plugin-fs](https://www.npmjs.com/package/@tauri-apps/plugin-fs) — version 2.4.5 confirmed [HIGH confidence]
- [tauri-plugin-fs docs.rs](https://docs.rs/crate/tauri-plugin-fs/latest) — Rust crate version 2.4.5 confirmed [HIGH confidence]
- [GitHub barvian/number-flow](https://github.com/barvian/number-flow) — MIT, 6.3k stars, v0.5.9 April 2025, React 19 compatible, zero-dependency [HIGH confidence]
- [number-flow.barvian.me](https://number-flow.barvian.me/) — official docs confirmed React package name `@number-flow/react` [HIGH confidence]
- [shadcn/ui Sidebar docs](https://ui.shadcn.com/docs/components/radix/sidebar) — `collapsible="icon"` prop confirmed [HIGH confidence]
- [shadcn issue #8037](https://github.com/shadcn-ui/ui/issues/8037), [PR #8077](https://github.com/shadcn-ui/ui/pull/8077) — icon mode pointer-event bug and fix confirmed [MEDIUM confidence]
- [Tailwind v4 multi-theme discussion](https://github.com/tailwindlabs/tailwindcss/discussions/15600) — CSS variable override pattern for multiple themes confirmed [HIGH confidence]
- [Motion docs react-animation](https://motion.dev/docs/react-animation) — confirmed `motion` package name change to `motion/react`, v12 React 19 support [HIGH confidence]

---

*Stack research for: HobbyForge v2.1 — Visual Command (Faction Theming, Dashboard, Sidebar, Gallery, Hobby Journal, Spending Tracker)*
*Researched: 2026-05-02*
