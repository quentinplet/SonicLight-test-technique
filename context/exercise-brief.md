# Exercise Brief — IRCAM, Service Web

> Source: email from Salah Eddine Chaouch (IRCAM, Service Web), 16 September 2026.
> This file is the contract the work is judged against. When a decision is not covered by
> `@context/project-overview.md`, resolve it in favour of what is written here.

## The role

Développeur.euse Full Stack junior, Service Web de l'IRCAM. The exercise is the step before an
interview with the team. It exists to give that interview a concrete basis — how the candidate
works, what they choose, how they approach a project.

The project (SonicLight) is an application the IRCAM has already built and finished. It is
reused here as a support for the exercise only: **the work produced will not be used or
integrated into their projects.**

## What the application must do

> « SonicLight est une application web permettant de créer des dessins et de les transformer en
> une expérience sonore et visuelle. Pour cet exercice, nous vous proposons d'en réaliser une
> version simplifiée. L'application devra notamment permettre d'identifier un utilisateur, de
> créer un dessin à l'aide d'un canvas et d'enregistrer son dessin. Un utilisateur doit pouvoir
> retrouver son propre dessin. Une interface d'administration devra permettre de consulter les
> dessins enregistrés par les différents utilisateurs. La lecture des dessins sous forme sonore
> peut être ajoutée en option. »

| #   | Requirement                                                | Status   |
| --- | ---------------------------------------------------------- | -------- |
| 1   | Identify a user                                            | Firm     |
| 2   | Create a drawing on a canvas                               | Firm     |
| 3   | Save it; the user can find their own drawing again         | Firm     |
| 4   | An admin interface listing every user's drawings           | Firm     |
| 5   | Sonic playback of drawings                                 | Optional |

**The details are deliberately left undefined.** Architecture, data handling and interface are
the candidate's to decide. Asking questions before starting is explicitly encouraged — the
brief says « vous pouvez et **devez** nous poser toutes les questions que vous jugez
nécessaires avant de commencer le développement ».

## Answers from IRCAM — 17 September 2026

Received in reply to the questions sent before development. They are part of the contract
and override any earlier assumption:

> 1. L'application doit être responsive et fonctionner aussi bien sur desktop que sur mobile.
> 2. Un utilisateur est limité à un seul dessin. Il peut toutefois écraser son ancien dessin
>    et en soumettre un nouveau. Dans ce cas, l'ancien dessin est remplacé.
> 3. Seul l'administrateur peut voir les dessins de l'ensemble des utilisateurs. Un
>    utilisateur ne peut voir que son propre dessin.
> 4. Oui, l'administrateur peut modérer les dessins, notamment les supprimer si nécessaire.
> 5. Cette partie étant optionnelle, vous êtes libre de définir le mapping que vous
>    souhaitez pour la sonification.

| #   | Consequence                                                                          |
| --- | ------------------------------------------------------------------------------------ |
| 1   | Responsive is a **firm** requirement, not polish                                     |
| 2   | `Drawing.userId` is unique; saving is create-or-replace (`PUT /api/drawing`)         |
| 3   | Confirms private drawings; only admin routes list other users' drawings             |
| 4   | Admin moderation is in scope: `DELETE /api/admin/drawings/:id`                       |
| 5   | The sonification mapping of `project-overview.md` §14 stands as a free choice        |

## Technologies

Flexible. Backend: **Node.js preferred**, Go accepted. Frontend: **Vue.js preferred**, React and
Svelte accepted. Everything else is free.

## Organisation

- One week, until **Wednesday 23 September 2026**
- "Quelques heures" should suffice for a first version; more or less time is fine
- **Finishing the whole project is not required.** What matters is the ability to choose and to
  prioritise within the time available
- **Git is required, with regular commits throughout development** — explicitly *not* a single
  commit at the end

## How it is graded

1. Code quality and technical choices
2. Understanding of the need, and the ability to make relevant decisions
3. The ability to prioritise and produce a coherent result
4. **The way Git is used**

Bonus points, explicitly optional and **never at the expense of the rest**: Docker · audio
generation and playback with the Web Audio API · any other relevant extension.

## After the exercise

Send the link to the Git repository. The interview follows: the work, the technical choices,
the difficulties met, and what the candidate would have liked to improve.

> **« L'entretien est plus important que le fait d'avoir terminé ou non le projet. »**

## On AI tools

Explicitly allowed, with one condition in exchange:

> « Il est important que vous compreniez le code que vous produisez et soyez capable
> d'expliquer vos choix lors de l'entretien. »

This single sentence is the reason `@context/ai-interaction.md` reads the way it does. A file
the candidate would discover during the interview is a liability, whatever its quality.
