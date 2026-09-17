# SonicLight.md

A drawing-to-sound web app: users sign in, draw on a canvas, save their drawings as
vector strokes, and replay them visually and audibly. Vue 3 SPA + Express API,
PostgreSQL, TypeScript end to end. Auth is a JWT in `localStorage`, sent as a Bearer header.

> **Status: prescriptive.** This file describes the _target_ setup, not an existing one —
> the repository is being built from scratch. Every command below is the intended
> command; replace this note with `Status: descriptive` and correct anything that
> drifted once the skeleton is in place and the commands have actually been run.

## Context Files

Read the following to get the full context of the project:

- @context/exercise-brief.md
- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Layout

```text
frontend/  Vue 3 SPA (Vite, <script setup>, TypeScript, Pinia, Vue Router)
           Tailwind 4 + DaisyUI 5, custom theme in src/style.css — no JS component library
           src/views/ src/components/ src/stores/ src/api/ src/composables/ src/types/
backend/   Express 5 API — TypeScript, single package
           prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
           src/routes/ src/controllers/ src/services/ src/middleware/ src/schemas/ src/lib/
context/   Project context files read by Claude Code (see above)
docker-compose.yml   PostgreSQL 16 + the API. No client container — see Gotchas
.github/workflows/   ci.yml — typecheck, test and build both packages on push
```

Two independent npm packages, no workspace tooling: `frontend/` and `backend/` each have
their own `package.json` and are installed and run separately. There is no root
`package.json` and no monorepo runner.

## Commands

### Frontend (`/frontend`)

```bash
npm run dev            # vite — dev server on http://localhost:5173
npm run build          # vue-tsc -b && vite build (full type check + production build)
npm run preview        # serve the production build locally
npm test               # vitest
npx vue-tsc --noEmit   # typecheck alone, without a build
```

The client reads `VITE_API_URL` from `frontend/.env` (`http://localhost:3000` locally) and
calls the API cross-origin, the same way it will once deployed. There is no proxy — see
Gotchas.

### Backend (`/backend`)

```bash
npm run dev            # tsx watch src/index.ts — API on http://localhost:3000
npm run build          # tsc — emits to dist/
npm start              # node dist/index.js (production)
npm test               # vitest
npx tsc --noEmit       # typecheck alone
```

### Database

PostgreSQL 16 runs in Docker (service `db`, host port **5433**, database `soniclight`).
Not 5432, so it can coexist with a local Postgres already bound there:

```bash
docker compose up -d db          # start the database alone
docker compose up -d             # start the database and the API
docker compose down -v           # stop and wipe the volume (destroys all data)
```

The client is never containerised: run it with `npm run dev`, and deploy it as a static
`dist/` to a CDN.

Prisma lives entirely in `backend/`, so every command runs from there:

```bash
npx prisma migrate dev --name <name>   # create + apply a migration (into prisma/migrations)
npx prisma migrate deploy              # apply pending migrations (CI / production)
npx prisma migrate status              # check applied vs pending
npx prisma generate                    # regenerate the client after a schema change
npx prisma studio                      # browse the data
npm run seed                           # tsx prisma/seed.ts — demo users + drawings
```

Seeding is idempotent (each step guarded by an existence check) and creates one admin
and two regular users with a handful of drawings, enough to exercise the admin view.
**It refuses to run when `NODE_ENV === "production"`** — these accounts have passwords
committed to the repository.

## Gotchas

- **Coordinates are normalised, not pixels.** A stroke point is stored as `x`/`y` in
  `[0, 1]` relative to the canvas box, never as raw pixels. This is what lets a drawing
  be replayed at any canvas size and on any screen. Denormalise on render, normalise on
  capture — never store the result of a raw `clientX`.
- **Pointer events, not mouse events.** The canvas uses `pointerdown`/`pointermove`/
  `pointerup` with `setPointerCapture`, so stylus and touch work for free. Map screen
  coordinates through `canvas.getBoundingClientRect()`, and size the backing store with
  `devicePixelRatio` or lines render blurry on retina displays.
- **The JWT lives in `localStorage`, so XSS is the project's number-one risk.** There is no
  `v-html` anywhere in this codebase, no user content is rendered as HTML, and the frontend
  dependency list stays frozen. These are not style preferences — they are what makes the
  storage choice acceptable.
- **The token is read and injected in exactly one place: `frontend/src/api/http.ts`.** No
  component, view or store builds an `Authorization` header by hand. Every `localStorage`
  access is wrapped in `try/catch` — it throws in private browsing.
- **Never trust the JWT payload client-side.** It is base64, not encrypted, so it proves
  nothing in the browser. Reading `exp` to log out cleanly is fine; deriving `role` from it
  is not. Identity and role come from `GET /api/auth/me`, answered by the server.
- **There is no `POST /api/auth/logout`, on purpose.** A stateless token cannot be revoked
  server-side; logout is a `removeItem`. Adding the endpoint would imply otherwise.
- **There is no Vite proxy, on purpose.** The client calls the API by its absolute
  `VITE_API_URL` in development exactly as in production, because front and API deploy to
  two different origins. `cors({ origin: env.CLIENT_ORIGINS })` on the server — an explicit
  list, never `"*"`, and no `credentials`. An `Authorization` header triggers an `OPTIONS`
  preflight; an origin that does not match exactly fails as an opaque network error with
  nothing in the server log.
- **`VITE_*` is inlined at build time, never read at runtime.** Changing `VITE_API_URL` on a
  deployed service does nothing without a rebuild. The symptom is `undefined/api/drawings`.
- **There is no `Dockerfile` for the client, on purpose.** `docker compose` is `db` +
  `server` only. The CDN ingests `dist/` directly, so a client image would never run.
- **Admin authorisation is enforced server-side.** Hiding the admin link in the Vue
  router is a UX detail, not a security boundary. Every `/api/admin/*` route passes
  through the role middleware, and that is where the check actually lives.
- **Migrations are generated, never hand-written or applied by `db push`.** `prisma db
push` silently diverges the schema from the migration history; it is not used in this
  project.
- **In production, `prisma migrate deploy` runs in the host's release hook**, never at
  container startup and never from a CI runner. At startup a failed migration crash-loops
  the app; in a release hook it fails once and aborts the deploy, leaving the previous
  version up.
- **The seed never runs in production.** `docker compose` runs `migrate deploy` then the
  seed; a deploy runs `migrate deploy` alone. Shipping the same entrypoint unchanged would
  put demo accounts with committed passwords in the live database.
- **After editing `schema.prisma`, run `npx prisma generate`** (or `migrate dev`, which
  includes it) or the TypeScript client keeps the previous types and the errors make no
  sense.
- **`AudioContext` must be created or resumed inside a user gesture.** Browsers block
  autoplay, so the audio context is instantiated on the first click of the play button,
  never at module load.
- **Never build a Tailwind class name at runtime.** ``:class="`bg-${color}`"`` yields a
  class Tailwind never saw in the source and never emitted — it fails silently in
  production. Data-driven colours go through an inline custom property
  (`:style="{ '--stroke': stroke.color }"`), the only inline style allowed.
- **The theme is custom, defined once in `frontend/src/style.css`** via
  `@plugin "daisyui/theme"`. Do not switch to a shipped DaisyUI theme; do not scatter hex
  values through components. DaisyUI covers the generic chrome only — the canvas, toolbar
  and palette are hand-written CSS.
- **The modal is a native `<dialog>` opened with `showModal()`.** Focus trap, focus
  restoration, `Escape` and the backdrop come from the browser. Do not reimplement them.
- **`.env` is never committed**, on either side. `backend/.env.example` and
  `frontend/.env.example` are the committed references; `JWT_SECRET`, `DATABASE_URL` and
  `CLIENT_ORIGINS` live in `backend/.env`, `VITE_API_URL` in `frontend/.env`.
- **In CI, `npx prisma generate` runs before the server typecheck**, or `tsc` fails on
  missing types with an error that never names the cause. `npm ci`, never `npm install`.
- **Commit early and often.** Regular, atomic commits are an explicit evaluation
  criterion for this exercise (see `@context/exercise-brief.md`). One commit per coherent
  step, imperative subject line, no `wip` dumps at the end.
- A test that was already failing before a task started is reported, not silently fixed.
