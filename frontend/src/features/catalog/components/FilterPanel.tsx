import { type FormEvent, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { FilterOptions } from '../types';
import { type CatalogUrlState, toggle } from '../url-state';

/**
 * Filtros de tamanho, cor e preço.
 * Tamanho e cor aplicam na hora; o preço aplica ao enviar, para não buscar a
 * cada número digitado.
 */
export function FilterPanel({
  options,
  state,
  onChange,
}: {
  options: FilterOptions | undefined;
  state: CatalogUrlState;
  onChange: (changes: Partial<CatalogUrlState>) => void;
}) {
  if (!options) {
    return <div className="h-64 animate-pulse bg-paper-deep" aria-hidden="true" />;
  }

  return (
    <div className="space-y-10">
      {options.sizes.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium">Tamanho</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.sizes.map((size) => {
              const checked = state.sizes.includes(size);
              return (
                <label
                  key={size}
                  className={cn(
                    'flex h-10 min-w-10 cursor-pointer items-center justify-center border px-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                    checked ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink',
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => onChange({ sizes: toggle(state.sizes, size) })}
                  />
                  {size === 'U' ? 'Único' : size}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {options.colors.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium">Cor</legend>
          <ul className="mt-3 space-y-2">
            {options.colors.map((color) => (
              <li key={color.name}>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-ink"
                    checked={state.colors.includes(color.name)}
                    onChange={() => onChange({ colors: toggle(state.colors, color.name) })}
                  />
                  <span
                    aria-hidden="true"
                    className="size-4 rounded-full border border-black/15"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <PriceFilter state={state} onChange={onChange} />
    </div>
  );
}

function PriceFilter({
  state,
  onChange,
}: {
  state: CatalogUrlState;
  onChange: (changes: Partial<CatalogUrlState>) => void;
}) {
  const minId = useId();
  const maxId = useId();
  const errorId = useId();
  const [min, setMin] = useState(state.minPrice?.toString() ?? '');
  const [max, setMax] = useState(state.maxPrice?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  // Se a URL mudar por fora (ex.: "limpar filtros"), os campos acompanham.
  useEffect(() => {
    setMin(state.minPrice?.toString() ?? '');
    setMax(state.maxPrice?.toString() ?? '');
  }, [state.minPrice, state.maxPrice]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minPrice = min === '' ? undefined : Number(min);
    const maxPrice = max === '' ? undefined : Number(max);

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      setError('O preço mínimo precisa ser menor que o máximo.');
      return;
    }
    setError(null);
    onChange({ minPrice, maxPrice });
  }

  const inputClass =
    'w-full border border-line bg-transparent px-3 py-2 text-sm tabular-nums focus:border-ink focus:outline-none';

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset aria-describedby={error ? errorId : undefined}>
        <legend className="text-sm font-medium">Preço (R$)</legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={minId} className="text-xs text-muted">
              Mínimo
            </label>
            <input
              id={minId}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={min}
              onChange={(event) => setMin(event.target.value.replace(/\D/g, ''))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={maxId} className="text-xs text-muted">
              Máximo
            </label>
            <input
              id={maxId}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={max}
              onChange={(event) => setMax(event.target.value.replace(/\D/g, ''))}
              className={inputClass}
            />
          </div>
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="secondary" className="mt-4 w-full">
          Aplicar preço
        </Button>
      </fieldset>
    </form>
  );
}
