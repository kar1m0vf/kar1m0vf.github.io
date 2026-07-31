import type { ProjectMedia } from '../types';

interface ResponsiveImageProps {
  className?: string;
  eager?: boolean;
  media: ProjectMedia;
  sizes: string;
}

export function ResponsiveImage({ className, eager = false, media, sizes }: ResponsiveImageProps) {
  return (
    <picture>
      <source srcSet={media.avifSrcSet} sizes={sizes} type="image/avif" />
      <source srcSet={media.srcSet} sizes={sizes} type="image/webp" />
      <img
        alt={media.alt}
        className={className}
        decoding="async"
        fetchPriority={eager ? 'high' : 'auto'}
        height={media.height}
        loading={eager ? 'eager' : 'lazy'}
        sizes={sizes}
        src={media.src}
        srcSet={media.srcSet}
        width={media.width}
      />
    </picture>
  );
}
