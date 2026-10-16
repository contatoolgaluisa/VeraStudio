import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';

export function AdminLoading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p role="status" className="py-16 text-muted">
      {label}
    </p>
  );
}

export function AdminError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <StatusMessage
      role="alert"
      title="Não foi possível carregar"
      action={<Button onClick={onRetry}>Tentar novamente</Button>}
    >
      {error.message}
    </StatusMessage>
  );
}
