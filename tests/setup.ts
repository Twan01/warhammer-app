import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

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
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = function () {};
}

// Auto-cleanup React Testing Library renders between tests to prevent leaked DOM.
afterEach(() => {
  cleanup();
});
