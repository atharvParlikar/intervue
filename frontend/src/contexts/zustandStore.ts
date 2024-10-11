import { create } from "zustand";

type Store = {
  code: string;
  updateCode: (newCode: string) => void;
};

export const useStore = create<Store>((set) => ({
  code: "",
  updateCode: (newCode: string) => set({ code: newCode }),
}));
