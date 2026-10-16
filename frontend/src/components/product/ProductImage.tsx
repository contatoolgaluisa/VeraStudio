import { cn } from '@/lib/cn';
import { imageSrcSet, imageUrl } from '@/lib/images';

/**
 * Foto de produto em proporção 3:4 (retrato, padrão de moda).
 * Sem foto cadastrada, mostra um bloco neutro com o nome, em vez de um ícone quebrado.
 */
export function ProductImage({
  image,
  fallbackLabel,
  sizes,
  priority = false,
  className,
}: {
  image: { url: string; alt: string } | null;
  fallbackLabel: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative aspect-[3/4] overflow-hidden bg-paper-deep', className)}>
      {image ? (
        <img
          src={imageUrl(image.url, 640)}
          srcSet={imageSrcSet(image.url)}
          sizes={sizes}
          alt={image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-end p-4 font-serif text-lg text-muted">
          {fallbackLabel}
        </div>
      )}
    </div>
  );
}
