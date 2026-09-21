import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';

interface PromptModalProps {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void | Promise<void>; // Updated to support async actions
  onClose: () => void;
}

export function PromptModal({
  title,
  label,
  initialValue = '',
  confirmLabel = 'Save',
  onConfirm,
  onClose,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submitting state

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
    } catch (error) {
      console.error('Failed to submit:', error);
      setIsSubmitting(false); // Re-enable button if the API request throws an error
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="mb-1 block text-sm font-medium text-ink-soft dark:text-mist-soft">{label}</label>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded border border-paper-border bg-paper px-3 py-2 text-sm dark:border-night-border dark:bg-night disabled:opacity-50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim() || isSubmitting}
            className="rounded bg-pine-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pine-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-pine-500"
          >
            {isSubmitting ? 'Creating...' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
