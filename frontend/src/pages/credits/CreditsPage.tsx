import { productPhotoCredits, sitePhotos } from '@/content/photos';

export function CreditsPage() {
  const siteCredits = [
    { label: 'Destaque da página inicial', ...sitePhotos.hero },
    { label: 'Categoria Feminino', ...sitePhotos.feminino },
    { label: 'Categoria Masculino', ...sitePhotos.masculino },
    { label: 'Categoria Acessórios', ...sitePhotos.acessorios },
  ];
  const linkClass = 'underline decoration-line underline-offset-4 hover:decoration-ink';

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-5xl">Créditos das fotos</h1>
      <p className="mt-4 text-muted">
        As fotos desta loja demonstrativa vêm do{' '}
        <a href="https://unsplash.com" className={linkClass}>
          Unsplash
        </a>{' '}
        e são usadas conforme a{' '}
        <a href="https://unsplash.com/license" className={linkClass}>
          licença do Unsplash
        </a>
        . Elas ilustram o catálogo e não mostram exatamente os produtos fictícios da loja.
      </p>

      <h2 className="mt-12 text-2xl">Páginas</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
        {siteCredits.map((credit) => (
          <li key={credit.url} className="flex flex-wrap justify-between gap-2 py-3">
            <span>{credit.label}</span>
            <a href={credit.page} className={linkClass}>
              Foto de {credit.author}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl">Produtos</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
        {productPhotoCredits.map((credit) => (
          <li key={credit.product} className="flex flex-wrap justify-between gap-2 py-3">
            <span>{credit.product}</span>
            <a href={credit.page} className={linkClass}>
              Foto de {credit.author}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
