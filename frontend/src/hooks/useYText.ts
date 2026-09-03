import { useEffect, useState } from 'react';
import type * as Y from 'yjs';

/** Re-renders whenever `ytext` changes, from this client or any remote peer. */
export function useYText(ytext: Y.Text): string {
  const [text, setText] = useState(() => ytext.toString());

  useEffect(() => {
    setText(ytext.toString());
    const observer = () => setText(ytext.toString());
    ytext.observe(observer);
    return () => ytext.unobserve(observer);
  }, [ytext]);

  return text;
}
