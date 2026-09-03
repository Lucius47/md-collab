import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-ink-soft dark:text-mist-soft">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`rounded px-3 py-1.5 text-sm font-medium text-white ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-pine-600 hover:bg-pine-700 dark:bg-pine-500'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
