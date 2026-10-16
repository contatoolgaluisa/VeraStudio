import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormMessage, SelectField, TextAreaField, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { centsToInput, parseReais } from '@/lib/format';
import { useAdminCategories } from '../api';
import { type ProductFormValues, productFormSchema } from '../schemas';
import type { AdminProduct, ProductInput } from '../types';

function toFormValues(product?: AdminProduct): ProductFormValues {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    categoryId: product?.category.id ?? '',
    price: product ? centsToInput(product.priceCents) : '',
    compareAtPrice:
      product?.compareAtPriceCents != null ? centsToInput(product.compareAtPriceCents) : '',
    isNew: product?.isNew ?? false,
  };
}

/** Dados principais do produto (criação e edição). Status, variações e fotos ficam à parte. */
export function ProductForm({
  product,
  onSubmit,
  pending,
  error,
  success,
}: {
  product?: AdminProduct;
  onSubmit: (input: ProductInput) => void;
  pending: boolean;
  error?: string;
  success?: string;
}) {
  const categories = useAdminCategories();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    values: toFormValues(product),
    resetOptions: { keepDirtyValues: true },
  });

  function submit(values: ProductFormValues) {
    onSubmit({
      name: values.name,
      // Em branco: o servidor gera a partir do nome.
      ...(values.slug ? { slug: values.slug } : {}),
      description: values.description,
      categoryId: values.categoryId,
      priceCents: parseReais(values.price)!,
      compareAtPriceCents: values.compareAtPrice ? parseReais(values.compareAtPrice) : null,
      isNew: values.isNew,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
      {error && <FormMessage>{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <TextField label="Nome" error={errors.name?.message} {...register('name')} />
      <TextField
        label="Endereço na loja (slug)"
        hint={
          product
            ? `Aparece em /produto/${product.slug}. Mudar o endereço quebra links já compartilhados.`
            : 'Deixe em branco para gerar a partir do nome.'
        }
        error={errors.slug?.message}
        {...register('slug')}
      />
      <TextAreaField
        label="Descrição"
        error={errors.description?.message}
        {...register('description')}
      />
      <SelectField
        label="Categoria"
        error={errors.categoryId?.message ?? categories.error?.message}
        disabled={!categories.data}
        {...register('categoryId')}
      >
        <option value="">{categories.isPending ? 'Carregando…' : 'Escolha a categoria'}</option>
        {categories.data?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Preço de venda (R$)"
          inputMode="decimal"
          placeholder="129,90"
          error={errors.price?.message}
          {...register('price')}
        />
        <TextField
          label={'Preço "de" (R$, opcional)'}
          inputMode="decimal"
          hint="Preencha para mostrar o produto em promoção."
          error={errors.compareAtPrice?.message}
          {...register('compareAtPrice')}
        />
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-ink" {...register('isNew')} />
        Marcar como novidade
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? 'Salvando…' : product ? 'Salvar alterações' : 'Criar rascunho'}
      </Button>
    </form>
  );
}
