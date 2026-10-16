import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/cn';

const links = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/produtos', label: 'Produtos', end: false },
  { to: '/admin/categorias', label: 'Categorias', end: false },
];

/**
 * Estrutura do painel. As rotas já passam por RequireAuth + RequireAdmin,
 * mas isso é só navegação: cada chamada à API /admin é conferida no backend.
 */
export function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line">
        <p className="pb-4 text-sm tracking-[0.18em] text-muted uppercase">Administração</p>
        <nav aria-label="Painel administrativo" className="-mb-px overflow-x-auto">
          <ul className="flex gap-6">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      'block border-b-2 pb-4 text-sm whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-ink text-ink'
                        : 'border-transparent text-muted hover:text-ink',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="pt-10">
        <Outlet />
      </div>
    </div>
  );
}
