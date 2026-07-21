import { createContext, useContext } from 'react';

/** A key equation and the meaning of each symbol in it. */
export interface Formula {
  expr: string;
  terms: { sym: string; desc: string }[];
}

/** What the Guide panel shows for the active room. */
export interface Guide {
  /** small label above the title — instrument name or "Step 3 of 8" */
  eyebrow: string;
  title: string;
  seeing: string;
  painting: string;
  /** optional "Dig deeper" — how the physics actually works */
  deeper?: string;
  /** optional key equation + its variables, shown in an expandable inside "Dig deeper" */
  formula?: Formula;
  /** stepped rooms (Learn) supply these to move through lessons from the guide */
  onPrev?: () => void;
  onNext?: () => void;
  onStep?: (i: number) => void;
  progress?: { i: number; n: number };
  /** step titles, for labelling the navigation dots */
  stepLabels?: string[];
  /** false when the current room/step has no controls — the shell hides Adjust */
  adjustable?: boolean;
}

export interface GuideCtx {
  guide: Guide | null;
  setGuide: (g: Guide | null) => void;
}

export const GuideContext = createContext<GuideCtx>({ guide: null, setGuide: () => {} });

export function useGuide() {
  return useContext(GuideContext);
}
