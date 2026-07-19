import { ToggleButton } from './ToggleButton';

interface SimTogglesProps {
  infinite: boolean;
  onInfinite: () => void;
  paused: boolean;
  onPause: () => void;
}

/** The boundary (infinite space) and freeze toggles shared by all instruments. */
export function SimToggles({ infinite, onInfinite, paused, onPause }: SimTogglesProps) {
  return (
    <>
      <ToggleButton label="infinite space" pressed={infinite} onToggle={onInfinite} />
      <ToggleButton label={paused ? 'frozen' : 'freeze'} pressed={paused} onToggle={onPause} />
    </>
  );
}
