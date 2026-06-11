/**
 * FBK-09: SnapshotHistorySheet uses toast.success("Snapshot deleted.") not plain toast().
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/features/army-lists/SnapshotHistorySheet.tsx"),
  "utf-8",
);

describe("FBK-09: Snapshot delete toast", () => {
  it("uses toast.success for snapshot deletion", () => {
    expect(SRC).toContain('toast.success("Snapshot deleted."');
  });

  it("does NOT use bare toast() for snapshot deletion (must be toast.success)", () => {
    // Find the handleDelete function body
    const handleDeleteBody = SRC.match(/const handleDelete[\s\S]*?(?=\n\s*const\s|\n\s*return\s)/);
    expect(handleDeleteBody).not.toBeNull();
    const body = handleDeleteBody![0];

    // Should have toast.success, not a bare toast( call for "Snapshot deleted."
    const bareToastMatch = body.match(/\btoast\("Snapshot deleted\."/);
    expect(bareToastMatch).toBeNull();

    // But toast.success should be present
    const successToastMatch = body.match(/toast\.success\("Snapshot deleted\."/);
    expect(successToastMatch).not.toBeNull();
  });
});
