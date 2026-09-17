# AI Interaction Guidelines

> **The deliverable is not the code — it is the ability to defend it out loud.** The brief
> allows AI tools and sets one condition in exchange: *« il est important que vous compreniez
> le code que vous produisez et soyez capable d'expliquer vos choix lors de l'entretien. »*
> A file Quentin would discover during the interview is a liability, whatever its quality.
> Every rule below follows from that.

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly — one line, not a lecture
- **Announce the plan before any non-trivial step, and wait for agreement.** Five lines
  maximum: what you will do, which files, the structuring decision, the alternative you
  discarded, how it gets verified. A step is non-trivial when Quentin could not justify the
  choice tomorrow without rereading the code
- Ask before any architectural change, new dependency, or schema change
- Don't add features that are not in `@context/current-feature.md`
- Never delete a file without asking

## Workflow

The same loop for every feature and every fix:

1. **Document** — the work package is written in `@context/current-feature.md` before it starts
2. **Branch** — one branch per package
3. **Implement** — build one piece, stop, let it be read, commit. Never dump a whole package
   in one go: code nobody has read is code nobody can defend
4. **Verify** — `npx tsc --noEmit` + `npm test` in `backend/`, `npm run type-check` +
   `npm run build` in `frontend/`, and a real check in the browser
5. **Iterate** — adjust on feedback
6. **Commit** — only once the build passes and the piece works
7. **Merge** — into `main`
8. **Delete the branch** after merge
9. **Review** — periodically and on demand (see below)
10. **Record** — mark done in `@context/current-feature.md` and add a History entry

Do NOT commit without permission, and never while the build fails. Fix first.

## Tiers — do not run ahead

P0 before P1, P1 before P2. No line of Web Audio before the MVP is finished and committed; no
`Dockerfile` before the app runs locally. The real risk on this exercise is not lack of
ambition — it is a half-wired bonus that prevents shipping a finished MVP, which is exactly
what the *« capacité à prioriser »* criterion measures.

## Branching

One branch per package: `feature/[name]` or `fix/[name]`. Ask before deleting it after merge.

## Commits

**Frequent, atomic commits are an explicit grading criterion for this exercise.** This section
is not housekeeping.

- Ask before committing — never auto-commit
- Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `ci:`
- One coherent, compiling step per commit. Never `wip`, never a single dump at the end
- The body carries a decision when one is worth recording — it costs nothing and reads well
  months later
- **Never squash on merge.** Squashing destroys the individual commits, which is precisely what
  is being evaluated. Prefer `--no-ff` so the feature boundaries stay visible while every
  commit survives
- **Never put "Generated with Claude" or a co-author line in a commit message**
- A `git log --oneline` whose commits all share one timestamp contradicts the brief in a way no
  code quality can offset

## Code Changes

- Minimal change to accomplish the task
- **No file Quentin cannot read in one pass.** Past ~150 lines in a file, ~40 in a function, or
  an abstraction that needs three files to be understood: split or simplify
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Follow the conventions already in the codebase; where none exists yet, follow
  `@context/coding-standards.md`

## When Stuck

- After 2–3 failed attempts, stop and explain the problem
- Don't try random fixes
- Ask when a requirement is unclear — `@context/project-overview.md` §19 lists what is already
  decided and what is still open

## Code Review

Review generated code periodically, and always on these five, which are this project's actual
risks:

- **Ownership isolation** — every drawing read or write takes `userId` in the signature; the
  filter is inside the query (`findFirst({ id, userId })`), never a comparison afterwards.
  Admin access is a separate named function, never an optional `userId?`
- **XSS** — the JWT lives in `localStorage`, so this is risk number one. No `v-html` anywhere,
  no user content rendered as HTML, frontend dependency list frozen
- **Input validation** — every request body goes through a Zod schema before reaching a
  service, bounds included. `drawing.data` is parsed by `DrawingDataSchema`, never cast with
  `as`
- **Leaks in responses** — `passwordHash` never leaves a service; output DTOs are built
  explicitly
- **Canvas correctness** — coordinates normalised to `[0, 1]`, never pixels; `pointer*` events,
  never `mouse*`; backing store sized with `devicePixelRatio`

A test that was already failing before a task started is reported, not silently fixed.
