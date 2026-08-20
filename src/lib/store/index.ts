import { create } from "zustand";

interface AppState {
  /** Job currently open in analysis / proposal / screening context, drives nav + breadcrumbs. */
  currentJobId: string | null;
  setCurrentJobId: (id: string | null) => void;

  /** Paste-flow textarea, kept across navigation so an accidental back doesn't lose input. */
  pasteDraft: string;
  setPasteDraft: (text: string) => void;

  /** Proposal Studio: humanize diff view toggle, shared between draft pane and review panel. */
  humanizeView: boolean;
  setHumanizeView: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentJobId: null,
  setCurrentJobId: (id) => set({ currentJobId: id }),

  pasteDraft: "",
  setPasteDraft: (text) => set({ pasteDraft: text }),

  humanizeView: false,
  setHumanizeView: (v) => set({ humanizeView: v }),
}));
