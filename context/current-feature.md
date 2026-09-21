# Current Feature

<!-- One work package at a time. When this one is done, summarise it in a line under
     History, then replace Feature / Status / Goals / Notes with the next one. -->

## Feature

Final polish and delivery

## Status

In progress — 22 September 2026. **The application is deployed and working online, and the
README is written and committed.** What is left is a short list of loose ends, then sending
the repository link. The deadline is 23 September.

## Goals

- Extract the two `<dialog>` elements from `AdminView.vue`, which stands at 207 lines against
  the 150-line limit this project sets itself. It is the one place where the repository
  contradicts its own written rule, and it is checkable in thirty seconds.
- Decide the fate of `experiment/audio-engine`: keep it as a visible trace of exploration, or
  delete it.
- Decide on rate limiting for `POST /api/auth/login`. It is the only real security gap: the
  hand-made admin account is brute-forceable. The cost is one dependency and five lines,
  against a frozen dependency list — so it is an arbitration, not an obvious win.
- Send the repository link.

## Notes

**Out of scope for this lot** — any new feature. The four firm requirements and the optional
one are done, deployed and demonstrated.

**Still open, to settle or to own:**

- The server image weighs 1.2 GB for want of a multi-stage build — a "simplest thing first"
  choice, to own or to fix. Fixing it would also remove the four `npm audit` highs, which all
  come from `mysql2` pulled in by the Prisma CLI and never loaded on a PostgreSQL project.
- No frontend tests: Vitest is not installed in `frontend/`.
- The canvas is not reachable by keyboard. A real limit of the product, named in the README
  rather than hidden.

## History

<!-- Kept up to date, oldest first. One entry per finished work package. Record decisions and
     the traps that still bite — not the verification steps, which are the same every time
     (typecheck, build, tests). -->

### 17/09 — Foundations ✅

Express 5 + TS (ESM) with `/api/health`, env validated at boot, errors shaped
`{ code, message }`; Postgres 16 in compose; Prisma schema + `init` migration; seed; a client
calling the API cross-origin; green CI. Commits `204ba96` → `51a497a`.

Departures from the plan, and why:

- **Prisma 7, not 6.** The `@prisma/adapter-pg` + `pg` adapter is mandatory; the URL and the
  seed command live in `prisma.config.ts` (`.env` loaded by `process.loadEnvFile()`, not
  `dotenv`); the client is generated into `src/generated/` (git-ignored), with
  `importFileExtension = "js"` so it resolves under `tsx` as under `node`. `migrate dev` no
  longer regenerates the client.
- **Postgres on host port 5433**, so it can coexist with a local Postgres already on 5432.
- **A unique `userName`, no email and no `displayName`.** No feature needs an email; one field
  serves as both the login identifier and the author name. Overview §8/§10 updated.
- **The seed came early** (planned for P1): `demo` / `admin`, bcrypt cost 10, so auth could be
  exercised as soon as it existed. No drawings yet.
- **No `.dockerignore`**: no Dockerfile yet — it arrives with one.
- **No frontend tests**: Vitest is not installed in `frontend/`.

Traps that still bite:

- **`npx vue-tsc --noEmit` checks nothing** (the root tsconfig is a solution file with
  `files: []`). Always `npm run type-check`. Fixed across all the docs.
- **"Failed to fetch" means the API is down *or* the origin was refused** — the same opaque
  error on the page; the browser console tells them apart.
- **`tsx -e` compiles as CommonJS**: no top-level await in a one-liner, while the project's
  own ESM files accept it.

### 17/09 — Authentication ✅

Register, login and `/api/auth/me` on the API; `requireAuth` / `requireAdmin`; session
restored on reload; login and register screens, header, route guards. 31 backend tests against
a real database, CI with Postgres. Branch `feature/auth`, commits `4d8b104` → `7f336a4`.

Departures from the plan, and why:

- **`AppError` business errors** (400, 401, 403, 404, 409) in `src/errors/app-error.ts`, each
  **carrying its own HTTP status**. Simpler than a mapping table; the rule "a service knows
  nothing of HTTP" was relaxed and documented. No error response is built by hand any more,
  `notFoundHandler` included.
- **Tests in `backend/tests/`**, mirroring `src/`, rather than beside the code. A separate
  `soniclight_test` database (`npm run test:db`), files run serially.
- **No `JWT_EXPIRES_IN`**: a fixed seven-day lifetime, a constant in `jwt.ts`.
- **Two Zod schemas**: `RegisterSchema` (format rules, one clear message per field via
  `abort: true`) and `LoginSchema` (filled fields only — a format miss is a 401, not a 400).
- **No `id` in responses**: `{ userName, role }` is enough, the token names the user.
- **`http.ts` laid out like an axios client** (`buildHeaders` before, `handleErrorResponse`
  after), importing the store and the router directly. A network failure becomes an `ApiError`
  with code `network.unreachable`: one kind of error for the views to handle.
- **Light mode only**, custom theme; the violet darkened to `#6d4aff` for AA contrast.
- **Interface in English** for now.

Traps that still bite:

- **A 401 must only log out if the request carried a token.** A failed login is a 401 too;
  redirecting on it would wipe the form of its error message.
- **`prisma migrate dev` refuses a non-interactive shell** as soon as it has a warning to
  confirm: use `migrate diff` + `migrate deploy` (procedure in `CLAUDE.md`).
- **Two simultaneous commits fail silently**: the VS Code Git extension locks the index. Run
  again, then check what each commit actually contains.
- **A login page's `?redirect=` is an open redirect** unless it is restricted to in-app paths.
- **Stroke colours too light on white** (yellow 1.9:1, green, cyan, orange): to be darkened to
  at least 3:1 in the drawing lot.

### 18/09 — Drawing ✅

A vector format validated by Zod, `GET/PUT/DELETE /api/drawing`, a pointer-driven canvas in
normalised coordinates, palette and widths, saving and reopening on a single screen. 54 backend
tests. Branch `feature/drawing`, commits `a918b43` → `1a41891`.

Departures from the plan, and why:

- **One screen instead of two.** A read-only `MyDrawingView` duplicated the editor once a user
  has a single drawing. `/` now opens on the saved drawing: "find your drawing again" in the
  strong sense, and editing becomes possible — which is what the IRCAM describes ("they can
  overwrite their previous drawing").
- **No animated replay** (P1 bonus): `renderStrokes` lost its `upTo` parameter, three lines to
  put back the day replay arrives.
- **The title is editable by clicking it**, the field sized to its text, with no permanent field
  in the toolbar. Blank on an existing drawing → the old title is kept (the `update` branch of
  the upsert omits `title`); blank on a first save → the `userName`.
- **An empty drawing is allowed** (`strokes` has no minimum): with no delete button on the user
  side, saving an empty canvas is how a saved drawing gets wiped.
- **`DELETE /api/drawing` written and tested, but not exposed**: an interface decision, not a
  scope one — the route carries a useful isolation test.
- **Undo / Clear / Save disabled while nothing has moved** since the last save, through a
  revision counter in the composable. Save reacts to the title too.
- **Palette darkened**: the original bright hues fell below 3:1 on white.

Traps that still bite:

- **`app.use(router)` triggers the first navigation**: the session must be restored before it,
  or the guard reads stale state and redirects to `/login` on reload.
- **A network failure must not clear the token**: only a 401 from the server ends a session.
- **`interface` is not enough for a `Json` column**: Prisma requires the implicit index
  signature that only a `type` alias gets.
- **Resizing a canvas clears it**: repaint everything from the strokes, which is free thanks to
  normalised coordinates.
- **A Tailwind class built at runtime does not exist** in the emitted CSS: stroke colours go
  through an inline custom property.

### 18/09 — Administration ✅

`GET/DELETE /api/admin/drawings(/:id)` behind `requireAuth` + `requireAdmin`, separate and
explicitly named services, generated demo drawings, an admin grid with opening and deletion.
64 backend tests. Branch `feature/admin`, commits `7d92cf1` → `32513ed`.

Departures from the plan, and why:

- **Deletion behind a dedicated confirmation modal**, reachable from a card's icon as from the
  opened drawing, and naming what is about to disappear. Delete buttons are the only red in the
  application: the owned exception to "nothing is coloured except the drawing".
- **`strokeCount` dropped** from the list and the interface: a useful consequence is that the
  query no longer loads the `jsonb` column at all.
- **An admin lands on `/admin`** after signing in; the drawing screen stays reachable.
- **The seeded `admin` account has no drawing**: the demonstration separates the roles better,
  and it exercises the empty canvas.
- **`DELETE /api/drawing` stays unexposed** on the user side (decision from the previous lot).

Traps that still bite:

- **The role comes from the verified token**: promoting an account in the database is not
  enough, a token issued before still says `USER`. That is what made the first admin test fail,
  and it is the owned limit of a stateless JWT.
- **A `204` response has no body**: `res.json()` fails there, deletion looked like it had failed
  when it had succeeded, and the `404` on the second attempt was only the consequence.
- **`clamp()` hides a geometry mistake**: the spiral came out flattened because a round radius
  cannot exceed `0.5 / aspectRatio` of the width.
- **Vite's hot reload can keep a stale module** when script and template change in quick
  succession: force a reload before concluding there is a bug.
- **On a delete, "already gone" is not a failure**: a 404 is handled as a success.

### 18/09 — Interface feedback ✅

Success and error toasts on saving, admin deletion and authentication; loading spinners; a 404
page. Branch `feature/toasts`, commits `4fee97f` → `5b81de3`.

Departures from the plan, and why:

- **Success is green** (`#15803d`, 5.0:1 on white), where the rule said "nothing is coloured
  except the drawing". The exception is owned and **bounded**: notifications and the red of
  deletions, nothing else. Overview §15 updated accordingly.
- **Undo re-enabled alongside Clear**: same guard, same defect. A reloaded drawing had "changed
  nothing since the save", so both buttons stayed dark — and the only way to wipe a drawing
  (Clear then Save of an empty canvas) became unreachable.
- **No `<Transition>` on the toasts**: the replay stays the product's only animation.
- **A 404 page with no `meta`**: an unknown URL is a 404 for everyone. Putting it behind
  `requiresAuth` would suggest it exists behind a session, and would protect nothing — the route
  table is in the bundle.

Traps that still bite:

- **An `aria-live` region inserted at the same time as its message is not announced**: the
  container stays in the DOM permanently, therefore `pointer-events-none` while empty, or it
  swallows clicks.
- **`load()` bumps the revision**, and the view aligns `savedRevision` with it: after a load,
  "has it changed since the save?" answers no while the canvas is full. That is the wrong
  question for Undo and Clear.
- **A SPA's 404 depends on the host**: without an `index.html` fallback, an unknown URL never
  reaches the router. Native on Vercel and Netlify, to be wired on GitHub Pages.
- **`btn-ghost` on a coloured background** lays a grey veil that clashes: on green or red, only
  an opacity change holds.
- **The editor's formatter rewrites the whole file** (quotes, semicolons) as soon as it is
  opened: diffs then mix substance and form, and splitting a commit per lot becomes impossible.
  A committed `.prettierrc` settles it once and for all.

### 20/09 — Sonification ✅

A drawing becomes a score: `x` → time, `y` → pitch quantised on a minor pentatonic, width →
gain, colour → timbre. An eight-second looping pass, a playhead drawn inside the canvas,
listening from the drawing screen and from every card of the admin view. Branches
`feature/sonification` then `feature/audio-effects`, commits `ba106d6` → `923d494`.

Departures from the plan, and why:

- **An `audio/` folder and a `canvas/` folder**, outside `composables/`, which now holds only
  what touches Vue. The mapping and the engine know neither `ref` nor lifecycle.
- **An `AudioEngine` port and a `WebAudioEngine` class**: replacing raw Web Audio with Tone.js,
  samples, an AudioWorklet, RNBO or Faust becomes a second implementation, not a modification.
  It is an explicit requirement, and the one place in the project where openness to extension
  was paid for in advance.
- **A timbre is named as a sound** (`pure`, `soft`, `hollow`, `bright`), never as a waveform: a
  sample-based engine has no oscillator to name.
- **The palette drops to five colours**, one per voice. It becomes the instrument list, so a
  sixth colour would have to sound like something.
- **Simplified afterwards**: the sliding-horizon scheduler, the merging of held notes and the
  hue computation were removed — 336 lines brought back to 229. Web Audio dates its own events,
  so a whole pass is scheduled at once.
- **Delay and reverb** as parallel sends, master at the end of the chain. The reverb impulse is
  generated (decaying noise), not shipped as a file.
- **Rejected: noise as a timbre** — it does not exist as an oscillator type, it would have taken
  a filtered `AudioBufferSourceNode`. Too much complexity for a fifth voice.
- **Rejected: the stroke as a waveform** (DFT of the path → `setPeriodicWave`). Written, tried,
  kept on `experiment/audio-engine`.

Traps that still bite:

- **`AudioContext` only starts inside a user gesture**, hence its creation on the first click.
- **An oscillator is single-use**: without an `onended` that disconnects, every pass leaves its
  nodes behind.
- **`exponentialRampToValueAtTime` throws on 0**: ramp down to `0.0001`.
- **One engine instance for the whole admin view**, or two drawings sound together.
- **Tailwind reads text, not code**: a constant named `STEPS` and a function named `toggle` were
  enough to make DaisyUI emit its `steps` and `toggle` components — 7 kB of dead CSS.

### 20/09 — Docker and deployment ✅

`docker compose up --build` starts the database, the API and the client. Online: API and
Postgres on Railway, front on Vercel. Branch `feature/docker`, commits `b6f3e06` → `16bbaf3`.

Departures from the plan, and why:

- **The client is containerised**, where the documentation said the opposite. The argument
  changed shape, not substance: the image serves **local demonstration** — one command has to
  give a whole application — while deployment stays a `dist/` on a CDN, and the image holds
  `http://localhost:3000` hard-coded, which proves it is not a deployment artifact.
- **Single-stage images**, no multi-stage: the simplest thing that works. A happy consequence is
  that the Prisma CLI stays in the image, so the release hook can run `migrate deploy` there. A
  costly one is 1.2 GB on the server side.
- **The seed runs in production, but without the `ADMIN`.** The rule changed in nature: it is
  about the **role**, no longer about the environment. A `USER` account with public credentials
  opens nothing that registering would not; the administrator can delete everybody's work. It is
  created by hand, with a password that is absent from the repository.

Traps that still bite:

- **`railway.json` overrides the dashboard**, silently: a pre-deploy command set in the UI never
  ran because the file said something else.
- **Railway reads its configuration at the service's root**, not the repository's: without
  `Root Directory` set to `backend`, neither the `Dockerfile` nor `railway.json` is seen.
- **A `preDeployCommand` entry is not handed to a shell**: `a && b` does not work there. An npm
  script does.
- **`VITE_API_URL` without `https://` produces a relative URL**, resolved against the front's
  own origin — hence a `POST` landing on `index.html` and an unintelligible 405.
- **A 404 on an API's `/` is not a failure**: no route is mounted there, and `notFoundHandler`
  answers in the project's own shape.
- **`docker compose run` starts the service's dependencies**: without `--no-deps`, testing the
  client alone wakes the API and hits an already-bound port.
- **The tab title was still `Vite App`** until the day before delivery.

### 20–22/09 — README, eraser and iOS fixes ✅

The README written and delivered: the demonstration link, the credentials, screenshots on
desktop and mobile, the technologies with a justification each, the structuring decisions, what
is deliberately out of scope, and the known limits. Plus a vector eraser, a rename cue on the
title, and two iOS audio fixes. Commits `8faad05` → `d84a7e2`.

Departures from the plan, and why:

- **The eraser deletes strokes, it does not paint the background.** A white stroke would still
  be a stroke: it would hide the ink on screen while the sonification kept playing every note
  underneath. Erasing has to reach the audio as well as the eye.
- **Undo therefore changed nature**, from `strokes.pop()` to a stack of past states, one
  snapshot per gesture. Owned consequence: on a freshly opened drawing, Undo is disabled, where
  it used to remove a saved stroke. Clear still works, so "wipe then save" is untouched.
- **`canvas/tools.ts` extracted** (palette, widths, `Tool`, aspect ratio): three real consumers,
  and it stops a presentational component importing a constant from a composable.
- **`useCanvasSurface` rejected.** It would have had exactly one caller. Abstracting on the
  first case to bring a line count down is the opposite of the rule. `useDrawing.ts` stands at
  189 lines instead, owned and explainable.
- **The exercise brief is no longer versioned.** It is IRCAM's own text; it stays on disk and is
  git-ignored. It remains in the history, which is not worth rewriting for something that is not
  a secret.

Traps that still bite:

- **Safari has a non-standard `"interrupted"` `AudioContext` state**, after a call, an alarm or
  a backgrounded tab. Resuming only from `"suspended"` leaves iOS silent until a reload — the
  condition has to be `state !== "running"`.
- **iOS plays Web Audio in its "ambient" category**, which the ring/silent switch mutes
  outright. `navigator.audioSession.type = "playback"` is the only standards-track way out, it
  is WebKit-only, and its price is that it pauses whatever else the phone was playing.
- **A hover-only affordance does not exist on a phone.** The title's rename cue had to be
  permanently visible, not revealed on hover.
- **Git over SSH dies on a filtered network**: port 22 refused, and GitHub's SSH on 443 cut too.
  Tethering is faster than debugging it.
- **Two credential helpers fight**: Homebrew's gitconfig sets `osxkeychain` ahead of the user's
  `store`, so the keychain prompt blocks the credential that would have worked.
