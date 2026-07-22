import { createContext, useContext } from 'react';
import type { MouseEvent as RMouseEvent, FocusEvent as RFocusEvent } from 'react';

export interface TipCtx {
  show: (text: string, rect: DOMRect) => void;
  hide: () => void;
}

export const TooltipContext = createContext<TipCtx>({ show: () => {}, hide: () => {} });

export function useTooltip() {
  return useContext(TooltipContext);
}

/**
 * Handlers to spread onto a control so it shows a styled tooltip on hover/focus
 * (a portalled bubble, so the scrolling Adjust panel can't clip it). Returns
 * inert handlers when there is no hint.
 */
export function useTip(hint?: string) {
  const { show, hide } = useTooltip();
  return {
    onMouseEnter: (e: RMouseEvent<HTMLElement>) => { if (hint) show(hint, e.currentTarget.getBoundingClientRect()); },
    onMouseLeave: () => { if (hint) hide(); },
    onFocus: (e: RFocusEvent<HTMLElement>) => { if (hint) show(hint, e.currentTarget.getBoundingClientRect()); },
    onBlur: () => { if (hint) hide(); },
  };
}
