import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <Icon size={32} className="mb-3 text-ink-soft/50 dark:text-mist-soft/50" strokeWidth={1.5} />
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft dark:text-mist-soft">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
