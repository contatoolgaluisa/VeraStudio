import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { brand } from '@/config/brand';

/**
 * Molde das páginas institucionais. Todas exibem o aviso de conteúdo
 * demonstrativo: os textos precisariam ser revisados (inclusive juridicamente)
 * antes de uma operação real.
 */
export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{intro}</p>

      <aside
        aria-label="Aviso"
        className="mt-8 border-l-2 border-accent bg-paper-deep px-5 py-4 text-sm"
      >
        <strong className="font-medium">Conteúdo demonstrativo.</strong> {brand.name} é uma loja
        fictícia, criada como projeto de portfólio. Este texto ilustra a página e não tem valor
        contratual. Antes de uma operação real, ele precisaria ser revisado por profissionais.
      </aside>

      <div className="mt-10 space-y-8 leading-relaxed [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-medium [&_h2]:tracking-normal [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_p]:text-muted [&_ul]:mt-2 [&_ul]:space-y-1 [&_ul]:text-muted">
        {children}
      </div>

      <p className="mt-12 text-sm text-muted">
        Ficou alguma dúvida?{' '}
        <Link to="/contato" className="underline underline-offset-4 hover:text-ink">
          Veja as formas de contato
        </Link>
        .
      </p>
    </article>
  );
}
