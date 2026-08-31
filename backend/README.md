# Markdown Collab — Backend

Node.js/Express + PostgreSQL (Prisma) + WebSocket (Yjs CRDT) backend for the
markdown journal / collaboration app. This is the backend half only — the
frontend (React/Vite/CodeMirror) is a separate follow-up delivery.

## Stack

- Express, TypeScript, compiled with `tsc` / run in dev with `tsx`
- PostgreSQL via Prisma, with a `tsvector` column + trigger for full-text search
- **Auth0** as the upstream OAuth identity provider — the backend itself runs
  an Authorization Code flow against Auth0 and issues its **own** HttpOnly,
  Secure session JWT afterwards. See "Why Auth0 this way" below.
- A raw `ws` WebSocket server (no `y-websocket` server package) that speaks
  the same wire protocol as `y-websocket`'s **client** provider, so the
  frontend can use that standard provider unmodified.
- AWS SDK v3 for S3 — works against real AWS or any S3-compatible endpoint
  (MinIO, Cloudflare R2, etc.) via `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE`.
- `archiver` for zip folder downloads, `node-cron` for the nightly trash purge.

## Getting started

```bash
cp .env.example .env        # fill in real values — see below
docker compose up -d        # local Postgres only
npm install
npm run prisma:migrate      # applies prisma/migrations/*
npm run dev                 # http://localhost:4000
```

I couldn't run any of the above in the sandbox that generated this code (no
outbound network access there), so please run `npm install` and ideally
`npm run build` yourself before deploying, to catch anything a real
TypeScript/npm run would catch that I couldn't verify.

## Auth0 setup

Create a **Regular Web Application** (not a SPA) in your Auth0 tenant — this
backend is the OAuth client, not the browser:

1. Allowed Callback URLs: `http://localhost:4000/api/auth/callback`
2. Allowed Logout URLs: `http://localhost:5173`
3. Authentication → Social: enable Google / GitHub (or whichever providers
   you want)
4. Copy the tenant Domain, Client ID, and Client Secret into `.env`

### Why Auth0 this way, instead of bearer tokens?

The spec calls for the backend to issue its own HttpOnly session JWT, which
is the "Regular Web App" OAuth pattern rather than the SPA-plus-bearer-token
pattern Auth0 usually steers React apps toward. So here, Auth0 is used
purely as the federated identity provider — it owns the login UI and the
Google/GitHub connections. Once its callback completes, this backend mints
and owns its own session token in a cookie, the same end result a
hand-rolled Passport.js flow would give you, just without writing a
strategy per provider.

## Environment variables

Full list with comments in `.env.example`. The ones you can't skip:
`DATABASE_URL`, `APP_JWT_SECRET` (32+ random chars — e.g. `openssl rand -hex 32`),
`AUTH0_*`, `AWS_*` / `S3_*`, and `FRONTEND_URL` (used for CORS and the
post-login redirect).

## API surface

```
GET  /api/auth/login | /api/auth/callback | /api/auth/me
POST /api/auth/logout

GET  /api/nodes?parentId=            list a folder (or your root)
POST /api/nodes                      create file/folder
GET|PATCH|DELETE /api/nodes/:id      read / rename+edit / soft-delete
PATCH /api/nodes/:id/move
POST /api/nodes/:id/restore
DELETE /api/nodes/:id/permanent
GET  /api/nodes/:id/download | /download-zip

GET|POST /api/nodes/:id/share        list / grant
DELETE   /api/nodes/:id/share/:userId
PATCH    /api/nodes/:id/public       toggle public link

GET  /api/nodes/:id/versions
POST /api/nodes/:id/versions/:versionId/restore

GET  /api/shared-with-me
GET  /api/trash
GET|POST|DELETE /api/favorites[/:nodeId]
GET  /api/search?q=

GET  /api/public/:publicLinkId               unauthenticated
GET  /api/public/nodes/:nodeId[/download]     unauthenticated, deep browse

wss://.../ws/:nodeId                  Yjs sync + awareness
```

Viewer-role WebSocket connections are accepted (so they see the live doc and
everyone's cursors) but their own edits are silently dropped server-side —
enforced in `src/websocket/room.ts`, not just in the UI.

## Known limitations / next steps

- **Single-process WebSocket rooms.** Rooms live in server memory, which is
  correct for one backend instance. Running more than one instance behind a
  load balancer needs a shared layer (Redis pub/sub is the usual choice) to
  fan out Yjs updates across instances — not implemented here.
- **Version restore doesn't reach into a live room.** It rewrites the stored
  content, but a file open in an active collaboration session keeps its
  in-memory doc as the source of truth until that room empties and reloads.
  Worth closing before shipping if version history and live co-editing are
  both expected to be used together.
- **Permission inheritance is one query per ancestor level.** Fine for
  normal folder depths; a recursive CTE (same idea as the one already used
  in `search.service.ts`) would be a worthwhile optimization for very deep
  trees.
- No automated tests in this pass — say the word if you want a test setup
  (Vitest/Jest + a throwaway test DB) added next.
- DOMPurify from the spec's security section is intentionally **not** a
  backend dependency: this API stores and serves raw markdown text, never
  rendered HTML, so sanitizing the preview pane is a frontend concern.
