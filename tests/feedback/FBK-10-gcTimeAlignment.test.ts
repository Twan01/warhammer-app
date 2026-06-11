/**
 * FBK-10: Every staleTime: Infinity hook also has gcTime: Infinity.
 *
 * Static analysis test that scans all source files for mismatched pairs.
 * This ensures React Query cache entries are never silently evicted for
 * data marked as never-stale.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

const SRC_ROOT = resolve(__dirname, "../../src");

/** Recursively collect all .ts and .tsx files under a directory. */
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("FBK-10: gcTime alignment with staleTime: Infinity", () => {
  it("every staleTime: Infinity in code has a matching gcTime: Infinity in the same useQuery block", () => {
    const files = collectFiles(SRC_ROOT);
    const violations: string[] = [];

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // Skip comment lines (JSDoc, single-line comments)
        if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;
        if (!trimmed.includes("staleTime: Infinity") && !trimmed.includes("staleTime:Infinity")) continue;

        // Check the surrounding lines (within 3 lines) for gcTime: Infinity
        const contextWindow = lines
          .slice(Math.max(0, i - 2), Math.min(lines.length, i + 4))
          .join("\n");

        if (!contextWindow.includes("gcTime: Infinity")) {
          const relPath = filePath.replace(SRC_ROOT, "src").replace(/\\/g, "/");
          violations.push(`${relPath}:${i + 1}`);
        }
      }
    }

    expect(
      violations,
      `Found staleTime: Infinity in code WITHOUT gcTime: Infinity at:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });

  it("staleTime: Infinity code count matches gcTime: Infinity code count across src/", () => {
    const files = collectFiles(SRC_ROOT);
    let staleCount = 0;
    let gcCount = 0;

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;
        if (trimmed.includes("staleTime: Infinity") || trimmed.includes("staleTime:Infinity")) staleCount++;
        if (trimmed.includes("gcTime: Infinity") || trimmed.includes("gcTime:Infinity")) gcCount++;
      }
    }

    // Both counts should be > 0 (sanity check that we found something)
    expect(staleCount).toBeGreaterThan(0);
    // Counts should match
    expect(gcCount).toBe(staleCount);
  });
});
