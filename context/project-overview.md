# SonicLight — Project Overview

> **Draw, then listen to your drawing: a stroke becomes a musical phrase.**

![Status](https://img.shields.io/badge/status-technical%20exercise-blue)
![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

|                 |                                                            |
| --------------- | ---------------------------------------------------------- |
| **Product**     | SonicLight — simplified version                            |
| **Type**        | Recruitment technical exercise — IRCAM, Web Department     |
| **Owner**       | Quentin Plet                                               |
| **Doc version** | 1.0 — 16 September 2026                                    |
| **Deadline**    | **Wednesday 23 September 2026**                            |
| **Status**      | **Starting from zero** — not a line of code written        |

> **⚠️ This project is graded on the ability to explain its choices, not on its completeness.**
> The brief says so explicitly: *"it is important that you understand the code you produce and
> are able to explain your choices during the interview"*, and *"the interview matters more
> than whether the project is finished"*. [§4](#4-working-on-this-project-with-claude-code)
> turns that constraint into working rules. **Read it before touching the code.**

---

## Table of contents

1. [The need, and how we read it](#1-the-need-and-how-we-read-it)
2. [Constraints of the exercise](#2-constraints-of-the-exercise)
3. [Functional scope & prioritisation](#3-functional-scope--prioritisation)
4. [Working on this project with Claude Code](#4-working-on-this-project-with-claude-code)
5. [System architecture](#5-system-architecture)
6. [Layered backend architecture](#6-layered-backend-architecture)
7. [Code principles](#7-code-principles)
8. [Data model](#8-data-model)
9. [The format of a drawing](#9-the-format-of-a-drawing)
10. [Prisma schema](#10-prisma-schema)
11. [Routing & API surface](#11-routing--api-surface)
12. [Authentication](#12-authentication)
13. [Canvas — capture and replay](#13-canvas--capture-and-replay)
14. [Sonification (bonus)](#14-sonification-bonus)
15. [UI/UX & design tokens](#15-uiux--design-tokens)
16. [Docker, deployment & environment variables](#16-docker-deployment--environment-variables)
17. [Commit plan](#17-commit-plan)
18. [Engineering rules](#18-engineering-rules)
19. [Open questions](#19-open-questions)
20. [Reference links](#20-reference-links)

---

## 1. The need, and how we read it

### The brief, literally

> "SonicLight is a web application for creating drawings and turning them into a sonic and
> visual experience. For this exercise, we propose you build a simplified version of it. The
> application must allow a user to be identified, to create a drawing using a canvas, and to
> save that drawing. A user must be able to find their own drawing again. An administration
> interface must allow the drawings saved by the different users to be reviewed. Playing the
> drawings back as sound may be added as an option."

Four firm requirements, one option:

| #   | Requirement                                           | Status       |
| --- | ----------------------------------------------------- | ------------ |
| 1   | Identify a user                                       | **Firm**     |
| 2   | Create a drawing on a canvas                          | **Firm**     |
| 3   | Save it; the user finds it again                      | **Firm**     |
| 4   | An admin interface listing every drawing              | **Firm**     |
| 5   | Sonic playback of drawings                            | _Optional_   |

### How we read it

The brief is deliberately under-specified — it says so in as many words. Three readings
structure everything that follows, and each one has to be defensible out loud:

**A. A drawing is a vector object, not an image.** The product's name says "turn a drawing into
a sonic experience". Sonifying a PNG means analysing pixels; sonifying a list of strokes means
reading a score. So we store **the geometry** ([§9](#9-the-format-of-a-drawing)), not the
rendering. It is the most structuring decision of the project: it makes the audio bonus
possible at almost no extra cost, where a PNG data URL would have made it nearly unreachable
in the time available.

**B. "Identify" ≠ "authenticate", but the admin forces our hand.** One could read "identify"
weakly — a nickname typed once. But an administration interface that reviews *everybody's*
drawings is by definition a resource to protect: without real authentication, anyone reaches
it. Authentication is therefore not over-scope, it is the direct consequence of requirement 4.

**C. One drawing per user, and the admin moderates.** The initial assumption — several drawings
per user, an admin who reviews without managing — was **invalidated by IRCAM's answers**
([§19](#19-open-questions)): each user has **one** drawing, which they can replace or delete,
and the admin sees every drawing and can **delete** them. They do not edit them. The "one
drawing only" constraint is carried by the database (`userId` unique), not by the code alone.

```mermaid
flowchart LR
    subgraph Draw["🎨 Draw"]
        D1[Canvas<br/>pointer events]
        D2[Strokes captured<br/>in normalised coordinates]
    end

    subgraph Store["💾 Store"]
        S1[(PostgreSQL<br/>jsonb)]
    end

    subgraph Play["🔊 Play back"]
        P1[Visual replay<br/>stroke by stroke]
        P2[Sonification<br/>Web Audio API]
    end

    D1 --> D2 --> S1 --> P1 & P2
```

### Why this project makes a good interview subject

The domain is tiny — two tables, six endpoints. All the material for discussion is concentrated
in four decisions, and that is exactly where the grading happens:

| Decision                                     | What it reveals                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Vector rather than bitmap                    | The ability to read the intent behind the brief, not only its letter    |
| Normalised rather than pixel coordinates     | Anticipating multi-resolution replay — a classic canvas trap            |
| Isolation through service signatures         | A security reflex applied before the incident, not after                |
| Sonification by pentatonic quantisation      | Familiarity with the musical domain — and an owned aesthetic choice     |

---

## 2. Constraints of the exercise

### What is explicitly graded

| Criterion (in the brief's order)                            | Concrete translation in this document                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Code quality and technical choices                           | [§6](#6-layered-backend-architecture) · [§7](#7-code-principles)            |
| Understanding of the need, and relevant decisions            | [§1](#1-the-need-and-how-we-read-it) · [§19](#19-open-questions)            |
| The ability to prioritise and produce a coherent result      | [§3](#3-functional-scope--prioritisation)                                   |
| The way Git is used                                          | [§17](#17-commit-plan)                                                      |

### Bonuses named explicitly

Docker · audio generation and playback with the Web Audio API · any other relevant extension.
**"These remain entirely optional and must not come at the expense of the rest."** This document
therefore treats Docker and audio as P1/P2 tiers, never as P0.

### Time budget

The brief estimates "a few hours" for a first version. This document plans for **~20 useful
hours spread from 16 to 22 September**, with submission on the evening of the 22nd to keep a
day of margin. Target split:

| Tier                                   | Budget | Total |
| -------------------------------------- | ------ | ----- |
| P0 — a complete, finished MVP          | 8 h    | 8 h   |
| P1 — Docker + visual replay + tests    | 4 h    | 12 h  |
| P1b — GitHub Actions CI                | 1 h    | 13 h  |
| P1c — front + API + database deployment| 3 h    | 16 h  |
| P2 — Web Audio sonification            | 3 h    | 19 h  |
| Finishing — README, proofreading        | 1 h    | 20 h  |

> **Stopping rule.** If P0 runs past 10 h, cut P2 without hesitating and ship a clean, deployed
> MVP. A coherent, finished project beats an ambitious half-wired one — that is literally
> criterion 3.

> **Deployment is budgeted at 3 h, and that is not pessimistic.** The code is ready in fifteen
> minutes; what takes time is the first CORS failure, the `VITE_API_URL` forgotten at build
> time, the managed database whose connection URL demands `?sslmode=require`, and the free
> service that falls asleep. Planning that margin avoids having to choose between deploying and
> finishing the canvas.

### What the brief allows, and what must not be wasted

> "You can and **must** ask us any question you deem necessary before starting development."

The word **must** is not decorative. [§19](#19-open-questions) lists the real grey areas; the
most structuring ones go out by email before development starts. The others are settled
unilaterally, documented here, and become interview material.

---

## 3. Functional scope & prioritisation

### P0 — the MVP, non-negotiable

| Area        | Content                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| **Auth**    | Sign-up (user name + password), sign-in, sign-out, session surviving a reload                |
| **Responsive** | Desktop **and** mobile — confirmed by IRCAM. Canvas, toolbar and admin view usable with a finger on a small screen |
| **Drawing** | Full-width canvas, drawing with mouse and finger, colour choice, width choice, undo, clear all |
| **Saving**  | Title + save. **One drawing per user**: saving again replaces the previous one               |
| **Finding it again** | "My drawing": replay, title, last modified date, deletion                           |
| **Admin**   | A protected route listing **every** drawing with its author, sorted by date, opening and **deletion** (moderation) |

### P1 — the first bonus tier

| Area           | Content                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| **Docker**     | `docker compose up` starts Postgres + API. One prerequisite: Docker         |
| **CI**         | GitHub Actions: types, tests and build checked on every push                |
| **Deployment** | Front on a CDN, API in a container, managed database — a clickable link     |
| **Visual replay** | The drawing rebuilds stroke by stroke when opened, instead of appearing at once |
| **Tests**      | Unit tests on the backend services (per-user isolation, drawing format validation) |
| **Seed**       | A demo dataset: 1 admin, 2 users, a few drawings — the admin view has something to show without manual input |

### P2 — the bonus that gives the product its name

| Area             | Content                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| **Sonification** | Audio playback of a drawing through the Web Audio API, playhead synchronised with the visual replay ([§14](#14-sonification-bonus)) |

### Explicitly out of scope

Several drawings per user · editing of a drawing by the admin · roles beyond `USER`/`ADMIN` ·
public sharing of a drawing by link · editing an already-saved drawing · layers · geometric
shapes, fill, text · PNG/SVG export · real-time collaboration · OAuth · password reset · email ·
pagination · offline mode.

> This list is not a list of regrets: it is the proof that an arbitration took place. It is
> reused as-is in the README and serves as the backbone of the interview.
>
> **Internationalisation left this list on 22 September**, after the rest was shipped. It is
> the one decision that was reversed, so it is the one worth stating plainly: the interface is
> now English and French, at the cost of the thirteenth dependency
> ([§5](#5-system-architecture)) and of the "no frontend dependency beyond Vue" argument that
> backed the `localStorage` token ([§12](#12-authentication)).

---

## 4. Working on this project with Claude Code

> This section takes precedence over all the others. The following ones describe a **target**;
> this one describes how it is permitted to be reached.

### The context

Unlike an ordinary project, **the deliverable is not the code: it is the ability to defend it
out loud**. The brief explicitly allows AI tools, and sets one condition in exchange —
understanding what is produced. A file Quentin would discover during the interview is a
liability, whatever its quality.

Every rule that follows comes from there.

### Rule 1 — Explain before writing

For any non-trivial step (a new module, an algorithm, a library choice), announce the plan
**first**, in five lines at most, and wait for agreement:

```
What I am going to do : capture strokes in a useDrawing() composable
Files touched         : frontend/src/composables/useDrawing.ts (new)
Structuring decision  : normalised [0,1] coordinates, no pixels
Alternative discarded : store pixels + a scale factor (breaks on resize)
Verification          : npm run type-check
```

A trivial step (adding a field, fixing an import, writing an obvious test) does not need this.
The test: *would Quentin be able to justify this choice tomorrow without rereading the code?*
If not, announce it.

### Rule 2 — No code Quentin cannot read in one pass

A file over ~150 lines, a function over ~40 lines, or an abstraction that requires jumping
between three files to be understood: that is a signal, not an achievement. Split, or simplify.

Corollary: **no mass generation**. Build one piece, read it, commit it, move to the next.
Dumping the whole MVP in a single message produces code nobody has read.

### Rule 3 — One commit = one coherent step

Regular commits are an **explicit grading criterion**. Concretely:

- One commit per finished functional step that compiles. Never `wip`, never "the whole backend"
  in one commit.
- Messages in English, imperative, _Conventional Commits_ style:
  `feat(drawing): capture strokes in normalised coordinates`.
- The message body documents a decision when it deserves it — it is free, and it reads well in
  an interview.
- The history must read like the story of the project. A reviewer running `git log --oneline`
  should understand the order in which the problems were attacked.

The target commit plan is at [§17](#17-commit-plan).

### Rule 4 — No new dependency without asking

The dependency list is **frozen** ([§5](#5-system-architecture)). Every addition is proposed
first, with its justification and the dependency-free alternative. On a project this size, every
line of `package.json` is a potential interview question: "why that one?". There has to be an
answer for each.

Barred outright: a drawing library (Fabric.js, Konva, Paper.js) — the native canvas **is** the
exercise; an audio library (Tone.js) — the raw Web Audio API **is** the bonus; a heavy UI
framework on a project with five screens.

### Rule 5 — The simplest thing that works

See [§7](#7-code-principles). Between two solutions, the one that fits in fewer files wins. A
few-hours exercise that is over-architected turns against its author: it demonstrates the
opposite of the "ability to prioritise" criterion.

### Rule 6 — Verify before handing back

At the end of any task that touches code:

```bash
# Backend
cd backend && npx tsc --noEmit && npm test

# Frontend
cd frontend && npm run type-check && npm run build
```

Do not announce a task as finished if any of the four fails. A test that was already failing
before the intervention is reported, not silently fixed.

### Rule 7 — Do not run ahead of the tiers

Not a line of sonification code until P0 is finished and committed. No `Dockerfile` until the
application runs locally. The real risk of this exercise is not a lack of ambition, it is a
half-finished P2 that prevents shipping a finished P0.

### What is done without asking

- Writing a P0 feature in a new file, following the conventions.
- Adding a test.
- Fixing a bug identified within the scope of the current task.
- Answering a question, explaining code, proposing a plan.

### What requires prior agreement

- Adding a dependency.
- Changing the Prisma schema.
- Changing a convention (folder layout, naming, API response shape).
- Starting a P1 or P2 tier.
- Touching a file outside the scope of the current task.

---

## 5. System architecture

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI["Vue 3 SPA — Vite<br/>script setup · Pinia · Vue Router"]
        CV["Canvas 2D<br/>pointer events"]
        WA["Web Audio API<br/>(P2)"]
        UI --- CV
        UI --- WA
    end

    subgraph API["Express 5 — TypeScript"]
        MW["Middleware<br/>auth · requireAdmin · errorHandler"]
        RT["Routes"]
        CTRL["Controllers"]
        SVC["Services"]
    end

    subgraph Data["Data layer"]
        PR["Prisma 7"]
        PG[("PostgreSQL 16<br/>strokes as jsonb")]
    end

    UI -->|"/api · Authorization: Bearer"| MW
    MW --> RT --> CTRL --> SVC --> PR --> PG
```

### Architecture decisions

| Decision       | Choice                                                 | Rationale                                                                                                                                      |
| -------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | Vue 3 SPA, `<script setup>`, no SSR and no Nuxt        | IRCAM's preferred technology. Nothing behind authentication needs indexing; a static build is enough                                            |
| Front build    | Vite                                                   | The Vue ecosystem standard. Produces a purely static `dist/`, deployable as-is on any CDN ([§16](#16-docker-deployment--environment-variables)) |
| Deployment     | Front and API deployed **separately**                  | The front is static → CDN; the API is a container → container host. Two distinct origins, owned ([§16](#16-docker-deployment--environment-variables)) |
| Front state    | Pinia, a single store (`auth`)                         | The rest of the state is local to its component. A store per screen would be ceremony                                                          |
| Backend        | Express 5 + TypeScript                                 | Express is still the Node reference, immediately readable by a reviewer. TypeScript for typing the drawing format, shared on both sides         |
| Layers         | Route → Controller → Service → Prisma                  | See [§6](#6-layered-backend-architecture)                                                                                                      |
| **No** repository | Services call Prisma directly                       | Prisma **is** already the data-access layer. A repository on top would only forward calls ([§6](#6-layered-backend-architecture))               |
| ORM            | Prisma 7, versioned migrations                         | A readable declarative schema, generated migrations, an end-to-end typed client                                                                |
| Database       | PostgreSQL 16, strokes as `jsonb`                      | See [§8](#8-data-model) — a drawing is a document, not a relation                                                                              |
| Auth           | Signed JWT, stored in `localStorage`, `Bearer` header  | The standard pattern for a SPA in front of a stateless API, and a familiar one. The XSS risk is owned and offset ([§12](#12-authentication))    |
| Validation     | Zod, on every request body                             | A Zod schema is **both** a runtime validator and a TypeScript type — one single source of truth                                                 |
| Tests          | Vitest on both sides                                   | The same runner for both packages, zero configuration on the Vite side                                                                         |
| Repo           | Two independent npm packages (`frontend/`, `backend/`) | No workspace: the overhead is not justified for two packages, and `npm install` in each stays trivial to document                              |

### Dependencies — the frozen list

| Package                   | Side   | Why                                                         |
| ------------------------- | ------ | ----------------------------------------------------------- |
| `vue`, `vue-router`, `pinia` | client | The Vue 3 foundation                                     |
| `vue-i18n`                | client | The thirteenth line, added last (see below)                 |
| `vite`, `@vitejs/plugin-vue`, `vue-tsc` | client | Build and typecheck                           |
| `tailwindcss`, `@tailwindcss/vite` | client | A way of writing CSS, tokens in `@theme` — no runtime |
| `daisyui`                 | client | A purely CSS Tailwind plugin: generic components, custom theme |
| `vitest`                  | client, server | Tests                                               |
| `express`, `@types/express` | server | The HTTP server                                           |
| `@prisma/client`, `prisma`, `@prisma/adapter-pg`, `pg` | server | ORM and migrations — Prisma 7 requires a driver adapter |
| `zod`                     | server | Input validation + type inference                           |
| `jsonwebtoken`            | server | Signing and verifying the JWT                               |
| `bcryptjs`                | server | Password hashing                                            |
| `cors`                    | server | Allows the client's origin for a direct call to the API     |
| `tsx`                     | server | Running TypeScript in development, with no build step       |

Twelve of these, three of them for styling, ship no JavaScript at runtime. `vue-i18n` is the
thirteenth line, and the only one that does — so here is its justification, as
[§4 rule 4](#rule-4--no-new-dependency-without-asking) demands.

**A hand-written module came first**: two dictionaries, a `locale` ref and a `t()` — fifty
lines, `+1.9 kB` gzipped, and it typed its own keys. It was replaced because of **plurals**:
`"{count} strokes"` renders "1 strokes", and getting that right per locale means
reimplementing `Intl.PluralRules`, which is exactly what vue-i18n already wraps.

**The price is measured, not guessed: `+18.5 kB` gzipped**, around 38% more JavaScript, for
62 strings. And it costs the "no frontend dependency beyond Vue" argument that backed the
`localStorage` token ([§12](#12-authentication)) — one more library now runs in the page.

**What it does not buy**, and this surprised us: strict key checking. Neither the
`DefineLocaleMessage` augmentation nor `useI18n<{ message: Messages }>()` rejects a misspelt
key, because `t()` carries a `string` overload — verified, not assumed. The only compile-time
guarantee is `const fr: Messages`, which is our own type, not the library's.

---

## 6. Layered backend architecture

Three layers, as folders, in a single package. Dependencies point one way only:

```
Route  ──▶  Controller  ──▶  Service  ──▶  Prisma Client
              │                 │
              └── Zod schema ───┘
```

```
backend/src/
├── routes/         auth.routes.ts · drawings.routes.ts · admin.routes.ts
├── controllers/    HTTP ↔ service translation
├── services/       business rules, the only place that touches Prisma
├── schemas/        Zod schemas (validation + inferred types)
├── middleware/     requireAuth · requireAdmin · errorHandler
├── lib/            prisma.ts (singleton) · jwt.ts · env.ts
├── types/          drawing.ts — the format of a drawing (§9)
└── index.ts        app wiring, listening
```

### Responsibilities

| Layer          | Role                                                             | May depend on         | Must never know about               |
| -------------- | ---------------------------------------------------------------- | --------------------- | ------------------------------------ |
| **Route**      | Path, method, middlewares applied                                | controllers, middleware | services, Prisma                   |
| **Controller** | HTTP: parse the request, call the service, choose the status     | services, Zod schemas | Prisma, business rules               |
| **Service**    | Business rules, data access, resource ownership                  | Prisma, types, `AppError` | `req`, `res`                     |
| **Zod schema** | Input contract, validation, inferred type                        | nothing               | Prisma, HTTP                         |
| **Middleware** | Auth, role, errors                                               | lib/jwt               | business services                    |

### The three rules that hold the pattern together

**1. A controller contains no business rule.** It validates, calls, translates. An action that
runs past ten lines has logic in the wrong place.

```ts
// controllers/drawing.controller.ts
export async function getMine(req: Request, res: Response) {
  const drawing = await drawingService.getMine(req.user!.id);
  if (!drawing) return res.status(404).json({ code: "drawing.notFound" });
  return res.json(drawing);
}
```

**2. A service touches neither `req` nor `res`.** It returns a value, `null`, or throws an
`AppError` (`NotFoundError`, `ConflictError`…) that the `errorHandler` turns into a response.
Each error carries its own HTTP status: an owned simplification, the status sitting next to the
error it describes, with no mapping table to maintain. A service that calls `res.status()` is no
longer testable outside an Express context — and that is precisely what we want to test.

**3. Only a service touches Prisma.** A controller that imports `prisma` short-circuits the
layer where ownership rules live. It is the easiest rule to break by accident, and the most
expensive.

### Per-user isolation goes through the signature

This is the most important point of the backend, and the best interview subject it contains.
Rather than relying on discipline never to forget the `userId` filter, **we impose it through
the signature**:

```ts
// services/drawing.service.ts

// Impossible to call without supplying the owner. The compiler does the work.
// One drawing per user: the userId is ENOUGH to designate the resource.
export function getMine(userId: string): Promise<Drawing | null> {
  return prisma.drawing.findUnique({ where: { userId } });
}

// Create or replace — an upsert on the unique column, atomic.
export function saveMine(userId: string, input: DrawingInput): Promise<Drawing> { /* … */ }

export function removeMine(userId: string): Promise<boolean> { /* … */ }

// Admin access is a SEPARATE function with an explicit name — never an optional
// `userId?` parameter on the functions above, which would make an omission silent.
export function listAllForAdmin(): Promise<DrawingWithAuthor[]> { /* … */ }
export function getByIdForAdmin(id: string): Promise<Drawing | null> { /* … */ }
export function removeForAdmin(id: string): Promise<boolean> { /* … */ }
```

> **The `userId` is the key of the query, never a filter added afterwards.** Since a user has at
> most one drawing, `findUnique({ where: { userId } })` designates it entirely: the user routes
> accept **no drawing id** from the client. There is therefore no "load by id, then check the
> owner" query to forget — and no way to aim at someone else's drawing.

> **No 403 on the user side.** With no id in the URL, a user cannot designate a resource that is
> not theirs: no drawing means a 404. The project's only 403 is the one from `requireAdmin`,
> where the route's existence is not a secret.

### Why there is no repository layer

The repository pattern makes sense on top of a verbose ORM, to give business names to queries
and to allow mocking. With Prisma, `prisma.drawing` **is** already that object: typed, named,
testable against a test database. Adding `DrawingRepository.findById()` that does
`return prisma.drawing.findFirst()` would be pure ceremony — one more file to read, zero
business rules gained.

It is an owned arbitration, not an oversight. The counter-argument — "what if we changed ORM?" —
does not hold: you do not change ORM on a two-table project, and abstracting it would cost more
today than tomorrow's hypothetical migration. See the rule of three
([§7](#7-code-principles)).

---

## 7. Code principles

### SOLID — applied to this project

| Principle | Concrete translation here                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| **S**    | One service per aggregate (`auth.service`, `drawing.service`). A file named `utils` or `helpers` is the sign that we do not know where to put something |
| **O**    | Adding a feature = adding a file, not modifying five existing ones                                          |
| **L**    | No class hierarchy in this project. Functions and modules                                                   |
| **I**    | Services export the functions that are actually called, not a full generic CRUD                             |
| **D**    | Controllers import services, never Prisma. The dependency points at the business abstraction                |

### DRY — but on the right side

DRY applies to **knowledge**, not to text. In this project, four rules exist in exactly one
place:

1. The `userId` filter — in the service signatures ([§6](#6-layered-backend-architecture)).
2. The format of a drawing — in the `DrawingDataSchema` Zod schema ([§9](#9-the-format-of-a-drawing)).
3. Coordinate normalisation — in the `useDrawing` composable on the client.
4. The drawing → sound mapping — in `useSonification`, never duplicated into a component.

The `DrawingData` type, on the other hand, is **deliberately duplicated** between
`frontend/src/types/` and `backend/src/types/`, with a header comment saying so. Twenty copied
lines cost less than a shared package and its build configuration, on a project this size. It is
the first thing to change if the project grew ([§19](#19-open-questions) Q6).

### KISS & YAGNI — the list of what we do not write

This project **does not introduce**:

- A repository layer ([§6](#6-layered-backend-architecture))
- CQRS, an event bus, or container-based dependency injection
- A `BaseService`, a `BaseController`, or a `<T>` generic over a single entity
- A drawing library — the native canvas is the exercise
- An audio library — the raw Web Audio API is the bonus
- A role system beyond the `USER` / `ADMIN` enum
- Pagination, caching, rate limiting, structured logging
- A separate `Stroke` table ([§8](#8-data-model))
- Any abstraction "for later"

**The rule of three:** abstract on the third real case, not the first. In one week, the third
case will not arrive.

### Arbitrating between the principles

When SOLID pushes towards abstraction and KISS towards the concrete, **KISS wins** — and on this
exercise, it wins by a wide margin. The criterion being graded is "ability to prioritise": an
enterprise architecture over two tables demonstrates exactly the opposite.

The one place where rigour beats simplicity is **per-user isolation**: there, the cost of an
oversight is a data leak between accounts, on an application that has an administration
interface precisely to show that the two are kept apart.

---

## 8. Data model

```mermaid
erDiagram
    USER ||--o| DRAWING : "owns"

    USER {
        uuid id PK
        string userName UK
        string passwordHash
        enum role "USER | ADMIN"
        datetime createdAt
    }

    DRAWING {
        uuid id PK
        string title
        jsonb data "vector strokes — §9"
        uuid userId FK
        datetime createdAt
        datetime updatedAt
    }
```

Two tables. That is all, and it is deliberate.

### Design notes

| #   | Decision                                            | Why                                                                                                                                                                                                                         |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Strokes as `jsonb`, not a `Stroke` table**         | A drawing is read and written **whole, always**. We never query "the red strokes", we never update a single point. A `Stroke` + `Point` table pair would produce thousands of rows per drawing for an aggregate that is never split — a pure join cost, with no benefit |
| 2   | `role` on `User`, no `Role` table                   | Two values, no granular permissions. An enum is enough; a role table would be an abstraction with no second case                                                                                                            |
| 3   | A single `userName`, no email                       | No feature needs an email (neither reset nor notification). One unique name serves as both the sign-in identifier and the author name shown in the admin view — one field fewer, one piece of personal data fewer            |
| 4   | No `thumbnail` column                               | The thumbnail renders client-side by replaying the strokes on a small canvas. Storing a derived PNG would duplicate the source of truth for a gain that is invisible at this scale ([§19](#19-open-questions) Q4)           |
| 5   | `onDelete: Cascade` on `Drawing.userId`             | Deleting an account deletes its drawing. There is no point keeping orphan drawings                                                                                                                                          |
| 6   | **`userId` unique**, no other index                 | One drawing per user (IRCAM's answer): the database enforces it, two simultaneous saves cannot create two rows, and replacing becomes an `upsert` on that column. The unique index also serves the only user-side query. The admin list is a few dozen rows: a sort index would not even be used |
| 7   | No soft delete                                      | The brief requires no trash bin. `DELETE` deletes                                                                                                                                                                           |

> **The `jsonb` is the point a reviewer will challenge.** The answer fits in one sentence: *the
> criterion is not the shape of the data but its unit of access — the strokes of a drawing are
> always read together, written together and deleted together, so they form a document and not a
> relation.* The day individual strokes needed querying — finding every drawing containing red,
> say — normalisation would become justified, and Postgres lets you get there gradually with a
> GIN index on the `jsonb` column first.

---

## 9. The format of a drawing

**This is the project's structuring decision.** It determines replay, sonification, robustness
to resizing, and most of the interview discussion.

```ts
// types/drawing.ts — canonical copy in backend/, duplicated in frontend/ (§7)

/** A point, in NORMALISED coordinates within [0, 1] relative to the canvas box. */
export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  /** Hex colour, e.g. "#e11d48". */
  color: string;
  /** Normalised thickness: a fraction of the canvas WIDTH, not pixels. */
  width: number;
  points: Point[];
}

export interface DrawingData {
  /** Format version. Lets the schema evolve without breaking what exists. */
  version: 1;
  /** Width / height ratio of the authoring canvas. Needed to replay without distortion. */
  aspectRatio: number;
  background: string;
  strokes: Stroke[];
}
```

### The four decisions contained in those twenty lines

**1. Normalised coordinates in `[0, 1]`, never pixels.**
The authoring canvas is 1200 px wide on a desktop screen, 380 px on a phone, and 240 px in an
admin gallery thumbnail. Pixel coordinates would only be valid on the screen that produced them.
Normalising at capture and denormalising at render makes the drawing **independent of its
display surface** — that is what lets the same data feed the full-width canvas, the thumbnail
and the audio playhead.

**2. `aspectRatio` stored with the drawing.**
Normalising `x` and `y` independently onto `[0, 1]` crushes the proportion information: a circle
drawn on a 16:9 canvas would come back as a circle on a square canvas — in practice, a distorted
oval. We record the authoring ratio, and replay respects it by adapting its box (letterboxing)
rather than stretching the drawing.

**3. `width` normalised against the width, not both axes.**
A stroke has a scalar thickness, not a vector. We normalise it against one dimension — the
width, by convention — so that it stays consistent whatever the render size.

**4. A literal `version: 1`.**
One byte in the database, one guarantee for the future: the day the format changes, we can tell
old drawings apart without guessing. The literal type makes TypeScript refuse any value other
than `1`, and the Zod schema refuses an unknown `version: 2` at the door.

### Server-side validation

The server **never trusts** the JSON it receives. The same Zod schema serves as validator and as
the source of the type:

```ts
// schemas/drawing.schema.ts
import { z } from "zod";

const PointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const StrokeSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().positive().max(0.5),
  points: z.array(PointSchema).min(1).max(5_000),
});

export const DrawingDataSchema = z.object({
  version: z.literal(1),
  aspectRatio: z.number().positive().max(10),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  strokes: z.array(StrokeSchema).max(1_000),
});

export const CreateDrawingSchema = z.object({
  title: z.string().trim().min(1).max(50),
  data: DrawingDataSchema,
});
```

> **The `max()` bounds are not decorative.** Without them, a malicious client posts a 200 MB
> `jsonb` row and fills the database. 1,000 strokes × 5,000 points is far beyond real use while
> remaining a hard ceiling. It is the project's only application-level security measure beyond
> authentication, and it is worth mentioning out loud.

### Path simplification at capture

A `pointermove` fires every few milliseconds: a two-second stroke easily produces 300 points,
the vast majority of them visually redundant. We filter at capture, with the simplest rule that
works: **we drop a point closer than a threshold distance to the previous one** (~0.002 in
normalised coordinates, roughly 2 px on a 1000 px canvas).

The result: a drawing typically goes from ~400 KB to ~40 KB of JSON, replay is smoother, and
sonification produces fewer spurious notes. The Ramer–Douglas–Peucker algorithm would do better
— it is listed at [§19](#19-open-questions) Q5 as an evolution, not a prerequisite.

---

## 10. Prisma schema

```prisma
// backend/prisma/schema.prisma

generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"   // not committed
  importFileExtension = "js"                        // resolves under tsx as under node
}

// Prisma 7: the connection URL lives in prisma.config.ts, no longer in the schema.
datasource db {
  provider = "postgresql"
}

enum Role {
  USER
  ADMIN
}

model User {
  id           String    @id @default(uuid()) @db.Uuid
  userName     String    @unique @db.VarChar(60)
  passwordHash String
  role         Role      @default(USER)
  createdAt    DateTime  @default(now())

  drawing      Drawing?

  @@map("users")
}

model Drawing {
  id        String   @id @default(uuid()) @db.Uuid
  title     String   @db.VarChar(50)

  /// Vector strokes, conforming to DrawingDataSchema (§9).
  /// A document read and written whole — never queried stroke by stroke.
  data      Json     @db.JsonB

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  /// Unique: one drawing per user, enforced by the database. Replacing = upsert.
  userId    String   @unique @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("drawings")
}
```

### Points to watch

- **`@db.JsonB` spelled out**, even though Prisma already maps `Json` to `jsonb` on PostgreSQL.
  Writing it makes the intent readable in the schema, and guards against a change of default
  behaviour.
- **Prisma's `Json` is not typed.** `drawing.data` arrives as `Prisma.JsonValue` on the
  TypeScript side. We systematically parse it with `DrawingDataSchema.parse()` on the way out of
  a service rather than writing `as DrawingData` — a cast would hide corrupted data until it
  crashed on the client.
- **`@@map` to lowercase plural table names.** SQL convention, decoupled from model naming.
- Migrations are generated (`prisma migrate dev`), **never** `prisma db push`: `db push`
  silently diverges from the history and makes the database irreproducible.

### Seed

```
backend/prisma/seed.ts
```

Creates, if absent: an `admin` account (role `ADMIN`), two user accounts, and three or four
programmatically generated drawings (spirals, waves) spread between them. Every step is guarded
by an existence check, so it is replayable without duplicates.

The goal: a reviewer who clones the repo and runs `docker compose up` sees a **populated**
administration interface, without having to create three accounts and draw with a mouse. It is a
welcome detail that weighs more than it looks on a first impression.

> **In production the seed creates the `USER` accounts but never the `ADMIN`.** Those passwords
> are written in a public Git repository, and what they cost depends on the role: a user reaches
> nothing but their own drawing — anyone would get as much by registering — whereas the
> administrator can delete everybody's work. The first is a demonstration convenience, the
> second a way in. The online administrator is created by hand, with a password that exists
> nowhere in the repository, and its identifier is in the README.

---

## 11. Routing & API surface

### Vue pages

| Route            | Guard              | Description                                              |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `/login`         | guest              | Sign in                                                  |
| `/register`      | guest              | Sign up                                                  |
| `/`              | authenticated      | The canvas — the landing screen, you draw straight away   |
| `/drawing`       | authenticated      | "My drawing": visual replay, then audio (P2), deletion    |
| `/admin`         | authenticated + ADMIN | Every drawing, all users together, with deletion       |
| `/admin/drawings/:id` | authenticated + ADMIN | Reading any user's drawing                         |

> **The canvas is the landing page, not the gallery.** The application exists to draw; the first
> possible action after signing in must be drawing, not navigating to a screen that lets you
> draw.

### Express API

| Route                  | Method   | Guard   | Description                                            |
| ---------------------- | -------- | ------- | ------------------------------------------------------ |
| `/api/auth/register`   | `POST`   | —       | Creates the account and returns the user               |
| `/api/auth/login`      | `POST`   | —       | Returns the user                                       |
| `/api/auth/me`         | `GET`    | auth    | The current user — the only reliable source of identity and role ([§12](#12-authentication)) |
| `/api/drawing`         | `GET`    | auth    | My drawing, `data` included — 404 if I have none       |
| `/api/drawing`         | `PUT`    | auth    | Creates or replaces my drawing                         |
| `/api/drawing`         | `DELETE` | auth    | Deletes my drawing                                     |
| `/api/admin/drawings`  | `GET`    | admin   | Every drawing with its author, without the `data`      |
| `/api/admin/drawings/:id` | `GET` | admin   | Any drawing, `data` included                           |
| `/api/admin/drawings/:id` | `DELETE` | admin | Deletes any drawing (moderation)                      |

> **`/api/drawing` is singular, with no identifier.** A user has at most one drawing: the token
> is enough to designate it. No id is accepted from the client on these routes, so there is no
> way to aim at someone else's — isolation is structural, not merely checked.

> **`PUT`, not `POST`.** Saving replaces a unique resource: sending the same request twice
> leaves the same state. That is the definition of an idempotent operation, and therefore of
> `PUT`. The row is kept (same id, original `createdAt`); only `title`, `data` and `updatedAt`
> change.

> **`GET /api/admin/drawings` does not return the `data`.** A list of twenty full drawings is
> several megabytes of JSON to display twenty titles. The list returns
> `{ id, title, updatedAt, author, strokeCount }`; the `data` only arrives when one is opened.

### The pipeline of a write

Every mutation follows the same sequence. Skipping a step is a guaranteed data leak.

```
1. requireAuth               → 401 if the Authorization header is missing or the JWT invalid
2. Zod validation of the body → 400 with the failing fields spelled out
3. Loading through the service, with the userId in the signature (§6)
                             → 404 if absent OR if the resource belongs to someone else
4. Mutation through Prisma
5. Returning a DTO — never the raw entity (the passwordHash never leaves a service)
```

### Error shape

One single shape, produced by the `errorHandler`:

```json
{ "code": "drawing.notFound", "message": "Drawing not found." }
```

The `code` is stable and machine-readable; the `message` is for the developer. The client reacts
to the `code`, never by parsing the text — which is what would let a translation be added later
without breaking anything.

---

## 12. Authentication

**A signed JWT (HS256), stored in `localStorage`, sent in the `Authorization: Bearer` header.**
User name + password, hashed with bcrypt (cost 10).

### Why this choice, and what it costs

It is the most widespread pattern for a SPA in front of a stateless API, and the one this
developer knows. On an exercise whose explicit criterion is *"it is important that you
understand the code you produce"*, working inside a familiar pattern beats discovering another
one during the week: the time saved goes to the canvas, which is the real subject.

It also has two properties that suit this architecture: **the API stays stateless and
browser-independent** — the same endpoint would serve a mobile client or a third-party client
unchanged — and **the transport is universal**, where a cookie is a browser-specific mechanism.

**The cost is real and it is owned: a token in `localStorage` is readable by any script on the
page.** One XSS flaw, and the attacker walks away with a portable token, valid for seven days,
usable from home. An `httpOnly` cookie would close that vector — at the price of CSRF exposure,
which a single attribute neutralises (`sameSite: "lax"`), whereas stealing a token from
`localStorage` has no equivalent countermeasure.

The trade-off holds here because the application handles no sensitive data — drawings — and
because the XSS surface is reduced by construction (see below). It would not hold on a banking
or medical application.

> **The condition that would flip the decision**, and this is the one to be able to state: as
> soon as the application displayed content authored by other users as HTML, or handled
> sensitive data, the `httpOnly` cookie would become the right choice again. The change is
> cheap, as it happens: the token is read in **one single place** server-side, in `requireAuth`,
> and a middleware can accept both transports in three lines.
>
> ```ts
> const token = req.headers.authorization?.replace("Bearer ", "")
>             ?? req.cookies?.token;
> ```
>
> We do not write it now — that would be anticipation
> ([§4 rule 7](#rule-7--do-not-run-ahead-of-the-tiers)) — but knowing it turns "what if this had
> to change?" into a one-sentence answer.

### What actually reduces the XSS risk

Since the token is exposed to the page's JavaScript, the measures that limit hostile JavaScript
from running are not optional:

- **No `v-html`, anywhere.** Vue escapes everything by default through `{{ }}`; `v-html` is
  precisely the XSS door. The project contains none, and it is a rule that can be checked in
  review ([§18](#18-engineering-rules) rule 27).
- **No user content rendered as HTML.** A drawing title is text, displayed as text. The
  application's only free-text field is that title, capped at 50 characters.
- **Almost no frontend dependency beyond the Vue foundation** ([§5](#5-system-architecture)).
  Every third-party library is JavaScript executed in the page, therefore one more surface.
  This argument was absolute until `vue-i18n` was added; it is now one library wide, and
  saying so is more useful than pretending the rule held.
- **A seven-day token lifetime**, no more, and `logout` erases it.

### Why a JWT and not a server session

With a single server and a database already present, a database-backed session would be just as
valid — and easier to revoke, even. The JWT is chosen because it **requires no session storage**
and verifies through a signature. The price paid is real: **an issued token cannot be revoked
before it expires**. On a drawing application that is acceptable; on an application handling
sensitive data it would not be.

### No refresh token

A short access token plus a long refresh token exists to shrink the exploitation window of a
stolen token. Adding that mechanism would double the authentication code surface for a marginal
gain on a one-week exercise. It is — along with the move to an `httpOnly` cookie — the first
thing to add if the project became real.

### The client stores the token, but never trusts it

A JWT payload is base64, not encrypted: **anyone can read it, so it proves nothing client-side**.
The frontend may read `exp` from it to sign out cleanly on expiry, but it **never** infers from
its contents that it is an administrator.

At application start, if a token is present in `localStorage`, the client calls
`GET /api/auth/me`. It is the server — the only holder of the signing secret — that confirms the
identity and the role. A `401` on a call that carried a token ends the session; the route guard
sends the user to `/login` on the next navigation.

```ts
// stores/auth.ts — the store owns the session, token included
const TOKEN_KEY = "soniclight.token";
const token = ref(localStorage.getItem(TOKEN_KEY));
```

Corollary: **`POST /api/auth/logout` does not exist.** With a stateless token held client-side,
signing out is a `removeItem` — a server call would revoke nothing and would suggest the
opposite. It is a genuine simplification of the chosen design, and a good example of coherence
between a decision and its consequences.

### How calls travel

Every request goes through a single wrapper in `src/api/http.ts` (about thirty lines), the only
place the header is injected. It does nothing else: it does not navigate and it stores nothing.
No component and no view adds a header by hand.

```ts
// api/http.ts — reads the token from the store, does not store it
const auth = useAuthStore();
const res = await fetch(`${API_URL}${path}`, {
  ...init,
  headers: {
    "Content-Type": "application/json",
    ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    ...init.headers,
  },
});
```

### No Vite proxy: cross-origin is owned end to end

**There is deliberately no proxy in `vite.config.ts`.** The client calls the API by its absolute
URL, read from `VITE_API_URL`, in development exactly as in production.

A Vite proxy would mean the browser only ever sees one origin in development — so no CORS, so
real comfort. But the front and the API are **deployed separately**: a static build on a CDN on
one side, a container on the other, two distinct domains
([§16](#16-docker-deployment--environment-variables)). A proxy would therefore model, in
development, a topology that will never exist in production, and would push the first CORS
failure to deployment day — that is, to the worst possible moment.

**Developing in the same configuration you deploy costs one CORS setting and avoids an entire
class of nasty surprises.** It is also what makes the `Bearer` header transport relevant rather
than arbitrary: a cookie, across two real origins, would require `SameSite=None`, therefore
`Secure`, therefore HTTPS on both sides, plus `credentials: true` with an exact origin list —
the `*` wildcard being forbidden as soon as credentials are involved. The storage choice and the
deployment choice hold each other up.

```ts
// backend/src/index.ts
app.use(cors({ origin: env.CLIENT_ORIGINS }));   // an explicit list, never "*"
```

```ts
// frontend/src/api/http.ts
const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { /* … */ });
```

`credentials: true` is **not** enabled: no cookie travels any more, the `Authorization` header is
enough.

> **The CORS preflight is real, not theoretical.** An `Authorization` header makes the request
> "non-simple", so the browser sends an `OPTIONS` before every call. The `cors` package answers
> it automatically — but if the origin is not in the list exactly (a forgotten `https://`, one
> trailing slash too many), the failure shows up as an opaque network error client-side, with
> nothing in the server log. It is the first place to look when a call works in `curl` and fails
> in the browser.

### The guards

- `requireAuth`: reads the `Authorization` header, verifies the signature, sets
  `req.user = { id, role }`, otherwise 401.
- `requireAdmin`: runs **after** `requireAuth`, checks `role === "ADMIN"`, otherwise 403.
- The role comes **from the token verified server-side**, never from a field sent by the client.
- On the Vue side: a router `beforeEach` protects `/admin` — **interface comfort, not security**.
  The real barrier is the server middleware, and it must be tested as such.

---

## 13. Canvas — capture and replay

### Capture

```
pointerdown  → open a stroke, capture the first point, setPointerCapture()
pointermove  → if the distance to the previous point > threshold, add the point + draw the segment
pointerup    → close the stroke, push it onto the stack
```

| Decision                                     | Why                                                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pointer*` rather than `mouse*` / `touch*`   | One event family covers mouse, finger and stylus. Handling two families separately is the most common source of broken tactile drawing        |
| `setPointerCapture()` on `pointerdown`       | The stroke continues even if the cursor leaves the canvas, and `pointerup` always arrives. Without it, a stroke stays "open" indefinitely      |
| `touch-action: none` in CSS on the canvas    | Without that line, drawing with a finger scrolls the page instead of drawing. One line of CSS, one mobile bug fewer                           |
| Backing store × `devicePixelRatio`           | `canvas.width = cssWidth * dpr` then `ctx.scale(dpr, dpr)`. Without it, strokes are blurry on any high-density display                        |
| `lineCap` and `lineJoin` set to `"round"`    | Without rounding, a fast stroke shows its segments and its angles. Two properties for a believable pencil look                                |
| An in-memory undo stack                      | `undo` removes the last stroke and redraws everything. At a few hundred strokes, redrawing is instantaneous — no need for an image cache      |

### Replay

Rendering and replay share **the same function**: `renderStrokes(ctx, data, box, upTo)`, where
`upTo` is the number of points to draw. Rendering a complete drawing means calling that function
once with the total; replaying it means calling it in a `requestAnimationFrame` loop with an
increasing `upTo`.

One render function, three uses: the editing canvas, the reading view, the thumbnail. It is the
only genuinely justified factorisation on the frontend.

`box` is computed from `aspectRatio` ([§9](#9-the-format-of-a-drawing)): the drawing is centred
in the available container while respecting its original proportion, with margins if needed,
rather than stretched.

---

## 14. Sonification (bonus)

> **P2 tier — not a line before P0 is finished and committed**
> ([§4 rule 7](#rule-7--do-not-run-ahead-of-the-tiers)).

### Lineage — Kandinsky

The direct reference is **[Kandinsky](https://musiclab.chromeexperiments.com/Kandinsky/)**, from
Google's Chrome Music Lab: you draw, the drawing is read from left to right, and what you traced
becomes sound. It is the same gesture as SonicLight, and it is worth going and playing with it
before writing a line of code.

Behind the experiment stands **Wassily Kandinsky** himself, who perceived correspondences
between colour, shape and sound — he associated yellow with a trumpet, blue with a cello, for
instance — and theorised those correspondences in *Concerning the Spiritual in Art* (1911). This
is not decoration: it gives the mapping chosen here a **genealogy**, rather than an arbitrary
choice. In an interview at IRCAM, knowing where the idea of matching a hue to a timbre comes
from is worth more than having invented it alone.

> **What we take, and what we do not.** We take the horizontal playhead, the looping playback,
> and above all the fact that **you hear something immediately, with nothing to configure**. We
> do **not** take shape recognition (Kandinsky distinguishes lines, dots and closed shapes, and
> assigns them different instruments): that is a computer-vision problem, out of reach in the
> time available, and the §14 mapping does very well without it. Being able to name that limit
> is a better answer than trying to cross it.

### The principle

The drawing is read **from left to right like a score**. A playhead sweeps the `x` axis over a
fixed duration; every stroke point it crosses triggers a note.

**Playback loops**, rather than running once. That is three extra lines, and it changes the
nature of the product: a single pass feels like listening to a file, a loop feels like handling
an instrument — you can modify the drawing while listening. It is the most profitable lesson to
take from Kandinsky.

```mermaid
flowchart LR
    A["Stroke point<br/>(x, y, colour, width)"] --> B["x → time<br/>playhead position"]
    A --> C["y → pitch<br/>quantised on a pentatonic scale"]
    A --> D["width → gain"]
    A --> E["hue → timbre<br/>oscillator type"]
    B & C & D & E --> F["OscillatorNode → GainNode → destination"]
```

### The mapping

| Drawing dimension   | Sound parameter      | Detail                                                                    |
| ------------------- | -------------------- | ------------------------------------------------------------------------- |
| `x` ∈ [0, 1]        | Time                 | Position within a playback of fixed duration (8 s by default)            |
| `y` ∈ [0, 1]        | Pitch                | Inverted (up = high), **quantised on a pentatonic scale**                |
| `width`             | Gain                 | A thick stroke sounds louder                                              |
| `color` (hue)       | Waveform             | `sine` · `triangle` · `square` · `sawtooth` depending on the hue sector   |

### Why pentatonic quantisation

This is the most interesting choice to defend. A linear `y → frequency` mapping produces a
continuous glissando: every drawing sounds like a siren, and two different drawings sound alike.
By projecting pitch onto a **minor pentatonic scale** — five degrees per octave, with no adjacent
semitone — any combination of notes stays consonant. The result is musical whatever the drawing,
which is exactly the point of a product called SonicLight.

```ts
// Minor pentatonic: 5 degrees per octave, no dissonant interval possible
const SCALE = [0, 3, 5, 7, 10];       // semitones from the root
const ROOT = 220;                      // A3
const OCTAVES = 3;

function pitchFromY(y: number): number {
  const step = Math.round((1 - y) * (SCALE.length * OCTAVES - 1));
  const semitones = SCALE[step % SCALE.length] + 12 * Math.floor(step / SCALE.length);
  return ROOT * Math.pow(2, semitones / 12);
}
```

It is an **aesthetic** decision, not a technical one — and it is defensible as such: on an IRCAM
product, owning a musical stance and being able to explain it is worth more than a neutral
mapping chosen by default.

### The three Web Audio API traps

1. **`AudioContext` does not start without a user gesture.** Browsers block automatic audio. The
   context is created — or resumed with `ctx.resume()` — on the first click of "Listen", never
   when the component mounts.
2. **An `OscillatorNode` cannot be reused.** It is single-use: `start()`, `stop()`, discard. One
   note = one oscillator created on the fly, and we disconnect it at the end so dead nodes do
   not accumulate.
3. **An envelope is mandatory.** Cutting an oscillator dead produces an audible click. A short
   attack and release — `setValueAtTime` then `exponentialRampToValueAtTime` on the gain — is
   enough to make the whole thing listenable.

### What we do not do

No reverb or effects · no unbounded polyphony (a hard cap on simultaneous notes, or a dense
drawing saturates) · no sample-accurate synchronisation — a `requestAnimationFrame` driving the
visual playhead and audio scheduled ~100 ms ahead is plenty · no audio export.

---

## 15. UI/UX & design tokens

### Principles

Light, sober, the interface disappearing behind the drawing. **Light mode only**, no dark
variant.

**Tailwind 4 + DaisyUI 5, with a custom theme.** Two development dependencies, no runtime, no
JavaScript components.

| Area                                                  | Treatment                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Buttons, fields, cards, modal, badges, alerts         | **DaisyUI** — generic work, no reason to rewrite it                     |
| Canvas, toolbar, palette, reading view                | **Hand-written CSS** — this is where the product's identity lives       |

> **That split is the decision, not the choice of tool.** DaisyUI where the work is generic,
> hand-written CSS where it carries the product. Adopting a library wholesale would give an
> admin dashboard; refusing one wholesale would mean rewriting focus states and field styles for
> nothing.

**Why Tailwind rather than entirely hand-written CSS.** Tailwind is not a component library, it
is a way of writing CSS: no runtime, and the output contains only the classes actually used. In
v4 the configuration lives in the CSS through `@theme` — the tokens are in one place, and
spacing and colours become consistent by construction rather than by discipline.

**Why DaisyUI rather than a Vue component library.** DaisyUI is a Tailwind plugin that emits
CSS: zero JavaScript, nothing to import, no component API to learn. The templates stay ordinary
Vue. A JS library would require being able to explain its lifecycle and its props — a CSS plugin
is explained in one sentence, which matters given the grading criterion.

**Why a custom theme and not a shipped one.** Shipping a tool's default appearance is shipping
nobody's. DaisyUI 5 lets a theme be defined directly in the CSS (`@plugin "daisyui/theme"`) with
its own semantic colours: you keep the components, you change the identity. That is precisely
what a heavy JS library would not let you do at this cost.

> **Rejected, and why:** PrimeVue (familiar coming from PrimeNG, but with an admin-dashboard
> look, and PrimeTek moved PrimeNG to a commercial licence from v22 — to be checked on the Vue
> side before any commitment); Vuetify and Quasar (oversized by an order of magnitude);
> shadcn-vue (the best compromise if you want to own your component code, but Tailwind + Reka UI
> + a CLI is more setup than gain across five screens).

### Stance & references

No mockup was provided. On that ground, the panel grades **coherence**, not beauty — and the
surest way to produce coherence is to hold **one strong constraint** from end to end:

> **Nothing on screen is coloured except the drawing.** The whole interface is greyscale, plus a
> single accent. The only saturated colours in the application are the stroke colours.
>
> **The exception: notifications.** A success toast is green, an error toast is red — the
> outcome of an action must be seen without being read. The exception is bounded to toasts and
> to the red of delete buttons; it extends neither to the chrome nor to states.

That rule is perceptible to a reviewer, justifies itself in one sentence, and automatically
settles the hundred micro-decisions there is no time to arbitrate one by one. Three corollaries
follow:

- **Nothing floats above the canvas.** No panel, no tooltip, no toolbar over the drawing area.
- **Monospace is reserved for the technical and the meta** — counters, event names, timestamps.
  The rest is sans-serif.
- **The product's only animation is the replay**, because it means something. Everything else is
  still.

**References, and what we take from each:**

| Reference                                                                       | What we take from it                                                                               |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Kandinsky](https://musiclab.chromeexperiments.com/Kandinsky/) (Chrome Music Lab) | **The central reference** — drawing → sound, a playhead, immediate playback with no settings ([§14](#14-sonification-bonus)) |
| [Chrome Music Lab](https://musiclab.chromeexperiments.com/Experiments), *Song Maker* | You hear something before configuring anything. Zero settings screens                         |
| [Ableton Learning Synths](https://learningsynths.ableton.com/)                    | The **instrument** pole: direct manipulation, generous targets, no chrome — for the drawing screen |
| [Padlet](https://padlet.com/) · [Are.na](https://www.are.na/)                     | The **board** pole: a calm grid, the content carrying everything — for the gallery and the admin view |
| [tldraw](https://tldraw.com/) · [Excalidraw](https://excalidraw.com/)             | Canvas UX: how the toolbar is treated, chrome that fades while drawing                             |
| [Teenage Engineering](https://teenage.engineering/)                              | The visual vocabulary: monospace labels, extreme restraint, objects that look like instruments     |

> The first two references pull towards the **instrument**, the next two towards the **board**.
> That is not a contradiction but a division of labour: the drawing screen follows the first
> pole, the gallery and the admin view follow the second. Being able to name that division is an
> interview answer in itself.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  ◈ SonicLight        Draw    My drawing    Admin       👤  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│     ┌────────────────────────────────────────────────┐     │
│     │                                                │     │
│     │                   CANVAS                       │     │
│     │                                                │     │
│     └────────────────────────────────────────────────┘     │
│                                                            │
│   ● ● ● ● ● ●      ▁▂▃▅      ↶ Undo      ✕ Clear           │
│   colours        width                          [ Save ]   │
└────────────────────────────────────────────────────────────┘
```

- **The toolbar sits below the canvas**, never over it: a floating control always ends up under
  the cursor at the moment you are drawing.
- **A closed palette of six colours**, no free picker. A restricted palette gives the admin
  gallery visual coherence, and makes the hue → timbre mapping
  ([§14](#14-sonification-bonus)) legible rather than arbitrary.
- **Saving opens a modal** asking for the title. No permanent title field cluttering the drawing
  screen.
- **The gallery is a grid of cards**, each rendering the drawing on a small canvas.
- **The admin view is the same grid**, plus the author's name on each card and a date sort.
  Reusing the card component is the right answer: the admin does not deserve a second interface.

### The modal is built on `<dialog>`, not on a div

DaisyUI's modal is built on the **native `<dialog>` element**, opened with `showModal()`. That
settles, for free, the project's only real accessibility problem: focus trap, focus restoration
on close, the `Escape` key, the semi-opaque backdrop — the browser handles all of it.

Rewriting that by hand is eighty lines you get subtly wrong. It is also why DaisyUI and the "no
JS library" rule reinforce each other rather than compete.

### Six UX decisions that weigh more than the choice of tool

1. **Replay starts when a drawing is opened, not on a click.** The drawing rebuilds stroke by
   stroke, automatically, in two seconds. It is the project's striking effect, and on its own it
   demonstrates that geometry was stored rather than an image. Hiding it behind a button loses
   it.
2. **Light, and light only.** The project owner's choice: one appearance to design and to check.
   A consequence to handle in the drawing lot: on a white background, the light hues of the
   stroke palette (yellow `#eab308` at 1.9:1, green, cyan) stand out poorly — the palette will be
   adjusted to reach at least 3:1, the WCAG minimum for a graphical element.
3. **The toolbar sits below the canvas**, never over it (see above).
4. **Keyboard shortcuts**: `Cmd/Ctrl+Z` undoes, `Escape` closes the modal, `Enter` submits the
   title. Three lines of code, and that is what separates a demo from a tool.
5. **Empty states are worked on.** "My drawing" for a new user, and the admin list with no
   drawings, are screens that will genuinely be seen. A dashed frame saying "No drawing — start
   drawing" beats an empty page.
6. **No flicker on load.** Thumbnails render from the strokes: plan a skeleton at the final
   height, or the grid jumps when the data lands.

### Design tokens

One single file, `frontend/src/style.css`, with no JavaScript configuration file:

```css
@import "tailwindcss";
@plugin "daisyui" { themes: false; }   /* no shipped theme, no dark variant */

/* A custom DaisyUI theme — which is what avoids shipping the tool's default look. */
@plugin "daisyui/theme" {
  name: "soniclight";
  default: true;
  color-scheme: light;

  --color-base-100:  #ffffff;   /* cards, modal */
  --color-base-200:  #f4f4f5;   /* page background */
  --color-base-300:  #e4e4e7;   /* borders */
  --color-base-content: #18181b; /* 17.7:1 on white */
  --color-primary:   #6d4aff;   /* the single accent — 5.2:1 with white text */
  --color-primary-content: #ffffff;
  --color-success:   #15803d;   /* success toast — 5.0:1 with white text */
  --color-error:     #b91c1c;   /* an error has to be seen */
  /* secondary, accent, neutral, info, warning: greys */
}
```

> **The violet was darkened from the first version** (`#7c5cff` → `#6d4aff`): on a light
> background, white text on `#7c5cff` only reaches 4.35:1, below the AA threshold of 4.5:1. The
> ratios are calculated, not eyeballed.

> **Stroke colours are not theme tokens.** They are **data**: they arrive from a drawing's
> `jsonb` and are applied through an inline CSS variable
> (`:style="{ '--stroke': stroke.color }"`), never as a dynamically generated class — a class
> built at runtime does not exist in Tailwind's output, which only knows what it read in the
> source files. It is the classic trap, and it is silent: the colour disappears in production
> with no error.

Drawing palette — six hues spread around the colour wheel, so that the hue → timbre mapping
clearly distinguishes the four waveforms:

| Colour  | Hex       | Associated waveform   |
| ------- | --------- | --------------------- |
| Red     | `#e11d48` | `sawtooth`            |
| Orange  | `#f97316` | `sawtooth`            |
| Yellow  | `#eab308` | `square`              |
| Green   | `#22c55e` | `triangle`            |
| Cyan    | `#06b6d4` | `sine`                |
| Violet  | `#8b5cf6` | `sine`                |

### Accessibility

The minimum, but done: visible focus on every control, an `aria-label` on every icon-only
button, the colour palette announced by name rather than by its swatch alone, text contrast
checked on a light background (WCAG AA ratios calculated, see the tokens).

The canvas itself is not keyboard-accessible — a real limit of the product, to be named honestly
in the interview rather than hidden.

---

## 16. Docker, deployment & environment variables

### `docker compose` — three services

```yaml
services:
  db:      # postgres:16-alpine, named volume, pg_isready healthcheck
  server:  # build ./backend, depends_on db (condition: service_healthy), migrate deploy + seed (dev only)
  client:  # build ./frontend, VITE_API_URL as a build arg, vite preview on 5173
```

**The client is containerised for local demonstration, not for deployment.** That distinction is
the whole decision: `docker compose up --build` has to give a working application, not two
thirds of one; but the front still ships as a `dist/` on a CDN, and the client image will
**never** be deployed.

The proof that it is not a deployment artifact is in the image itself: `http://localhost:3000`
is hard-coded in the JavaScript bundle.

What that costs, and what has to be stated:

- **`VITE_*` is inlined at build time, never read at runtime.** The API URL therefore goes in as
  a `build arg`, and the image is tied to one specific API. An artifact can no longer be
  promoted from one environment to another — the configuration would have to be injected at
  startup (`envsubst` on an `index.html` template) to give the image its independence back.
- **It makes a third topology.** Development = the Vite server; production = a CDN; Docker =
  `vite preview`. Three ways of serving the same files, owned because the third only exists to
  start the project in one command.
- **`vite preview` is not a production server**, as Vite says itself. It is acceptable here
  precisely because this image never leaves the reviewer's machine.

> **What would flip the decision the other way**: an infrastructure already on Kubernetes, or
> the need to serve the front behind the same domain as the API to remove CORS. The client image
> would then become the deployment artifact, and runtime configuration would become mandatory.

Docker therefore keeps its usefulness where it is real: reproducing **Postgres**, which a
reviewer has not necessarily installed in version 16, and packaging the API as it will be
deployed. The brief's Docker bonus is still ticked — a `docker compose up` that gives a working
API with its database is Docker.

| Point to watch                                            | Why                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `healthcheck` on `db` + `condition: service_healthy`       | `depends_on` alone waits for the container to start, not for Postgres to accept connections — the API would crash on first start |
| `prisma migrate deploy` when the server starts, not `dev`  | `deploy` applies existing migrations without ever generating one or resetting the database            |
| In production the seed only creates the `USER` accounts    | Their passwords are public but carry no privilege; the `ADMIN` can delete everybody's work and is created by hand |
| In production, migrations go through the host's release hook, not the container start | A failed migration must abort the deployment, not put the application in a restart loop |
| A single-stage server image                                | The simplest thing that works, and the Prisma CLI stays in the image — which is what lets the release hook run `migrate deploy` there. The price is size, which a multi-stage build would divide |
| A named volume for the Postgres data                       | `docker compose down` does not lose the drawings; `down -v` erases them on purpose                    |
| A `.dockerignore` in `backend/`                            | Without it, `node_modules` goes into the build context and makes it ten times slower                  |

### Deployment — front and API separate

| Piece       | Target                                                 | Mechanism                                                    |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **Front**   | A static CDN (Vercel, Netlify or GitHub Pages)         | Vite build → `dist/` published                               |
| **API**     | A container host (Railway, Render, Fly.io)             | The `Dockerfile` in `backend/`                                |
| **Database**| Managed Postgres (the host's own, or Neon)             | `DATABASE_URL` provided by the host                          |

Two distinct domains, therefore **real cross-origin in production** — which the development
configuration already reproduces identically ([§12](#12-authentication)).

**The three deployment traps, in the order they appear:**

1. **`VITE_API_URL` is inlined at build time, not read at runtime.** Setting it in the service's
   environment variables afterwards changes nothing: it needs a rebuild. It is the most frequent
   mistake in this setup, and it shows up as a front calling `undefined/api/drawing`.
2. **GitHub Pages needs two settings that Vercel and Netlify handle alone.** The site is served
   from a sub-path (`/repo-name/`), so `base` must be set in `vite.config.ts`, or no asset
   loads. And a SPA needs a fallback for deep routes: on Pages that means copying `index.html`
   to `404.html`; Vercel and Netlify have a native setting (`rewrites` / `_redirects`).
   **Recommendation: Vercel or Netlify**, which remove both problems and deploy on a plain
   `git push`.
3. **`CLIENT_ORIGINS` must hold the exact origin** of the deployed front — scheme included, no
   trailing slash. A list, not a single value: the development origin and the production one
   coexist there.

On free tiers, the API service and the managed database go to sleep after inactivity: the first
call after a pause takes a few seconds. No functional consequence, but worth mentioning in the
README so a reviewer does not read the initial latency as a defect.

### CI — GitHub Actions

One workflow, `.github/workflows/ci.yml`, triggered on every `push` and every `pull_request`:

```yaml
jobs:
  server:   # npm ci → npx prisma generate → npx tsc --noEmit → npm test
  client:   # npm ci → npm run type-check → npm run build
```

| Point to watch                                   | Why                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `npx prisma generate` before the server typecheck | Without the generated client, `tsc` fails on missing types — and the error never names the cause |
| `npm ci`, never `npm install`                     | `ci` honours the lockfile to the letter; `install` can rewrite it and hide a drift              |
| A `package-lock.json` generated on the same platform | A lockfile produced on macOS can omit Linux-only resolutions and break `npm ci` in CI        |
| An npm cache through `actions/setup-node`         | `cache: "npm"` with the lockfile path — a few seconds per run, for free                         |
| No matrix here                                    | A single Node version (22 LTS). Testing three versions on an exercise would be ceremony         |

### CD — deploying the API, and migrations

The backend's CD raises a question the front does not: **where do database migrations run?**
That is the heart of the matter, well before the choice of the tool that triggers the deployment.

#### Where `prisma migrate deploy` runs — three places, one recommendation

| Place                                     | Verdict | Why                                                                                                                                                                       |
| ----------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At **container start**                    | ❌       | Runs on every restart and on every replica. Above all: a failed migration crashes the application **in a loop**, instead of failing once, cleanly                           |
| In a **GitHub Actions job**               | ⚠️       | Works, but forces the production database to accept GitHub's address ranges and `DATABASE_URL` to live in repository secrets. Exposure for nothing                          |
| In the **host's release hook**            | ✅       | `release_command` on Fly.io, a *pre-deploy command* on Render, the equivalent on Railway. Runs once, inside the host's network, **and fails the deployment** if the migration fails — the previous version stays online |

The third is the right one, and the argument fits in one sentence: **a failed migration must
abort the deployment, not put the application in a restart loop.**

> `prisma migrate deploy` is idempotent and takes a Postgres advisory lock, so two concurrent
> runs do not step on each other. Concurrency is not the problem with running at container
> start; the failure mode is.

#### The seed **never** creates an administrator in production

The local `docker-compose` runs `migrate deploy` **then** the full seed. The deployment runs
`migrate deploy`, and there the seed only creates the `USER` accounts and their drawings.

The distinction turns on the role, not on the environment: those passwords are in a public
repository, but a user reaches nothing but their own drawing — registration is open, anyone
would get the same access — whereas the administrator can delete everybody's work. The first is
a demonstration convenience, the second would be a way in.

In production the `ADMIN` is therefore **removed from the account list** rather than skipped by a
condition inside the loop: it cannot be created by a forgotten `if`. The demonstration's admin
account is created by hand, and its password exists nowhere in the repository.

#### What triggers the deployment

The same arbitration as for the front, and it depends on the host:

| API host             | Native Git integration | Actions deploy workflow           |
| -------------------- | ---------------------- | --------------------------------- |
| Render, Railway      | Yes                    | **Pointless** — it would duplicate |
| Fly.io               | No                     | **Needed** — `flyctl deploy`      |

With Render or Railway, CI stays the only workflow, and deployment follows a `push` to `main`.
With Fly.io, a second workflow becomes legitimate:

```yaml
# .github/workflows/deploy-api.yml
on:
  push:
    branches: [main]
    paths: ["backend/**", ".github/workflows/deploy-api.yml"]
concurrency:
  group: deploy-api          # never two deployments in flight at once
  cancel-in-progress: false  # let one finish, do not interrupt a deployment
jobs:
  deploy:
    needs: [server]          # only deploy if CI is green
    # flyctl deploy — the migration runs in fly.toml's release_command
```

**Recommendation: Render or Railway**, for the same reason as Vercel on the front — less
machinery to write, and an Actions deploy workflow that would add nothing. Fly.io remains a
valid choice if you would rather drive deployment from the repository.

> **Free tiers change often** — how long a free database lives, monthly credits, sleep
> behaviour. Check today's terms on the host's site rather than trusting a comparison written
> six months ago.

#### What we do not write

No staging environment, no blue-green deployment, no automatic rollback, no reversible (`down`)
migrations. On a one-week exercise, reversibility means "redeploy the previous commit" — and
being able to say that the real production subject would be **expand/contract migrations** (add
a column, backfill it, switch the code, only then drop the old one) is worth more than
implementing it here for two tables.

### Environment variables

```bash
# backend/.env — never committed; backend/.env.example is
DATABASE_URL="postgresql://soniclight:soniclight@localhost:5433/soniclight"
JWT_SECRET=""              # generated with: openssl rand -base64 32
PORT="3000"
NODE_ENV="development"
CLIENT_ORIGINS="http://localhost:5173"   # comma-separated list of origins allowed by CORS
```

```bash
# frontend/.env — never committed; frontend/.env.example is
VITE_API_URL="http://localhost:3000"     # inlined at build time (see the traps above)
```

The client therefore has **one** environment variable, and one only. That is the price of
separate deployment, owned in the same way as the CORS configuration.

The server configuration is validated at startup by a Zod schema in `lib/env.ts`: a missing
variable fails the boot with a clear message, rather than producing an `undefined` that will
surface as an empty `JWT_SECRET` and tokens signed with an empty key.

---

## 17. Commit plan

Git is a grading criterion. The target history, in order:

| #   | Commit                                                        | Content                                           |
| --- | ------------------------------------------------------------- | ------------------------------------------------- |
| 1   | `chore: init repo, gitignore, readme skeleton`                | The skeleton. **First commit within hour 1**      |
| 2   | `chore(server): scaffold express + typescript`                | The server answers on `/api/health`               |
| 3   | `chore(db): add docker compose with postgres`                 | The database starts                               |
| 4   | `feat(db): add user and drawing models`                       | Prisma schema + first migration                   |
| 5   | `feat(auth): register, login, logout with httpOnly jwt`       | Authentication backend                            |
| 6   | `feat(auth): require auth and admin middlewares`              | The guards                                        |
| 7   | `chore(client): scaffold vue 3 + router + pinia`              | The front starts, `VITE_API_URL` and CORS wired   |
| 8   | `feat(client): login and register screens`                    | The authentication cycle closes end to end        |
| 9   | `feat(drawing): canvas capture with normalised coordinates`   | **The heart of the project**                      |
| 10  | `feat(drawing): color, width, undo and clear controls`        | The toolbar                                       |
| 11  | `feat(drawing): save or replace the user's single drawing`    | `PUT/GET/DELETE /api/drawing`                     |
| 12  | `feat(drawing): open and render a saved drawing`              | "Finding your drawing again"                      |
| 13  | `feat(admin): list and moderate all drawings`                 | List, read, delete — **P0 is complete**           |
| 14  | `test(server): cover ownership isolation in drawing service`  | The tests that matter                             |
| 15  | `feat(db): seed demo users and drawings`                      | The demo dataset                                  |
| 16  | `feat(drawing): animate stroke-by-stroke replay`              | P1                                                |
| 17  | `chore(docker): containerise the api and its database`        | P1 — the Docker bonus, then the client for a full `up` |
| 18  | `ci: typecheck, test and build both packages on push`         | P1b — GitHub Actions                              |
| 19  | `chore(db): gate the seed behind a non-production check`      | Before any deployment, never after                |
| 20  | `chore(deploy): configure api, database and static front`     | P1c — migrations in the release hook              |
| 21  | `feat(audio): sonify drawings with the web audio api`         | P2                                                |
| 22  | `docs: document architecture choices and trade-offs`          | The final README, with the demo link              |

> **Commit 1 goes out on day one, not on the last day.** A `git log` whose commits all carry the
> same date three minutes apart contradicts the brief visibly, whatever the quality of the code.
> Committing as you go is not a performance: it is a trace.

> Commits 16 to 22 can be dropped without damage if time runs short. Commits 1 to 15 form a
> coherent and sufficient deliverable. If one bonus had to be saved, it would be 20: a clickable
> link changes how the project is received. And 19 stops being optional as soon as 20 exists.

---

## 18. Engineering rules

### Collaboration

| #   | Rule                                                                                        |
| --- | ------------------------------------------------------------------------------------------- |
| 1   | Announce the plan before any non-trivial step, and wait for agreement.                      |
| 2   | No file Quentin cannot read in one pass. No mass generation.                                |
| 3   | One commit per coherent step that compiles. Never `wip`, never a final dump.                |
| 4   | No new dependency without approval. The list in [§5](#5-system-architecture) is frozen.     |
| 5   | `tsc --noEmit`, `npm run type-check`, `npm test`, `npm run build` all pass before handing back. |
| 6   | Not a line of P1 before P0 is finished, not a line of P2 before P1 is.                      |

### Architecture

| #   | Rule                                                                                          |
| --- | --------------------------------------------------------------------------------------------- |
| 7   | One-way layering: Route → Controller → Service → Prisma.                                      |
| 8   | Only a service imports `prisma`. A controller that imports it is a bug.                       |
| 9   | A service knows neither `req` nor `res`; it throws an `AppError`, which carries its status.   |
| 10  | No repository layer on top of Prisma.                                                         |
| 11  | Abstract on the third real case, not the first.                                               |
| 12  | One stroke-rendering function, shared by editing, reading and the thumbnail.                  |

### Data & security

| #   | Rule                                                                                               |
| --- | -------------------------------------------------------------------------------------------------- |
| 13  | Every read or write of a drawing takes the `userId` as a parameter. No exception.                  |
| 14  | Admin access goes through a distinct service function, never an optional `userId?`.                |
| 15  | A resource belonging to another user returns **404**, never 403.                                   |
| 16  | Every request body is validated by a Zod schema before reaching a service.                         |
| 17  | A drawing's `data` is parsed by `DrawingDataSchema`, never cast with `as`.                          |
| 18  | Coordinates are normalised within `[0, 1]`. No pixel ever crosses the network boundary.            |
| 19  | `passwordHash` never leaves a service. Output DTOs are built explicitly.                            |
| 20  | Every schema change goes through a generated Prisma migration. Never `db push`.                     |
| 21  | `.env` is never committed. `.env.example` is, with placeholder values.                              |
| 30  | The seed **never** creates an `ADMIN` in production: the role is removed from the list, not skipped by an `if`. |
| 31  | In production, migrations run in the host's release hook, never at container start.                 |

### Frontend

| #   | Rule                                                                                        |
| --- | ------------------------------------------------------------------------------------------- |
| 22  | API calls all go through `api/http.ts`, which prefixes `VITE_API_URL`. No hard-coded API URL anywhere else. |
| 23  | The canvas uses `pointer*`, never `mouse*` or `touch*`.                                     |
| 24  | The canvas backing store is sized with `devicePixelRatio`.                                  |
| 25  | The Vue route guard is interface comfort; security is the server middleware.                |
| 26  | `AudioContext` is only created or resumed inside a user event handler.                      |
| 27  | **No `v-html`, anywhere.** The token lives in `localStorage`: XSS is risk number one ([§12](#12-authentication)). |
| 28  | The `auth` store owns the token and is the only code that stores it; `src/i18n` is the only other writer to `localStorage`, for the chosen language. `api/http.ts` is the only code that sends the token. The HTTP client does not navigate. |
| 29  | The displayed role comes from `GET /api/auth/me`, never from a JWT payload decoded client-side. |

---

## 19. Open questions

### To ask IRCAM before developing

| #   | Question                                                                            | Working assumption meanwhile                                                                                          |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Q1  | Is the administrator account assigned (seed / environment variable), or can a user register as an admin? | Assigned at seed time. No escalation possible from the interface                                  |
| Q2  | Does a user have **one** drawing or **several**? The brief says "their drawing" in the singular, then "the drawings saved by the different users" in the plural | ~~Several~~ → **One, replaceable** (IRCAM's answer). `userId` unique, `PUT /api/drawing` |
| Q3  | Should the admin be able to delete or moderate, or only to review?                  | ~~Review only~~ → **They can moderate, deletion included** (IRCAM's answer) |
| Q4  | Should drawings be public between users, or strictly private outside the admin?     | **Strictly private** — assumption confirmed by IRCAM                                      |

**Answers received on 17 September 2026.** Two assumptions out of three were wrong: that is
exactly why the question had to be asked before writing any business code. The cost of the
change was limited to one migration, because no service and no screen existed yet. IRCAM also
specified that the application must be **responsive** (desktop and mobile) and left the
**sonification mapping free**.

### Settled unilaterally — interview material

| #   | Question                                                          | Decision                                                                                                                                       |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Q5  | Simplify paths with Ramer–Douglas–Peucker?                        | No. A minimum-distance filter is enough and fits in five lines. RDP would be the right evolution if volume became a problem                     |
| Q6  | A shared package for the types between client and server?         | No. Twenty duplicated lines with an explicit header, rather than an npm workspace. The first thing to tackle if the project grew                |
| Q7  | Store a timestamp per point to replay at the real tempo?          | Not in P0. Replay runs at constant speed. It is the most seductive evolution of the format — and it would cost one extra field (`t`)            |
| Q8  | A pre-computed PNG thumbnail in the database?                     | No. Rendered client-side from the strokes. Duplicating the source of truth for twenty cards is not justified                                   |
| Q9  | Editing an already-saved drawing?                                 | Out of scope. You create, you review, you delete. Editing would open the versioning question, unrelated to what is being graded                |
| Q15 | A component library for the interface?                            | Tailwind 4 + DaisyUI 5 with a **custom theme**, and nothing else. DaisyUI is a purely CSS plugin: no JavaScript, no component API to learn. It covers the generic parts (buttons, fields, cards, modal); the canvas, the toolbar and the palette are hand-written, because that is where the product's identity lives ([§15](#15-uiux--design-tokens)) |
| Q10 | End-to-end tests (Playwright)?                                    | No. Unit tests on per-user isolation cover the real risk; an E2E suite would cost two hours for shallow coverage                                |
| Q11 | Deploying a live demonstration?                                   | **Yes.** A static front on a CDN, the API in a container, a managed database — three pieces deployed separately ([§16](#16-docker-deployment--environment-variables)). A clickable link changes how the project is received: a reviewer sees the product before reading the code. Budgeted at 3 h, cut only as a last resort |
| Q13 | A full CI/CD pipeline in GitHub Actions?                          | **CI yes, CD depending on the host.** CI checks types, tests and build on every push — nothing else does. Triggering the deployment goes through the host's Git integration when it has one (Vercel, Render, Railway); an Actions workflow is only written for Fly.io, which has none ([§16](#16-docker-deployment--environment-variables)) |
| Q14 | Where do migrations run at deployment time?                       | In the **host's release hook**, never at container start and never from an Actions runner. At startup, a failed migration loops the application; in a release hook it fails once and aborts the deployment, leaving the previous version online. From a runner, the production database would have to be exposed to GitHub's addresses ([§16](#16-docker-deployment--environment-variables)) |
| Q12 | Token in `localStorage` or in an `httpOnly` cookie?               | `localStorage` + the `Bearer` header. The standard pattern for a SPA in front of a stateless API, familiar, and one that keeps the API browser-independent. **The XSS risk is owned**, offset by the total absence of `v-html`, by a frontend dependency list of thirteen lines that is otherwise frozen, and by the fact that no sensitive data is handled. It flips to the `httpOnly` cookie as soon as any of those three points changes ([§12](#12-authentication)) |

---

## 20. Reference links

### Stack

- [Vue 3](https://vuejs.org/) · [`<script setup>`](https://vuejs.org/api/sfc-script-setup.html) · [Pinia](https://pinia.vuejs.org/) · [Vue Router](https://router.vuejs.org/)
- [Vite](https://vite.dev/) · [Environment variables and modes](https://vite.dev/guide/env-and-mode) · [Static site deployment](https://vite.dev/guide/static-deploy)
- [GitHub Actions](https://docs.github.com/actions) · [`actions/setup-node`](https://github.com/actions/setup-node)
- [CORS on MDN](https://developer.mozilla.org/docs/Web/HTTP/CORS) · [Preflight requests](https://developer.mozilla.org/docs/Web/HTTP/CORS#preflighted_requests)
- [Express 5](https://expressjs.com/) · [Migrating 4 → 5](https://expressjs.com/en/guide/migrating-5.html)
- [Prisma](https://www.prisma.io/docs) · [`Json` fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) · [Migrations](https://www.prisma.io/docs/orm/prisma-migrate)
- [Zod](https://zod.dev/)

### Interface

- [Tailwind CSS 4](https://tailwindcss.com/docs) · [CSS-based configuration (`@theme`)](https://tailwindcss.com/docs/theme) · [Vite plugin](https://tailwindcss.com/docs/installation/using-vite)
- [DaisyUI](https://daisyui.com/) · [Custom themes](https://daisyui.com/docs/themes/) · [Modal](https://daisyui.com/components/modal/)
- [`<dialog>` on MDN](https://developer.mozilla.org/docs/Web/HTML/Element/dialog) · [`showModal()`](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/showModal)

### Canvas & audio

- [Canvas API](https://developer.mozilla.org/docs/Web/API/Canvas_API) · [Drawing tutorial](https://developer.mozilla.org/docs/Web/API/Canvas_API/Tutorial)
- [Pointer Events](https://developer.mozilla.org/docs/Web/API/Pointer_events) · [`setPointerCapture`](https://developer.mozilla.org/docs/Web/API/Element/setPointerCapture)
- [Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API) · [Best practices](https://developer.mozilla.org/docs/Web/API/Web_Audio_API/Best_practices) · [`OscillatorNode`](https://developer.mozilla.org/docs/Web/API/OscillatorNode) · [Autoplay policy](https://developer.mozilla.org/docs/Web/Media/Autoplay_guide)

### Security

- [OWASP — Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP — JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [MDN — `SameSite` cookies](https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

### Git

- [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/)

---

_A living document — to be updated when a decision changes, noting the change in
[§19](#19-open-questions)._
