import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getAppSetting } from "@/db/queries/appSettings";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface GameDayListState {
  cp: number;
  cpHistory: number[];
  startingCp: number;
  checklistItems: ChecklistItem[];
  usedAbilities: string[];
}

interface GameDayStore {
  listStates: Record<string, GameDayListState>;

  setStartingCp: (listId: number, cp: number) => void;
  spendCp: (listId: number, cost: number) => void;
  gainCp: (listId: number) => void;
  undoCp: (listId: number) => void;
  toggleChecklistItem: (listId: number, itemId: string) => void;
  addChecklistItem: (listId: number, text: string) => void;
  resetChecklist: (listId: number) => void;
  toggleAbilityUsed: (listId: number, abilityKey: string) => void;
  setDefaultChecklist: (listId: number, items: ChecklistItem[]) => void;
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "default-1", text: "Verify army list points", checked: false },
  { id: "default-2", text: "Check detachment rules", checked: false },
  { id: "default-3", text: "Review stratagems", checked: false },
  { id: "default-4", text: "Confirm faction rules", checked: false },
  { id: "default-5", text: "Set up terrain", checked: false },
];

function getListState(state: GameDayStore, listId: number): GameDayListState {
  return state.listStates[String(listId)] ?? {
    cp: 0,
    cpHistory: [],
    startingCp: 0,
    checklistItems: [...DEFAULT_CHECKLIST.map((item) => ({ ...item }))],
    usedAbilities: [],
  };
}

function setListState(
  state: GameDayStore,
  listId: number,
  partial: Partial<GameDayListState>,
): { listStates: Record<string, GameDayListState> } {
  const key = String(listId);
  const cur = getListState(state, listId);
  return {
    listStates: {
      ...state.listStates,
      [key]: { ...cur, ...partial },
    },
  };
}

/**
 * Phase 110 (D-06, D-07): Persist migration function for Zustand store.
 *
 * v0 → v1: OPG keys changed from "unitId::abilityName" (AUTOINCREMENT-based)
 * to "unitId:abilityName" (composite). Any key containing "::" is a stale
 * v0 key and must be dropped — the user will simply re-toggle those abilities.
 *
 * Exported for direct testing without a full Zustand render environment.
 */
export function migrateGameDayState(
  persistedState: unknown,
  fromVersion: number,
): GameDayStore {
  if (fromVersion === 0) {
    const old = persistedState as { listStates?: Record<string, GameDayListState> };
    if (old.listStates) {
      const newStates: Record<string, GameDayListState> = {};
      for (const [key, ls] of Object.entries(old.listStates)) {
        newStates[key] = {
          ...ls,
          usedAbilities: Array.isArray(ls.usedAbilities)
            ? ls.usedAbilities.filter((k) => !k.includes("::"))
            : [],
        };
      }
      return { ...(persistedState as Record<string, unknown>), listStates: newStates } as GameDayStore;
    }
  }
  return persistedState as GameDayStore;
}

export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set) => ({
      listStates: {},

      setStartingCp: (listId, cp) =>
        set((s) => setListState(s, listId, { startingCp: cp, cp, cpHistory: [] })),

      spendCp: (listId, cost) =>
        set((s) => {
          const cur = getListState(s, listId);
          const safeCost = Math.max(0, cost);
          return setListState(s, listId, {
            cpHistory: [...cur.cpHistory, cur.cp],
            cp: Math.max(0, cur.cp - safeCost),
          });
        }),

      gainCp: (listId) =>
        set((s) => {
          const cur = getListState(s, listId);
          return setListState(s, listId, {
            cpHistory: [...cur.cpHistory, cur.cp],
            cp: cur.cp + 1,
          });
        }),

      undoCp: (listId) =>
        set((s) => {
          const cur = getListState(s, listId);
          if (cur.cpHistory.length === 0) return s;
          const history = [...cur.cpHistory];
          const prev = history.pop()!;
          return setListState(s, listId, {
            cp: prev,
            cpHistory: history,
          });
        }),

      toggleChecklistItem: (listId, itemId) =>
        set((s) => {
          const cur = getListState(s, listId);
          return setListState(s, listId, {
            checklistItems: cur.checklistItems.map((item) =>
              item.id === itemId ? { ...item, checked: !item.checked } : item,
            ),
          });
        }),

      addChecklistItem: (listId, text) =>
        set((s) => {
          const cur = getListState(s, listId);
          return setListState(s, listId, {
            checklistItems: [
              ...cur.checklistItems,
              { id: crypto.randomUUID(), text, checked: false },
            ],
          });
        }),

      resetChecklist: (listId) =>
        set((s) => {
          const cur = getListState(s, listId);
          return setListState(s, listId, {
            checklistItems: cur.checklistItems.map((item) => ({
              ...item,
              checked: false,
            })),
          });
        }),

      toggleAbilityUsed: (listId, abilityKey) =>
        set((s) => {
          const cur = getListState(s, listId);
          const idx = cur.usedAbilities.indexOf(abilityKey);
          return setListState(s, listId, {
            usedAbilities:
              idx >= 0
                ? cur.usedAbilities.filter((k) => k !== abilityKey)
                : [...cur.usedAbilities, abilityKey],
          });
        }),

      setDefaultChecklist: (listId, items) =>
        set((s) => {
          const key = String(listId);
          if (s.listStates[key]) return s; // never overwrite existing sessions
          return {
            listStates: {
              ...s.listStates,
              [key]: { ...createDefaultState(), checklistItems: items },
            },
          };
        }),
    }),
    {
      name: "game-day-state",
      version: 1,
      migrate: migrateGameDayState,
    },
  ),
);

function createDefaultState(): GameDayListState {
  return {
    cp: 0,
    cpHistory: [],
    startingCp: 0,
    checklistItems: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
    usedAbilities: [],
  };
}

export function useGameDayListState(listId: number): GameDayListState {
  return (
    useGameDayStore((s) => s.listStates[String(listId)]) ?? createDefaultState()
  );
}

/** Reads custom checklist defaults from app_settings, falling back to DEFAULT_CHECKLIST. */
export async function getDefaultChecklist(): Promise<ChecklistItem[]> {
  const raw = await getAppSetting("default_checklist");
  if (!raw) return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  try {
    const parsed = JSON.parse(raw) as Array<{ text: string }>;
    return parsed.map((entry) => ({
      id: crypto.randomUUID(),
      text: entry.text,
      checked: false,
    }));
  } catch {
    return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  }
}
