/**
 * Faction and sub-faction mapping constants for the unit database build pipeline.
 *
 * FACTION_MAP: BSData catalogue filename -> Wahapedia faction_id
 * SUB_FACTION_MAP: BSData catalogue filename -> sub-faction label (per D-09)
 */

/**
 * Maps BSData catalogue names to Wahapedia faction IDs.
 * Extracted verbatim from build-unit-db.ts.
 */
export const FACTION_MAP: Record<string, string> = {
  "Imperium - Space Marines": "SM",
  "Imperium - Black Templars": "SM",
  "Imperium - Blood Angels": "SM",
  "Imperium - Dark Angels": "SM",
  "Imperium - Deathwatch": "SM",
  "Imperium - Imperial Fists": "SM",
  "Imperium - Iron Hands": "SM",
  "Imperium - Raven Guard": "SM",
  "Imperium - Salamanders": "SM",
  "Imperium - Space Wolves": "SM",
  "Imperium - Ultramarines": "SM",
  "Imperium - White Scars": "SM",
  "Imperium - Adeptus Custodes": "AC",
  "Imperium - Adepta Sororitas": "AS",
  "Imperium - Adeptus Mechanicus": "AdM",
  "Imperium - Astra Militarum": "AM",
  "Imperium - Astra Militarum - Library": "AM",
  "Imperium - Grey Knights": "GK",
  "Imperium - Agents of the Imperium": "AoI",
  "Imperium - Imperial Knights": "QI",
  "Imperium - Imperial Knights - Library": "QI",
  "Imperium - Adeptus Titanicus": "TL",
  "Chaos - Chaos Space Marines": "CSM",
  "Chaos - Death Guard": "DG",
  "Chaos - Thousand Sons": "TS",
  "Chaos - World Eaters": "WE",
  "Chaos - Emperor's Children": "EC",
  "Chaos - Chaos Knights": "QT",
  "Chaos - Chaos Knights Library": "QT",
  "Chaos - Chaos Daemons": "CD",
  "Chaos - Chaos Daemons Library": "CD",
  "Chaos - Titanicus Traitoris": "TL",
  "Aeldari - Craftworlds": "AE",
  "Aeldari - Aeldari Library": "AE",
  "Aeldari - Drukhari": "DRU",
  "Aeldari - Ynnari": "AE",
  "Necrons": "NEC",
  "Orks": "ORK",
  "T'au Empire": "TAU",
  "Tyranids": "TYR",
  "Library - Tyranids": "TYR",
  "Genestealer Cults": "GC",
  "Leagues of Votann": "LoV",
  "Unaligned Forces": "UN",
  "Library - Titans": "TL",
  "Library - Astartes Heresy Legends": "SM",
};

/**
 * Maps BSData faction_id + catalogue to alternative Wahapedia faction_id for cross-faction matching.
 * Used when BSData groups units under a parent faction but Wahapedia has separate faction_ids.
 * Key: "bsdataName:bsdataFactionId", Value: alternative Wahapedia faction_id to try.
 */
export const CROSS_FACTION_MAP: Record<string, string> = {
  "Aeldari - Aeldari Library": "DRU", // Drukhari units live in Aeldari Library but Wahapedia uses DRU
};

/**
 * Maps BSData catalogue names to sub-faction labels (per D-09).
 *
 * Only chapter-specific / warband-specific catalogues are mapped here.
 * Units from base catalogues (e.g., "Imperium - Space Marines") get
 * sub_faction = null -- they are shared across all chapters.
 */
export const SUB_FACTION_MAP: Record<string, string> = {
  // Space Marines chapters
  "Imperium - Black Templars": "Black Templars",
  "Imperium - Blood Angels": "Blood Angels",
  "Imperium - Dark Angels": "Dark Angels",
  "Imperium - Deathwatch": "Deathwatch",
  "Imperium - Imperial Fists": "Imperial Fists",
  "Imperium - Iron Hands": "Iron Hands",
  "Imperium - Raven Guard": "Raven Guard",
  "Imperium - Salamanders": "Salamanders",
  "Imperium - Space Wolves": "Space Wolves",
  "Imperium - Ultramarines": "Ultramarines",
  "Imperium - White Scars": "White Scars",
  // Chaos Space Marines warbands
  "Chaos - Death Guard": "Death Guard",
  "Chaos - Thousand Sons": "Thousand Sons",
  "Chaos - World Eaters": "World Eaters",
  "Chaos - Emperor's Children": "Emperor's Children",
  // Aeldari sub-factions
  "Aeldari - Drukhari": "Drukhari",
  "Aeldari - Ynnari": "Ynnari",
};

/**
 * Maps faction keywords found in Datasheets_keywords.csv to sub-faction labels.
 *
 * Used during the pre-dedup sub-faction scan: if a unit's faction keywords include
 * one of these, it gets assigned the corresponding sub_faction BEFORE dedup runs.
 * This prevents chapter-specific unit variants (e.g., Black Templars Impulsor)
 * from being deduped away as duplicates of the generic SM version.
 *
 * Only keywords that appear as is_faction_keyword=true in the CSV are included.
 */
export const KEYWORD_SUB_FACTION_MAP: Record<string, string> = {
  // Space Marines chapters
  "Black Templars": "Black Templars",
  "Blood Angels": "Blood Angels",
  "Blood Ravens": "Blood Ravens",
  "Dark Angels": "Dark Angels",
  "Deathwatch": "Deathwatch",
  "Imperial Fists": "Imperial Fists",
  "Iron Hands": "Iron Hands",
  "Raven Guard": "Raven Guard",
  "Salamanders": "Salamanders",
  "Space Wolves": "Space Wolves",
  "Ultramarines": "Ultramarines",
  "White Scars": "White Scars",
  // Chaos warbands (faction keywords on CSM units)
  "Death Guard": "Death Guard",
  "Thousand Sons": "Thousand Sons",
  "World Eaters": "World Eaters",
  "Emperor's Children": "Emperor's Children",
  // Aeldari
  "Drukhari": "Drukhari",
  "Ynnari": "Ynnari",
};
