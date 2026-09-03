import { useMemo } from 'react';
import type * as Y from 'yjs';
import { useYText } from '../../hooks/useYText';
import { renderMarkdown } from '../../lib/markdown';

export function PreviewPane({ ytext }: { ytext: Y.Text }) {
  const text = useYText(ytext);
  const html = useMemo(() => renderMarkdown(text), [text]);

  if (!text.trim()) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-soft/60 dark:text-mist-soft/60">
        Nothing to preview yet — start writing on the left.
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm dark:prose-invert h-full max-w-none overflow-auto p-4 prose-headings:font-serif prose-pre:bg-paper-surface dark:prose-pre:bg-night-surface"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
