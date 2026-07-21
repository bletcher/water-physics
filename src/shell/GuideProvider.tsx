import { useState } from 'react';
import type { ReactNode } from 'react';
import { GuideContext } from './GuideContext';
import type { Guide } from './GuideContext';

export function GuideProvider({ children }: { children: ReactNode }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  return <GuideContext.Provider value={{ guide, setGuide }}>{children}</GuideContext.Provider>;
}
