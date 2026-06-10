import { describe, it, expect } from "vitest";
import {
  getBucketLabel,
  BUCKET_ORDER,
} from "@/lib/stageLabel";

describe("BUCKET_ORDER", () => {
  it("has exactly 5 entries", () => {
    expect(BUCKET_ORDER).toHaveLength(5);
  });

  it("matches expected bucket names in order", () => {
    expect(BUCKET_ORDER).toEqual([
      "Not Started",
      "Assembly",
      "Painting",
      "Finishing",
      "Done",
    ]);
  });
});

describe("getBucketLabel", () => {
  it("returns custom label when pipeline_labels has override for bucket", () => {
    const settings = {
      pipeline_labels: JSON.stringify({ Assembly: "Build Phase" }),
    };
    expect(getBucketLabel("Assembly", settings)).toBe("Build Phase");
  });

  it("returns default bucket name when pipeline_labels key is missing from settings", () => {
    expect(getBucketLabel("Assembly", {})).toBe("Assembly");
  });

  it("returns default bucket name when pipeline_labels is empty object", () => {
    const settings = { pipeline_labels: "{}" };
    expect(getBucketLabel("Assembly", settings)).toBe("Assembly");
  });

  it("returns default bucket name when pipeline_labels is malformed JSON", () => {
    const settings = { pipeline_labels: "INVALID" };
    expect(getBucketLabel("Assembly", settings)).toBe("Assembly");
  });

  it("returns default bucket name when override map exists but specific bucket not overridden", () => {
    const settings = {
      pipeline_labels: JSON.stringify({ Painting: "Paint Phase" }),
    };
    expect(getBucketLabel("Assembly", settings)).toBe("Assembly");
  });

  it("resolves labels for all 5 buckets", () => {
    const overrides: Record<string, string> = {
      "Not Started": "Backlog",
      Assembly: "Build",
      Painting: "Paint",
      Finishing: "Finish",
      Done: "Complete",
    };
    const settings = { pipeline_labels: JSON.stringify(overrides) };
    const results = BUCKET_ORDER.map((b) => getBucketLabel(b, settings));
    expect(results).toEqual(["Backlog", "Build", "Paint", "Finish", "Complete"]);
  });

  it("returns default when override value is empty string", () => {
    const settings = {
      pipeline_labels: JSON.stringify({ Assembly: "" }),
    };
    // Empty string is falsy, so || bucket returns the default
    expect(getBucketLabel("Assembly", settings)).toBe("Assembly");
  });
});
