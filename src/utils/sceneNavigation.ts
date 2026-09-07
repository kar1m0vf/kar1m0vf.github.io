export const sceneNavigationEvent = 'portfolio:scene-navigation';
export const sceneJumpEvent = 'portfolio:scene-jump';
export const sceneFrameEvent = 'portfolio:scene-frame';

export interface SceneDestination {
  element: HTMLElement;
  hash?: string;
  progress?: number;
  top?: number;
  focusSelector?: string;
  history?: 'push' | 'none';
  immediate?: boolean;
}

export function destinationTop(destination: SceneDestination) {
  if (destination.top !== undefined) return destination.top;
  return destination.element.getBoundingClientRect().top + window.scrollY
    + Math.max(0, destination.element.offsetHeight - window.innerHeight) * (destination.progress ?? 0);
}

export function jumpToScene(destination: SceneDestination) {
  window.scrollTo({ top: destinationTop(destination), behavior: 'instant' });
  // Scroll-driven springs and the 3D rig must adopt the destination, without
  // interpolating through all the chapters hidden by the transition.
  window.dispatchEvent(new Event(sceneJumpEvent));
}

export function focusScene(destination: SceneDestination) {
  const heading = destination.element.querySelector<HTMLElement>(destination.focusSelector ?? 'h1, h2');
  const target = heading && !heading.closest('[inert]') ? heading : destination.element;
  const temporary = !target.hasAttribute('tabindex') && target.tabIndex < 0;
  if (temporary) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  if (temporary) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
}

export function navigateToScene(id: string, options: Omit<SceneDestination, 'element'> = {}) {
  const element = document.getElementById(id);
  if (!element) return;
  const destination: SceneDestination = { element, hash: `#${id}`, ...options };
  const event = new CustomEvent<SceneDestination>(sceneNavigationEvent, { detail: destination, cancelable: true });
  if (window.dispatchEvent(event)) {
    jumpToScene(destination);
    focusScene(destination);
  }
}

export function reportSceneFrame(host: HTMLElement) {
  if (document.documentElement.dataset.sceneTransition === 'settling') {
    window.dispatchEvent(new CustomEvent(sceneFrameEvent, { detail: host }));
  }
}
