import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Painel lateral modal (menu do celular, filtros).
 *
 * Acessibilidade:
 * - role="dialog" + aria-modal: leitores de tela tratam como janela;
 * - o foco vai para dentro ao abrir, fica preso nele (Tab circula) e volta
 *   para o botão que abriu ao fechar;
 * - Esc fecha; a página por trás não rola.
 *
 * O painel é renderizado direto no <body> (portal). Sem isso, se ele estiver
 * dentro de um elemento com `backdrop-filter` ou `transform` (como o cabeçalho
 * fixo), o `position: fixed` passa a ser relativo a esse elemento e o painel
 * fica espremido na altura dele.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = 'left',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right';
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute top-0 flex h-full w-[min(24rem,88vw)] flex-col bg-paper shadow-xl',
          side === 'left' ? 'left-0' : 'right-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-xl">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="-mr-2 p-2">
            <Icon name="close" />
            <span className="sr-only">Fechar</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
