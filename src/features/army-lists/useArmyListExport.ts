import { useCallback } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  formatArmyListForExport,
  buildClipboardText,
  buildJsonFormat,
  slugify,
  dateStamp,
} from "@/lib/exportArmyList";
import { generateBattleRosterPdf } from "@/lib/exportArmyListPdf";
import { assembleRoster } from "@/lib/exportRoster";
import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement, ArmyListUnitWargear } from "@/types/armyList";
import type { Faction } from "@/types/faction";
import type { Locale } from "@/stores/localeStore";

export function useArmyListExport({
  list,
  units,
  listEnhancements,
  faction,
  listWargear,
  locale,
}: {
  list: ArmyList | undefined | null;
  units: ArmyListUnitRow[];
  listEnhancements: ArmyListEnhancement[];
  faction: Faction | null;
  listWargear: ArmyListUnitWargear[];
  locale: Locale;
}) {
  const handleCopyToClipboard = useCallback(async () => {
    if (!list) return;
    try {
      const data = formatArmyListForExport(list, units ?? [], listEnhancements ?? [], faction?.name ?? null);
      const text = buildClipboardText(data);
      await writeText(text);
      toast.success("List copied to clipboard");
    } catch {
      toast.error("Failed to copy — check clipboard permissions");
    }
  }, [list, units, listEnhancements, faction]);

  const handleSaveJson = useCallback(async () => {
    if (!list) return;
    try {
      const data = formatArmyListForExport(list, units ?? [], listEnhancements ?? [], faction?.name ?? null);
      const jsonString = buildJsonFormat(data);
      const destination = await save({
        title: "Save Army List as JSON",
        defaultPath: `${slugify(list.name)}-${dateStamp()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!destination) return;
      await writeTextFile(destination, jsonString);
      toast.success("List saved as JSON");
    } catch {
      toast.error("Failed to save JSON — check file permissions");
    }
  }, [list, units, listEnhancements, faction]);

  const handleSavePdf = useCallback(async () => {
    if (!list) return;
    try {
      // Build wargear map grouped by army_list_unit_id for the formatter
      const wargearMap = new Map<number, ArmyListUnitWargear[]>();
      for (const w of listWargear ?? []) {
        if (!wargearMap.has(w.army_list_unit_id)) wargearMap.set(w.army_list_unit_id, []);
        wargearMap.get(w.army_list_unit_id)!.push(w);
      }
      const data = formatArmyListForExport(
        list,
        units ?? [],
        listEnhancements ?? [],
        faction?.name ?? null,
        wargearMap,
      );
      const destination = await save({
        title: "Save Army List as PDF",
        defaultPath: `${slugify(list.name)}-${dateStamp()}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!destination) return;

      const roster = await assembleRoster({
        list,
        units: units ?? [],
        enhancements: listEnhancements ?? [],
        summary: data,
        locale,
      });
      const buffer = await generateBattleRosterPdf(roster, list.name, list.points_limit);
      await invoke("write_bytes_to_path", {
        destination,
        bytes: Array.from(new Uint8Array(buffer)),
      });
      toast.success("List saved as PDF");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }, [list, units, listEnhancements, faction, listWargear, locale]);

  return { handleCopyToClipboard, handleSaveJson, handleSavePdf };
}
