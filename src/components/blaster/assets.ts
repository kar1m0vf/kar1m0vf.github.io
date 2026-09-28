import type { MiniBlasterAssets } from './types';

const assetSources = {
  boss: '/media/blaster/mini/boss.webp',
  drone: '/media/blaster/mini/drone.webp',
  effects: '/media/blaster/mini/effects.webp',
  player: '/media/blaster/mini/player.webp',
} as const;

function loadImage(source: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    const cleanUp = () => {
      signal?.removeEventListener('abort', handleAbort);
      image.onload = null;
      image.onerror = null;
    };

    const handleAbort = () => {
      cleanUp();
      image.src = '';
      reject(new DOMException('Mini Blaster asset loading was aborted.', 'AbortError'));
    };

    image.onload = () => {
      cleanUp();
      void image.decode().catch(() => undefined).finally(() => resolve(image));
    };
    image.onerror = () => {
      cleanUp();
      reject(new Error(`Unable to load Mini Blaster asset: ${source}`));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    image.decoding = 'async';
    image.src = source;
  });
}

let preparedAssets: Promise<MiniBlasterAssets> | undefined;

async function prepareAssets(): Promise<MiniBlasterAssets> {
  const [boss, drone, effects, player] = await Promise.all([
    loadImage(assetSources.boss),
    loadImage(assetSources.drone),
    loadImage(assetSources.effects),
    loadImage(assetSources.player),
  ]);

  return { boss, drone, effects, player };
}

/** Keep decoded sprites from the loader through every game restart. Aborting
 * one consumer must not cancel the resource another mounted consumer awaits. */
export function loadMiniBlasterAssets(signal?: AbortSignal): Promise<MiniBlasterAssets> {
  if (signal?.aborted) return Promise.reject(new DOMException('Asset loading aborted.', 'AbortError'));
  const assets = preparedAssets ??= prepareAssets().catch(error => {
    preparedAssets = undefined;
    throw error;
  });
  if (!signal) return assets;
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Asset loading aborted.', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    void assets.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
