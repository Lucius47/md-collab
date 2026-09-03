import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/**
 * Renders markdown to sanitized HTML for the live preview pane. Every
 * rendered string passes through DOMPurify before it ever touches
 * dangerouslySetInnerHTML — this is the app's only XSS boundary for
 * user-authored content, per the spec's security requirements.
 */
export function renderMarkdown(source: string): string {
  const rawHtml = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
