import { useEffect, useRef, useState } from 'react';

/**
 * Receding chrome: `awake` is true right after any interaction and flips to false
 * after `timeout` ms of stillness, so the UI can fade and let the water breathe.
 * State only changes on the two transitions — moving the mouse doesn't re-render.
 */
export function useChrome(timeout = 3600): boolean {
  const [awake, setAwake] = useState(true);
  const awakeRef = useRef(true);

  useEffect(() => {
    let id = 0;
    const wake = () => {
      if (!awakeRef.current) { awakeRef.current = true; setAwake(true); }
      clearTimeout(id);
      id = window.setTimeout(() => { awakeRef.current = false; setAwake(false); }, timeout);
    };
    const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    wake();
    return () => {
      clearTimeout(id);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [timeout]);

  return awake;
}
