import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PuzzleObject = {
  id: string;
  name: string;
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
};

export type Puzzle = {
  id: string;
  title: string;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  objects: PuzzleObject[];
  createdAt: number;
  // Challenge fields
  challengeId?: string;
  challengerName?: string;
  challengerTime?: number; // seconds
  challengeMessage?: string;
  bestTime?: number; // local best time in seconds
  // Remix fields
  isRemix?: boolean;
  remixedBy?: string;
};

interface PuzzleStore {
  puzzles: Puzzle[];
  addPuzzle: (puzzle: Puzzle) => void;
  deletePuzzle: (id: string) => void;
  updatePuzzle: (id: string, patch: Partial<Puzzle>) => void;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
}

const usePuzzleStore = create<PuzzleStore>()(
  persist(
    (set) => ({
      puzzles: [],
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      addPuzzle: (puzzle) =>
        set((state) => ({ puzzles: [puzzle, ...state.puzzles] })),
      deletePuzzle: (id) =>
        set((state) => ({ puzzles: state.puzzles.filter((p) => p.id !== id) })),
      updatePuzzle: (id, patch) =>
        set((state) => ({
          puzzles: state.puzzles.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),
    }),
    {
      name: "puzzle-storage-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ puzzles: state.puzzles }) as Partial<PuzzleStore>,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export default usePuzzleStore;
