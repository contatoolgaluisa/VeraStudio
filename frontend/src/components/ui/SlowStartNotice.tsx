import { useEffect, useState } from 'react';

/**
 * Aviso para quando o carregamento demora. Na demonstração publicada, a API
 * fica no plano gratuito do Render, que desliga após 15 minutos sem acesso e
 * leva cerca de 1 minuto para voltar. Sem este aviso, a loja pareceria quebrada.
 */
export function SlowStartNotice({ delayMs = 5000 }: { delayMs?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <p role="status" className="mb-6 text-sm text-muted">
      {visible &&
        'Iniciando o servidor de demonstração. Na primeira visita, isso pode levar até 1 minuto.'}
    </p>
  );
}
