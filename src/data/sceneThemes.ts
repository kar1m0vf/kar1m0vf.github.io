import type { ProjectTheme } from '../types';

export type SceneTheme = 'blue' | ProjectTheme;
export interface ThemeBoundary { at: number; theme: SceneTheme }
export interface ThemeBlend { from: SceneTheme; to: SceneTheme; progress: number }

// Keep the project's familiar Builder Mode hue, with separate glass and light
// tones so changing the tint preserves the reflective material's depth.
export const sceneThemes = {
  blue: { glass: '#1665bf', emissive: '#0642ad', core: '#6ebeff', key: '#b9dfff', rim: '#2878ff', halo: '#67b3ff', bead: '#c9eeff' },
  nar: { glass: '#c32662', emissive: '#960b43', core: '#ffa0c4', key: '#ffe1ee', rim: '#ff4167', halo: '#ff78ac', bead: '#ffe2ef' },
  trendyol: { glass: '#d66118', emissive: '#b33d06', core: '#ffc082', key: '#ffead1', rim: '#ff7a1a', halo: '#ffad63', bead: '#ffe7c9' },
  blaster: { glass: '#7745cf', emissive: '#5423b9', core: '#c6a0ff', key: '#eadcff', rim: '#a47aff', halo: '#bb8fff', bead: '#efe2ff' },
} as const;

/** Blend over a viewport-sized band, narrowing it for short neighbouring
 * sections. The neutral gaps are blue; adjacent projects blend directly. */
export function sampleSceneTheme(position: number, boundaries: readonly ThemeBoundary[], span: number): ThemeBlend {
  let from: SceneTheme = 'blue';
  for (let index = 0; index < boundaries.length; index++) {
    const boundary = boundaries[index]!;
    const previous = boundaries[index - 1]?.at ?? -Infinity;
    const next = boundaries[index + 1]?.at ?? Infinity;
    const radius = Math.max(1, Math.min(span, (boundary.at - previous) / 2, (next - boundary.at) / 2));
    if (position < boundary.at - radius) return { from, to: from, progress: 1 };
    if (position <= boundary.at + radius) {
      const t = Math.max(0, Math.min(1, (position - boundary.at + radius) / (radius * 2)));
      return { from, to: boundary.theme, progress: t * t * (3 - 2 * t) };
    }
    from = boundary.theme;
  }
  return { from, to: from, progress: 1 };
}
