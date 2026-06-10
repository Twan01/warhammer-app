import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HobbyDefaultsSection } from "@/features/settings/HobbyDefaultsSection";

const mockMutate = vi.fn();

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
  useUpdateSetting: vi.fn(() => ({ mutate: mockMutate })),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ""),
    },
  },
}));

import { useAppSettings } from "@/hooks/useAppSettings";

function mockSettings(data: Record<string, string> = {}) {
  vi.mocked(useAppSettings).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useAppSettings>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings();
});

describe("HobbyDefaultsSection", () => {
  it("renders Hobby Defaults heading", () => {
    render(<HobbyDefaultsSection />);
    expect(
      screen.getByText("Hobby Defaults"),
    ).toBeInTheDocument();
  });

  it("renders Pipeline Stage Labels sub-heading with 5 inputs", () => {
    render(<HobbyDefaultsSection />);
    expect(screen.getByText("Pipeline Stage Labels")).toBeInTheDocument();
    // 5 pipeline inputs + 1 add-item input + 1 mission input = 7 total
    // Pipeline inputs have specific placeholders
    expect(screen.getByPlaceholderText("Not Started")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Assembly")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Painting")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Finishing")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Done")).toBeInTheDocument();
  });

  it("renders Default Pre-Game Checklist sub-heading with default items", () => {
    render(<HobbyDefaultsSection />);
    expect(
      screen.getByText("Default Pre-Game Checklist"),
    ).toBeInTheDocument();
    expect(screen.getByText("Verify army list points")).toBeInTheDocument();
    expect(screen.getByText("Check detachment rules")).toBeInTheDocument();
    expect(screen.getByText("Review stratagems")).toBeInTheDocument();
    expect(screen.getByText("Confirm faction rules")).toBeInTheDocument();
    expect(screen.getByText("Set up terrain")).toBeInTheDocument();
  });

  it("renders Default Mission Format sub-heading with input", () => {
    render(<HobbyDefaultsSection />);
    expect(
      screen.getByText("Default Mission Format"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g., Take and Hold, Leviathan..."),
    ).toBeInTheDocument();
  });

  it("checklist add-item: type text and click Add Item adds new entry", () => {
    render(<HobbyDefaultsSection />);
    const addInput = screen.getByPlaceholderText("Add checklist item...");
    const addButton = screen.getByRole("button", { name: /Add Item/i });

    fireEvent.change(addInput, { target: { value: "Bring dice" } });
    fireEvent.click(addButton);

    expect(screen.getByText("Bring dice")).toBeInTheDocument();
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ key: "default_checklist" }),
      expect.anything(),
    );
  });

  it("checklist delete button disabled when only 1 item remains", () => {
    // Provide settings with only 1 checklist item
    mockSettings({
      default_checklist: JSON.stringify([{ text: "Single item" }]),
    });
    render(<HobbyDefaultsSection />);
    const deleteBtn = screen.getByLabelText('Remove "Single item" from checklist');
    expect(deleteBtn).toBeDisabled();
  });

  it("checklist delete removes item when multiple items exist", () => {
    mockSettings({
      default_checklist: JSON.stringify([
        { text: "Item A" },
        { text: "Item B" },
      ]),
    });
    render(<HobbyDefaultsSection />);
    const deleteBtn = screen.getByLabelText('Remove "Item A" from checklist');
    expect(deleteBtn).not.toBeDisabled();
    fireEvent.click(deleteBtn);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ key: "default_checklist" }),
      expect.anything(),
    );
  });

  it("pipeline label blur triggers save with pipeline_labels key", () => {
    render(<HobbyDefaultsSection />);
    const assemblyInput = screen.getByPlaceholderText("Assembly");
    fireEvent.blur(assemblyInput, { target: { value: "Build Phase" } });
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ key: "pipeline_labels" }),
      expect.anything(),
    );
  });

  it("mission format blur triggers save with default_mission_format key", () => {
    render(<HobbyDefaultsSection />);
    const missionInput = screen.getByPlaceholderText(
      "e.g., Take and Hold, Leviathan...",
    );
    fireEvent.blur(missionInput, { target: { value: "Leviathan" } });
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ key: "default_mission_format" }),
      expect.anything(),
    );
  });
});
