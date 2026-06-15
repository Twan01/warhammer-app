/**
 * Shared PDF generation for army list export.
 *
 * Used by ArmyListDetailPage for jsPDF + autoTable rendering.
 * Phase g91: category-grouped tables, model counts, wargear loadout lines,
 * rich header/footer with page numbers.
 */

import type { ExportData } from "@/lib/exportArmyList";
import { dateStamp } from "@/lib/exportArmyList";

// Canonical battlefield role ordering — mirrors ArmyListDetailPage.tsx
const ROLE_ORDER = [
  "Character",
  "Epic Hero",
  "Battleline",
  "Infantry",
  "Mounted",
  "Beast",
  "Vehicle",
  "Monster",
  "Fortification",
  "Dedicated Transport",
];

function categorySort(a: string, b: string): number {
  const ai = ROLE_ORDER.indexOf(a);
  const bi = ROLE_ORDER.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
}

/**
 * Generate an army list PDF and return the raw ArrayBuffer.
 * Lazy-loads jsPDF and jspdf-autotable on first call.
 */
export async function generateArmyListPdf(
  data: ExportData,
  listName: string,
  detachmentName: string | null,
  pointsLimit: number | null,
): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const grandTotal = data.totalPoints + data.enhancementTotal;
  const totalModelCount = data.sortedUnits.reduce(
    (sum, u) => sum + (u.selectedModelCount ?? 0),
    0,
  );

  // ── Header ──────────────────────────────────────────────────────────────────

  // Army name (title)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(listName, 20, 22);

  // Metadata: faction, detachment, date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 51, 51);
  doc.text(
    `Faction: ${data.factionName ?? "None"}  |  Detachment: ${detachmentName ?? "None"}  |  ${dateStamp()}`,
    20,
    29,
  );

  // Summary line: total vs limit, unit count, model count
  const limitStr = pointsLimit != null ? ` / ${pointsLimit}pts` : "";
  doc.text(
    `Total: ${grandTotal}pts${limitStr}  |  Units: ${data.sortedUnits.length}  |  Models: ${totalModelCount}`,
    20,
    35,
  );
  doc.setTextColor(0, 0, 0);

  // ── Category-grouped unit tables ────────────────────────────────────────────

  // Group units by category; null/undefined -> "Uncategorized"
  const categoryMap = new Map<string, typeof data.sortedUnits>();
  for (const unit of data.sortedUnits) {
    const cat = unit.unitCategory ?? "Uncategorized";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(unit);
  }

  // Sort categories by roleOrder then localeCompare
  const sortedCategories = Array.from(categoryMap.keys()).sort(categorySort);

  let currentY = 42;

  for (const category of sortedCategories) {
    const catUnits = categoryMap.get(category)!;
    const catTotal = catUnits.reduce((sum, u) => sum + u.points, 0);

    // Section header: category name + subtotal
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${category}  —  ${catTotal}pts`, 20, currentY);
    currentY += 4;

    // Build rows for this category
    const bodyRows: (string | number)[][] = [];
    for (const unit of catUnits) {
      let name = unit.displayName;
      if (unit.isGhost) name += " (Planned)";
      if (unit.isWarlord) name += " (Warlord)";
      const models = unit.selectedModelCount != null ? String(unit.selectedModelCount) : "";
      const notes = unit.leaderLabel ?? unit.enhancementName ?? "";
      bodyRows.push([models, name, `${unit.points}pts`, notes]);

      // Wargear sub-row (appended to Notes cell as second line via a dedicated row)
      if (unit.wargear.length > 0) {
        const loadoutText =
          "Loadout: " +
          unit.wargear
            .map((w) => `${w.quantity}x ${w.weapon_name}`)
            .join(", ");
        // Span via empty model/points, indented name
        bodyRows.push(["", `  ${loadoutText}`, "", ""]);
      }
    }

    autoTable(doc, {
      startY: currentY,
      head: [["Models", "Unit", "Points", "Notes"]],
      body: bodyRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 16 },  // Models
        1: { cellWidth: "auto" },
        2: { cellWidth: 20 },  // Points
        3: { cellWidth: 50 },  // Notes
      },
      margin: { left: 20, right: 20 },
      didDrawCell: undefined,
    });

    currentY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        ?.finalY + 8;
  }

  // ── Enhancements section ────────────────────────────────────────────────────

  if (data.enhancements.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Enhancements", 20, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [["Enhancement", "Points"]],
      body: data.enhancements.map((e) => [
        e.enhancement_name,
        `${e.enhancement_points}pts`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 20, right: 20 },
    });

    currentY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        ?.finalY + 8;
  }

  // ── Grand total line ────────────────────────────────────────────────────────

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Total: ${grandTotal}pts${pointsLimit != null ? ` / ${pointsLimit}pts` : ""}`,
    20,
    currentY,
  );

  // ── Footer: "Page X of Y" + branding on every page ──────────────────────────

  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(153, 153, 153);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );
    doc.text(
      "Generated by HobbyForge",
      pageWidth - 20,
      pageHeight - 10,
      { align: "right" },
    );
    doc.setTextColor(0, 0, 0);
  }

  return doc.output("arraybuffer");
}
