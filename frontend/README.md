# Marginalia — Frontend

React + Vite + Tailwind client for the markdown journal / collaboration app.
Pairs with the backend delivered earlier in this project — see `../backend`.

## Stack

- React 18, Vite, TypeScript, React Router
- Tailwind CSS, with a small custom "paper/ink/pine" design system (see
  below) instead of default Tailwind styling, plus `@tailwindcss/typography`
  for the rendered-markdown preview
- CodeMirror 6 (`codemirror`, `@codemirror/lang-markdown`,
  `@codemirror/theme-one-dark`) bound to Yjs via `y-codemirror.next`
- `y-websocket` (client provider), `y-indexeddb` (offline persistence),
  `yjs` — talking to the backend's hand-rolled but wire-compatible
  WebSocket server
- `marked` + `dompurify` for the sanitized preview pane
- `lucide-react` for icons

## Getting started

```bash
cp .env.example .env    # point VITE_API_URL at your running backend
npm install
npm run dev              # http://localhost:5173
```

As with the backend, I couldn't run `npm install` or a build in the sandbox
that generated this code (no outbound network access there) — please run
`npm run build` (which runs a full `tsc` project build) locally before
deploying, to catch anything a real compiler pass would that I couldn't.

## How it fits the backend

- **Auth**: there's no Auth0 SDK here on purpose. "Log in" is a full-page
  redirect to `${VITE_API_URL}/api/auth/login`; the backend runs the entire
  OAuth flow and comes back with an HttpOnly session cookie already set. The
  frontend just calls `GET /api/auth/me` on load to find out who (if anyone)
  is signed in. See the backend README for the reasoning.
- **Realtime**: `useCollabDoc` opens a `y-websocket` `WebsocketProvider`
  against `${VITE_WS_URL}/ws/:nodeId`. The backend speaks that exact wire
  protocol by hand (not the `y-websocket` server package), so this is a
  stock provider talking to a custom server. The shared doc's text lives at
  `ydoc.getText('content')` — that key has to match the backend's
  `src/websocket/persistence.ts`, which it does.
- **Undo/redo**: `Y.UndoManager` is constructed with no `trackedOrigins`
  override. Its default only tracks transactions with a `null` origin
  (local edits); `y-websocket` applies incoming remote updates using itself
  as the origin specifically so undo managers skip them automatically —
  that's what gives each collaborator isolated undo history without extra
  wiring on either end.
- **Cross-origin cookies**: the session cookie is `SameSite=Lax`, which
  browsers still send on fetch/WebSocket requests between different
  *ports* of `localhost` or different *subdomains* of the same site (that's
  why local dev on :5173/:4000 just works). If you deploy the frontend and
  backend on genuinely different domains (not subdomains of one another),
  Lax cookies won't be sent on fetch calls — you'd need to change the
  backend's cookie to `sameSite: 'none'` (it's already conditionally
  `secure`) for that specific topology.

## Design system

Deliberately not the default Tailwind-indigo-on-white look: a paper/ink
palette (`paper`/`ink` for light, `night`/`mist` for dark) with a muted pine
green (`pine-*`) as the single accent, `Source Serif 4` for headings against
`IBM Plex Sans`/`IBM Plex Mono` for UI chrome and code — meant to read like
a notebook rather than a generic SaaS dashboard. All defined in
`tailwind.config.js`; dark mode uses Tailwind's `class` strategy, toggled
by `ThemeContext` and persisted to `localStorage`.

## Known limitations / things worth checking

- **Remote cursor CSS.** `y-codemirror.next` renders remote carets/
  selections using internal class names I've styled in `index.css`
  (`.cm-ySelectionCaret`, `.cm-ySelectionInfo`, etc.) from memory of the
  library's source rather than a live check. If remote cursors sync
  correctly but render unstyled, inspect the actual DOM the installed
  version produces and adjust those selectors — the sync/collab logic
  itself doesn't depend on them.
- **Mobile editor remount.** On narrow screens the editor and preview are
  tabs rather than a permanent split, and `EditorPane` unmounts when you
  switch away from the Edit tab. Content is never at risk (the Y.Doc is the
  source of truth, not the CodeMirror instance), but scroll/cursor position
  within the editor resets when you switch tabs and back.
- **Move-to is a folder picker, not drag-and-drop.** Faster to build
  correctly; drag-and-drop reordering would be a reasonable follow-up.
- **No automated tests or Storybook** in this pass.
- I split search-result highlighting through DOMPurify (only `<b>` allowed)
  before rendering it, since Postgres's `ts_headline()` doesn't HTML-escape
  the surrounding note text it returns — worth knowing about if you touch
  that component, since it's the app's second `dangerouslySetInnerHTML`
  boundary after the markdown preview itself.
