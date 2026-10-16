import { Link } from 'react-router';
import { brand } from '@/config/brand';
import { infoNavigation, mainNavigation } from '@/config/navigation';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-10">
        <div className="max-w-sm">
          <p className="font-serif text-3xl tracking-[0.08em]">{brand.shortName}</p>
          <p className="mt-3 text-sm text-muted">
            {brand.name} é uma loja fictícia, criada como projeto de portfólio. Produtos, preços e
            estoques são demonstrativos e nenhum pagamento real é processado.
          </p>
        </div>

        <nav aria-label="Rodapé: loja">
          <h2 className="font-sans text-sm font-medium tracking-normal">Loja</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {mainNavigation.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Rodapé: atendimento">
          <h2 className="font-sans text-sm font-medium tracking-normal">Atendimento</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {infoNavigation.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
