import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface GameDayListState {
  cp: number;
  prevCp: number | null;
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
    prevCp: null,
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

export const useGameDayStore = create<GameDayStore>()(
  persist(
    (set) => ({
      listStates: {},

      setStartingCp: (listId, cp) =>
        set((s) => setListState(s, listId, { startingCp: cp, cp, prevCp: null })),

      spendCp: (listId, cost) =>
        set((s) => {
          const cur = getListState(s, listId);
          const safeCost = Math.max(0, cost);
          return setListState(s, listId, {
            prevCp: cur.cp,
            cp: Math.max(0, cur.cp - safeCost),
          });
        }),

      gainCp: (listId) =>
        set((s) => {
          const cur = getListState(s, listId);
          return setListState(s, listId, {
            prevCp: cur.cp,
            cp: cur.cp + 1,
          });
        }),

      undoCp: (listId) =>
        set((s) => {
          const cur = getListState(s, listId);
          return setListState(s, listId, {
            cp: cur.prevCp ?? cur.cp,
            prevCp: null,
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
    }),
    { name: "game-day-state" },
  ),
);

const DEFAULT_STATE: GameDayListState = {
  cp: 0,
  prevCp: null,
  startingCp: 0,
  checklistItems: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
  usedAbilities: [],
};

export function useGameDayListState(listId: number): GameDayListState {
  return (
    useGameDayStore((s) => s.listStates[String(listId)]) ?? DEFAULT_STATE
  );
}
