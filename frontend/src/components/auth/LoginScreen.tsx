import { NotebookPen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LoginScreen() {
  const { login } = useAuth();

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-paper px-6 dark:bg-night">
      <div className="w-full max-w-sm text-center">
        <NotebookPen size={36} className="mx-auto mb-4 text-pine-600 dark:text-pine-400" strokeWidth={1.5} />
        <h1 className="font-serif text-2xl font-semibold">Marginalia</h1>
        <p className="mt-2 text-sm text-ink-soft dark:text-mist-soft">
          Markdown notes that stay in sync — write alongside people, not just near them.
        </p>
        <button
          onClick={login}
          className="mt-6 w-full rounded bg-pine-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pine-700 dark:bg-pine-500 dark:hover:bg-pine-600"
        >
          Continue with Google or GitHub
        </button>
        <p className="mt-3 text-xs text-ink-soft/70 dark:text-mist-soft/70">
          Handled by your workspace's identity provider — no password stored here.
        </p>
      </div>
    </div>
  );
}
