import { ButtonLink } from '@/components/ui/Button';

/**
 * Página honesta para funcionalidades que ainda não foram construídas.
 * Melhor avisar do que mostrar um botão que não faz nada.
 */
export function UpcomingPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
      <div className="max-w-xl">
        <h1 className="text-5xl">{title}</h1>
        <p className="mt-4 text-lg text-muted">{description}</p>
        <ButtonLink to="/loja" className="mt-8">
          Continuar na loja
        </ButtonLink>
      </div>
    </section>
  );
}
