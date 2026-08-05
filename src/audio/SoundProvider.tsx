import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { SoundEngine, type SoundCue } from './soundEngine';

export type { SoundCue } from './soundEngine';

const STORAGE_KEY = 'portfolio:sound:v1';

interface SoundContextValue {
  readonly soundEnabled: boolean;
  readonly setSoundEnabled: (next: boolean) => void;
  readonly playSound: (cue: SoundCue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function readStoredPreference(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function storePreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function SoundProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [soundEnabled, setSoundEnabledState] = useState(readStoredPreference);
  const engineRef = useRef<SoundEngine | null>(null);
  const soundEnabledRef = useRef(soundEnabled);

  const ensureEngine = useCallback((): SoundEngine => {
    const current = engineRef.current;
    if (current !== null) {
      return current;
    }

    const engine = new SoundEngine();
    engineRef.current = engine;
    return engine;
  }, []);

  useEffect(() => {
    function removeUnlockListeners() {
      window.removeEventListener('pointerdown', unlockAudio, true);
      window.removeEventListener('keydown', unlockAudio, true);
    }

    function unlockAudio(event: Event) {
      if (!event.isTrusted || !soundEnabledRef.current) {
        return;
      }

      if (ensureEngine().unlock()) {
        removeUnlockListeners();
      }
    }

    window.addEventListener('pointerdown', unlockAudio, true);
    window.addEventListener('keydown', unlockAudio, true);

    return () => {
      removeUnlockListeners();

      const engine = engineRef.current;
      engineRef.current = null;
      engine?.dispose();
    };
  }, [ensureEngine]);

  const setSoundEnabled = useCallback(
    (next: boolean): void => {
      const previous = soundEnabledRef.current;
      if (previous === next) {
        return;
      }

      if (!next) {
        // Schedule the acknowledgement while sound is still considered active.
        ensureEngine().play('toggle-off');
      }

      soundEnabledRef.current = next;
      setSoundEnabledState(next);
      storePreference(next);

      if (next) {
        ensureEngine().play('toggle-on');
      }
    },
    [ensureEngine],
  );

  const playSound = useCallback(
    (cue: SoundCue): void => {
      if (soundEnabledRef.current) {
        ensureEngine().play(cue);
      }
    },
    [ensureEngine],
  );

  const value = useMemo<SoundContextValue>(
    () => ({ soundEnabled, setSoundEnabled, playSound }),
    [playSound, setSoundEnabled, soundEnabled],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const value = useContext(SoundContext);
  if (value === null) {
    throw new Error('useSound must be used inside a SoundProvider.');
  }

  return value;
}
