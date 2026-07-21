import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PaletteContext, DEFAULT_PALETTE } from './PaletteContext';
import type { Palette } from './PaletteContext';

const STORE_KEY = 'water-physics.settings.v1';

interface Stored {
  palette: Palette;
  valueStudy: boolean;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Stored>;
      return {
        palette: { ...DEFAULT_PALETTE, ...(s.palette ?? {}) },
        valueStudy: !!s.valueStudy,
      };
    }
  } catch {
    // ignore corrupt/blocked storage — fall back to defaults
  }
  return { palette: DEFAULT_PALETTE, valueStudy: false };
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [{ palette, valueStudy }, setState] = useState<Stored>(load);

  // persist across reloads
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ palette, valueStudy }));
    } catch {
      // ignore write failures (private mode, quota)
    }
  }, [palette, valueStudy]);

  const setPalette = (patch: Partial<Palette>) =>
    setState((cur) => ({ ...cur, palette: { ...cur.palette, ...patch } }));
  const setValueStudy = (on: boolean) => setState((cur) => ({ ...cur, valueStudy: on }));
  const resetColours = () => setState((cur) => ({ ...cur, palette: DEFAULT_PALETTE }));

  return (
    <PaletteContext.Provider value={{ palette, valueStudy, setPalette, setValueStudy, resetColours }}>
      {children}
    </PaletteContext.Provider>
  );
}
