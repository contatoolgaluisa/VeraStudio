import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormMessage, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/admin/api';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { type CategoryFormValues, categoryFormSchema } from '@/features/admin/schemas';
import type { AdminCategory, CategoryInput } from '@/features/admin/types';
import { pluralize } from '@/lib/format';

function toInput(values: CategoryFormValues): CategoryInput {
  return {
    name: values.name,
    description: values.description || null,
    sortOrder: Number(values.sortOrder),
  };
}

function CategoryFields({ form }: { form: ReturnType<typeof useForm<CategoryFormValues>> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_2fr_8rem]">
      <TextField label="Nome" error={errors.name?.message} {...register('name')} />
      <TextField
        label="Descrição (opcional)"
        error={errors.description?.message}
        {...register('description')}
      />
      <TextField
        label="Ordem no menu"
        inputMode="numeric"
        error={errors.sortOrder?.message}
        {...register('sortOrder')}
      />
    </div>
  );
}

function CategoryItem({ category }: { category: AdminCategory }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category.name,
      description: category.description ?? '',
      sortOrder: String(category.sortOrder),
    },
  });
  const count = category._count.products;
  const error = update.error ?? remove.error;

  if (editing) {
    return (
      <li className="border-b border-line py-5">
        <form
          noValidate
          aria-label={`Editar ${category.name}`}
          onSubmit={form.handleSubmit((values) =>
            update.mutate(
              { id: category.id, ...toInput(values) },
              { onSuccess: () => setEditing(false) },
            ),
          )}
        >
          <CategoryFields form={form} />
          {error && (
            <div className="mt-4">
              <FormMessage>{error.message}</FormMessage>
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <Button type="submit" size="sm" disabled={update.isPending}>
              Salvar
            </Button>
            <Button
              size="sm"
              variant="text"
              onClick={() => {
                form.reset();
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 border-b border-line py-5">
      <div className="min-w-0">
        <p className="font-medium">{category.name}</p>
        <p className="mt-1 text-sm text-muted">
          /loja/{category.slug} · {pluralize(count, 'produto', 'produtos')} · ordem{' '}
          {category.sortOrder}
        </p>
        {category.description && <p className="mt-1 text-sm">{category.description}</p>}
        {error && (
          <div className="mt-3">
            <FormMessage>{error.message}</FormMessage>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Editar ${category.name}`}
          onClick={() => setEditing(true)}
        >
          Editar
        </Button>
        {confirming ? (
          <>
            <Button
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(category.id)}
            >
              Confirmar exclusão
            </Button>
            <Button size="sm" variant="text" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="text"
            aria-label={`Excluir ${category.name}`}
            disabled={count > 0}
            title={
              count > 0 ? 'Mova os produtos para outra categoria antes de excluir.' : undefined
            }
            onClick={() => setConfirming(true)}
          >
            Excluir
          </Button>
        )}
      </div>
    </li>
  );
}

const emptyCategory: CategoryFormValues = { name: '', description: '', sortOrder: '0' };

export function CategoriesPage() {
  const categories = useAdminCategories();
  const create = useCreateCategory();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyCategory,
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl sm:text-5xl">Categorias</h1>
      <p className="mt-3 text-muted">
        O endereço de cada categoria é gerado a partir do nome. Só é possível excluir categorias sem
        produtos.
      </p>

      <form
        noValidate
        aria-labelledby="nova-categoria-titulo"
        onSubmit={form.handleSubmit((values) =>
          create.mutate(toInput(values), { onSuccess: () => form.reset(emptyCategory) }),
        )}
        className="mt-10 border border-line p-5"
      >
        <h2 id="nova-categoria-titulo" className="text-xl">
          Nova categoria
        </h2>
        <div className="mt-4">
          <CategoryFields form={form} />
        </div>
        {create.isError && (
          <div className="mt-4">
            <FormMessage>{create.error.message}</FormMessage>
          </div>
        )}
        <Button type="submit" size="sm" className="mt-5" disabled={create.isPending}>
          {create.isPending ? 'Criando…' : 'Criar categoria'}
        </Button>
      </form>

      {categories.isPending ? (
        <AdminLoading label="Carregando categorias…" />
      ) : categories.isError ? (
        <AdminError error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.data.length === 0 ? (
        <p className="mt-10 text-sm">Nenhuma categoria cadastrada.</p>
      ) : (
        <ul className="mt-6">
          {categories.data.map((category) => (
            <CategoryItem key={category.id} category={category} />
          ))}
        </ul>
      )}
    </div>
  );
}
