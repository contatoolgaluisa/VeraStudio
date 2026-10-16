import { type FormEvent, useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Campo de busca por nome. Leva para /busca?q=termo. */
export function SearchForm({ className, onSearch }: { className?: string; onSearch?: () => void }) {
  const id = useId();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = term.trim();
    navigate(q ? `/busca?q=${encodeURIComponent(q)}` : '/busca');
    onSearch?.();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Buscar produtos
      </label>
      <input
        id={id}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Buscar"
        maxLength={100}
        className="w-full border-b border-line bg-transparent py-2 pr-8 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-0 -translate-y-1/2 p-1 text-muted hover:text-ink"
      >
        <Icon name="search" />
        <span className="sr-only">Buscar</span>
      </button>
    </form>
  );
}
