import { imageUrl } from '@/lib/images';

/**
 * Miniatura das listas do painel. Decorativa (alt vazio): o nome do produto
 * já aparece ao lado, e o leitor de tela não precisa ouvi-lo duas vezes.
 */
export function Thumb({ url, className = 'w-10' }: { url: string | null; className?: string }) {
  return (
    <div className={`aspect-[3/4] shrink-0 overflow-hidden bg-paper-deep ${className}`}>
      {url && (
        <img
          src={imageUrl(url, 160)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
