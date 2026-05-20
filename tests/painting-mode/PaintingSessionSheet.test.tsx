/**
 * Phase 87 SL-01 -- PaintingSessionSheet behavioral tests.
 *
 * Verifies:
 * - Renders prefilled context block with unitName, recipeName, stepName, sectionName
 * - Form defaults: duration=30, notes empty
 * - Submit calls onSubmit with entered values
 * - Keep Working button calls onClose
 * - Save & Mark Done submits the form
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaintingSessionSheet } from "@/features/painting-mode/PaintingSessionSheet";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaintingSessionSheet", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    unitName: "Intercessors",
    recipeName: "Ultramarines Scheme",
    stepName: "Apply base coat",
    sectionName: "Basecoat",
    onSubmit: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SL-01: renders prefilled context block with unitName, recipeName, stepName, sectionName", () => {
    render(<PaintingSessionSheet {...defaultProps} />);

    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Ultramarines Scheme")).toBeInTheDocument();
    expect(screen.getByText("Apply base coat")).toBeInTheDocument();
    expect(screen.getByText("Basecoat")).toBeInTheDocument();
  });

  it("SL-01: omits sectionName when null", () => {
    render(<PaintingSessionSheet {...defaultProps} sectionName={null} />);

    expect(screen.getByText("Intercessors")).toBeInTheDocument();
    expect(screen.getByText("Apply base coat")).toBeInTheDocument();
    expect(screen.queryByText("Basecoat")).not.toBeInTheDocument();
  });

  it("SL-01: form defaults duration to 30", () => {
    render(<PaintingSessionSheet {...defaultProps} />);

    const durationInput = screen.getByRole("spinbutton");
    expect(durationInput).toHaveValue(30);
  });

  it("SL-01: Keep Working button calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PaintingSessionSheet {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /Keep Working/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("SL-01: Save & Mark Done submits form with duration and notes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaintingSessionSheet {...defaultProps} onSubmit={onSubmit} />);

    // Clear default duration and type new value
    const durationInput = screen.getByRole("spinbutton");
    await user.clear(durationInput);
    await user.type(durationInput, "45");

    // Type notes
    const notesTextarea = screen.getByPlaceholderText("Optional notes");
    await user.type(notesTextarea, "Looking good");

    // Submit
    await user.click(screen.getByRole("button", { name: /Save & Mark Done/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(45, "Looking good");
    });
  });

  it("SL-01: Save & Mark Done submits with null notes when notes field empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaintingSessionSheet {...defaultProps} onSubmit={onSubmit} />);

    // Submit with defaults (duration=30, no notes)
    await user.click(screen.getByRole("button", { name: /Save & Mark Done/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(30, null);
    });
  });

  it("SL-01: Save & Mark Done disabled when isPending", () => {
    render(<PaintingSessionSheet {...defaultProps} isPending={true} />);

    expect(screen.getByRole("button", { name: /Save & Mark Done/i })).toBeDisabled();
  });
});
