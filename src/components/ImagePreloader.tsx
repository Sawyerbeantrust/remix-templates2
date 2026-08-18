import React, { useState, useEffect, useRef } from 'react';
import { useResolvedImage } from '../hooks/useResolvedImage';
import { getFilenameFromPath, DEFAULT_FALLBACK_IMAGE } from '../utils/imageFallback';

export interface ImagePreloaderProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  style?: React.CSSProperties;
  className?: string;
  containerClassName?: string;
  placeholderClassName?: string;
  fallbackSrc?: string;
  aspectRatioClassName?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  showSkeleton?: boolean;
  showSpinner?: boolean;
  fadeDurationMs?: number;
  onPreloadSuccess?: (url: string) => void;
  onPreloadError?: (err?: any) => void;
  children?: React.ReactNode; // Optional custom placeholder / overlay while preloading
}

/**
 * Transparent Image Preloader Component
 * Pre-fetches and decodes the image in the background (off-screen memory)
 * before mounting or displaying the actual <img> tag.
 * Eliminates layout pop-in, half-loaded visual tearing, and network flickering.
 */
export function ImagePreloader({
  src,
  alt,
  className = 'w-full h-full',
  containerClassName = 'w-full h-full relative overflow-hidden',
  placeholderClassName = '',
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  aspectRatioClassName = '',
  objectFit = 'cover',
  showSkeleton = false,
  showSpinner = false,
  fadeDurationMs = 300,
  onPreloadSuccess,
  onPreloadError,
  children,
  width,
  height,
  loading = 'lazy',
  style,
  ...restProps
}: ImagePreloaderProps) {
  const resolvedPropSrc = useResolvedImage(src, fallbackSrc);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const activeLoadIdRef = useRef<number>(0);

  useEffect(() => {
    let isCancelled = false;
    const currentLoadId = ++activeLoadIdRef.current;

    setIsLoading(true);
    setHasError(false);
    setIsRendered(false);

    if (!resolvedPropSrc) {
      setIsLoading(false);
      setActiveUrl(fallbackSrc);
      return;
    }

    const candidateUrls: string[] = [];
    candidateUrls.push(resolvedPropSrc);

    // If local asset path, also prepare fallback variants to probe
    const filename = getFilenameFromPath(resolvedPropSrc);
    if (filename && (resolvedPropSrc.includes('/images/') || resolvedPropSrc.includes('/assets/images/'))) {
      const alt1 = `/assets/images/${filename}`;
      const alt2 = `/images/${filename}`;
      if (!candidateUrls.includes(alt1)) candidateUrls.push(alt1);
      if (!candidateUrls.includes(alt2)) candidateUrls.push(alt2);
    }
    if (fallbackSrc && !candidateUrls.includes(fallbackSrc)) {
      candidateUrls.push(fallbackSrc);
    }

    const tryPreloadCandidate = (index: number) => {
      if (index >= candidateUrls.length) {
        if (!isCancelled && currentLoadId === activeLoadIdRef.current) {
          setIsLoading(false);
          setHasError(true);
          setActiveUrl(fallbackSrc);
          onPreloadError?.();
        }
        return;
      }

      const targetUrl = candidateUrls[index];
      const img = new Image();

      img.onload = () => {
        if (isCancelled || currentLoadId !== activeLoadIdRef.current) return;

        // If browser supports decode, decode image before rendering to completely avoid paint frame drop
        if (typeof img.decode === 'function') {
          img.decode().then(() => {
            if (isCancelled || currentLoadId !== activeLoadIdRef.current) return;
            setActiveUrl(targetUrl);
            setIsLoading(false);
            onPreloadSuccess?.(targetUrl);
          }).catch(() => {
            // Decode fallback (some formats don't support async decode)
            if (isCancelled || currentLoadId !== activeLoadIdRef.current) return;
            setActiveUrl(targetUrl);
            setIsLoading(false);
            onPreloadSuccess?.(targetUrl);
          });
        } else {
          setActiveUrl(targetUrl);
          setIsLoading(false);
          onPreloadSuccess?.(targetUrl);
        }
      };

      img.onerror = () => {
        if (isCancelled || currentLoadId !== activeLoadIdRef.current) return;
        // Try next candidate in the resolution chain
        tryPreloadCandidate(index + 1);
      };

      img.referrerPolicy = 'no-referrer';
      img.src = targetUrl;
    };

    tryPreloadCandidate(0);

    return () => {
      isCancelled = true;
    };
  }, [resolvedPropSrc, fallbackSrc, onPreloadSuccess, onPreloadError]);

  const fitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  }[objectFit] || 'object-cover';

  return (
    <div
      className={`${containerClassName} ${aspectRatioClassName}`}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
    >
      {/* Background Preloader / Transparent Placeholder Layer */}
      {isLoading && (
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-200 ${
            showSkeleton ? 'bg-neutral-900/60 animate-pulse' : 'bg-transparent'
          } ${placeholderClassName}`}
          aria-hidden="true"
        >
          {showSpinner && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/80 animate-spin" />
            </div>
          )}
          {children}
        </div>
      )}

      {/* Rendered Image once background preload & decode completes */}
      {activeUrl && (
        <img
          {...restProps}
          src={activeUrl}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          referrerPolicy="no-referrer"
          onLoad={() => setIsRendered(true)}
          className={`${className} ${fitClass} transition-opacity ${
            isRendered && !isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            transitionDuration: `${fadeDurationMs}ms`,
            ...style,
          }}
        />
      )}
    </div>
  );
}

export const TransparentImagePreloader = ImagePreloader;
export default ImagePreloader;
