import React from 'react';
import { TransparentImagePreloader } from './TransparentImagePreloader';
import { DEFAULT_FALLBACK_IMAGE } from '../utils/imageFallback';

interface CategoryPreviewImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackSrc?: string;
}

export default function CategoryPreviewImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full relative overflow-hidden',
  fallbackSrc = DEFAULT_FALLBACK_IMAGE
}: CategoryPreviewImageProps) {
  return (
    <TransparentImagePreloader
      src={src}
      alt={alt}
      className={className}
      containerClassName={containerClassName}
      fallbackSrc={fallbackSrc}
      objectFit="cover"
    />
  );
}
