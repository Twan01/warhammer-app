import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  getPhotosByUnit,
  createUnitPhoto,
  deleteUnitPhoto,
  getLatestPhotoByUnit,
} from "@/db/queries/unitPhotos";
import type { UnitPhoto, CreateUnitPhotoInput } from "@/types/unitPhoto";

/**
 * unit photos query keys (JOUR-04..06).
 * Per-unit factory.
 */
export const UNIT_PHOTOS_KEY = (unitId: number) =>
  ["unit-photos", unitId] as const;

/**
 * COLL-01 — batch query key for latest photo per unit across the entire collection.
 * staleTime: Infinity — only photo create/delete mutations invalidate.
 */
export const LATEST_UNIT_PHOTOS_KEY = ["unit-photos", "latest"] as const;

/**
 * UnitPhoto with its derived asset:// URL for use as <img src>.
 * The `assetUrl` is computed at hook level using convertFileSrc on
 * join(appDataDir(), file_path) — see 13-RESEARCH.md §Pattern 4.
 */
export interface UnitPhotoWithUrl extends UnitPhoto {
  assetUrl: string;
}

/**
 * Loads photo timeline for a unit, with each row's assetUrl pre-derived so
 * <img src={photo.assetUrl}> works directly in the JournalTab.
 *
 * appDataDir() is resolved ONCE per hook (not per thumbnail) — 13-RESEARCH.md
 * §Open Question 3. Joining + converting per row is cheap.
 *
 * staleTime: Infinity — photos only change via the mutations in this file.
 */
export function useUnitPhotos(unitId: number | undefined) {
  const [appDir, setAppDir] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    appDataDir().then((dir) => {
      if (!cancelled) setAppDir(dir);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useQuery({
    queryKey:
      unitId !== undefined ? UNIT_PHOTOS_KEY(unitId) : (["unit-photos"] as const),
    queryFn: async (): Promise<UnitPhotoWithUrl[]> => {
      if (unitId === undefined || appDir === null) return [];
      const rows = await getPhotosByUnit(unitId);
      return Promise.all(
        rows.map(async (row) => {
          const absolute = await join(appDir, row.file_path);
          return { ...row, assetUrl: convertFileSrc(absolute) };
        })
      );
    },
    enabled: unitId !== undefined && appDir !== null,
    staleTime: Infinity,
  });
}

export function useCreateUnitPhoto() {
  const qc = useQueryClient();
  return useMutation<void, Error, CreateUnitPhotoInput>({
    mutationFn: createUnitPhoto,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: UNIT_PHOTOS_KEY(variables.unit_id) });
      qc.invalidateQueries({ queryKey: LATEST_UNIT_PHOTOS_KEY });
    },
  });
}

export function useDeleteUnitPhoto(unitId: number) {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    number,
    { previous: UnitPhotoWithUrl[] | undefined }
  >({
    mutationFn: (photoId: number) => deleteUnitPhoto(photoId),
    onMutate: async (photoId) => {
      await qc.cancelQueries({ queryKey: UNIT_PHOTOS_KEY(unitId) });
      const previous = qc.getQueryData<UnitPhotoWithUrl[]>(UNIT_PHOTOS_KEY(unitId));
      qc.setQueryData<UnitPhotoWithUrl[]>(UNIT_PHOTOS_KEY(unitId), (old) =>
        (old ?? []).filter((p) => p.id !== photoId)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      qc.setQueryData(UNIT_PHOTOS_KEY(unitId), context?.previous);
      toast.error("Failed to delete photo — changes were not saved.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: UNIT_PHOTOS_KEY(unitId) });
      qc.invalidateQueries({ queryKey: LATEST_UNIT_PHOTOS_KEY });
    },
  });
}

/**
 * COLL-01 — batch-loads the latest photo per unit across the entire collection.
 * Returns Map<number, UnitPhotoWithUrl> keyed by entity_id (unit id).
 * staleTime: Infinity — only photo create/delete mutations invalidate.
 */
export function useLatestUnitPhotos() {
  const [appDir, setAppDir] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    appDataDir().then((dir) => {
      if (!cancelled) setAppDir(dir);
    });
    return () => { cancelled = true; };
  }, []);

  return useQuery({
    queryKey: LATEST_UNIT_PHOTOS_KEY,
    queryFn: async (): Promise<Map<number, UnitPhotoWithUrl>> => {
      if (appDir === null) return new Map();
      const rows = await getLatestPhotoByUnit();
      const withUrls = await Promise.all(
        rows.map(async (row) => {
          const absolute = await join(appDir, row.file_path);
          return { ...row, assetUrl: convertFileSrc(absolute) };
        })
      );
      return new Map(withUrls.map((r) => [r.entity_id, r]));
    },
    enabled: appDir !== null,
    staleTime: Infinity,
  });
}
