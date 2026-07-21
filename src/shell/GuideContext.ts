import { createContext, useContext } from 'react';

/** What the Guide panel shows for the active room. */
export interface Guide {
  /** small label above the title — instrument name or "Step 3 of 8" */
  eyebrow: string;
  title: string;
  seeing: string;
  painting: string;
  /** stepped rooms (Learn) supply these to move through lessons from the guide */
  onPrev?: () => void;
  onNext?: () => void;
  progress?: { i: number; n: number };
}

export interface GuideCtx {
  guide: Guide | null;
  setGuide: (g: Guide | null) => void;
}

export const GuideContext = createContext<GuideCtx>({ guide: null, setGuide: () => {} });

export function useGuide() {
  return useContext(GuideContext);
}
