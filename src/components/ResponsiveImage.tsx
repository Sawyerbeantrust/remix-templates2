import React, { useState } from 'react';
import { Maximize2, Minimize2, Image as ImageIcon } from 'lucide-react';
import { useResolvedImage } from '../hooks/useResolvedImage';
import { getFilenameFromPath, DEFAULT_FALLBACK_IMAGE, IMAGE_MAP } from '../utils/imageFallback';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackSrc?: string;
  aspectRatioClassName?: string; // e.g. "aspect-[4/3]" or "aspect-square"
  showFitToggle?: boolean;
  size?: 'shop_catalog' | 'medium' | 'large' | 'full';
  width?: number;
  height?: number;
}

const getWooCommerceResizedUrl = (url: string, size: 'shop_catalog' | 'medium' | 'large' | 'full'): string => {
  if (!url || !url.includes('/wp-content/uploads/')) {
    return url;
  }
  // If it already has size suffix, don't change
  if (url.match(/-\d+x\d+\.(jpg|jpeg|png|webp)$/i)) {
    return url;
  }
  const extensionIndex = url.lastIndexOf('.');
  if (extensionIndex === -1) return url;
  const baseUrl = url.substring(0, extensionIndex);
  const ext = url.substring(extensionIndex);

  switch (size) {
    case 'medium':
      return `${baseUrl}-300x300${ext}`;
    case 'shop_catalog':
      return `${baseUrl}-600x600${ext}`;
    case 'large':
      return `${baseUrl}-1024x1024${ext}`;
    case 'full':
    default:
      return url;
  }
};

const generateSrcSet = (url: string): string => {
  if (!url) return '';
  if (!url.includes('/wp-content/uploads/')) {
    // If it's an Unsplash image, we can generate custom w parameters!
    if (url.includes('images.unsplash.com')) {
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('auto', 'format');
        urlObj.searchParams.set('fit', 'crop');
        
        urlObj.searchParams.set('w', '300');
        const w300 = urlObj.toString();
        
        urlObj.searchParams.set('w', '600');
        const w600 = urlObj.toString();
        
        urlObj.searchParams.set('w', '1024');
        const w1024 = urlObj.toString();
        
        return `${w300} 300w, ${w600} 600w, ${w1024} 1024w`;
      } catch (e) {
        return '';
      }
    }
    return '';
  }
  
  if (url.match(/-\d+x\d+\.(jpg|jpeg|png|webp)$/i)) {
    return ''; // already resized
  }

  const extensionIndex = url.lastIndexOf('.');
  if (extensionIndex === -1) return '';
  const baseUrl = url.substring(0, extensionIndex);
  const ext = url.substring(extensionIndex);

  return `${baseUrl}-300x300${ext} 300w, ${baseUrl}-600x600${ext} 600w, ${baseUrl}-1024x1024${ext} 1024w`;
};

export default function ResponsiveImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  aspectRatioClassName = 'aspect-[4/3]',
  showFitToggle = false,
  size = 'full',
  width,
  height,
}: ResponsiveImageProps) {
  const resolvedSrc = useResolvedImage(src, fallbackSrc);
  const [imageLoading, setImageLoading] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => getWooCommerceResizedUrl(resolvedSrc, size));
  const [fallbackStep, setFallbackStep] = useState(0);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [hasError, setHasError] = useState(false);

  // Sync state if src or resolvedSrc prop changes externally
  React.useEffect(() => {
    const nextUrl = getWooCommerceResizedUrl(resolvedSrc, size);
    setCurrentSrc(nextUrl);
    setFallbackStep(0);
    setHasError(false);
  }, [resolvedSrc, size]);

  const handleLoad = () => {
    setImageLoading(false);
  };

  const handleError = () => {
    // If it's a base64 or blob or local uploads path, do not attempt /assets/images/ rewrites
    if (typeof currentSrc === 'string' && (currentSrc.startsWith('data:') || currentSrc.startsWith('blob:') || currentSrc.startsWith('/uploads/'))) {
      setImageLoading(false);
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      return;
    }

    const filename = getFilenameFromPath(typeof currentSrc === 'string' ? currentSrc : '');
    const isLocalAsset = filename && typeof currentSrc === 'string' && (
      currentSrc.startsWith('/images/') || 
      currentSrc.startsWith('/assets/images/') || 
      currentSrc.startsWith('/src/assets/images/') ||
      currentSrc.startsWith('images/')
    );

    if (isLocalAsset) {
      if (fallbackStep === 0) {
        setFallbackStep(1);
        setCurrentSrc(`/assets/images/${filename}`);
        return;
      }
      if (fallbackStep === 1) {
        setFallbackStep(2);
        setCurrentSrc(`/images/${filename}`);
        return;
      }
      if (fallbackStep === 2) {
        setFallbackStep(3);
        const mapped = IMAGE_MAP[filename];
        if (mapped && mapped !== currentSrc) {
          setCurrentSrc(mapped);
          return;
        }
      }
    }

    // If resized url failed and we haven't tried the raw resolvedSrc, try raw resolvedSrc once
    if (currentSrc !== resolvedSrc && resolvedSrc && fallbackStep === 0) {
      setFallbackStep(1);
      setCurrentSrc(resolvedSrc);
      return;
    }

    setImageLoading(false);
    setHasError(true);
    setCurrentSrc(fallbackSrc);
  };

  const toggleFitMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFitMode(prev => (prev === 'cover' ? 'contain' : 'cover'));
  };

  // Build standard width/height fallback based on typical aspect ratio
  const isSquare = aspectRatioClassName.includes('square');
  const imgWidth = width ?? 600;
  const imgHeight = height ?? (isSquare ? 600 : 450);

  return (
    <div 
      className={`relative overflow-hidden w-full ${aspectRatioClassName} ${containerClassName} bg-neutral-950/80`}
    >
      {/* Loading Skeleton Backdrop */}
      {imageLoading && (
        <div className="absolute inset-0 bg-[#0c0c0c] flex flex-col items-center justify-center gap-1.5 z-10">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff0000]/10 border-t-[#ff0000] animate-spin" />
          <span className="text-[9px] font-mono tracking-widest text-neutral-600 animate-pulse uppercase">TRITON IMAGE</span>
        </div>
      )}

      {/* Primary Image */}
      {currentSrc ? (
        <img
          src={currentSrc}
          srcSet={!hasError && fallbackStep === 0 && typeof src === 'string' && src.includes('images.unsplash.com') ? generateSrcSet(src) : undefined}
          sizes="(max-width: 640px) 300px, (max-width: 1024px) 600px, 1024px"
          width={imgWidth}
          height={imgHeight}
          alt={alt}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full transition-all duration-300 ease-out ${
            fitMode === 'cover' ? 'object-cover' : 'object-contain p-2 bg-neutral-950'
          } opacity-100 ${className}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#0c0c0c] text-neutral-600">
          <ImageIcon size={22} className="opacity-40" />
          <span className="text-[10px] uppercase tracking-wider font-mono">No Image Available</span>
        </div>
      )}

      {/* Dynamic Fit Switch Overlay */}
      {showFitToggle && !imageLoading && !hasError && currentSrc && (
        <button
          type="button"
          onClick={toggleFitMode}
          className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-black/75 hover:bg-[#ff0000]/90 text-white font-mono text-[9px] font-bold uppercase tracking-wider border border-neutral-800 transition-all hover:scale-105 active:scale-95 shadow flex items-center gap-1 cursor-pointer"
          title={fitMode === 'cover' ? "Switch to Fit Screen (Contain)" : "Switch to Fill Screen (Cover)"}
        >
          {fitMode === 'cover' ? (
            <>
              <Minimize2 size={10} />
              <span>Best Fit</span>
            </>
          ) : (
            <>
              <Maximize2 size={10} />
              <span>Full Frame</span>
            </>
          )}
        </button>
      )}

      {/* Decorative Technical Grid overlay for branding feel */}
      <div className="absolute inset-0 pointer-events-none border border-white/5" />
    </div>
  );
}
