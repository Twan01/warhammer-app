/**
 * Phase 104 — Static faction-to-alignment mapping for the Unit Database browser.
 *
 * Maps each of the 25 Warhammer 40k faction IDs to one of 4 alignment groups,
 * used by the FactionPicker sidebar to group factions visually.
 */

export type Alignment = "Space Marines" | "Imperium" | "Chaos" | "Xenos";

export const ALIGNMENT_ORDER: readonly Alignment[] = [
  "Space Marines",
  "Imperium",
  "Chaos",
  "Xenos",
] as const;

export const FACTION_ALIGNMENT: Record<string, Alignment> = {
  // Space Marines
  SM: "Space Marines",

  // Imperium
  AM: "Imperium",
  AoI: "Imperium",
  GK: "Imperium",
  QI: "Imperium",
  AC: "Imperium",
  AS: "Imperium",
  AdM: "Imperium",
  TL: "Imperium",
  UN: "Imperium",

  // Chaos
  CSM: "Chaos",
  TS: "Chaos",
  DG: "Chaos",
  EC: "Chaos",
  WE: "Chaos",
  QT: "Chaos",
  CD: "Chaos",

  // Xenos
  NEC: "Xenos",
  AE: "Xenos",
  ORK: "Xenos",
  TAU: "Xenos",
  LoV: "Xenos",
  TYR: "Xenos",
  DRU: "Xenos",
  GC: "Xenos",
};
