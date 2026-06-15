/**
 * Shared PDF generation for army list export.
 *
 * Used by ArmyListDetailPage for jsPDF + autoTable rendering.
 * Phase g91: category-grouped tables, model counts, wargear loadout lines,
 * rich header/footer with page numbers.
 *
 * Phase h48: adds generateBattleRosterPdf for full battle-ready roster
 * (Section A: Roster Summary, Section B: Datasheets, Section C: Detachment).
 * generateArmyListPdf is preserved unchanged for print-preview path.
 */

import type { ExportData } from "@/lib/exportArmyList";
import { dateStamp } from "@/lib/exportArmyList";
import type { RosterData } from "@/lib/exportRoster";
import { rulesTextToPlain } from "@/lib/rulesTextToPlain";

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

// ---------------------------------------------------------------------------
// Private helper: renderSummary
// Draws the Roster Summary (header + category tables + enhancements + total)
// and returns the finalY after the grand total line.
// ---------------------------------------------------------------------------

function renderSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoTable: any,
  data: ExportData,
  listName: string,
  detachmentName: string | null,
  pointsLimit: number | null,
): number {
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

  return currentY;
}

// ---------------------------------------------------------------------------
// Private helper: stampFooters
// Stamps "Page X of Y" + "Generated by HobbyForge" on every page.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stampFooters(doc: any): void {
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
}

// ---------------------------------------------------------------------------
// generateArmyListPdf — EXISTING, UNCHANGED (print-preview path)
// ---------------------------------------------------------------------------

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

  renderSummary(doc, autoTable, data, listName, detachmentName, pointsLimit);

  stampFooters(doc);

  return doc.output("arraybuffer");
}

// ---------------------------------------------------------------------------
// generateBattleRosterPdf — NEW (full battle-ready roster)
// ---------------------------------------------------------------------------

/**
 * Generate a full battle-ready roster PDF with:
 *   Section A: Roster Summary (category-grouped units, enhancements, total)
 *   Section B: Datasheets (stat blocks, weapon tables, grouped abilities)
 *   Section C: Detachment (rule, stratagems, assigned enhancements) — only when set
 *
 * Returns raw ArrayBuffer for writing to disk via Tauri.
 */
export async function generateBattleRosterPdf(
  roster: RosterData,
  listName: string,
  pointsLimit: number | null,
): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 40; // left=20, right=20
  const pageBottom = pageHeight - 18;
  const topMargin = 20;
  const lineHeight = 4; // mm per line of text at ~8pt

  // ── Section A: Roster Summary ──────────────────────────────────────────────

  const detachmentDisplayName =
    roster.detachment?.detachmentName ??
    roster.summary.list.detachment_name ??
    null;

  renderSummary(
    doc,
    autoTable,
    roster.summary,
    listName,
    detachmentDisplayName,
    pointsLimit,
  );

  // ── Section B: Datasheets ──────────────────────────────────────────────────

  doc.addPage();
  let currentY = topMargin;

  // Section title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DATASHEETS", 20, currentY);
  currentY += 8;

  /**
   * Ensure there is at least `needed` mm remaining on the current page.
   * If not, add a new page and reset currentY.
   */
  function ensureSpace(needed: number): void {
    if (currentY + needed > pageBottom) {
      doc.addPage();
      currentY = topMargin;
    }
  }

  for (const sheet of roster.datasheets) {
    ensureSpace(40);

    // Datasheet title line
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const countStr = sheet.count > 1 ? `  x${sheet.count}` : "";
    doc.text(`${sheet.displayName}${countStr}  —  ${sheet.points}pts`, 20, currentY);
    currentY += 6;

    if (sheet.detail === null) {
      // Ghost or unavailable unit
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(102, 102, 102);
      doc.text("Planned — no datasheet available.", 20, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 8;
      continue;
    }

    const detail = sheet.detail;

    // Stat block table
    if (detail.models.length > 0) {
      ensureSpace(16);
      autoTable(doc, {
        startY: currentY,
        head: [["Model", "M", "T", "Sv", "Inv", "W", "Ld", "OC"]],
        body: detail.models.map((m) => [
          m.name ?? "—",
          m.M ?? "—",
          m.T != null ? String(m.T) : "—",
          m.Sv ?? "—",
          m.inv_sv ?? "—",
          m.W != null ? String(m.W) : "—",
          m.Ld ?? "—",
          m.OC != null ? String(m.OC) : "—",
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [80, 80, 80], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 14 },
          2: { cellWidth: 14 },
          3: { cellWidth: 14 },
          4: { cellWidth: 14 },
          5: { cellWidth: 14 },
          6: { cellWidth: 14 },
          7: { cellWidth: 14 },
        },
        margin: { left: 20, right: 20 },
      });
      currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 4;
    }

    // Ranged weapons table
    const rangedWeapons = detail.weapons.filter((w) => w.category === "Ranged");
    if (rangedWeapons.length > 0) {
      ensureSpace(16);
      autoTable(doc, {
        startY: currentY,
        head: [["Ranged", "Range", "A", "BS", "S", "AP", "D"]],
        body: rangedWeapons.map((w) => [
          w.name,
          w.range ?? "—",
          w.attacks ?? "—",
          w.skill ?? "—",
          w.strength ?? "—",
          w.ap ?? "—",
          w.damage ?? "—",
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [80, 80, 80], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 18 },
          2: { cellWidth: 14 },
          3: { cellWidth: 14 },
          4: { cellWidth: 14 },
          5: { cellWidth: 14 },
          6: { cellWidth: 14 },
        },
        margin: { left: 20, right: 20 },
      });
      currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 4;
    }

    // Melee weapons table (anything not "Ranged")
    const meleeWeapons = detail.weapons.filter((w) => w.category !== "Ranged");
    if (meleeWeapons.length > 0) {
      ensureSpace(16);
      autoTable(doc, {
        startY: currentY,
        head: [["Melee", "Range", "A", "WS", "S", "AP", "D"]],
        body: meleeWeapons.map((w) => [
          w.name,
          w.range ?? "Melee",
          w.attacks ?? "—",
          w.skill ?? "—",
          w.strength ?? "—",
          w.ap ?? "—",
          w.damage ?? "—",
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [80, 80, 80], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 18 },
          2: { cellWidth: 14 },
          3: { cellWidth: 14 },
          4: { cellWidth: 14 },
          5: { cellWidth: 14 },
          6: { cellWidth: 14 },
        },
        margin: { left: 20, right: 20 },
      });
      currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 4;
    }

    // Abilities: group into Core, Faction, Unit
    if (detail.abilities.length > 0) {
      const coreAbilities = detail.abilities.filter((a) => a.ability_type === "Core");
      const factionAbilities = detail.abilities.filter((a) => a.ability_type === "Faction");
      const unitAbilities = detail.abilities.filter(
        (a) => a.ability_type !== "Core" && a.ability_type !== "Faction"
      );

      const abilityGroups = [
        { label: "Core", abilities: coreAbilities },
        { label: "Faction", abilities: factionAbilities },
        { label: "Unit", abilities: unitAbilities },
      ].filter((g) => g.abilities.length > 0);

      for (const group of abilityGroups) {
        ensureSpace(10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(group.label.toUpperCase(), 20, currentY);
        currentY += 4;

        for (const ability of group.abilities) {
          const plainDesc = rulesTextToPlain(ability.description);
          const descLines = doc.splitTextToSize(plainDesc, contentWidth);
          const bodyHeight = descLines.length * lineHeight;
          ensureSpace(6 + bodyHeight);

          // Ability name (bold)
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(ability.name, 20, currentY);
          currentY += 4;

          // Ability description (normal)
          if (plainDesc) {
            doc.setFont("helvetica", "normal");
            doc.text(descLines, 20, currentY);
            currentY += bodyHeight + 2;
          }
        }

        currentY += 2; // gap between groups
      }
    }

    currentY += 4; // gap between datasheets
  }

  // ── Section C: Detachment (only when set) ─────────────────────────────────

  if (roster.detachment != null) {
    const det = roster.detachment;

    doc.addPage();
    currentY = topMargin;

    // Section title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`DETACHMENT — ${det.detachmentName}`, 20, currentY);
    currentY += 8;

    // Detachment abilities (rules)
    if (det.abilities.length > 0) {
      for (const ability of det.abilities) {
        const plainDesc = rulesTextToPlain(ability.description);
        const descLines = doc.splitTextToSize(plainDesc, contentWidth);
        const bodyHeight = descLines.length * lineHeight;
        ensureSpace(6 + bodyHeight);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(ability.name, 20, currentY);
        currentY += 5;

        if (plainDesc) {
          doc.setFont("helvetica", "normal");
          doc.text(descLines, 20, currentY);
          currentY += bodyHeight + 4;
        }
      }
    }

    // Stratagems
    if (det.stratagems.length > 0) {
      ensureSpace(12);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("STRATAGEMS", 20, currentY);
      currentY += 6;

      for (const strat of det.stratagems) {
        const plainDesc = rulesTextToPlain(strat.description);
        const descLines = doc.splitTextToSize(plainDesc, contentWidth);
        const bodyHeight = descLines.length * lineHeight;
        ensureSpace(14 + bodyHeight);

        // Name + CP
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${strat.name}  (${strat.cp_cost}CP)`, 20, currentY);
        currentY += 4;

        // Meta line: type · turn · phase (omit empty)
        const metaParts = [strat.type, strat.turn, strat.phase].filter(Boolean);
        if (metaParts.length > 0) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          doc.text(metaParts.join(" · "), 20, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 4;
        }

        // Description
        if (plainDesc) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(descLines, 20, currentY);
          currentY += bodyHeight + 4;
        }
      }
    }

    // Assigned Enhancements
    if (det.enhancements.length > 0) {
      ensureSpace(10);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("ASSIGNED ENHANCEMENTS", 20, currentY);
      currentY += 6;

      for (const enh of det.enhancements) {
        ensureSpace(8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${enh.name} — ${enh.points}pts  (on ${enh.onUnit})`, 20, currentY);
        currentY += 6;
      }
    }
  }

  // ── Footer on every page ───────────────────────────────────────────────────

  stampFooters(doc);

  return doc.output("arraybuffer");
}
