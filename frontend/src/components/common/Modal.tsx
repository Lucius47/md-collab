import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 dark:bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded border border-paper-border bg-paper shadow-xl dark:border-night-border dark:bg-night-surface"
      >
        <div className="flex items-center justify-between border-b border-paper-border px-4 py-3 dark:border-night-border">
          <h2 className="font-serif text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-paper-border px-4 py-3 dark:border-night-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
