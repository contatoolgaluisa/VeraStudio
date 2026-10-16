import { useId, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Price } from '@/components/product/Price';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useProduct, useProducts } from '@/features/catalog/queries';
import type { ProductDetail } from '@/features/catalog/types';
import {
  colorHasStock,
  findVariant,
  initialColor,
  initialSize,
  sizeStatus,
  type SizeStatus,
} from '@/features/catalog/variant-selection';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';

export function ProductPage() {
  const { slug = '' } = useParams();
  const product = useProduct(slug);

  if (product.isPending) return <ProductSkeleton />;

  if (product.isError) {
    if (product.error instanceof ApiError && product.error.status === 404) {
      return <NotFoundPage />;
    }
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <StatusMessage
          role="alert"
          title="Não foi possível carregar o produto"
          action={
            <Button onClick={() => void product.refetch()} disabled={product.isFetching}>
              {product.isFetching ? 'Tentando…' : 'Tentar novamente'}
            </Button>
          }
        >
          {product.error.message} Verifique sua conexão e tente de novo.
        </StatusMessage>
      </div>
    );
  }

  // key: ao navegar para outro produto, a seleção de cor e tamanho recomeça.
  return <ProductView key={product.data.id} product={product.data} />;
}

function ProductView({ product }: { product: ProductDetail }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const color = initialColor(product, searchParams.get('cor'));
  const [size, setSize] = useState(initialSize(product));
  const [quantity, setQuantity] = useState(1);
  const quantityId = useId();

  const variant = findVariant(product, color, size);
  const maxQuantity = variant?.available ? variant.maxQuantity : 0;
  const singleSize = product.sizes.length === 1;

  function chooseColor(name: string) {
    // A cor fica na URL: o link compartilhado abre na mesma cor.
    setSearchParams({ cor: name }, { replace: true });
    if (size && sizeStatus(product, name, size) !== 'available' && !singleSize) setSize(undefined);
    setQuantity(1);
  }

  function chooseSize(value: string) {
    setSize(value);
    setQuantity(1);
  }

  const { images, matchesColor } = imagesForColor(product, color);
  const colorHex = product.colors.find((c) => c.name === color)?.hex;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <nav aria-label="Você está em" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-x-2">
          <li>
            <Link to="/loja" className="hover:text-ink">
              Loja
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/loja/${product.category.slug}`} className="hover:text-ink">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
        <div className="grid gap-4">
          {images.map((image, index) => (
            <ProductImage
              key={image.id}
              image={image.url ? image : null}
              fallbackLabel={product.name}
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority={index === 0}
            />
          ))}
          {!matchesColor && color && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <span
                aria-hidden="true"
                className="size-3 rounded-full border border-black/15"
                style={{ backgroundColor: colorHex }}
              />
              Foto ilustrativa. A cor escolhida é {color}.
            </p>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <h1 className="text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <Price
            priceCents={product.priceCents}
            compareAtPriceCents={product.compareAtPriceCents}
            className="mt-3 text-lg"
          />
          {product.discountPercent && (
            <p className="mt-1 text-sm text-accent">{product.discountPercent}% de desconto</p>
          )}

          {!product.inStock && (
            <p role="status" className="mt-6 border border-line p-4 text-sm">
              Este produto está esgotado em todas as cores e tamanhos.
            </p>
          )}

          <fieldset className="mt-8">
            <legend className="text-sm">
              Cor: <span className="font-medium">{color}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.colors.map((option) => {
                const selected = option.name === color;
                const hasStock = colorHasStock(product, option.name);
                return (
                  <label
                    key={option.name}
                    className={cn(
                      'relative flex size-10 cursor-pointer items-center justify-center rounded-full border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                      selected ? 'border-ink' : 'border-transparent hover:border-line',
                    )}
                  >
                    <input
                      type="radio"
                      name="cor"
                      value={option.name}
                      checked={selected}
                      onChange={() => chooseColor(option.name)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-7 rounded-full border border-black/15',
                        !hasStock && 'opacity-40',
                      )}
                      style={{ backgroundColor: option.hex }}
                    />
                    <span className="sr-only">
                      {option.name}
                      {!hasStock && ' (esgotada)'}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-8">
            <legend className="text-sm">{singleSize ? 'Tamanho único' : 'Tamanho'}</legend>
            {!singleSize && (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((option) => {
                  const status = color ? sizeStatus(product, color, option) : 'nonexistent';
                  const disabled = status !== 'available';
                  const selected = option === size;
                  return (
                    <label
                      key={option}
                      className={cn(
                        'flex h-11 min-w-12 items-center justify-center border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                        selected && 'border-ink bg-ink text-paper',
                        !selected && !disabled && 'cursor-pointer border-line hover:border-ink',
                        disabled && 'cursor-not-allowed border-line text-muted line-through',
                      )}
                    >
                      {/* O nome lido pelo leitor de tela explica por que o tamanho está bloqueado. */}
                      <input
                        type="radio"
                        name="tamanho"
                        value={option}
                        checked={selected}
                        disabled={disabled}
                        onChange={() => chooseSize(option)}
                        aria-label={`${option}${SIZE_STATUS_LABEL[status]}`}
                        className="sr-only"
                      />
                      <span aria-hidden="true">{option}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div className="mt-8 flex items-end gap-4">
            <div>
              <label htmlFor={quantityId} className="text-sm">
                Quantidade
              </label>
              <select
                id={quantityId}
                value={quantity}
                disabled={maxQuantity === 0}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-2 block border border-line bg-transparent px-3 py-2.5 text-sm tabular-nums focus:border-ink disabled:opacity-50"
              >
                {Array.from({ length: Math.max(maxQuantity, 1) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            {/* O carrinho chega na Fase 6. O botão existe para mostrar a regra de
                seleção, mas fica desativado e diz claramente por quê. */}
            <Button className="flex-1" disabled aria-describedby="aviso-carrinho">
              Adicionar ao carrinho
            </Button>
          </div>
          <p id="aviso-carrinho" className="mt-2 text-sm text-muted">
            {selectionHint(variant, size)}
          </p>

          {variant && variant.available && variant.maxQuantity <= 3 && (
            <p className="mt-4 text-sm text-accent">
              {variant.maxQuantity === 1
                ? 'Última unidade neste tamanho.'
                : `Restam ${variant.maxQuantity} unidades neste tamanho.`}
            </p>
          )}

          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-sans text-sm font-medium tracking-normal">Descrição</h2>
            <p className="mt-3 leading-relaxed text-muted">{product.description}</p>
            {variant && <p className="mt-4 text-xs text-muted">Código: {variant.sku}</p>}
          </div>
        </div>
      </div>

      <RelatedProducts product={product} />
    </div>
  );
}

/**
 * Fotos a exibir: as cadastradas para a cor escolhida, quando existem.
 * Sem fotos por cor (caso atual do seed, com uma foto ilustrativa por
 * produto), mostra todas e avisa que a foto não corresponde à cor.
 */
function imagesForColor(product: ProductDetail, color: string | undefined) {
  const ofColor = product.images.filter((image) => image.color === color);
  if (ofColor.length > 0) return { images: ofColor, matchesColor: true };
  if (product.images.length > 0) return { images: product.images, matchesColor: false };
  return {
    images: [{ id: 'sem-foto', url: '', alt: '', color: null }],
    matchesColor: false,
  };
}

const SIZE_STATUS_LABEL: Record<SizeStatus, string> = {
  available: '',
  soldout: ' (esgotado)',
  nonexistent: ' (indisponível nesta cor)',
};

function selectionHint(variant: ReturnType<typeof findVariant>, size: string | undefined) {
  if (!size) return 'Escolha um tamanho. O carrinho de compras chega na Fase 6 do projeto.';
  if (!variant?.available) return 'Esta combinação está esgotada. Escolha outra cor ou tamanho.';
  return 'Combinação disponível. O carrinho de compras chega na Fase 6 do projeto.';
}

function RelatedProducts({ product }: { product: ProductDetail }) {
  const related = useProducts({ category: product.category.slug, pageSize: 5 });
  const items = (related.data?.data ?? []).filter((p) => p.id !== product.id).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="relacionados" className="pt-24">
      <h2 id="relacionados" className="mb-8 text-3xl sm:text-4xl">
        Mais em {product.category.name}
      </h2>
      <ProductGrid products={items} />
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-7xl animate-pulse gap-10 px-4 pt-16 sm:px-6 lg:grid-cols-[7fr_5fr] lg:px-10"
      aria-busy="true"
      aria-label="Carregando produto"
    >
      <div className="aspect-[3/4] bg-paper-deep" />
      <div className="space-y-4">
        <div className="h-12 w-3/4 bg-paper-deep" />
        <div className="h-6 w-1/4 bg-paper-deep" />
        <div className="h-32 bg-paper-deep" />
      </div>
    </div>
  );
}
