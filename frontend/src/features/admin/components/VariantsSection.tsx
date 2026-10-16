import { zodResolver } from '@hookform/resolvers/zod';
import { type FormEvent, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormMessage, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAddVariant, useUpdateVariant } from '../api';
import { parseStockDelta, type VariantFormValues, variantFormSchema } from '../schemas';
import type { AdminProduct, AdminVariant } from '../types';

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 rounded-full border border-line"
      style={{ backgroundColor: hex }}
    />
  );
}

/**
 * Uma linha da tabela de variações. O estoque é ajustado de forma RELATIVA
 * ("+5" entrou mercadoria, "-2" avaria): se uma venda acontecer enquanto a
 * tela está aberta, o ajuste não apaga essa venda.
 */
function VariantRow({ variant }: { variant: AdminVariant }) {
  const update = useUpdateVariant();
  const [delta, setDelta] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const deltaId = useId();
  const label = `${variant.color} ${variant.size}`;

  function applyDelta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = parseStockDelta(delta);
    if (value === null) {
      setInputError('Use um número como +5 ou -2.');
      return;
    }
    setInputError(null);
    update.mutate({ id: variant.id, stockDelta: value }, { onSuccess: () => setDelta('') });
  }

  const message = inputError ?? (update.isError ? update.error.message : null);

  return (
    <tr className={cn('border-b border-line align-top', !variant.isActive && 'text-muted')}>
      <td className="py-3 pr-4">
        <span className="flex items-center gap-2">
          <Swatch hex={variant.colorHex} />
          {variant.color}
        </span>
      </td>
      <td className="py-3 pr-4">{variant.size}</td>
      <td className="py-3 pr-4 font-mono text-xs">{variant.sku}</td>
      <td
        className={cn(
          'py-3 pr-4 text-right tabular-nums',
          variant.isActive && variant.stock === 0 && 'text-danger',
        )}
      >
        {variant.stock}
      </td>
      <td className="py-3 pr-4">
        <form onSubmit={applyDelta} className="flex items-center gap-2">
          <label htmlFor={deltaId} className="sr-only">
            Ajuste de estoque de {label}
          </label>
          <input
            id={deltaId}
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            placeholder="+5 ou -2"
            inputMode="numeric"
            aria-invalid={message ? true : undefined}
            className="w-24 border border-line bg-transparent px-2 py-1.5 focus:border-ink focus:outline-none"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={update.isPending}>
            Aplicar
          </Button>
        </form>
        {message && (
          <p role="alert" className="mt-1.5 max-w-64 text-xs text-danger">
            {message}
          </p>
        )}
      </td>
      <td className="py-3 text-right">
        <Button
          size="sm"
          variant="text"
          disabled={update.isPending}
          aria-label={`${variant.isActive ? 'Desativar' : 'Ativar'} ${label}`}
          onClick={() => update.mutate({ id: variant.id, isActive: !variant.isActive })}
        >
          {variant.isActive ? 'Desativar' : 'Ativar'}
        </Button>
      </td>
    </tr>
  );
}

const emptyVariant: VariantFormValues = {
  color: '',
  colorHex: '#',
  size: '',
  sku: '',
  stock: '0',
};

function AddVariantForm({ product }: { product: AdminProduct }) {
  const add = useAddVariant(product.id);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: emptyVariant,
  });
  const hex = watch('colorHex');

  // Cor já usada neste produto: reaproveita o mesmo tom, para não haver
  // duas amostras diferentes para "Preto" na página do produto.
  function fillKnownHex() {
    const known = product.variants.find(
      (variant) => variant.color.toLowerCase() === getValues('color').trim().toLowerCase(),
    );
    if (known) setValue('colorHex', known.colorHex, { shouldValidate: true });
  }

  function submit(values: VariantFormValues) {
    add.mutate(
      {
        color: values.color,
        colorHex: values.colorHex.toUpperCase(),
        size: values.size.toUpperCase(),
        sku: values.sku.toUpperCase(),
        stock: Number(values.stock),
      },
      // Mantém cor e tom preenchidos: o normal é cadastrar vários tamanhos da mesma cor.
      {
        onSuccess: () => reset({ ...emptyVariant, color: values.color, colorHex: values.colorHex }),
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-labelledby="nova-variacao-titulo"
      className="mt-8 border border-line p-5"
    >
      <h3 id="nova-variacao-titulo" className="text-lg">
        Nova variação
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <TextField
          label="Cor"
          placeholder="Preto"
          list="cores-do-produto"
          error={errors.color?.message}
          {...register('color', { onBlur: fillKnownHex })}
        />
        <datalist id="cores-do-produto">
          {[...new Set(product.variants.map((variant) => variant.color))].map((color) => (
            <option key={color} value={color} />
          ))}
        </datalist>
        <div>
          <TextField
            label="Tom (hexadecimal)"
            placeholder="#151515"
            error={errors.colorHex?.message}
            {...register('colorHex')}
          />
          {/^#[0-9A-Fa-f]{6}$/.test(hex) && (
            <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
              <Swatch hex={hex} /> Amostra
            </p>
          )}
        </div>
        <TextField
          label="Tamanho"
          placeholder="M"
          error={errors.size?.message}
          {...register('size')}
        />
        <TextField
          label="SKU"
          placeholder="VS-CAM-PRE-M"
          hint="Código único da variação."
          error={errors.sku?.message}
          {...register('sku')}
        />
        <TextField
          label="Estoque inicial"
          inputMode="numeric"
          error={errors.stock?.message}
          {...register('stock')}
        />
      </div>
      {add.isError && (
        <div className="mt-4">
          <FormMessage>{add.error.message}</FormMessage>
        </div>
      )}
      <Button type="submit" size="sm" className="mt-5" disabled={add.isPending}>
        {add.isPending ? 'Adicionando…' : 'Adicionar variação'}
      </Button>
    </form>
  );
}

export function VariantsSection({ product }: { product: AdminProduct }) {
  return (
    <section aria-labelledby="variacoes-titulo">
      <h2 id="variacoes-titulo" className="text-2xl">
        Variações e estoque
      </h2>
      <p className="mt-2 text-sm text-muted">
        Cada combinação de cor e tamanho tem seu SKU e seu estoque. Variações desativadas não
        aparecem na loja. Para corrigir uma cor ou tamanho digitado errado, desative a variação e
        cadastre outra.
      </p>

      {product.variants.length === 0 ? (
        <p className="mt-6 border border-dashed border-line p-5 text-sm">
          Nenhuma variação cadastrada. Adicione ao menos uma para poder publicar o produto.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Cor
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Tamanho
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  SKU
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">
                  Estoque
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Ajustar estoque
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  <span className="sr-only">Ativar ou desativar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <VariantRow key={variant.id} variant={variant} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddVariantForm product={product} />
    </section>
  );
}
