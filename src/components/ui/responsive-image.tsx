import Image from 'next/image';
import type { ImageProps } from 'next/image';

import { MediaFrame } from './media-frame';

type ResponsiveImageProps = {
  src: ImageProps['src'];
  alt: string;
  sizes: string;
  aspectRatio?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function ResponsiveImage({
  src,
  alt,
  sizes,
  aspectRatio = '4 / 3',
  className = '',
  imageClassName = '',
  priority = false,
}: ResponsiveImageProps) {
  return (
    <MediaFrame aspectRatio={aspectRatio} className={className}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${imageClassName}`}
      />
    </MediaFrame>
  );
}
