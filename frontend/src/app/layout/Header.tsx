import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { brand } from '@/config/brand';
import { mainNavigation } from '@/config/navigation';
import { cn } from '@/lib/cn';
import { SearchForm } from './SearchForm';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'py-1 text-sm transition-colors hover:text-ink',
    isActive ? 'text-ink underline decoration-accent underline-offset-8' : 'text-muted',
  );

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-ml-2 p-2 lg:hidden"
          aria-haspopup="dialog"
        >
          <Icon name="menu" />
          <span className="sr-only">Abrir menu</span>
        </button>

        <Link to="/" className="font-serif text-2xl tracking-[0.08em]" aria-label={brand.name}>
          {brand.shortName}
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex gap-6">
            {mainNavigation.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <SearchForm className="hidden w-48 md:block" />
          <Link to="/busca" className="p-2 md:hidden">
            <Icon name="search" />
            <span className="sr-only">Buscar</span>
          </Link>
          {/* O carrinho é implementado na Fase 6; o link leva a uma página que avisa isso. */}
          <Link to="/carrinho" className="-mr-2 p-2">
            <Icon name="bag" />
            <span className="sr-only">Carrinho</span>
          </Link>
        </div>
      </div>

      <Drawer open={menuOpen} onClose={closeMenu} title="Menu">
        <nav aria-label="Principal (celular)">
          <ul className="space-y-1">
            {mainNavigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    cn('block py-2 font-serif text-3xl', isActive ? 'text-accent' : 'text-ink')
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <SearchForm className="mt-10" onSearch={closeMenu} />
      </Drawer>
    </header>
  );
}
