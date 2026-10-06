interface BufferSize { width: number; height: number }

/** Keep the rendered buffer while browser chrome animates its viewport height.
 * Owners apply ready sizes inside their render frame, immediately before drawing. */
export class SceneBufferResize {
  private applied: BufferSize | null = null;
  private pending: BufferSize | null = null;
  private ready = false;
  private disposed = false;
  private heightTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  constructor(private readonly onReady: () => void) {}

  request(width: number, height: number) {
    if (this.disposed || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    this.clearHeightTimer();
    if (this.applied?.width === width && this.applied.height === height) {
      this.pending = null;
      this.ready = false;
      return;
    }
    this.pending = { width, height };
    this.ready = !this.applied || width !== this.applied.width;
    if (this.ready) {
      this.onReady();
      return;
    }
    this.heightTimer = globalThis.setTimeout(() => {
      this.heightTimer = undefined;
      if (this.disposed || !this.pending) return;
      this.ready = true;
      this.onReady();
    }, 120);
  }

  flush(apply: (width: number, height: number) => void): boolean {
    if (this.disposed || !this.pending || !this.ready) return false;
    const size = this.pending;
    apply(size.width, size.height);
    this.applied = size;
    this.pending = null;
    this.ready = false;
    this.clearHeightTimer();
    return true;
  }

  dispose() {
    this.disposed = true;
    this.pending = null;
    this.ready = false;
    this.clearHeightTimer();
  }

  private clearHeightTimer() {
    if (this.heightTimer === undefined) return;
    globalThis.clearTimeout(this.heightTimer);
    this.heightTimer = undefined;
  }
}
