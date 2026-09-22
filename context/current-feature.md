# Current Feature

<!-- One work package at a time. When this one is done, summarise it in a line under
     History, then replace Feature / Status / Goals / Notes with the next one. -->

## Feature

Final polish and delivery

## Status

In progress — 22 September 2026. **The application is deployed and working online, the README
is written, and `main` carries everything.** What is left is the rate-limiting decision and
sending the repository link. The deadline is 23 September.

## Goals

- ✅ Extract the two `<dialog>` elements from `AdminView.vue`, which stood at 211 lines against
  the 150-line limit this project sets itself. Now `DrawingDialog.vue` and
  `DeleteDrawingDialog.vue`; the view is back to 150.
- ✅ Decide the fate of `experiment/audio-engine`: **kept**, as a visible trace of exploration.
- ✅ Merge `feature/i18n`, then `feature/e2e` (`--no-ff`, so the lot boundaries stay readable).
- ✅ Shorten the context documents: what was obsolete (a plan for work already done) and what
  was written twice. Roughly 500 lines lighter, no decision lost.
- Decide on rate limiting for `POST /api/auth/login`. It is the only real security gap: the
  hand-made admin account is brute-forceable. The cost is one dependency and five lines,
  against a dependency list that has already grown by one for i18n — so it is an arbitration,
  not an obvious win.
- Decide whether the e2e suite goes into CI. A job was drafted — Postgres as a service, a
  `backend/.env` written on the runner, `reuseExistingServer: !process.env.CI` — and set
  aside for now.
- Send the repository link.

## Notes

**Out of scope for this lot** — any new feature. The four firm requirements and the optional
one are done, deployed and demonstrated.

**Still open, to settle or to own:**

- The e2e suite runs against the seeded development database and is not in CI. Each run
  leaves an `e2e-<timestamp>` account behind — without a drawing, so it shows nowhere.
- The server image weighs 1.2 GB for want of a multi-stage build — a "simplest thing first"
  choice, to own or to fix. Fixing it would also remove the four `npm audit` highs, which all
  come from `mysql2` pulled in by the Prisma CLI and never loaded on a PostgreSQL project.
- No unit tests on the frontend: Vitest is not installed in `frontend/`. The Playwright suite
  covers the journeys, not the components.
- The canvas is not reachable by keyboard. A real limit of the product, named in the README
  rather than hidden.

## History

<!-- Oldest first, one entry per finished work package. Decisions taken and traps worth
     remembering — not the verification steps, which are the same every time. -->

### 17/09 — Foundations ✅

Express 5 + TS (ESM) with `/api/health`, env validated at boot, errors shaped
`{ code, message }`; Postgres 16 in compose; Prisma schema, `init` migration and seed; a client
calling the API cross-origin; green CI. Commits `204ba96` → `51a497a`.

- **Prisma 7, not 6**: the `@prisma/adapter-pg` adapter is mandatory, the URL and the seed
  command live in `prisma.config.ts`, the client is generated into `src/generated/`
  (git-ignored), and `migrate dev` no longer regenerates it.
- **A unique `userName`, no email**: one field is both the login identifier and the author name.
- **The seed came early**, planned for P1, so auth could be exercised as soon as it existed.
- Trap: **`npx vue-tsc --noEmit` checks nothing** — the root tsconfig is a solution file with
  `files: []`. Always `npm run type-check`.
- Trap: **"Failed to fetch" means the API is down _or_ the origin was refused.** Same opaque
  error on the page; only the browser console tells them apart.

### 17/09 — Authentication ✅

Register, login and `/api/auth/me`; `requireAuth` / `requireAdmin`; session restored on reload;
login and register screens, header, route guards. 31 backend tests against a real database.
Branch `feature/auth`, commits `4d8b104` → `7f336a4`.

- **`AppError` subclasses each carry their own HTTP status.** Simpler than a mapping table; the
  rule "a service knows nothing of HTTP" was relaxed knowingly, and no error response is built
  by hand any more.
- **Two Zod schemas**: `RegisterSchema` enforces the format rules, `LoginSchema` only checks
  both fields are filled — a format miss is a 401, not a 400 that would reveal the rules.
- **No `id` in responses and no `JWT_EXPIRES_IN`**: `{ userName, role }` is enough, and the
  seven-day lifetime is a constant in `jwt.ts`.
- Trap: **a 401 must only log out if the request carried a token.** A failed login is a 401 too,
  and redirecting on it wipes the form of its error message.
- Trap: **`prisma migrate dev` refuses a non-interactive shell** as soon as it has a warning to
  confirm: `migrate diff` + `migrate deploy` instead (procedure in `CLAUDE.md`).

### 18/09 — Drawing ✅

A vector format validated by Zod, `GET/PUT/DELETE /api/drawing`, a pointer-driven canvas in
normalised coordinates, palette and widths, saving and reopening on a single screen. 54 backend
tests. Branch `feature/drawing`, commits `a918b43` → `1a41891`.

- **One screen instead of two.** A read-only view duplicated the editor once a user has a single
  drawing. `/` opens on the saved drawing: finding it again in the strong sense, editing
  included.
- **An empty drawing is allowed**, because with no delete button on the user side, saving an
  empty canvas is how a drawing gets wiped.
- **`DELETE /api/drawing` written and tested but not exposed**: an interface decision, and the
  route carries a useful isolation test.
- Trap: **`app.use(router)` triggers the first navigation**, so the session must be restored
  before it or the guard redirects to `/login` on every reload.
- Trap: **a Tailwind class built at runtime does not exist** in the emitted CSS. Stroke colours
  go through an inline custom property.
- Trap: **resizing a canvas clears it** — repaint from the strokes, which normalised coordinates
  make free.

### 18/09 — Administration ✅

`GET/DELETE /api/admin/drawings(/:id)` behind `requireAuth` + `requireAdmin`, separate and
explicitly named services, generated demo drawings, an admin grid with opening and deletion.
64 backend tests. Branch `feature/admin`, commits `7d92cf1` → `32513ed`.

- **Deletion behind a dedicated confirmation modal** that names what is about to disappear.
  Delete buttons are the only red in the application — the owned exception to "nothing is
  coloured except the drawing".
- **`strokeCount` dropped** from the list: a useful consequence is that the query no longer
  loads the `jsonb` column at all.
- **The seeded `admin` has no drawing**: the demonstration separates the roles better, and it
  exercises the empty canvas.
- Trap: **the role comes from the verified token.** Promoting an account in the database is not
  enough — a token issued before still says `USER`. The owned limit of a stateless JWT.
- Trap: **a `204` has no body**, so `res.json()` fails there and a successful deletion looks
  like a failure.
- Trap: **on a delete, "already gone" is not a failure**: a 404 is handled as a success.

### 18/09 — Interface feedback ✅

Success and error toasts, loading spinners, a 404 page. Branch `feature/toasts`, commits
`4fee97f` → `5b81de3`.

- **Success is green**, where the rule said nothing is coloured except the drawing. The
  exception is owned and **bounded**: notifications and the red of deletions, nothing else.
- **Undo re-enabled alongside Clear.** A reloaded drawing had "changed nothing since the save",
  so both stayed dark — and wiping a drawing became unreachable. `load()` bumps the revision,
  which makes that the wrong question to ask.
- **A 404 page with no `meta`**: an unknown URL is a 404 for everyone. Putting it behind
  `requiresAuth` would suggest it exists behind a session, and protect nothing.
- Trap: **an `aria-live` region inserted with its message is not announced.** The container
  stays in the DOM permanently, therefore `pointer-events-none` while empty.
- Trap: **a SPA's 404 depends on the host.** Without an `index.html` fallback, an unknown URL
  never reaches the router. Native on Vercel, to be wired by hand on GitHub Pages.

### 20/09 — Sonification ✅

A drawing becomes a score: `x` → time, `y` → pitch quantised on a minor pentatonic, width →
gain, colour → timbre. An eight-second looping pass, a playhead drawn inside the canvas.
Branches `feature/sonification` then `feature/audio-effects`, commits `ba106d6` → `923d494`.

- **An `audio/` folder and a `canvas/` folder**, outside `composables/`, which now holds only
  what touches Vue. The mapping and the engine know neither `ref` nor lifecycle.
- **An `AudioEngine` port and a `WebAudioEngine` class.** Replacing raw Web Audio with Tone.js,
  samples, an AudioWorklet, RNBO or Faust becomes a second implementation, not a modification.
  The one place in the project where openness to extension was paid for in advance.
- **A timbre is named as a sound** (`pure`, `soft`, `hollow`, `bright`), never as a waveform: a
  sample-based engine has no oscillator to name. **The palette drops to five colours**, one per
  voice — it became the instrument list.
- **Simplified afterwards**: the sliding-horizon scheduler and the merging of held notes went,
  336 lines back to 229. Web Audio dates its own events, so a whole pass is scheduled at once.
- **Rejected: the stroke as a waveform** (DFT of the path → `setPeriodicWave`). Written, tried,
  kept on `experiment/audio-engine`. **Rejected: noise as a timbre** — not an oscillator type.
- Traps: **`AudioContext` only starts inside a user gesture**; **an oscillator is single-use**
  and needs an `onended` that disconnects; **`exponentialRampToValueAtTime` throws on 0**;
  **one engine instance per view**, or two drawings sound together.
- Trap: **Tailwind reads text, not code.** A constant named `STEPS` and a function named
  `toggle` were enough to make DaisyUI emit its `steps` and `toggle` components — 7 kB of
  dead CSS.

### 20/09 — Docker and deployment ✅

`docker compose up --build` starts the database, the API and the client. Online: API and
Postgres on Railway, front on Vercel. Branch `feature/docker`, commits `b6f3e06` → `16bbaf3`.

- **The client is containerised**, where the documentation said the opposite. The image serves
  **local demonstration** — one command has to give a whole application — while deployment stays
  a `dist/` on a CDN, and the image holds `http://localhost:3000` hard-coded, which proves it is
  not a deployment artifact.
- **Single-stage images.** A happy consequence is that the Prisma CLI stays in the image, so the
  release hook can run `migrate deploy` there; a costly one is 1.2 GB on the server side.
- **The seed runs in production, without the `ADMIN`.** The rule changed in nature: it is about
  the **role**, not the environment. A `USER` account with public credentials opens nothing that
  registering would not; the administrator can delete everybody's work.
- Traps, all Railway-shaped: **`railway.json` silently overrides the dashboard**; **the
  configuration is read at the service's root**, so `Root Directory = backend` or neither the
  Dockerfile nor `railway.json` is seen; **a `preDeployCommand` is not handed to a shell**, so
  `a && b` needs an npm script.
- Trap: **`VITE_API_URL` without `https://` is a relative URL**, resolved against the front's own
  origin — a `POST` landing on `index.html` and an unintelligible 405.

### 20–22/09 — README, eraser and iOS fixes ✅

The README delivered: demonstration link, credentials, screenshots, technologies with a
justification each, structuring decisions, what is out of scope, known limits. Plus a vector
eraser and two iOS audio fixes. Commits `8faad05` → `d84a7e2`.

- **The eraser deletes strokes, it does not paint the background.** A white stroke would still
  be a stroke: it would hide the ink while the sonification kept playing every note underneath.
  Erasing has to reach the audio as well as the eye.
- **Undo therefore changed nature**, from `strokes.pop()` to a stack of snapshots, one per
  gesture. Owned consequence: on a freshly opened drawing, Undo is disabled.
- **`useCanvasSurface` rejected**: it would have had exactly one caller. Abstracting on the
  first case to bring a line count down is the opposite of the rule, so `useDrawing.ts` stands
  at 189 lines, owned and explainable.
- Trap: **Safari has a non-standard `"interrupted"` `AudioContext` state**, after a call or a
  backgrounded tab. Resuming only from `"suspended"` leaves iOS silent until a reload — the
  condition has to be `state !== "running"`.
- Trap: **iOS plays Web Audio in its "ambient" category**, which the ring/silent switch mutes.
  `navigator.audioSession.type = "playback"` is the only standards-track way out, WebKit-only.

### 22/09 — Bilingual interface ✅

English and French, a toggle in the header, the choice kept in `localStorage` and the browser
language as the default. 62 strings, plural forms on the counters. Branch `feature/i18n`.

- **Internationalisation was listed as out of scope**, and the reversal is written down in both
  the README and the overview rather than the line quietly dropped.
- **A hand-written module came first**, and was thrown away. Fifty lines, `+1.9 kB` gzipped, and
  it typed its own keys. It lost on **plurals**: doing them properly per locale means
  reimplementing `Intl.PluralRules`.
- **`vue-i18n` is the thirteenth dependency** and the only frontend one shipping JavaScript at
  runtime: `+18.5 kB` gzipped for 62 strings, and it costs the "no dependency beyond Vue"
  argument that backed the `localStorage` token.
- Trap: **vue-i18n does not type its keys.** Neither the `DefineLocaleMessage` augmentation nor
  `useI18n<{ message: Messages }>()` rejects a misspelt key — `t()` carries a `string` overload.
  The same illusion already existed with `RouteMeta`, which extends `Record<string, unknown>`.
- Trap: **translated labels are not the same length.** Switching language moved the toggle out
  from under the finger that had tapped it. Layout sized by content is layout that moves.

### 22/09 — End-to-end tests ✅

Five Playwright tests over the two journeys: a user is refused a wrong password, draws, saves,
reloads and finds the drawing again, and cannot reach `/admin`; an admin sees everybody's
drawings and deletes one after confirming. Branch `feature/e2e`.

- **E2E tests were out of scope**, in the README and in overview §17 Q10. Reversed like i18n
  before them, and recorded as such. The argument that lost was cost.
- **A third npm package, `e2e/`**, not a folder inside `frontend/`: the suite drives the API as
  much as the interface, and `@playwright/test` is neither side's dependency.
- **Fixtures create their data through the API**, and delete the throwaway account's drawing on
  teardown — no route deletes a user, and without a drawing the account never reaches the admin
  grid, which is what the tests count.
- **Not wired into CI.** A job was drafted and set aside: Postgres as a service, a
  `backend/.env` written on the runner, `reuseExistingServer: !process.env.CI`.
- Trap: **the interface follows the browser language**, so `locale: "en-US"` is pinned in the
  config or the suite fails on a French machine. And **the admin tests read the seed**.
