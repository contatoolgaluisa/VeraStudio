import { Link } from 'react-router';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { ButtonLink } from '@/components/ui/Button';
import { useProducts } from '@/features/catalog/queries';
import type { ProductQuery } from '@/features/catalog/types';
import { imageSrcSet, imageUrl } from '@/lib/images';
import { type Photo, sitePhotos } from '@/content/photos';

function ResponsiveImage({
  photo,
  sizes,
  priority = false,
  className,
}: {
  photo: Photo;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <img
      src={imageUrl(photo.url, 1280)}
      srcSet={imageSrcSet(photo.url)}
      sizes={sizes}
      alt={photo.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl items-end gap-8 px-4 pt-8 sm:px-6 md:grid-cols-12 lg:px-10 lg:pt-14">
      <div className="pb-4 md:col-span-7 md:pb-16">
        <h1 className="animate-rise-in text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] font-light">
          Peças que atravessam estações.
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Linho, lã merino e couro em cortes precisos, para vestir hoje e daqui a muitos invernos.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/novidades">Ver novidades</ButtonLink>
          <ButtonLink to="/loja" variant="secondary">
            Explorar a loja
          </ButtonLink>
        </div>
      </div>
      <div className="md:col-span-5">
        <ResponsiveImage
          photo={sitePhotos.hero}
          sizes="(min-width: 768px) 40vw, 100vw"
          priority
          className="aspect-[4/5] w-full object-cover"
        />
      </div>
    </section>
  );
}

const categoryTiles = [
  { label: 'Feminino', to: '/loja/feminino', photo: sitePhotos.feminino },
  { label: 'Masculino', to: '/loja/masculino', photo: sitePhotos.masculino },
  { label: 'Acessórios', to: '/loja/acessorios', photo: sitePhotos.acessorios },
];

function Categories() {
  return (
    <section aria-labelledby="categorias" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-10">
      <h2 id="categorias" className="sr-only">
        Categorias
      </h2>
      <ul className="grid gap-4 sm:grid-cols-3 lg:gap-6">
        {categoryTiles.map((tile) => (
          <li key={tile.to}>
            <Link to={tile.to} className="group block">
              <div className="overflow-hidden bg-paper-deep">
                <ResponsiveImage
                  photo={tile.photo}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
                />
              </div>
              <p className="mt-3 font-serif text-3xl">{tile.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductShelf({
  id,
  title,
  description,
  query,
  linkTo,
  linkLabel,
}: {
  id: string;
  title: string;
  description: string;
  query: ProductQuery;
  linkTo: string;
  linkLabel: string;
}) {
  const { data, isError } = useProducts(query);

  // A vitrine é complementar: se a API falhar ou não houver itens, ela some
  // em vez de ocupar a home com um erro.
  if (isError || (data && data.data.length === 0)) return null;

  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={id} className="text-4xl sm:text-5xl">
            {title}
          </h2>
          <p className="mt-2 text-muted">{description}</p>
        </div>
        <Link to={linkTo} className="text-sm underline underline-offset-4 hover:text-accent">
          {linkLabel}
        </Link>
      </div>
      {data ? <ProductGrid products={data.data} /> : <ProductGridSkeleton count={4} />}
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <ProductShelf
        id="novidades"
        title="Novidades"
        description="As peças que acabaram de chegar."
        query={{ isNew: true, pageSize: 4 }}
        linkTo="/novidades"
        linkLabel="Ver todas as novidades"
      />
      <ProductShelf
        id="promocoes"
        title="Promoções"
        description="Peças selecionadas com preço reduzido."
        query={{ onSale: true, sort: 'price_asc', pageSize: 4 }}
        linkTo="/promocoes"
        linkLabel="Ver todas as promoções"
      />
    </>
  );
}
