import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { parsePipelineLabels } from "@/lib/stageLabel";

// ---- HOB-01: parsePipelineLabels direct unit tests ----

describe("HOB-01: parsePipelineLabels exported utility", () => {
  it("returns empty object when pipeline_labels key is absent", () => {
    expect(parsePipelineLabels({})).toEqual({});
  });

  it("returns parsed map when pipeline_labels is valid JSON", () => {
    const settings = {
      pipeline_labels: JSON.stringify({
        Assembly: "Build",
        Done: "Finished",
      }),
    };
    expect(parsePipelineLabels(settings)).toEqual({
      Assembly: "Build",
      Done: "Finished",
    });
  });

  it("returns empty object when pipeline_labels is malformed JSON", () => {
    expect(parsePipelineLabels({ pipeline_labels: "NOT{JSON" })).toEqual({});
  });

  it("returns empty object when pipeline_labels is empty string", () => {
    expect(parsePipelineLabels({ pipeline_labels: "" })).toEqual({});
  });
});

// ---- HOB-01 / HOB-02 / HOB-03: Component interaction gaps ----

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
import { HobbyDefaultsSection } from "@/features/settings/HobbyDefaultsSection";

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

describe("HOB-01: pipeline label save removes key when reset to default name", () => {
  it("deletes bucket key from map when user clears input back to default", () => {
    // Start with a custom label for Assembly
    mockSettings({
      pipeline_labels: JSON.stringify({ Assembly: "Build Phase", Done: "Complete" }),
    });
    render(<HobbyDefaultsSection />);
    const assemblyInput = screen.getByPlaceholderText("Assembly");
    // User clears the field (empty string) which should reset to default bucket name
    fireEvent.blur(assemblyInput, { target: { value: "" } });
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "pipeline_labels",
      }),
      expect.anything(),
    );
    // The saved value should NOT include Assembly (it was reset to default)
    // but should still include Done
    const savedValue = JSON.parse(mockMutate.mock.calls[0][0].value);
    expect(savedValue).not.toHaveProperty("Assembly");
    expect(savedValue).toHaveProperty("Done", "Complete");
  });

  it("saves trimmed value when user enters label with whitespace", () => {
    mockSettings({});
    render(<HobbyDefaultsSection />);
    const assemblyInput = screen.getByPlaceholderText("Assembly");
    fireEvent.blur(assemblyInput, { target: { value: "  Build Phase  " } });
    expect(mockMutate).toHaveBeenCalled();
    const savedValue = JSON.parse(mockMutate.mock.calls[0][0].value);
    expect(savedValue.Assembly).toBe("Build Phase");
  });
});

describe("HOB-01: pipeline inputs show existing custom labels from settings", () => {
  it("displays custom label as defaultValue when settings has override", () => {
    mockSettings({
      pipeline_labels: JSON.stringify({ Assembly: "Build Phase" }),
    });
    render(<HobbyDefaultsSection />);
    const assemblyInput = screen.getByPlaceholderText("Assembly") as HTMLInputElement;
    expect(assemblyInput.value).toBe("Build Phase");
  });
});

describe("HOB-02: checklist add-item via Enter key submits new item", () => {
  it("pressing Enter in add-item input adds new checklist entry", () => {
    render(<HobbyDefaultsSection />);
    const addInput = screen.getByPlaceholderText("Add checklist item...");
    fireEvent.change(addInput, { target: { value: "Roll for initiative" } });
    fireEvent.keyDown(addInput, { key: "Enter" });
    expect(screen.getByText("Roll for initiative")).toBeInTheDocument();
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ key: "default_checklist" }),
      expect.anything(),
    );
  });
});

describe("HOB-02: Add Item button disabled when input is empty or whitespace", () => {
  it("Add Item button is disabled when input is empty", () => {
    render(<HobbyDefaultsSection />);
    const addButton = screen.getByRole("button", { name: /Add Item/i });
    expect(addButton).toBeDisabled();
  });

  it("Add Item button is disabled when input is only whitespace", () => {
    render(<HobbyDefaultsSection />);
    const addInput = screen.getByPlaceholderText("Add checklist item...");
    fireEvent.change(addInput, { target: { value: "   " } });
    const addButton = screen.getByRole("button", { name: /Add Item/i });
    expect(addButton).toBeDisabled();
  });

  it("Add Item button is enabled when input has real text", () => {
    render(<HobbyDefaultsSection />);
    const addInput = screen.getByPlaceholderText("Add checklist item...");
    fireEvent.change(addInput, { target: { value: "New item" } });
    const addButton = screen.getByRole("button", { name: /Add Item/i });
    expect(addButton).not.toBeDisabled();
  });
});

describe("HOB-02: checklist shows custom items from settings", () => {
  it("renders custom checklist items when default_checklist setting exists", () => {
    mockSettings({
      default_checklist: JSON.stringify([
        { text: "Bring extra dice" },
        { text: "Print army list" },
      ]),
    });
    render(<HobbyDefaultsSection />);
    expect(screen.getByText("Bring extra dice")).toBeInTheDocument();
    expect(screen.getByText("Print army list")).toBeInTheDocument();
    // Default items should NOT be present
    expect(screen.queryByText("Verify army list points")).not.toBeInTheDocument();
  });
});

describe("HOB-03: mission format shows existing value from settings", () => {
  it("displays saved mission format as defaultValue when setting exists", () => {
    mockSettings({
      default_mission_format: "Leviathan",
    });
    render(<HobbyDefaultsSection />);
    const missionInput = screen.getByPlaceholderText(
      "e.g., Take and Hold, Leviathan...",
    ) as HTMLInputElement;
    expect(missionInput.value).toBe("Leviathan");
  });
});

describe("HOB-03: mission format save trims whitespace", () => {
  it("saves trimmed value when user enters format with spaces", () => {
    render(<HobbyDefaultsSection />);
    const missionInput = screen.getByPlaceholderText(
      "e.g., Take and Hold, Leviathan...",
    );
    fireEvent.blur(missionInput, { target: { value: "  Take and Hold  " } });
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "default_mission_format",
        value: "Take and Hold",
      }),
      expect.anything(),
    );
  });
});

describe("HOB-02: adding item with empty text does not mutate", () => {
  it("clicking Add Item with empty trimmed text does not call mutate", () => {
    render(<HobbyDefaultsSection />);
    const addInput = screen.getByPlaceholderText("Add checklist item...");
    fireEvent.change(addInput, { target: { value: "   " } });
    // Force click even though button is disabled
    const addButton = screen.getByRole("button", { name: /Add Item/i });
    fireEvent.click(addButton);
    // The button is disabled, so the click should not trigger mutation
    // Only pipeline_labels or mission_format from blur events, not default_checklist
    const checklistCalls = mockMutate.mock.calls.filter(
      (call: unknown[]) => (call[0] as { key: string }).key === "default_checklist",
    );
    expect(checklistCalls).toHaveLength(0);
  });
});
