import { useCallback, useEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { EditorPane } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface SplitEditorProps {
  ytext: Y.Text;
  awareness: Awareness;
  editable: boolean;
}

export function SplitEditor({ ytext, awareness, editable }: SplitEditorProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [split, setSplit] = useState(50);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerDown = useCallback(() => {
    dragging.current = true;
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDesktop]);

  if (!isDesktop) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="flex border-b border-paper-border dark:border-night-border">
          {(['edit', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2 text-sm font-medium capitalize ${
                mobileTab === tab
                  ? 'border-b-2 border-pine-500 text-pine-700 dark:border-pine-400 dark:text-pine-300'
                  : 'text-ink-soft dark:text-mist-soft'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {mobileTab === 'edit' ? (
            <EditorPane ytext={ytext} awareness={awareness} editable={editable} />
          ) : (
            <PreviewPane ytext={ytext} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full w-full min-h-0">
      <div
        style={{ width: `${split}%` }}
        className="h-full min-w-0 border-r border-paper-border dark:border-night-border"
      >
        <EditorPane ytext={ytext} awareness={awareness} editable={editable} />
      </div>
      <div
        onPointerDown={onPointerDown}
        className="w-1 shrink-0 cursor-col-resize bg-paper-border transition-colors hover:bg-pine-400 dark:bg-night-border dark:hover:bg-pine-500"
      />
      <div style={{ width: `${100 - split}%` }} className="h-full min-w-0">
        <PreviewPane ytext={ytext} />
      </div>
    </div>
  );
}
