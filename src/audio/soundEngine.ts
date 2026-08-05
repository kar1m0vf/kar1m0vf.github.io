export type SoundCue =
  | 'open'
  | 'close'
  | 'select'
  | 'toggle-on'
  | 'toggle-off'
  | 'signal'
  | 'launch'
  | 'pause'
  | 'hit'
  | 'complete'
  | 'contact';

type AudioContextConstructor = new () => AudioContext;

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor;
  };

interface Tone {
  readonly at: number;
  readonly duration: number;
  readonly from: number;
  readonly to?: number;
  readonly level: number;
  readonly wave?: OscillatorType;
}

type CuePlans = Readonly<Record<SoundCue, readonly Tone[]>>;

const SILENCE = 0.0001;
// Calibrated to stay comfortable on headphones while remaining clear on phone speakers.
const MASTER_GAIN = 0.36;

const cuePlans = {
  open: [
    { at: 0, duration: 0.16, from: 196, to: 293.66, level: 0.34 },
    { at: 0.055, duration: 0.2, from: 392, to: 587.33, level: 0.22 },
  ],
  close: [
    { at: 0, duration: 0.16, from: 349.23, to: 196, level: 0.28 },
    { at: 0.035, duration: 0.13, from: 174.61, level: 0.18, wave: 'triangle' },
  ],
  select: [
    { at: 0, duration: 0.09, from: 493.88, to: 659.25, level: 0.3 },
    { at: 0.04, duration: 0.1, from: 987.77, level: 0.14 },
  ],
  'toggle-on': [
    { at: 0, duration: 0.12, from: 261.63, to: 329.63, level: 0.26 },
    { at: 0.08, duration: 0.17, from: 493.88, to: 659.25, level: 0.27 },
  ],
  'toggle-off': [
    { at: 0, duration: 0.095, from: 246.94, to: 164.81, level: 0.25 },
    { at: 0.055, duration: 0.085, from: 123.47, level: 0.16, wave: 'triangle' },
  ],
  signal: [
    { at: 0, duration: 0.24, from: 220, to: 659.25, level: 0.24, wave: 'sine' },
    { at: 0.19, duration: 0.13, from: 880, to: 1174.66, level: 0.18 },
  ],
  launch: [
    { at: 0, duration: 0.34, from: 98, to: 523.25, level: 0.34, wave: 'sawtooth' },
    { at: 0.11, duration: 0.27, from: 196, to: 783.99, level: 0.2 },
  ],
  pause: [
    { at: 0, duration: 0.09, from: 196, level: 0.25, wave: 'triangle' },
    { at: 0.115, duration: 0.09, from: 164.81, level: 0.22, wave: 'triangle' },
  ],
  hit: [
    { at: 0, duration: 0.075, from: 130.81, to: 73.42, level: 0.32, wave: 'square' },
    { at: 0.012, duration: 0.1, from: 659.25, to: 220, level: 0.15, wave: 'triangle' },
  ],
  complete: [
    { at: 0, duration: 0.28, from: 261.63, level: 0.23 },
    { at: 0.105, duration: 0.31, from: 329.63, level: 0.22 },
    { at: 0.21, duration: 0.42, from: 493.88, to: 659.25, level: 0.25 },
  ],
  contact: [
    { at: 0, duration: 0.32, from: 220, to: 246.94, level: 0.2, wave: 'triangle' },
    { at: 0.045, duration: 0.36, from: 329.63, level: 0.19 },
    { at: 0.09, duration: 0.42, from: 493.88, level: 0.17 },
  ],
} as const satisfies CuePlans;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const audioWindow = window as AudioWindow;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function hasActiveUserGesture(): boolean {
  if (typeof navigator === 'undefined' || navigator.userActivation === undefined) {
    // Older Web Audio implementations enforce their own gesture policy.
    return true;
  }

  return navigator.userActivation.isActive;
}

export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private disposed = false;

  unlock(): boolean {
    if (this.disposed) {
      return false;
    }

    const context = this.getContext();
    if (context === null) {
      return false;
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }

    return true;
  }

  play(cue: SoundCue): void {
    if (this.disposed) {
      return;
    }

    const context = this.getContext();
    if (context === null) {
      return;
    }

    const schedule = (): void => {
      if (!this.disposed && context.state !== 'closed') {
        this.scheduleCue(context, cue);
      }
    };

    if (context.state === 'running') {
      schedule();
      return;
    }

    void context.resume().then(schedule).catch(() => undefined);
  }

  dispose(): void {
    this.disposed = true;
    this.master?.disconnect();
    this.filter?.disconnect();

    const context = this.context;
    this.context = null;
    this.master = null;
    this.filter = null;

    if (context !== null && context.state !== 'closed') {
      void context.close().catch(() => undefined);
    }
  }

  private getContext(): AudioContext | null {
    if (this.context !== null) {
      return this.context;
    }

    // A scroll/effect-triggered cue must not initialize Web Audio before the
    // visitor has interacted with the page.
    if (!hasActiveUserGesture()) {
      return null;
    }

    const AudioContextClass = getAudioContextConstructor();
    if (AudioContextClass === null) {
      return null;
    }

    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      const filter = context.createBiquadFilter();

      master.gain.setValueAtTime(MASTER_GAIN, context.currentTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4_200, context.currentTime);
      filter.Q.setValueAtTime(0.35, context.currentTime);
      master.connect(filter);
      filter.connect(context.destination);

      this.context = context;
      this.master = master;
      this.filter = filter;
      return context;
    } catch {
      return null;
    }
  }

  private scheduleCue(context: AudioContext, cue: SoundCue): void {
    const master = this.master;
    if (master === null) {
      return;
    }

    const baseTime = context.currentTime + 0.008;
    for (const tone of cuePlans[cue]) {
      this.scheduleTone(context, master, baseTime, tone);
    }
  }

  private scheduleTone(
    context: AudioContext,
    destination: AudioNode,
    baseTime: number,
    tone: Tone,
  ): void {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = baseTime + tone.at;
    const end = start + tone.duration;
    const attackEnd = Math.min(start + 0.018, end - 0.01);

    oscillator.type = tone.wave ?? 'sine';
    oscillator.frequency.setValueAtTime(tone.from, start);
    if (tone.to !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.to, end);
    }

    envelope.gain.setValueAtTime(SILENCE, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(SILENCE, tone.level), attackEnd);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, end);

    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.addEventListener(
      'ended',
      () => {
        oscillator.disconnect();
        envelope.disconnect();
      },
      { once: true },
    );
    oscillator.start(start);
    oscillator.stop(end + 0.015);
  }
}
