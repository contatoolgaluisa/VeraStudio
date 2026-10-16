import { FormMessage } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { useUpdateProduct } from '../api';
import type { AdminProduct, ProductStatus } from '../types';
import { StatusBadge } from './StatusBadge';

const HELP: Record<ProductStatus, string> = {
  DRAFT: 'Rascunho: não aparece na loja. Para publicar, cadastre ao menos uma variação ativa.',
  PUBLISHED: 'Publicado: visível na loja para todos os visitantes.',
  ARCHIVED: 'Arquivado: fora da loja e fora dos alertas de estoque. Pode ser restaurado.',
};

/** Publicar, despublicar e arquivar. A regra de publicação é conferida no backend. */
export function StatusActions({ product }: { product: AdminProduct }) {
  const update = useUpdateProduct(product.id);
  const setStatus = (status: ProductStatus) => update.mutate({ status });

  return (
    <section aria-labelledby="situacao-titulo" className="border border-line p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="situacao-titulo" className="text-xl">
          Situação
        </h2>
        <StatusBadge status={product.status} />
      </div>
      <p className="mt-2 text-sm text-muted">{HELP[product.status]}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {product.status === 'DRAFT' && (
          <Button size="sm" disabled={update.isPending} onClick={() => setStatus('PUBLISHED')}>
            Publicar na loja
          </Button>
        )}
        {product.status === 'PUBLISHED' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={update.isPending}
            onClick={() => setStatus('DRAFT')}
          >
            Voltar para rascunho
          </Button>
        )}
        {product.status !== 'ARCHIVED' ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={update.isPending}
            onClick={() => setStatus('ARCHIVED')}
          >
            Arquivar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={update.isPending}
            onClick={() => setStatus('DRAFT')}
          >
            Restaurar como rascunho
          </Button>
        )}
      </div>
      {update.isError && (
        <div className="mt-4">
          <FormMessage>{update.error.message}</FormMessage>
        </div>
      )}
    </section>
  );
}
