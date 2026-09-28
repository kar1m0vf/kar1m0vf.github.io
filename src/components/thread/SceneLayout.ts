interface Box { top: number; left: number; width: number; height: number }
interface Anchor { box: Box; sticky?: { start: number; end: number; offset: number } }

/** Read layout in one batch after content/size changes. Native scrolling only
 * subtracts scrollY; sticky anchors use their container's cached limits. */
export class SceneLayout {
  private readonly anchors = new Map<string, Anchor>();
  dirty = true;

  constructor(private readonly root: HTMLElement, private readonly selectors: readonly string[]) {}

  refresh(scroll: number) {
    if (!this.dirty) return;
    this.dirty = false;
    this.anchors.clear();
    for (const selector of this.selectors) {
      const element = this.root.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const anchor: Anchor = { box: { top: rect.top + scroll, left: rect.left, width: rect.width, height: rect.height } };
      const sticky = element.closest<HTMLElement>('.personal-intro__sticky, .thread-passage__sticky, .life-story__place');
      if (sticky && getComputedStyle(sticky).position === 'sticky' && sticky.parentElement) {
        const parentRect = sticky.parentElement.getBoundingClientRect();
        const stickyRect = sticky.getBoundingClientRect();
        anchor.sticky = { start: parentRect.top + scroll,
          end: parentRect.bottom + scroll - stickyRect.height, offset: rect.top - stickyRect.top };
      }
      this.anchors.set(selector, anchor);
    }
  }

  bounds(selector: string, scroll: number): Box | undefined {
    const anchor = this.anchors.get(selector);
    if (!anchor) return;
    const { box, sticky } = anchor;
    const top = sticky ? Math.max(sticky.start, Math.min(sticky.end, scroll)) + sticky.offset : box.top;
    return { ...box, top: top - scroll };
  }
}
