# Coding Standards — SonicLight

Stack: Vue 3 (`<script setup>`, Vite, Pinia) on the frontend, Express 5 + TypeScript /
Prisma 7 (PostgreSQL 16) on the backend. See `context/project-overview.md` for the full
spec and `context/exercise-brief.md` for the constraints this exercise is graded on.

This is a one-week technical exercise. Where a rule below trades rigour for speed, that is
deliberate and documented — but the trade is stated, never silently taken.

## TypeScript

- Strict mode on both packages (`"strict": true`, plus `noUncheckedIndexedAccess`)
- No `any`. Use `unknown` and narrow, or write the type
- No `as` to silence the compiler. The one thing that legitimately needs narrowing —
  `drawing.data`, which Prisma types as `Prisma.JsonValue` — goes through
  `DrawingDataSchema.parse()`, which narrows *and* validates. A cast there would let a
  corrupted row reach the canvas and crash the render
- `!` non-null assertions only where a middleware guarantees the value and the guarantee is
  one line away (`req.user!` after `requireAuth`). Everywhere else, narrow properly
- Type inference where obvious, explicit types on every exported function signature
- The drawing format types (`Point`, `Stroke`, `DrawingData`) are duplicated between
  `frontend/src/types/drawing.ts` and `backend/src/types/drawing.ts`, with a header comment on
  both naming the server copy as canonical. Twenty duplicated lines beat a workspace at this
  size — but they must stay byte-identical, so a change to one is a change to both in the
  same commit

## Vue

- `<script setup>` with the Composition API only — no Options API, no `defineComponent`
- One job per component. A component that both captures pointer events and talks to the API
  is doing two things
- Reusable logic goes into composables under `src/composables/` (`useDrawing`,
  `useCanvasReplay`, `useSonification`) — the canvas logic never lives inside a view
- Local state with `ref`/`reactive`. Pinia holds exactly one store, `auth`, because it is
  the only state shared across unrelated routes. A store per screen would be ceremony
- All HTTP goes through `src/api/` modules — components never call `fetch` directly. Those
  modules in turn go through `src/api/http.ts`, the one place that reads the token and sets the
  `Authorization` header
- Props and emits are typed with `defineProps<T>()` / `defineEmits<T>()` generics, never the
  runtime object form
- Router guards protect `/admin` and the authenticated routes. This is **UX, not security** —
  the real boundary is `requireAdmin` on the server, and it is tested there
- Views under `src/views/`, one per route; shared presentational components under
  `src/components/`

## Canvas

The canvas is the exercise. It is written against the native API — no Fabric.js, no Konva,
no Paper.js, **and no p5.js**. p5 is the closest call, being the creative-coding standard and
culturally at home here, but it owns the render loop while Vue owns the component lifecycle,
and the project would use maybe 2% of it: `pointerdown` → `lineTo` → `stroke`. The integration
cost exceeds the sixty native lines it replaces. If the drawings were generated
algorithmically rather than traced by hand, the answer would be the opposite.

- `pointerdown` / `pointermove` / `pointerup` only. Never `mouse*` or `touch*`: one event
  family covers mouse, touch and stylus, and handling two families separately is the most
  common source of broken tactile drawing
- `setPointerCapture()` on `pointerdown`, so a stroke survives the cursor leaving the canvas
  and `pointerup` always fires. Without it a stroke can stay open forever
- `touch-action: none` in CSS on the canvas element, or drawing with a finger scrolls the
  page instead of drawing
- Size the backing store with `devicePixelRatio` (`canvas.width = cssWidth * dpr`, then
  `ctx.scale(dpr, dpr)`) or every stroke is blurry on a high-density display
- `lineCap` and `lineJoin` are `"round"`. Without them a fast stroke shows its segments
- **Coordinates are normalised to `[0, 1]` at capture and denormalised at render.** No pixel
  value is ever stored, sent over the network, or persisted. This is what lets one drawing
  render in the editor, in a gallery thumbnail and in the replay view
- Stroke `width` is normalised against the canvas **width** only — thickness is a scalar,
  not a vector
- One render function, `renderStrokes(ctx, data, box, upTo)`, shared by the editor, the
  replay view and the thumbnail. `upTo` drives the stroke-by-stroke animation. Three call
  sites, one implementation
- Points are filtered at capture: a point closer than ~0.002 normalised units to the previous
  one is dropped. Cuts a typical drawing from ~400 KB to ~40 KB of JSON with no visible
  difference

## Web Audio (P2 only)

Native Web Audio API — no Tone.js. Nothing in this section is written before the P0 scope is
finished and committed.

- `AudioContext` is created — or resumed via `ctx.resume()` — inside a user gesture handler,
  never at component mount. Browsers block autoplay, and a context created at mount starts
  suspended
- `OscillatorNode` is single-use: `start()`, `stop()`, disconnect, discard. One note, one
  oscillator. Reusing one throws
- Every note gets a gain envelope (`setValueAtTime` then `exponentialRampToValueAtTime`).
  Stopping an oscillator abruptly produces an audible click
- `exponentialRampToValueAtTime` never targets `0` — it throws. Ramp to `0.0001`, then stop
- Pitch is quantised onto a minor pentatonic scale rather than mapped linearly from `y`. A
  linear map makes every drawing sound like a siren; five degrees per octave with no adjacent
  semitones keeps any combination consonant. This is an aesthetic decision, stated as one
- Simultaneous voices are hard-capped. A dense drawing would otherwise clip the output
- The mapping lives in `useSonification`, in one place — never inlined into a view

## Express API

- Router-based, three routers (`auth`, `drawings`, `admin`) mounted under `/api`
- Layering is one-directional: **Route → Controller → Service → Prisma**
- Only a service imports `prisma`. A controller that imports it bypasses the layer where
  ownership rules live — that is a bug, not a shortcut
- A service never touches `req`, `res`, or an HTTP status code. It returns a value, `null`,
  or throws a domain error that the central `errorHandler` translates. A service that knows
  about HTTP cannot be unit-tested, and the ownership tests are the tests that matter here
- A controller holds no business logic. Past ten lines, logic is in the wrong place
- Every mutating endpoint follows the same pipeline, in order — skipping a step is how data
  leaks between accounts:
  1. `requireAuth` → resolve `req.user` from the JWT cookie, else `401`
  2. Zod `safeParse` of the body → `400` with the failing fields
  3. Load through the service **with `userId` in the signature** → `404` if missing *or*
     owned by someone else
  4. Mutate through Prisma
  5. Return an explicitly built DTO — `passwordHash` never leaves a service
- Ownership is enforced by the query, not after it: `findFirst({ where: { id, userId } })`,
  never `findUnique({ id })` followed by a comparison
- Admin access is a **separate, explicitly named service function**
  (`listAllForAdmin()`), never an optional `userId?` parameter on the user-facing one. An
  optional parameter makes the omission silent; a separate function makes it deliberate
- A resource owned by another user returns **`404`, never `403`** — a `403` would confirm the
  id exists. The only `403` in the project is `requireAdmin`, where the route's existence is
  not a secret
- `GET /api/drawings` returns summaries without `data`. Twenty full drawings is megabytes of
  JSON to render twenty titles
- Async route handlers are wrapped so a rejected promise reaches the error middleware.
  Express 5 forwards rejections natively — verify this rather than assuming it

## Database

- Prisma 7 + PostgreSQL 16 for all data access. No raw SQL
- Schema changes go through `prisma migrate dev`. **Never `prisma db push`** — it diverges
  silently from the migration history and makes the database unreproducible
- `prisma migrate deploy` in Docker and any non-local environment: it applies existing
  migrations and never generates or resets
- After editing `schema.prisma`, run `prisma generate` — since Prisma 7, `migrate dev` no longer does it
  or the client keeps stale types and the errors make no sense
- Strokes are stored as `jsonb` on `Drawing.data`, not as `Stroke`/`Point` tables. A drawing
  is always read, written and deleted whole — it is a document, not a relation. The day a
  query needs individual strokes, a GIN index comes before normalisation
- Every `jsonb` payload is validated by `DrawingDataSchema` on the way **in** and parsed by it
  on the way **out**. The database enforces no shape; Zod is the only guarantee
- Hard bounds on the payload (`≤ 1000` strokes, `≤ 5000` points per stroke) are validation,
  not decoration — without them a client can post a 200 MB `jsonb` row
- `@@index([userId, createdAt(sort: Desc)])` exists because that is the personal gallery
  query, the most frequent in the app. No other index until a query justifies one
- `onDelete: Cascade` on `Drawing.userId` — orphan drawings serve no purpose
- No soft delete, no `thumbnail` column, no `Role` table. See `project-overview.md` §8
- The seed is idempotent: every step guarded by an existence check, safe to replay

## Auth

JWT (HS256) in `localStorage`, sent as `Authorization: Bearer`. The standard SPA-over-a-
stateless-API pattern, and the one this developer knows — on an exercise graded on
understanding the code you produce, a familiar pattern beats a theoretically better unfamiliar
one. It also keeps the API browser-independent, which a cookie would not.

**The XSS exposure is accepted, not overlooked.** A token in `localStorage` is readable by any
script on the page. The rules below are what keep that acceptable, and none of them is
optional:

- **No `v-html`. Anywhere.** Vue escapes `{{ }}` by default; `v-html` is the XSS door. This is
  grep-able in review, and it is the single most important rule in this file
- **No user-generated content is ever rendered as HTML.** A drawing title is text, displayed as
  text. It is the only free-text field in the app, capped at 80 characters
- **No frontend dependency beyond the Vue core.** Every third-party library is more script
  running in the page, which is more XSS surface. This is why the dependency list is frozen
- The token is read and injected in **exactly one place**, `src/api/http.ts`. No component, no
  view, no store builds an `Authorization` header by hand
- Every `localStorage` access is wrapped in `try/catch` — it throws in private browsing and
  when site data is blocked. Never a bare `localStorage.getItem()`
- 7-day expiry. `logout` is a `removeItem`; there is deliberately **no `POST /api/auth/logout`**
  endpoint, because a stateless token cannot be revoked server-side and an endpoint would
  suggest otherwise

**The client never trusts the token's contents.** A JWT payload is base64, not encrypted —
readable by anyone, therefore proof of nothing client-side. Reading `exp` to log out cleanly is
fine; inferring `role === "ADMIN"` from it is not. Identity and role come from
`GET /api/auth/me` at startup, answered by the server, which is the only holder of the signing
secret. A `401` on any call clears the store and redirects.

- bcrypt at cost 10. No plaintext password is ever logged, including inside an error
- `JWT_SECRET` is validated at boot by the env schema. A missing secret fails startup rather
  than signing tokens with `undefined`
- The role on `req.user` comes from the verified token, never from a client-supplied field
- **No Vite proxy.** The client calls the API by its absolute URL from `VITE_API_URL`, in
  development exactly as in production. A proxy would make development same-origin while the
  deployed app is genuinely cross-origin — front on a CDN, API in a container — and would
  defer the first CORS failure to deploy day. Developing in the topology you ship costs one
  CORS config and removes a class of surprises
- `cors({ origin: env.CLIENT_ORIGINS })` — an explicit list, never `"*"`, and
  `credentials: true` is deliberately **not** set: no cookie circulates
- An `Authorization` header makes the request non-simple, so the browser preflights with
  `OPTIONS`. `cors` answers it, but an origin that does not match **exactly** (missing
  `https://`, trailing slash) fails as an opaque network error client-side with nothing in the
  server log. First place to look when a call works in `curl` and fails in the browser
- No refresh token: a stated trade-off. The 7-day token cannot be revoked before expiry
- **The condition that flips this decision**, worth being able to state out loud: the day the
  app renders content authored by other users as HTML, or handles sensitive data, the
  `httpOnly` cookie becomes the right answer. The migration is cheap — the token is read in one
  place server-side, and `requireAuth` can accept both transports in three lines

## Validation

- Zod at the API boundary, on every request body. Nothing unvalidated reaches a service
- A Zod schema is the single source of truth: the runtime validator *and* the inferred
  TypeScript type (`z.infer<typeof Schema>`). Never write the interface separately — the two
  will drift
- `safeParse` in controllers, so a failure becomes a `400` with field detail rather than a
  thrown `ZodError` reaching the error middleware as a `500`
- Environment variables are validated by a Zod schema in `lib/env.ts` at startup. A missing
  variable fails the boot with a clear message, not the first user request

## Error Handling

- One central `errorHandler` middleware, registered last. Domain errors
  (`NotFoundError`, `ForbiddenError`, `ValidationError`) map to statuses there, in one place
- Services throw domain errors; controllers return statuses. Neither does the other's job
- One error shape on the wire: `{ code: "drawing.notFound", message: "…" }`. The `code` is
  stable and machine-readable, the `message` is for the developer. The client branches on
  `code`, never on text — that is what would make adding translations non-breaking later
- Never swallow an error. Log it server-side, surface something readable client-side
- Client-side: API modules throw on non-2xx, views catch and show the message. No global
  toast interceptor for five screens

## Naming

- Vue components: PascalCase files and usage (`DrawingCanvas.vue`, `<DrawingCanvas />`)
- Composables: `useX` camelCase (`useDrawing.ts`)
- Pinia stores: `useXStore` (`useAuthStore`)
- TypeScript functions and variables: camelCase; types and interfaces: PascalCase, no
  `I` prefix
- Constants: `SCREAMING_SNAKE_CASE`
- Backend files carry their layer: `drawings.routes.ts`, `drawings.controller.ts`,
  `drawing.service.ts`, `drawing.schema.ts` — the filename says where a thing belongs
- API JSON is camelCase throughout, request and response
- API routes are kebab-case and plural (`/api/drawings`, `/api/admin/drawings`)
- Prisma models are PascalCase singular (`Drawing`), tables are lowercase plural via `@@map`
  (`drawings`)
- Tests sit beside what they test: `drawing.service.test.ts`

## File Organization

```text
frontend/src/
├── views/        one per route — DrawView, GalleryView, DrawingView, AdminView, LoginView
├── components/   shared presentational pieces — DrawingCard, ColorPicker, ToolBar
├── composables/  useDrawing, useCanvasReplay, useSonification
├── stores/       auth.ts — the only store
├── api/          auth.ts, drawings.ts — the only place fetch is called
├── types/        drawing.ts (duplicate of the server copy)
└── router/

backend/src/
├── routes/       auth.routes.ts, drawings.routes.ts, admin.routes.ts
├── controllers/
├── services/     the only layer that imports prisma
├── schemas/      Zod — validators and inferred types
├── middleware/   requireAuth, requireAdmin, errorHandler
├── lib/          prisma.ts, jwt.ts, env.ts
└── types/        drawing.ts (canonical copy)
```

- Two independent npm packages, no workspace. `npm install` in each
- No new top-level folder without updating this document and `project-overview.md`
- No `utils/` or `helpers/`. A file named after what it cannot classify is a file whose
  contents have no home

## Styling

Tailwind 4 + DaisyUI 5 with a custom theme. Two dev dependencies, no runtime, no JavaScript
components. The split is the decision, not the tool:

- **DaisyUI for the generic chrome** — buttons, inputs, cards, modal, badges, alerts. No reason
  to hand-write focus rings and field states
- **Hand-written CSS for what carries the product** — canvas, toolbar, colour palette, replay
  view. Adopting a library wholesale gives an admin dashboard; refusing one wholesale rewrites
  work that has no identity in it

- **The theme is custom, never a shipped one.** Defined in `frontend/src/style.css` via
  `@plugin "daisyui/theme"`. Shipping a library's default appearance is shipping nobody's
- All tokens live in that one file — `@theme` for Tailwind's, the theme block for DaisyUI's
  semantic colours. No hex values scattered through components
- **The modal is a native `<dialog>` opened with `showModal()`**, which DaisyUI's modal is
  built on. Focus trap, focus restoration, `Escape` and the backdrop come from the browser.
  Hand-rolling that is eighty lines you get subtly wrong
- **Never build a class name at runtime.** `` :class="`bg-${color}`" `` produces a class
  Tailwind never saw in the source and therefore never emitted. It fails silently in
  production. Data-driven colours go through an inline custom property
  (`:style="{ '--stroke': stroke.color }"`), which is data, not styling — and is the only
  inline style allowed
- Drawing colours come from a **closed palette of six**, defined once. A free colour picker
  would make the gallery visually incoherent and the hue → timbre mapping arbitrary
- Colour never carries meaning alone: every icon-only button has an `aria-label`, and every
  palette swatch is named
- Dark by default: stroke colours read better, and it is the convention for creative tools
- **The one constraint that holds the design together: nothing on screen is coloured except the
  drawing.** The whole interface is greyscale plus a single accent; the only saturated colours
  in the app are the stroke colours. Three corollaries — nothing floats over the canvas,
  monospace is reserved for technical and meta text (counters, event names, timestamps), and
  the replay is the product's only animation
- **Style every native form control or drop it.** A bare `input[type=range]` renders a white
  track on a dark theme and is the one element that betrays the design. `accent-color`, or
  DaisyUI's `range range-primary`

## UX rules that outweigh the tooling

- **Replay starts on open, not on click.** A saved drawing reconstructs stroke by stroke as
  soon as its page loads. It is the project's one memorable moment and it demonstrates, without
  a word, that geometry was stored rather than an image
- **Keyboard**: `Cmd/Ctrl+Z` undoes, `Escape` closes the modal, `Enter` submits the title.
  Three lines, and the difference between a demo and a tool
- **The toolbar sits below the canvas**, never over it — a floating control ends up under the
  cursor at the exact moment someone is drawing
- **Empty states are written, not omitted.** A new user's gallery is the second screen they
  see
- **Skeletons match final height.** Thumbnails render from strokes, so a grid without reserved
  height jumps when the data lands

## Testing

- Vitest on both packages
- The tests that matter are the **ownership tests**: a user cannot read, open or delete
  another user's drawing; a non-admin cannot reach an admin route. These are the tests to
  write first and the ones worth discussing
- Plus schema tests: `DrawingDataSchema` rejects out-of-range coordinates, oversized payloads
  and an unknown `version`
- Plus one auth test that matters given the storage choice: a token with a tampered payload
  (role flipped to `ADMIN`) is rejected by signature verification. It proves the role comes
  from the verified token and not from what the client sent
- No end-to-end tests. Two hours for shallow coverage, on an exercise measured in hours, is a
  bad trade — stated as a decision, not an omission

## Deployment & CI

Front and API deploy **separately**: a static `dist/` on a CDN, the API as a container, a
managed Postgres. Two origins in production, which is why development is cross-origin too.

- **There is no `Dockerfile` for the client, on purpose.** The server's image is really used
  in production; a client image never would be, since the CDN ingests `dist/` directly.
  Building an artifact that never runs is the opposite of the prioritisation this exercise
  grades. `docker compose` is `db` + `server`, and that still satisfies the Docker bonus
- **`VITE_*` variables are inlined at build time, not read at runtime.** Setting `VITE_API_URL`
  in a service's environment after the fact changes nothing — it needs a rebuild. The symptom
  is a front calling `undefined/api/drawings`
- **Prefer Vercel or Netlify over GitHub Pages.** Pages serves from a subpath, so `base` must
  be set in `vite.config.ts` or no asset loads, and an SPA needs a deep-link fallback
  (`index.html` copied to `404.html`). The other two handle both natively and deploy on push
- `CLIENT_ORIGINS` is a list and holds the exact deployed origin — scheme included, no
  trailing slash
- Free tiers sleep after inactivity; the first call after a pause takes seconds. Say so in the
  README so a reviewer does not read latency as a defect

CI is one workflow, `.github/workflows/ci.yml`, on every push and pull request: `npm ci` →
`prisma generate` → `tsc --noEmit` → `npm test` for the server, `npm ci` → `vue-tsc --noEmit`
→ `npm run build` for the client.

- `npx prisma generate` **before** the server typecheck, or `tsc` fails on missing types with
  an error that never names the cause
- `npm ci`, never `npm install` — `ci` honours the lockfile exactly
- Generate `package-lock.json` on the same platform CI runs on; a lockfile written on macOS can
  omit Linux-only resolutions and break `npm ci` in the runner
- No Node version matrix. One LTS. Testing three versions here would be ceremony

**CD for the API, and where migrations run.** This is the part the frontend does not have, and
it is the question worth being able to answer.

- **`prisma migrate deploy` runs in the host's release hook** — `release_command` on Fly.io, a
  pre-deploy command on Render or Railway — never at container startup and never from an
  Actions runner. At startup, a failed migration crash-loops the app instead of failing once;
  from a runner, the production database has to accept connections from GitHub's address
  ranges and `DATABASE_URL` has to live in repository secrets. In a release hook it runs once,
  inside the host's network, and **a failure aborts the deploy so the previous version stays
  up**. `migrate deploy` is idempotent and takes a Postgres advisory lock, so concurrency is
  not the issue — the failure mode is
- **The seed never runs in production.** `docker compose` runs `migrate deploy` then the seed;
  a deploy runs `migrate deploy` alone. The same entrypoint shipped unchanged would insert
  demo accounts, with passwords committed to a Git repository, into the production database.
  The guard is `NODE_ENV !== "production"` in code, not an intention
- **Whether a deploy workflow exists at all depends on the host.** Render and Railway deploy on
  push through their own Git integration, so an Actions workflow would duplicate it — same
  argument as Vercel on the frontend. Fly.io has no Git integration, so `flyctl deploy` in
  Actions is genuinely needed there
- A deploy workflow, where one exists, carries `needs:` on the CI job (never deploy a red
  build), a `paths:` filter on `backend/**`, and a `concurrency` group with
  `cancel-in-progress: false` — two deploys must not overlap, and one already in flight is
  allowed to finish
- No staging environment, no blue-green, no automatic rollback, no `down` migrations. Rollback
  here is redeploying the previous commit. Knowing that the real production answer is
  expand/contract migrations — add a column, backfill, switch the code, drop the old one
  later — is worth more than implementing it for two tables

## Code Quality

- No commented-out code
- No unused imports or variables
- Functions under ~40 lines, files under ~150. Past that, split — not because of a metric,
  but because the whole point is that every file can be read in one pass and defended aloud
- **Conventional Commits, committed continuously.** Regular commits are an explicit grading
  criterion: one commit per coherent, compiling step. Never `wip`, never a single dump at the
  end. A `git log` whose commits all share one timestamp contradicts the brief in a way no
  code quality can offset
- Before handing back: `npx tsc --noEmit` and `npm test` in `backend/`, `npx vue-tsc --noEmit`
  and `npm run build` in `frontend/`. All four pass, or the task is not done
- A test that was already failing before a task started is reported, not silently fixed
