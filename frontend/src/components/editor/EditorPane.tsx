import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { useTheme } from '../../context/ThemeContext';

interface EditorPaneProps {
  ytext: Y.Text;
  awareness: Awareness;
  editable: boolean;
}

export function EditorPane({ ytext, awareness, editable }: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    // No trackedOrigins override: Y.UndoManager's default only tracks
    // transactions with a null origin, which is what local edits get. Y
    // providers (y-websocket here) apply *remote* updates using themselves
    // as the transaction origin specifically so undo managers skip them by
    // default — that's what gives each collaborator isolated undo history
    // per the spec, with no extra wiring needed on our end.
    const undoManager = new Y.UndoManager(ytext);

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        markdown(),
        EditorView.editable.of(editable),
        ...(theme === 'dark' ? [oneDark] : []),
        yCollab(ytext, awareness, { undoManager }),
        keymap.of(yUndoManagerKeymap),
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-content': { fontFamily: 'inherit' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });

    return () => {
      view.destroy();
      undoManager.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytext, awareness, editable, theme]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden font-mono" />;
}
