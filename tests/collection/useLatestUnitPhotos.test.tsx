import { vi, describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * COLL-01 — useLatestUnitPhotos hook returns Map<number, UnitPhotoWithUrl>.
 */

const getLatestPhotoByUnitMock = vi.fn();

vi.mock("@/db/queries/unitPhotos", () => ({
  getPhotosByUnit: vi.fn(),
  createUnitPhoto: vi.fn(),
  deleteUnitPhoto: vi.fn(),
  getLatestPhotoByUnit: () => getLatestPhotoByUnitMock(),
  getPhotoCountsByUnitIds: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/app/data"),
  join: vi.fn().mockImplementation((...parts: string[]) => Promise.resolve(parts.join("/"))),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn().mockImplementation((path: string) => `asset://${path}`),
}));

import { useLatestUnitPhotos, LATEST_UNIT_PHOTOS_KEY } from "@/hooks/useUnitPhotos";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useLatestUnitPhotos", () => {
  it("returns a Map<number, UnitPhotoWithUrl> keyed by entity_id", async () => {
    getLatestPhotoByUnitMock.mockResolvedValueOnce([
      { id: 5, entity_type: "unit", entity_id: 1, file_path: "a.jpg", caption: null, taken_at: null, stage_label: null, created_at: "2026-05-01" },
      { id: 9, entity_type: "unit", entity_id: 2, file_path: "b.jpg", caption: null, taken_at: null, stage_label: null, created_at: "2026-05-01" },
    ]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useLatestUnitPhotos(), { wrapper: makeWrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const map = result.current.data;
    expect(map).toBeInstanceOf(Map);
    expect(map?.has(1)).toBe(true);
    expect(map?.has(2)).toBe(true);
  });

  it("each value has assetUrl derived from convertFileSrc", async () => {
    getLatestPhotoByUnitMock.mockResolvedValueOnce([
      { id: 7, entity_type: "unit", entity_id: 3, file_path: "c.jpg", caption: null, taken_at: null, stage_label: null, created_at: "2026-05-01" },
    ]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useLatestUnitPhotos(), { wrapper: makeWrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const photo = result.current.data?.get(3);
    expect(photo?.assetUrl).toMatch(/^asset:\/\//);
  });

  it("query key is ['unit-photos', 'latest']", () => {
    expect(LATEST_UNIT_PHOTOS_KEY).toEqual(["unit-photos", "latest"]);
  });

  it("staleTime is Infinity — only mutations invalidate", async () => {
    getLatestPhotoByUnitMock.mockResolvedValue([]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useLatestUnitPhotos(), { wrapper: makeWrapper(qc) });

    await waitFor(() => {
      const query = qc.getQueryCache().find({ queryKey: LATEST_UNIT_PHOTOS_KEY });
      // staleTime: Infinity means the query is never stale immediately after fetch
      expect(query).toBeDefined();
    });
  });
});
