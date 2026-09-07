/** One shared signal lets the scenes and game rest while the navigation is open. */
export const controlOverlayEvent = 'portfolio:control-overlay';

export function isControlOverlayOpen() {
  return document.body.classList.contains('k-control-open');
}

export function isSceneTransitionActive() {
  return Boolean(document.documentElement.dataset.sceneTransition);
}

export function isSceneRenderingSuspended() {
  const phase = document.documentElement.dataset.sceneTransition;
  return isControlOverlayOpen() || phase === 'covering' || phase === 'jumping';
}

export function setControlOverlayOpen(open: boolean) {
  if (open === isControlOverlayOpen()) return;
  document.body.classList.toggle('k-control-open', open);
  window.dispatchEvent(new Event(controlOverlayEvent));
}
