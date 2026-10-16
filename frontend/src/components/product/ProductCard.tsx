import { Link } from 'react-router';
import type { ProductSummary } from '@/features/catalog/types';
import { Price } from './Price';
import { ProductImage } from './ProductImage';

/** Indicação curta sobre a foto: esgotado tem prioridade, depois promoção, depois novidade. */
function badgeFor(product: ProductSummary): string | null {
  if (!product.inStock) return 'Esgotado';
  if (product.discountPercent) return `−${product.discountPercent}%`;
  if (product.isNew) return 'Novo';
  return null;
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  const badge = badgeFor(product);

  return (
    <article className="group relative">
      <div className="relative">
        <ProductImage
          image={product.image}
          fallbackLabel={product.name}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="transition-opacity duration-300 group-hover:opacity-90"
        />
        {badge && (
          <span className="absolute top-3 left-3 bg-paper px-2 py-1 text-xs font-medium">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <h3 className="font-sans text-sm font-medium tracking-normal">
          {/* O link cobre o card inteiro (::after), mas o texto acessível é só o nome. */}
          <Link to={`/produto/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <Price priceCents={product.priceCents} compareAtPriceCents={product.compareAtPriceCents} />
        {product.colors.length > 1 && (
          <p className="flex items-center gap-1.5 pt-1">
            {product.colors.map((color) => (
              <span
                key={color.name}
                title={color.name}
                className="size-3 rounded-full border border-black/15"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            <span className="sr-only">
              Cores: {product.colors.map((color) => color.name).join(', ')}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}
