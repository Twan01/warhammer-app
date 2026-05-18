import { describe, it, expect } from "vitest";
import { formatBytes } from "@/lib/formatBytes";

describe("formatBytes", () => {
  it("returns '0 B' for zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("returns '0 B' for negative values", () => {
    expect(formatBytes(-100)).toBe("0 B");
  });

  it("formats small byte values without unit conversion", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats values under 10 with one decimal place", () => {
    expect(formatBytes(1)).toBe("1.0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats values 10+ as integers", () => {
    expect(formatBytes(14 * 1024)).toBe("14 KB");
  });

  it("formats megabyte values correctly", () => {
    // 2.4 MB
    const bytes = Math.round(2.4 * 1024 * 1024);
    expect(formatBytes(bytes)).toBe("2.4 MB");
  });

  it("formats large megabyte values as integers", () => {
    expect(formatBytes(14 * 1024 * 1024)).toBe("14 MB");
  });

  it("formats gigabyte values correctly", () => {
    // 1.5 GB
    const bytes = 1.5 * 1024 * 1024 * 1024;
    expect(formatBytes(bytes)).toBe("1.5 GB");
  });

  it("clamps to GB for very large values", () => {
    // 2 TB worth of bytes should still show in GB
    const bytes = 2 * 1024 * 1024 * 1024 * 1024;
    expect(formatBytes(bytes)).toBe("2048 GB");
  });
});
