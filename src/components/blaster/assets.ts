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

export async function loadMiniBlasterAssets(signal?: AbortSignal): Promise<MiniBlasterAssets> {
  const [boss, drone, effects, player] = await Promise.all([
    loadImage(assetSources.boss, signal),
    loadImage(assetSources.drone, signal),
    loadImage(assetSources.effects, signal),
    loadImage(assetSources.player, signal),
  ]);

  return { boss, drone, effects, player };
}

