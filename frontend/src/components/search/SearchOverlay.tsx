import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { File, Folder, Search } from 'lucide-react';
import DOMPurify from 'dompurify';
import { search } from '../../lib/api';
import type { SearchResult } from '../../types/api';
import { Spinner } from '../common/Spinner';

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      search(trimmed)
        .then((r) => setResults(r.results))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (id: string) => {
    navigate(`/nodes/${id}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 pt-24 dark:bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded border border-paper-border bg-paper shadow-xl dark:border-night-border dark:bg-night-surface"
      >
        <div className="flex items-center gap-2 border-b border-paper-border px-3 py-2.5 dark:border-night-border">
          <Search size={16} className="text-ink-soft dark:text-mist-soft" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your notes…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft/50 dark:placeholder:text-mist-soft/50"
          />
          {loading && <Spinner size={14} />}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!loading && query.trim() && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-soft dark:text-mist-soft">
              Nothing matches "{query.trim()}".
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => go(r.id)}
              className="flex w-full items-start gap-2.5 border-b border-paper-border px-3 py-2.5 text-left last:border-0 hover:bg-paper-surface dark:border-night-border dark:hover:bg-night"
            >
              {r.type === 'folder' ? (
                <Folder size={15} className="mt-0.5 shrink-0 text-pine-600 dark:text-pine-400" />
              ) : (
                <File size={15} className="mt-0.5 shrink-0 text-ink-soft dark:text-mist-soft" />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div
                  className="truncate text-xs text-ink-soft dark:text-mist-soft [&_b]:font-semibold [&_b]:text-pine-600 dark:[&_b]:text-pine-400"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(r.snippet, { ALLOWED_TAGS: ['b'], ALLOWED_ATTR: [] }),
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
