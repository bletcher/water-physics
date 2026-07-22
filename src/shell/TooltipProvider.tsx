import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TooltipContext } from './TooltipContext';

interface Tip { text: string; x: number; y: number; below: boolean; }

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);

  const show = useCallback((text: string, rect: DOMRect) => {
    const below = rect.top < 96;                       // flip under the control near the top edge
    setTip({
      text,
      x: rect.left + rect.width / 2,
      y: below ? rect.bottom + 9 : rect.top - 9,
      below,
    });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  return (
    <TooltipContext.Provider value={{ show, hide }}>
      {children}
      {tip &&
        createPortal(
          <div
            className={'tip' + (tip.below ? ' tip-below' : '')}
            style={{ left: tip.x, top: tip.y }}
            role="tooltip"
          >
            {tip.text}
          </div>,
          document.body,
        )}
    </TooltipContext.Provider>
  );
}
