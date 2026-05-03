/**
 * Phase 12 — UnitGallery tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plans 12-01 and 12-02 will:
 *   1. Create src/hooks/useCollectionViewMode.ts exporting `useCollectionViewMode()` per
 *      12-RESEARCH.md §Architecture Patterns Pattern 1 (mirrors useSidebarCollapsed.ts —
 *      localStorage key 'collection-view-mode', values 'table'|'gallery', default 'table').
 *   2. Create src/features/units/UnitGallery.tsx per 12-UI-SPEC.md §Gallery Card Layout +
 *      §View Toggle Specification (responsive grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4,
 *      cards rendering PaintingRing + name + faction badge + status + model count + points +
 *      Flame icon when is_active_project=1; toggle buttons inside header row use
 *      aria-label="Table view" / "Gallery view" with bg-muted active class).
 *   3. Modify src/features/units/CollectionPage.tsx — add useCollectionViewMode hook call
 *      and conditional render branch swapping <UnitTable> for <UnitGallery>.
 *   4. Replace `describe.skip` below with `describe`.
 *   5. Add real assertions matching 12-VALIDATION.md §Per-Task Verification Map rows
 *      12-01-02 (UI-04 toggle) and 12-02-01 (UI-04/05/06 card content + filter independence).
 *
 * The stub exists in Wave 0 so Plans 12-01 and 12-02 have concrete failing targets to flip
 * green (Nyquist sampling rate per 12-VALIDATION.md).
 *
 * File extension is .tsx because real test bodies will render <UnitGallery /> via JSX.
 *
 * Pitfall 6 (12-RESEARCH.md): Do NOT add Object.defineProperty(window, 'matchMedia', ...)
 * here — gallery cards have no animation and no matchMedia dependency. Phase 11's
 * matchMedia polyfill in DashboardPage.test.tsx is not needed for Phase 12 tests.
 */
import { describe, it } from "vitest";

describe.skip("UnitGallery — UI-04/UI-05/UI-06 (gallery view + toggle + filter preservation)", () => {
  it("[UI-04] header row renders Table and Gallery icon buttons with correct aria-labels", () => {
    // Plan 12-01 will (CollectionPage rendered, not UnitGallery — toggle lives in CollectionPage):
    //   - render(<MemoryRouter><QueryClientProvider><CollectionPage /></QueryClientProvider></MemoryRouter>)
    //   - expect(screen.getByLabelText("Table view")).toBeInTheDocument()
    //   - expect(screen.getByLabelText("Gallery view")).toBeInTheDocument()
  });

  it("[UI-04] clicking the Gallery toggle button switches view to gallery (active button gets bg-muted)", () => {
    // Plan 12-01 will:
    //   - default view is 'table' — gallery button has no bg-muted
    //   - await userEvent.click(screen.getByLabelText("Gallery view"))
    //   - expect(screen.getByLabelText("Gallery view").className).toContain("bg-muted")
    //   - expect(screen.getByLabelText("Table view").className).not.toContain("bg-muted")
  });

  it("[UI-04] localStorage persistence — view mode survives remount", () => {
    // Plan 12-01 will:
    //   - localStorage.setItem('collection-view-mode', 'gallery')
    //   - render(<CollectionPage />)
    //   - assert that gallery view is active on first paint (gallery button has bg-muted)
    //   - rerender — assert state survives (use unmount + re-render to simulate re-entry)
  });

  it("[UI-05] gallery card renders unit name, faction badge with color_theme, and PaintingRing with percentage", () => {
    // Plan 12-02 will:
    //   - render(<UnitGallery data={[mockUnit]} factions={[mockFaction]} ... />)
    //   - expect(screen.getByText(mockUnit.name)).toBeInTheDocument()
    //   - expect(screen.getByTestId("faction-badge")).toHaveStyle({ backgroundColor: mockFaction.color_theme })
    //   - const ring = screen.getByRole("img", { name: `${mockUnit.painting_percentage}% painted` })
    //   - expect(ring.querySelector("text")?.textContent).toBe(`${mockUnit.painting_percentage}%`)
  });

  it("[UI-05] clicking a gallery card calls onRowClick with the unit (matches table click behavior)", () => {
    // Plan 12-02 will:
    //   - const onRowClick = vi.fn()
    //   - render(<UnitGallery data={[mockUnit]} factions={[mockFaction]} onRowClick={onRowClick} ... />)
    //   - await userEvent.click(screen.getByLabelText(mockUnit.name))
    //   - expect(onRowClick).toHaveBeenCalledWith(mockUnit)
  });

  it("[UI-06] switching view mode does not reset the collectionFilters Zustand store", () => {
    // Plan 12-02 will:
    //   - useCollectionFilters.setState({ search: "Marines", factions: [1] })
    //   - render(<CollectionPage />)
    //   - await userEvent.click(screen.getByLabelText("Gallery view"))
    //   - expect(useCollectionFilters.getState().search).toBe("Marines")
    //   - expect(useCollectionFilters.getState().factions).toEqual([1])
    //   - await userEvent.click(screen.getByLabelText("Table view"))
    //   - expect(useCollectionFilters.getState().search).toBe("Marines")  // still preserved
  });
});
