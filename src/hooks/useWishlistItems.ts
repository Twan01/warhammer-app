import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWishlistItems,
  createWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
} from "@/db/queries/wishlistItems";
import type {
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
} from "@/types/wishlistItem";

export const WISHLIST_ITEMS_KEY = ["wishlist-items"] as const;

export function useWishlistItems() {
  return useQuery({ queryKey: WISHLIST_ITEMS_KEY, queryFn: getWishlistItems });
}

export function useCreateWishlistItem() {
  const qc = useQueryClient();
  return useMutation<number, Error, CreateWishlistItemInput>({
    mutationFn: createWishlistItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_ITEMS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateWishlistItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateWishlistItemInput>({
    mutationFn: updateWishlistItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_ITEMS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteWishlistItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteWishlistItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_ITEMS_KEY });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
