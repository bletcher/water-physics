import { createContext, useContext } from 'react';

/** Global, cross-room water colours the viewer can tune from Rooms → Settings. */
export interface Palette {
  /** water colour at rest, "#rrggbb" */
  primary: string;
  /** colour a full crest reaches, "#rrggbb" */
  crest: string;
}

export interface PaletteCtx {
  palette: Palette;
  /** value-study mode: flatten every scene into flat light/dark tones */
  valueStudy: boolean;
  setPalette: (patch: Partial<Palette>) => void;
  setValueStudy: (on: boolean) => void;
  /** restore the default water/crest colours */
  resetColours: () => void;
}

export const DEFAULT_PALETTE: Palette = { primary: '#0c2a3a', crest: '#264c62' };

export const PaletteContext = createContext<PaletteCtx>({
  palette: DEFAULT_PALETTE,
  valueStudy: false,
  setPalette: () => {},
  setValueStudy: () => {},
  resetColours: () => {},
});

export function usePalette() {
  return useContext(PaletteContext);
}

/** Map the resting water colour to a plausible sunlit pool-floor tint. */
export function floorFromWater([r, g, b]: [number, number, number]): [number, number, number] {
  return [
    Math.min(255, r * 2.4 + 44),
    Math.min(255, g * 2.4 + 44),
    Math.min(255, b * 2.4 + 44),
  ];
}
