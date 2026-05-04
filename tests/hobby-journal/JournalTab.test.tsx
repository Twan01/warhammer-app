/**
 * JOUR-05 — JournalTab render-state tests.
 *
 * Mocks the two Phase 13 hook modules so the component renders predictable
 * states. Mocks the Tauri plugin imports so jsdom doesn't crash on missing
 * native APIs (only render is exercised here; click flows are manual).
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  BaseDirectory: { AppData: "AppData" },
}));

const useJournalSessionsMock = vi.fn();
const useCreatePaintingSessionMock = vi.fn();
const useDeletePaintingSessionMock = vi.fn();
vi.mock("@/hooks/useJournalSessions", () => ({
  useJournalSessions: (id: number | undefined) => useJournalSessionsMock(id),
  useCreatePaintingSession: () => useCreatePaintingSessionMock(),
  useDeletePaintingSession: (id: number) => useDeletePaintingSessionMock(id),
  PAINTING_SESSIONS_KEY: (id: number) => ["painting-sessions", id],
}));

const useUnitPhotosMock = vi.fn();
const useCreateUnitPhotoMock = vi.fn();
const useDeleteUnitPhotoMock = vi.fn();
vi.mock("@/hooks/useUnitPhotos", () => ({
  useUnitPhotos: (id: number | undefined) => useUnitPhotosMock(id),
  useCreateUnitPhoto: () => useCreateUnitPhotoMock(),
  useDeleteUnitPhoto: (id: number) => useDeleteUnitPhotoMock(id),
  UNIT_PHOTOS_KEY: (id: number) => ["unit-photos", id],
}));

import { JournalTab } from "@/features/units/JournalTab";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  useJournalSessionsMock.mockReset();
  useCreatePaintingSessionMock.mockReset();
  useDeletePaintingSessionMock.mockReset();
  useUnitPhotosMock.mockReset();
  useCreateUnitPhotoMock.mockReset();
  useDeleteUnitPhotoMock.mockReset();

  // Default no-op mutation shape so `.isPending` etc. don't blow up
  const passiveMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
  useCreatePaintingSessionMock.mockReturnValue(passiveMutation);
  useDeletePaintingSessionMock.mockReturnValue(passiveMutation);
  useCreateUnitPhotoMock.mockReturnValue(passiveMutation);
  useDeleteUnitPhotoMock.mockReturnValue(passiveMutation);
});

describe("JournalTab — JOUR-05 render states", () => {
  it("JOUR-05: renders Skeleton elements while useUnitPhotos is loading (isLoading: true)", () => {
    useJournalSessionsMock.mockReturnValue({ data: [], isLoading: false });
    useUnitPhotosMock.mockReturnValue({ data: undefined, isLoading: true });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <JournalTab unitId={1} onPhotoClick={() => {}} />,
      { wrapper: makeWrapper(qc) }
    );

    // shadcn Skeleton has data-slot="skeleton" + animate-pulse class
    const skeletons = container.querySelectorAll('[data-slot="skeleton"], .animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("JOUR-05: renders 3-column thumbnail grid (grid-cols-3) with one img per photo when useUnitPhotos returns data", () => {
    useJournalSessionsMock.mockReturnValue({ data: [], isLoading: false });
    useUnitPhotosMock.mockReturnValue({
      data: [
        { id: 1, entity_type: "unit" as const, entity_id: 1, file_path: "a.jpg", caption: null, stage_label: "Primed", taken_at: "2026-05-03", created_at: "2026-05-03", assetUrl: "asset://localhost/a.jpg" },
        { id: 2, entity_type: "unit" as const, entity_id: 1, file_path: "b.jpg", caption: "Looking sharp", stage_label: "Finished", taken_at: "2026-05-02", created_at: "2026-05-02", assetUrl: "asset://localhost/b.jpg" },
      ],
      isLoading: false,
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <JournalTab unitId={1} onPhotoClick={() => {}} />,
      { wrapper: makeWrapper(qc) }
    );

    expect(container.querySelector(".grid-cols-3")).not.toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText("Primed")).toBeInTheDocument();
    expect(screen.getByText("Finished")).toBeInTheDocument();
  });
});
