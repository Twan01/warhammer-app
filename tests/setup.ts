import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Global mock for Zustand persist middleware — makes all persist stores
// work as plain in-memory stores in tests (no localStorage dependency).
// Per-file vi.mock("zustand/middleware") calls override this if needed.
vi.mock("zustand/middleware", () => ({
  persist: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Global mock for LocaleToggle — prevents QueryClientProvider requirement
// from cascading into every component test that renders AppSidebar.
// LocaleToggle has its own dedicated test file for real behavior testing.
vi.mock("@/components/common/LocaleToggle", () => ({
  LocaleToggle: () => null,
}));

// Polyfill ResizeObserver — jsdom does not implement it but cmdk (Command) uses it.
// Without this polyfill, any test rendering a <Command> component throws:
// "ReferenceError: ResizeObserver is not defined"
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill scrollIntoView — jsdom does not implement it but cmdk uses it when
// the highlighted item changes. Without this, clicking a CommandItem throws:
// "TypeError: e.scrollIntoView is not a function"
// Guard with typeof Element check so data-layer tests (node environment) skip this.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = function () {};
}

// Polyfill hasPointerCapture / setPointerCapture — jsdom does not implement these
// but Radix UI components (Select, etc.) call them when receiving pointer events.
// Without this polyfill, any test that userEvent-clicks a Radix Select trigger throws:
// "TypeError: target.hasPointerCapture is not a function"
// Guard with typeof Element check so data-layer tests (node environment) skip this.
if (typeof Element !== "undefined" && typeof Element.prototype.hasPointerCapture === "undefined") {
  Element.prototype.hasPointerCapture = function (_pointerId: number): boolean {
    return false;
  };
}
if (typeof Element !== "undefined" && typeof Element.prototype.setPointerCapture === "undefined") {
  Element.prototype.setPointerCapture = function (_pointerId: number): void {};
}
if (typeof Element !== "undefined" && typeof Element.prototype.releasePointerCapture === "undefined") {
  Element.prototype.releasePointerCapture = function (_pointerId: number): void {};
}

// Auto-cleanup React Testing Library renders between tests to prevent leaked DOM.
afterEach(() => {
  cleanup();
});
