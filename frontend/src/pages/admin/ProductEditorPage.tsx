import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAdminProduct, useCreateProduct, useUpdateProduct } from '@/features/admin/api';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { ImagesSection } from '@/features/admin/components/ImagesSection';
import { ProductForm } from '@/features/admin/components/ProductForm';
import { StatusActions } from '@/features/admin/components/StatusActions';
import { VariantsSection } from '@/features/admin/components/VariantsSection';
import { ApiError } from '@/lib/api';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';

function BackLink() {
  return (
    <Link to="/admin/produtos" className="text-sm text-muted underline-offset-4 hover:underline">
      ← Produtos
    </Link>
  );
}

export function NewProductPage() {
  const create = useCreateProduct();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl">
      <BackLink />
      <h1 className="mt-4 text-4xl sm:text-5xl">Novo produto</h1>
      <p className="mt-3 text-muted">
        O produto nasce como rascunho. Depois de salvar, cadastre as variações (cor, tamanho,
        estoque) e as fotos, e então publique.
      </p>
      <div className="mt-10">
        <ProductForm
          pending={create.isPending}
          error={create.error?.message}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (product) => navigate(`/admin/produtos/${product.id}?criado=1`),
            })
          }
        />
      </div>
    </div>
  );
}

export function EditProductPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const product = useAdminProduct(id);
  const update = useUpdateProduct(id);

  if (product.isPending) return <AdminLoading label="Carregando produto…" />;
  if (product.isError) {
    if (product.error instanceof ApiError && [400, 404].includes(product.error.status)) {
      return <NotFoundPage />;
    }
    return <AdminError error={product.error} onRetry={() => void product.refetch()} />;
  }

  const data = product.data;

  return (
    <div>
      <BackLink />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">{data.name}</h1>
        {data.status === 'PUBLISHED' && (
          <Link
            to={`/produto/${data.slug}`}
            className="text-sm underline underline-offset-4 hover:text-accent"
          >
            Ver na loja
          </Link>
        )}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="order-2 lg:order-1">
          <h2 className="sr-only">Dados do produto</h2>
          <ProductForm
            product={data}
            pending={update.isPending}
            error={update.error?.message}
            success={
              update.isSuccess
                ? 'Alterações salvas.'
                : params.get('criado')
                  ? 'Rascunho criado. Agora cadastre as variações e as fotos.'
                  : undefined
            }
            onSubmit={(input) => update.mutate(input)}
          />
        </div>
        <div className="order-1 lg:order-2">
          <StatusActions product={data} />
        </div>
      </div>

      <div className="mt-16 space-y-16">
        <VariantsSection product={data} />
        <ImagesSection product={data} />
      </div>
    </div>
  );
}
