import { useApiStatus } from './useApiStatus';

/** Mostra, com dados reais, se a API e o banco estão respondendo. */
export function ApiStatus() {
  const { isPending, isError, error, refetch, isFetching } = useApiStatus();

  let tone = 'bg-muted';
  let label = 'Verificando conexão com a API…';

  if (!isPending && !isError) {
    tone = 'bg-success';
    label = 'API e banco de dados respondendo';
  } else if (isError) {
    tone = 'bg-danger';
    label = `Sem conexão: ${error.message}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border border-line p-5">
      {/* role="status" faz leitores de tela anunciarem a mudança */}
      <p role="status" className="flex items-center gap-3">
        <span aria-hidden="true" className={`size-2.5 rounded-full ${tone}`} />
        {label}
      </p>
      {isError && (
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="ml-auto border border-ink px-4 py-2 text-sm transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          {isFetching ? 'Tentando…' : 'Tentar novamente'}
        </button>
      )}
    </div>
  );
}
