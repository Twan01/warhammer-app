import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Auto-cleanup React Testing Library renders between tests to prevent leaked DOM.
afterEach(() => {
  cleanup();
});
