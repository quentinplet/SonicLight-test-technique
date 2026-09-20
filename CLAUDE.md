# SonicLight.md

A drawing-to-sound web app: users sign in, draw on a canvas, save their drawings as
vector strokes, and replay them visually and audibly. Vue 3 SPA + Express API,
PostgreSQL, TypeScript end to end. Auth is a JWT in `localStorage`, sent as a Bearer header.

> **Status: descriptive.** Commands below have been run against the repository as it
> stands (foundations lot, 17 September 2026). Anything not built yet is marked _(not yet)_;
> the Layout still lists target folders that later lots create.

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
           Tailwind 4 + DaisyUI 5, custom theme in src/style.css — no JS component library (not yet)
           src/views/ src/components/ src/stores/ src/api/ src/composables/ src/types/
           src/canvas/ — stroke rendering · src/audio/ — sonification (sonify, webAudio,
           interfaces/engine — the port every engine implements)
backend/   Express 5 API — TypeScript, single package
           prisma/schema.prisma, prisma/migrations/, prisma/seed.ts
           src/routes/ src/controllers/ src/services/ src/middleware/ src/schemas/ src/lib/
context/   Project context files read by Claude Code (see above)
docker-compose.yml   PostgreSQL 16 + the API and the client, each with its own Dockerfile
.github/workflows/   ci.yml — typecheck, test and build both packages on push
```

Two independent npm packages, no workspace tooling: `frontend/` and `backend/` each have
their own `package.json` and are installed and run separately. There is no root
`package.json` and no monorepo runner.

## Commands

### Frontend (`/frontend`)

```bash
npm run dev            # vite — dev server on http://localhost:5173
npm run build          # run-p type-check build-only (full type check + production build)
npm run build-only     # vite build alone
npm run preview        # serve the production build locally
npm run type-check     # vue-tsc --build — typecheck alone
```

**Never `npx vue-tsc --noEmit` at the package root**: `tsconfig.json` is a solution file
with `"files": []` that only references `tsconfig.app.json` / `tsconfig.node.json`, so it
checks nothing and always passes. Use `npm run type-check`. No frontend tests yet — Vitest
is not installed in `frontend/` _(not yet)_.

The client reads `VITE_API_URL` from `frontend/.env` (`http://localhost:3000` locally) and
calls the API cross-origin, the same way it will once deployed. There is no proxy — see
Gotchas.

### Backend (`/backend`)

```bash
npm run dev            # tsx watch --env-file=.env src/index.ts — API on http://localhost:3000
npm run build          # tsc -p tsconfig.build.json — emits src/ only to dist/
npm start              # node dist/index.js (production)
npm run test:db        # create/migrate the soniclight_test database — once, then after each migration
npm test               # vitest — tests/ (mirrors src/), against soniclight_test, never the dev DB
npm run format         # prettier — src/, tests/, prisma/, prisma.config.ts
npm run predeploy      # migrate deploy + seed — what Railway runs in its pre-deploy step
npx tsc --noEmit       # typecheck alone — covers src/, tests/, prisma/seed.ts, configs
```

The frontend and the API run in two terminals. With the API down, the home page shows
"Failed to fetch" — the same opaque error as a CORS rejection; the browser console tells
them apart (`ERR_CONNECTION_REFUSED` vs `blocked by CORS policy`).

### Database

PostgreSQL 16 runs in Docker (service `db`, host port **5433**, database `soniclight`).
Not 5432, so it can coexist with a local Postgres already bound there:

```bash
docker compose up -d db          # start the database alone
docker compose down -v           # stop and wipe the volume (destroys all data)
```

`docker compose up --build` runs the three services — database, API, client — on
`http://localhost:5173`. For day-to-day work, still `npm run dev` on both packages: the client
image rebuilds on every change, the dev server does not.

Prisma lives entirely in `backend/`, so every command runs from there:

```bash
npx prisma migrate dev --name <name>   # create + apply a migration (into prisma/migrations)
npx prisma migrate deploy              # apply pending migrations (CI / production)
npx prisma migrate status              # check applied vs pending
npx prisma generate                    # regenerate the client — migrate dev no longer does it (Prisma 7)
npx prisma studio                      # browse the data
npm run seed                           # prisma db seed → tsx prisma/seed.ts (set in prisma.config.ts)
```

Prisma 7: the connection URL and the seed command live in `prisma.config.ts`, which loads
`.env` with `process.loadEnvFile()`. The client is generated into `src/generated/prisma`
(git-ignored) and imported from there, with the `@prisma/adapter-pg` driver adapter.

Seeding is idempotent (upsert on `userName`, then on `userId` for the drawing) and creates
four accounts: `demo` / `demo1234`, `alex` / `alex1234` and `sam` / `sam12345` (USER, each
with one generated drawing), plus `admin` / `admin1234` (ADMIN, no drawing — the admin view
then shows three drawings by three authors). Shapes are generated in `prisma/shapes.ts`:
formulas read better than transcribed points, and they show the format is geometry.
**In production it seeds the USER accounts only, never the ADMIN.** These passwords are
committed to a public repository: a user can reach nothing but their own drawing, which
anyone could get by registering, whereas the admin can delete everybody else's work. The
deployed admin is created by hand, with a password that exists nowhere in this repository.

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
- **The auth store owns the token** (`frontend/src/stores/auth.ts`, the only code touching
  `localStorage`); **`frontend/src/api/http.ts` is the only code that sends it**, reading
  `auth.token`. No component or view builds an `Authorization` header. A 401 on a request
  that carried a token calls `auth.logout()` — no redirect from the HTTP module; the route
  guards send the user to `/login` on the next navigation.
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
  deployed service does nothing without a rebuild. The symptom is `undefined/api/drawing`.
- **The client's image is for local demonstration, not for deployment.** It bakes
  `VITE_API_URL=http://localhost:3000` into the bundle, so it only ever works on the machine
  that built it. The deployed front stays a `dist/` on a CDN.
- **One drawing per user** (IRCAM answer, `context/exercise-brief.md`). `Drawing.userId` is
  unique; user routes are singular (`/api/drawing`) and take no drawing id — the token
  names the resource. Saving is an `upsert` on `userId`. Only `/api/admin/*` addresses a
  drawing by id, and the admin can delete it.
- **`prisma migrate dev` refuses non-interactive shells when it has a warning to confirm**
  (e.g. adding a unique constraint). From an agent shell, generate the SQL with
  `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
  into a new `prisma/migrations/<timestamp>_<name>/migration.sql`, apply it with
  `migrate deploy`, then confirm `migrate dev` reports "Already in sync". Still generated,
  never hand-written.
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
- **The seed never creates an admin in production.** The privileged account is the only one
  whose committed password would matter, so `NODE_ENV=production` filters it out of the list
  rather than guarding an `if` inside the loop. The demo users and their drawings do get
  seeded: a deployed demonstration needs something to show.
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

## Deployed

API and Postgres on **Railway**, client on **Vercel**. Both deploy on a push to `main`
through their own Git integration — there is no deploy workflow in `.github/`, on purpose.

- **Railway reads its configuration at the service's root directory, not the repository's.**
  Without `Root Directory = backend`, neither `backend/Dockerfile` nor `backend/railway.json`
  is seen: it falls back to Nixpacks and the pre-deploy step silently never runs.
- **`railway.json` overrides the dashboard, silently.** A pre-deploy command typed into the
  UI is ignored while the file says something else. Change the file, not the form.
- **A `preDeployCommand` entry is not handed to a shell**, so `a && b` does not work there.
  `npm run predeploy` does, because npm provides the shell.
- **`VITE_API_URL` must carry its scheme.** Without `https://`, the value is a relative path
  resolved against the front's own origin — the symptom is a `POST` landing on `index.html`
  and a 405 that names nothing.
- **`VITE_*` is inlined at build time**, so changing it on Vercel needs a redeploy, not just
  a save. And `CLIENT_ORIGINS` on Railway must hold the exact Vercel origin, no trailing
  slash, or every call fails as an opaque network error with nothing in the server log.
- **A 404 on `/` is not a failure**: no route is mounted there, and the answer comes from
  `notFoundHandler` in the project's own `{ code, message }` shape.
- Free tiers sleep: the first call after a pause takes seconds. Say so in the README.
