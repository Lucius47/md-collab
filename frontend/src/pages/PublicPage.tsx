import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, File as FileIcon, Folder, Moon, NotebookPen, Sun } from 'lucide-react';
import { getPublicByLink, getPublicNode, publicDownloadUrl } from '../lib/api';
import type { ApiNode } from '../types/api';
import { renderMarkdown } from '../lib/markdown';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { useTheme } from '../context/ThemeContext';

export function PublicPage() {
  const { publicLinkId } = useParams();
  const [node, setNode] = useState<ApiNode | null>(null);
  const [children, setChildren] = useState<Array<Pick<ApiNode, 'id' | 'name' | 'type'>>>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!publicLinkId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    // The same route param serves two purposes: the original shared link
    // id, or — when navigating deeper into a public folder — a raw node
    // id (see the backend's two /api/public routes).
    getPublicByLink(publicLinkId)
      .catch(() => getPublicNode(publicLinkId))
      .then(({ node, children }) => {
        if (cancelled) return;
        setNode(node);
        setChildren(children);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicLinkId]);

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-night dark:text-mist">
      <header className="flex h-14 items-center justify-between border-b border-paper-border px-4 dark:border-night-border">
        <div className="flex items-center gap-2">
          <NotebookPen size={18} className="text-pine-600 dark:text-pine-400" />
          <span className="font-serif font-semibold">Marginalia</span>
          <span className="rounded bg-paper-surface px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-soft dark:bg-night-surface dark:text-mist-soft">
            Public
          </span>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {!loading && notFound && (
          <EmptyState
            icon={FileIcon}
            title="This link isn't available"
            description="It may have been unpublished or removed by its owner."
          />
        )}

        {!loading && node && node.type === 'file' && (
          <article>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="truncate font-serif text-2xl font-semibold">{node.name}</h1>
              <a
                href={publicDownloadUrl(node.id)}
                className="flex shrink-0 items-center gap-1 rounded border border-paper-border px-2.5 py-1.5 text-xs hover:bg-paper-surface dark:border-night-border dark:hover:bg-night-surface"
              >
                <Download size={13} /> Download
              </a>
            </div>
            <div
              className="prose dark:prose-invert max-w-none prose-headings:font-serif"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(node.content ?? '') }}
            />
          </article>
        )}

        {!loading && node && node.type === 'folder' && (
          <div>
            <h1 className="mb-4 font-serif text-2xl font-semibold">{node.name}</h1>
            {children.length === 0 ? (
              <p className="text-sm text-ink-soft dark:text-mist-soft">This folder is empty.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {children.map((c) => (
                  <Link
                    key={c.id}
                    to={`/public/${c.id}`}
                    className="flex flex-col items-start gap-2 rounded border border-paper-border p-3 hover:border-pine-400 hover:bg-paper-surface dark:border-night-border dark:hover:bg-night-surface"
                  >
                    {c.type === 'folder' ? (
                      <Folder size={18} className="text-pine-600 dark:text-pine-400" />
                    ) : (
                      <FileIcon size={18} className="text-ink-soft dark:text-mist-soft" />
                    )}
                    <span className="w-full truncate text-sm">{c.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
