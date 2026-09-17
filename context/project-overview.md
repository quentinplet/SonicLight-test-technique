# SonicLight — Project Overview

> **Dessiner, puis écouter son dessin : un trait devient une phrase sonore.**

![Status](https://img.shields.io/badge/status-exercice%20technique-blue)
![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white)

|                 |                                                            |
| --------------- | ---------------------------------------------------------- |
| **Produit**     | SonicLight — version simplifiée                            |
| **Type**        | Exercice technique de recrutement — IRCAM, Service Web     |
| **Owner**       | Quentin Plet                                               |
| **Doc version** | 1.0 — 16 septembre 2026                                    |
| **Échéance**    | **mercredi 23 septembre 2026**                             |
| **Statut**      | **Démarrage à zéro** — aucune ligne de code écrite         |

> **⚠️ Ce projet est évalué sur la capacité à expliquer ses choix, pas sur son exhaustivité.**
> L'énoncé le dit explicitement : *« il est important que vous compreniez le code que vous
> produisez et soyez capable d'expliquer vos choix lors de l'entretien »*, et *« l'entretien
> est plus important que le fait d'avoir terminé ou non le projet »*. Le [§4](#4-travailler-sur-ce-projet-avec-claude-code)
> traduit cette contrainte en règles de travail. **Le lire avant toute intervention sur le code.**

---

## Table des matières

1. [Le besoin & la lecture qu'on en fait](#1-le-besoin--la-lecture-quon-en-fait)
2. [Contraintes de l'exercice](#2-contraintes-de-lexercice)
3. [Périmètre fonctionnel & priorisation](#3-périmètre-fonctionnel--priorisation)
4. [Travailler sur ce projet avec Claude Code](#4-travailler-sur-ce-projet-avec-claude-code)
5. [Architecture système](#5-architecture-système)
6. [Architecture backend en couches](#6-architecture-backend-en-couches)
7. [Principes de code](#7-principes-de-code)
8. [Modèle de données](#8-modèle-de-données)
9. [Le format d'un dessin](#9-le-format-dun-dessin)
10. [Schéma Prisma](#10-schéma-prisma)
11. [Routing & surface API](#11-routing--surface-api)
12. [Authentification](#12-authentification)
13. [Canvas — capture et rejeu](#13-canvas--capture-et-rejeu)
14. [Sonification (bonus)](#14-sonification-bonus)
15. [UI/UX & design tokens](#15-uiux--design-tokens)
16. [Docker, déploiement & variables d'environnement](#16-docker-déploiement--variables-denvironnement)
17. [Plan de commits](#17-plan-de-commits)
18. [Règles d'ingénierie](#18-règles-dingénierie)
19. [Questions ouvertes](#19-questions-ouvertes)
20. [Liens de référence](#20-liens-de-référence)

---

## 1. Le besoin & la lecture qu'on en fait

### L'énoncé, littéralement

> « SonicLight est une application web permettant de créer des dessins et de les
> transformer en une expérience sonore et visuelle. Pour cet exercice, nous vous proposons
> d'en réaliser une version simplifiée. L'application devra notamment permettre d'identifier
> un utilisateur, de créer un dessin à l'aide d'un canvas et d'enregistrer son dessin. Un
> utilisateur doit pouvoir retrouver son propre dessin. Une interface d'administration devra
> permettre de consulter les dessins enregistrés par les différents utilisateurs. La lecture
> des dessins sous forme sonore peut être ajoutée en option. »

Quatre exigences fermes, une option :

| #   | Exigence                                              | Statut       |
| --- | ----------------------------------------------------- | ------------ |
| 1   | Identifier un utilisateur                             | **Ferme**    |
| 2   | Créer un dessin sur un canvas                         | **Ferme**    |
| 3   | Enregistrer le dessin, l'utilisateur le retrouve      | **Ferme**    |
| 4   | Interface d'administration listant tous les dessins   | **Ferme**    |
| 5   | Lecture sonore des dessins                            | _Optionnel_  |

### La lecture qu'on en fait

L'énoncé est volontairement sous-spécifié — c'est écrit noir sur blanc. Trois interprétations
structurent tout le reste du document, et chacune doit pouvoir être défendue à l'oral :

**A. Un dessin est un objet vectoriel, pas une image.** Le nom du produit dit « transformer
un dessin en expérience sonore ». Sonifier un PNG, c'est analyser des pixels ; sonifier une
liste de traits, c'est lire une partition. On stocke donc **la géométrie** ([§9](#9-le-format-dun-dessin)),
pas le rendu. C'est la décision la plus structurante du projet : elle rend le bonus audio
possible pour quasiment zéro coût supplémentaire, alors qu'un dataURL PNG le rendrait
presque irréalisable dans le temps imparti.

**B. « Identifier » ≠ « authentifier », mais l'admin force la main.** On pourrait lire
« identifier » au sens faible (un pseudo saisi une fois). Mais une interface d'administration
qui consulte les dessins de *tous* les utilisateurs est par définition une ressource à
protéger : sans authentification réelle, n'importe qui y accède. L'authentification n'est donc
pas un sur-scope, c'est la conséquence directe de l'exigence n°4.

**C. Un dessin par utilisateur, et l'admin modère.** L'hypothèse initiale — plusieurs
dessins par utilisateur, un admin qui consulte sans gérer — a été **invalidée par les
réponses de l'IRCAM** ([§19](#19-questions-ouvertes)) : chaque utilisateur a **un seul**
dessin, qu'il peut remplacer ou supprimer, et l'admin voit tous les dessins et peut les
**supprimer**. Il ne les modifie pas. La contrainte « un seul dessin » est portée par la
base (`userId` unique), pas seulement par le code.

```mermaid
flowchart LR
    subgraph Draw["🎨 Dessiner"]
        D1[Canvas<br/>pointer events]
        D2[Traits capturés<br/>en coordonnées normalisées]
    end

    subgraph Store["💾 Stocker"]
        S1[(PostgreSQL<br/>jsonb)]
    end

    subgraph Play["🔊 Rejouer"]
        P1[Rejeu visuel<br/>trait par trait]
        P2[Sonification<br/>Web Audio API]
    end

    D1 --> D2 --> S1 --> P1 & P2
```

### Pourquoi ce projet est un bon sujet d'entretien

Le domaine est minuscule — deux tables, six endpoints. Toute la matière de discussion est
concentrée sur quatre décisions, et c'est exactement là que l'évaluation se joue :

| Décision                                     | Ce qu'elle révèle                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Format vectoriel plutôt que bitmap           | Capacité à lire l'intention derrière l'énoncé, pas seulement la lettre  |
| Coordonnées normalisées plutôt qu'en pixels  | Anticipation du rejeu multi-résolution — un piège classique du canvas   |
| Isolation par la signature des services      | Réflexe de sécurité appliqué avant l'incident, pas après                |
| Sonification par quantification pentatonique | Culture du domaine musical — et un choix esthétique assumé              |

---

## 2. Contraintes de l'exercice

### Ce qui est explicitement évalué

| Critère (dans l'ordre de l'énoncé)                          | Traduction concrète dans ce document                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Qualité du code et des choix techniques                      | [§6](#6-architecture-backend-en-couches) · [§7](#7-principes-de-code)      |
| Compréhension du besoin et décisions pertinentes             | [§1](#1-le-besoin--la-lecture-quon-en-fait) · [§19](#19-questions-ouvertes) |
| Capacité à prioriser et à produire un résultat cohérent      | [§3](#3-périmètre-fonctionnel--priorisation)                               |
| Manière de travailler avec Git                               | [§17](#17-plan-de-commits)                                                 |

### Bonus explicitement cités

Docker · génération et lecture audio avec la Web Audio API · toute autre extension pertinente.
**« Ces éléments restent entièrement optionnels et ne doivent pas se faire au détriment du reste. »**
Ce document traite donc Docker et l'audio comme des paliers P1/P2, jamais comme du P0.

### Budget temps

L'énoncé estime « quelques heures » pour une première version. Ce document part sur
**~20 h utiles réparties du 16 au 22 septembre**, avec une soumission le 22 au soir pour
garder une marge d'un jour. Répartition cible :

| Palier                                 | Budget | Cumul |
| -------------------------------------- | ------ | ----- |
| P0 — MVP complet et fini               | 8 h    | 8 h   |
| P1 — Docker + rejeu visuel + tests     | 4 h    | 12 h  |
| P1b — CI GitHub Actions                | 1 h    | 13 h  |
| P1c — Déploiement front + API + base   | 3 h    | 16 h  |
| P2 — Sonification Web Audio            | 3 h    | 19 h  |
| Finition — README, relecture           | 1 h    | 20 h  |

> **Règle d'arrêt.** Si le P0 déborde au-delà de 10 h, on coupe le P2 sans hésiter et on
> livre un MVP propre, déployé. Un projet cohérent et fini vaut mieux qu'un projet
> ambitieux à moitié câblé — c'est littéralement le critère n°3.

> **Le déploiement est budgété à 3 h, et ce n'est pas pessimiste.** Le code est prêt en
> quinze minutes ; ce qui prend du temps, c'est le premier CORS qui ne passe pas, le
> `VITE_API_URL` oublié au build, la base managée dont l'URL de connexion exige
> `?sslmode=require`, et le service gratuit qui s'endort. Prévoir cette marge évite de
> devoir choisir entre déployer et finir le canvas.

### Ce que l'énoncé autorise et qu'il ne faut pas gâcher

> « Vous pouvez et devez nous poser toutes les questions que vous jugez nécessaires avant de
> commencer le développement. »

Le mot **devez** n'est pas décoratif. Le [§19](#19-questions-ouvertes) recense les zones
d'ombre réelles ; les plus structurantes partent par mail avant le début du développement.
Les autres sont tranchées unilatéralement, documentées ici, et deviennent des sujets
d'entretien.

---

## 3. Périmètre fonctionnel & priorisation

### P0 — Le MVP, non négociable

| Domaine     | Contenu                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| **Auth**    | Inscription (nom d'utilisateur + mot de passe), connexion, déconnexion, session persistante au refresh   |
| **Responsive** | Desktop **et** mobile — exigence confirmée par l'IRCAM. Canvas, barre d'outils et vue admin utilisables au doigt sur petit écran |
| **Dessin**  | Canvas plein écran, tracé à la souris et au doigt, choix de couleur, choix d'épaisseur, gomme d'annulation (undo), effacer tout |
| **Sauver**  | Titre + enregistrement. **Un seul dessin par utilisateur** : enregistrer à nouveau remplace l'ancien |
| **Retrouver** | « Mon dessin » : rejeu, titre, date de dernière modification, suppression                  |
| **Admin**   | Route protégée listant **tous** les dessins avec leur auteur, tri par date, ouverture et **suppression** (modération) |

### P1 — Le premier palier de bonus

| Domaine        | Contenu                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| **Docker**     | `docker compose up` démarre Postgres + API. Un seul prérequis : Docker      |
| **CI**         | GitHub Actions : types, tests et build vérifiés à chaque push               |
| **Déploiement**| Front sur CDN, API en conteneur, base managée — un lien cliquable à envoyer |
| **Rejeu visuel** | Le dessin se reconstruit trait par trait à l'ouverture, au lieu d'apparaître d'un coup |
| **Tests**      | Tests unitaires sur les services backend (isolation par utilisateur, validation du format d'un dessin) |
| **Seed**       | Jeu de démonstration : 1 admin, 2 utilisateurs, quelques dessins — l'admin a quelque chose à afficher sans saisie manuelle |

### P2 — Le bonus qui donne son nom au produit

| Domaine          | Contenu                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| **Sonification** | Lecture audio d'un dessin via la Web Audio API, tête de lecture synchronisée avec le rejeu visuel ([§14](#14-sonification-bonus)) |

### Explicitement hors scope

Plusieurs dessins par utilisateur · modification d'un dessin par l'admin · rôles au-delà de `USER`/`ADMIN` ·
partage public d'un dessin par lien · édition d'un dessin déjà enregistré · calques ·
formes géométriques, remplissage, texte · export PNG/SVG · collaboration temps réel ·
OAuth · réinitialisation de mot de passe · email · pagination ·
internationalisation · mode hors ligne.

> Cette liste n'est pas une liste de regrets : c'est la démonstration qu'un arbitrage a eu
> lieu. Elle est reprise telle quelle dans le README et sert de trame à l'entretien.

---

## 4. Travailler sur ce projet avec Claude Code

> Cette section prime sur toutes les autres. Les sections suivantes décrivent une **cible** ;
> celle-ci décrit comment il est permis de l'atteindre.

### Le contexte

Contrairement à un projet ordinaire, **le livrable n'est pas le code : c'est la capacité à le
défendre à l'oral**. L'énoncé autorise explicitement les outils d'IA, et pose une seule
condition en retour — comprendre ce qui est produit. Un fichier que Quentin découvrirait
pendant l'entretien est un passif, quelle que soit sa qualité.

Les règles qui suivent découlent toutes de là.

### Règle 1 — Expliquer avant d'écrire

Pour toute étape non triviale (un nouveau module, un algorithme, un choix de bibliothèque),
annoncer **d'abord** le plan en cinq lignes maximum, et attendre l'accord :

```
Ce que je vais faire  : capture des traits dans un composable useDrawing()
Fichiers touchés      : frontend/src/composables/useDrawing.ts (nouveau)
Décision structurante : coordonnées normalisées [0,1], pas de pixels
Alternative écartée   : stocker en pixels + facteur d'échelle (casse au resize)
Vérification          : npm run type-check
```

Une étape triviale (ajouter un champ, corriger un import, écrire un test évident) n'a pas
besoin de ça. Le critère : *est-ce que Quentin saurait justifier ce choix demain sans relire
le code ?* Si non, l'annoncer.

### Règle 2 — Pas de code que Quentin ne puisse relire d'une traite

Un fichier de plus de ~150 lignes, une fonction de plus de ~40 lignes, ou une abstraction qui
demande de sauter entre trois fichiers pour être comprise : c'est un signal, pas une réussite.
Découper, ou simplifier.

Corollaire : **pas de génération en masse**. On construit un morceau, on le relit, on le
commit, on passe au suivant. Vider le MVP entier en un seul message produit du code que
personne n'a lu.

### Règle 3 — Un commit = une étape cohérente

Les commits réguliers sont un **critère d'évaluation explicite**. Concrètement :

- Un commit par étape fonctionnelle terminée et qui compile. Jamais de `wip`, jamais de
  « tout le backend » en un commit.
- Messages en anglais, à l'impératif, style _Conventional Commits_ :
  `feat(drawing): capture strokes in normalised coordinates`.
- Le corps du message sert à documenter une décision quand elle mérite de l'être — c'est
  gratuit, et ça se relit en entretien.
- L'historique doit se lire comme le récit du projet. Un relecteur qui fait `git log --oneline`
  doit comprendre l'ordre dans lequel les problèmes ont été attaqués.

Le plan de commits cible est au [§17](#17-plan-de-commits).

### Règle 4 — Pas de nouvelle dépendance sans demander

La liste des dépendances est **figée** ([§5](#5-architecture-système)). Toute addition se
propose d'abord, avec la justification et l'alternative sans dépendance. Sur un projet de
cette taille, chaque ligne du `package.json` est une question potentielle en entretien :
« pourquoi celle-là ? ». Il faut une réponse pour chacune.

Interdits d'office : une bibliothèque de dessin (Fabric.js, Konva, Paper.js) — le canvas natif
**est** l'exercice ; une bibliothèque audio (Tone.js) — la Web Audio API brute **est** le
bonus ; un framework UI lourd alors que le projet a cinq écrans.

### Règle 5 — Le plus simple qui fonctionne

Voir [§7](#7-principes-de-code). Entre deux solutions, celle qui tient en moins de fichiers
gagne. Un exercice de quelques heures sur-architecturé se retourne contre son auteur : il
démontre l'inverse du critère « capacité à prioriser ».

### Règle 6 — Vérifier avant de rendre la main

À la fin de toute tâche touchant au code :

```bash
# Backend
cd backend && npx tsc --noEmit && npm test

# Frontend
cd frontend && npm run type-check && npm run build
```

Ne pas annoncer une tâche terminée si l'un des quatre échoue. Un test qui échouait déjà
avant l'intervention est signalé, pas corrigé silencieusement.

### Règle 7 — Ne pas anticiper les paliers

Aucune ligne de code de sonification tant que le P0 n'est pas terminé et commité. Aucun
`Dockerfile` tant que l'application ne tourne pas en local. Le risque réel de cet exercice
n'est pas le manque d'ambition, c'est un P2 à moitié fait qui empêche de livrer un P0 fini.

### Ce qui est fait sans demander

- Écrire une fonctionnalité listée en P0 dans un fichier neuf, en suivant les conventions.
- Ajouter un test.
- Corriger un bug identifié dans le périmètre de la tâche en cours.
- Répondre à une question, expliquer du code, proposer un plan.

### Ce qui demande un accord préalable

- Ajouter une dépendance.
- Modifier le schéma Prisma.
- Changer une convention (arborescence, nommage, format de réponse d'API).
- Attaquer un palier P1 ou P2.
- Toucher à un fichier hors du périmètre de la tâche en cours.

---

## 5. Architecture système

```mermaid
flowchart TB
    subgraph Client["Navigateur"]
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

    subgraph Data["Couche données"]
        PR["Prisma 7"]
        PG[("PostgreSQL 16<br/>strokes en jsonb")]
    end

    UI -->|"/api · Authorization: Bearer"| MW
    MW --> RT --> CTRL --> SVC --> PR --> PG
```

### Décisions d'architecture

| Décision       | Choix                                                  | Justification                                                                                                                                  |
| -------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | Vue 3 SPA, `<script setup>`, pas de SSR ni de Nuxt     | Techno privilégiée par l'IRCAM. Aucun enjeu SEO derrière une authentification ; un build statique suffit                                        |
| Build front    | Vite                                                   | Standard de l'écosystème Vue. Produit un `dist/` purement statique, déployable tel quel sur n'importe quel CDN ([§16](#16-docker-déploiement--variables-denvironnement)) |
| Déploiement    | Front et API déployés **séparément**                   | Le front est statique → CDN ; l'API est un conteneur → hébergeur de conteneurs. Deux origines distinctes, assumées ([§16](#16-docker-déploiement--variables-denvironnement)) |
| État front     | Pinia, un seul store (`auth`)                          | Le reste de l'état est local au composant. Un store par écran serait de la cérémonie                                                           |
| Backend        | Express 5 + TypeScript                                 | Express reste la référence Node, immédiatement lisible par un relecteur. TypeScript pour le typage du format de dessin, partagé des deux côtés |
| Couches        | Route → Controller → Service → Prisma                  | Voir [§6](#6-architecture-backend-en-couches)                                                                                                  |
| **Pas** de repository | Les services appellent Prisma directement       | Prisma **est** déjà la couche d'accès. Un repository par-dessus ne ferait que transférer des appels ([§6](#6-architecture-backend-en-couches)) |
| ORM            | Prisma 7, migrations versionnées                       | Schéma déclaratif lisible, migrations générées, client typé de bout en bout                                                                    |
| Base           | PostgreSQL 16, traits en `jsonb`                       | Voir [§8](#8-modèle-de-données) — un dessin est un document, pas une relation                                                                  |
| Auth           | JWT signé, stocké en `localStorage`, en-tête `Bearer`  | Pattern standard d'une SPA devant une API sans état, et maîtrisé. Le risque XSS est assumé et compensé ([§12](#12-authentification))           |
| Validation     | Zod, sur chaque corps de requête                       | Un schéma Zod sert **à la fois** de validateur runtime et de type TypeScript — une seule source de vérité                                      |
| Tests          | Vitest des deux côtés                                  | Même runner sur les deux packages, zéro configuration côté Vite                                                                                |
| Repo           | Deux packages npm indépendants (`frontend/`, `backend/`)  | Pas de workspace : l'overhead ne se justifie pas à deux packages, et `npm install` dans chacun reste trivial à documenter                      |

### Dépendances — la liste figée

| Package                   | Côté   | Pourquoi                                                    |
| ------------------------- | ------ | ----------------------------------------------------------- |
| `vue`, `vue-router`, `pinia` | client | Le socle Vue 3                                           |
| `vite`, `@vitejs/plugin-vue`, `vue-tsc` | client | Build et typecheck                            |
| `tailwindcss`, `@tailwindcss/vite` | client | Méthode d'écriture du CSS, tokens en `@theme` — aucun runtime |
| `daisyui`                 | client | Plugin Tailwind purement CSS : composants génériques, thème sur mesure |
| `vitest`                  | client, server | Tests                                               |
| `express`, `@types/express` | server | Le serveur HTTP                                           |
| `@prisma/client`, `prisma`, `@prisma/adapter-pg`, `pg` | server | ORM et migrations — Prisma 7 exige un adaptateur de driver |
| `zod`                     | server | Validation des entrées + inférence de types                 |
| `jsonwebtoken`            | server | Signature et vérification du JWT                            |
| `bcryptjs`                | server | Hachage des mots de passe                                   |
| `cors`                    | server | Autorise l'origine du client pour un appel direct à l'API   |
| `tsx`                     | server | Exécution TypeScript en développement, sans étape de build  |

Douze lignes, dont trois pour le style et aucune n'embarquant de JavaScript au runtime. Toute
treizième se justifie ([§4 règle 4](#règle-4--pas-de-nouvelle-dépendance-sans-demander)).

---

## 6. Architecture backend en couches

Trois couches, en dossiers, dans un seul package. Les dépendances vont dans un seul sens :

```
Route  ──▶  Controller  ──▶  Service  ──▶  Prisma Client
              │                 │
              └── Schéma Zod ───┘
```

```
backend/src/
├── routes/         auth.routes.ts · drawings.routes.ts · admin.routes.ts
├── controllers/    traduction HTTP ↔ service
├── services/       règles métier, seul endroit qui touche Prisma
├── schemas/        schémas Zod (validation + types inférés)
├── middleware/     requireAuth · requireAdmin · errorHandler
├── lib/            prisma.ts (singleton) · jwt.ts · env.ts
├── types/          drawing.ts — le format d'un dessin (§9)
└── index.ts        montage de l'app, écoute
```

### Responsabilités

| Couche         | Rôle                                                             | Peut dépendre de      | Ne doit jamais connaître             |
| -------------- | ---------------------------------------------------------------- | --------------------- | ------------------------------------ |
| **Route**      | Chemin, méthode, middlewares appliqués                           | controllers, middleware | services, Prisma                   |
| **Controller** | HTTP : parse la requête, appelle le service, choisit le statut   | services, schémas Zod | Prisma, règles métier                |
| **Service**    | Règles métier, accès aux données, propriété des ressources       | Prisma, types, `AppError` | `req`, `res`                     |
| **Schéma Zod** | Contrat d'entrée, validation, type inféré                        | rien                  | Prisma, HTTP                         |
| **Middleware** | Auth, rôle, erreurs                                              | lib/jwt               | services métier                      |

### Les trois règles qui font tenir le pattern

**1. Le controller ne contient aucune règle métier.** Il valide, appelle, traduit. Une action
qui dépasse une dizaine de lignes a de la logique au mauvais endroit.

```ts
// controllers/drawing.controller.ts
export async function getMine(req: Request, res: Response) {
  const drawing = await drawingService.getMine(req.user!.id);
  if (!drawing) return res.status(404).json({ code: "drawing.notFound" });
  return res.json(drawing);
}
```

**2. Le service ne manipule ni `req` ni `res`.** Il retourne une valeur, `null`, ou lève une
`AppError` (`NotFoundError`, `ConflictError`…) que l'`errorHandler` transforme en réponse.
Chaque erreur porte son statut HTTP : simplification assumée, le statut est lu à côté de
l'erreur qu'il décrit, sans table de correspondance à maintenir. Un
service qui manipule `res.status()` n'est plus testable hors d'un contexte Express — et
c'est précisément ce qu'on veut tester.

**3. Seul le service touche Prisma.** Un controller qui importe `prisma` court-circuite la
couche où vivent les règles de propriété. C'est la règle la plus facile à enfreindre par
inadvertance, et la plus coûteuse.

### L'isolation par utilisateur passe par la signature

C'est le point le plus important du backend, et le meilleur sujet d'entretien qu'il contient.
Plutôt que de compter sur la discipline pour ne jamais oublier le filtre `userId`, **on
l'impose par la signature** :

```ts
// services/drawing.service.ts

// Impossible d'appeler sans fournir le propriétaire. Le compilateur fait le travail.
// Un seul dessin par utilisateur : le userId SUFFIT à désigner la ressource.
export function getMine(userId: string): Promise<Drawing | null> {
  return prisma.drawing.findUnique({ where: { userId } });
}

// Crée ou remplace — upsert sur la colonne unique, atomique.
export function saveMine(userId: string, input: DrawingInput): Promise<Drawing> { /* … */ }

export function removeMine(userId: string): Promise<boolean> { /* … */ }

// L'accès admin est une fonction SÉPARÉE, au nom explicite — jamais un paramètre
// optionnel `userId?` sur les fonctions ci-dessus, qui rendrait l'oubli silencieux.
export function listAllForAdmin(): Promise<DrawingWithAuthor[]> { /* … */ }
export function getByIdForAdmin(id: string): Promise<Drawing | null> { /* … */ }
export function removeForAdmin(id: string): Promise<boolean> { /* … */ }
```

> **Le `userId` est la clé de la requête, jamais un filtre ajouté après.** Un utilisateur
> ayant au plus un dessin, `findUnique({ where: { userId } })` le désigne entièrement : les
> routes utilisateur n'acceptent **aucun identifiant de dessin** venu du client. Il n'existe
> donc pas de requête « charger par id, puis vérifier le propriétaire » à oublier — et
> aucun moyen de viser le dessin d'un autre.

> **Pas de 403 côté utilisateur.** Sans id dans l'URL, un utilisateur ne peut pas désigner une
> ressource qui ne lui appartient pas : sans dessin, c'est un 404. Le seul 403 du projet est
> celui de `requireAdmin`, où l'existence de la route n'est pas un secret.

### Pourquoi pas de couche repository

Le pattern repository a du sens au-dessus d'un ORM bavard, pour donner des noms métier aux
requêtes et pouvoir mocker. Avec Prisma, `prisma.drawing` **est** déjà cet objet : typé,
nommé, testable via une base de test. Ajouter `DrawingRepository.findById()` qui fait
`return prisma.drawing.findFirst()` serait de la cérémonie pure — un fichier de plus à lire,
zéro règle métier gagnée.

C'est un arbitrage assumé, pas un oubli. Le contre-argument — « et si on changeait d'ORM ? » —
ne tient pas : on ne change pas d'ORM sur un projet de deux tables, et l'abstraire coûterait
plus cher aujourd'hui que la migration hypothétique de demain. Voir la règle des trois
([§7](#7-principes-de-code)).

---

## 7. Principes de code

### SOLID — appliqué à ce projet

| Principe | Traduction concrète ici                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| **S**    | Un service par agrégat (`auth.service`, `drawing.service`). Un fichier nommé `utils` ou `helpers` est le signe qu'on ne sait pas où ranger quelque chose |
| **O**    | Ajouter une fonctionnalité = ajouter un fichier, pas modifier cinq fichiers existants                       |
| **L**    | Aucune hiérarchie de classes dans ce projet. Des fonctions et des modules                                   |
| **I**    | Les services exportent les fonctions réellement appelées, pas un CRUD générique complet                     |
| **D**    | Les controllers importent des services, jamais Prisma. La dépendance pointe vers l'abstraction métier       |

### DRY — mais du bon côté

DRY s'applique à la **connaissance**, pas au texte. Dans ce projet, quatre règles n'existent
qu'à un seul endroit :

1. Le filtre par `userId` — dans la signature des services ([§6](#6-architecture-backend-en-couches)).
2. Le format d'un dessin — dans le schéma Zod `DrawingDataSchema` ([§9](#9-le-format-dun-dessin)).
3. La normalisation des coordonnées — dans le composable `useDrawing` côté client.
4. Le mapping dessin → son — dans `useSonification`, jamais dupliqué dans un composant.

Le type `DrawingData` est en revanche **volontairement dupliqué** entre `frontend/src/types/`
et `backend/src/types/`, avec un en-tête qui le signale. Vingt lignes recopiées coûtent moins
cher qu'un package partagé et sa configuration de build, sur un projet de cette taille. C'est
la première chose à changer si le projet grossissait ([§19](#19-questions-ouvertes) Q6).

### KISS & YAGNI — la liste de ce qu'on n'écrit pas

Ce projet **n'introduit pas** :

- De couche repository ([§6](#6-architecture-backend-en-couches))
- De pattern CQRS, de bus d'événements, d'injection de dépendances par conteneur
- De `BaseService`, `BaseController`, ou de générique `<T>` sur une seule entité
- De bibliothèque de dessin — le canvas natif est l'exercice
- De bibliothèque audio — la Web Audio API brute est le bonus
- De système de rôles au-delà de l'énumération `USER` / `ADMIN`
- De pagination, de cache, de rate limiting, de logs structurés
- De table `Stroke` séparée ([§8](#8-modèle-de-données))
- D'abstraction « pour plus tard »

**La règle des trois :** on abstrait au troisième cas réel, pas au premier. Sur une semaine,
le troisième cas n'arrivera pas.

### L'arbitrage entre les principes

Quand SOLID pousse vers l'abstraction et KISS vers le concret, **KISS gagne** — et sur cet
exercice, il gagne largement. Le critère évalué est « capacité à prioriser » : une
architecture d'entreprise sur deux tables démontre exactement le contraire.

Le seul endroit où la rigueur prime sur la simplicité est **l'isolation par utilisateur** :
là, le coût d'un oubli est une fuite de données entre comptes, sur une application qui a
précisément une interface d'administration pour montrer qu'on sait séparer les deux.

---

## 8. Modèle de données

```mermaid
erDiagram
    USER ||--o| DRAWING : "possède"

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
        jsonb data "traits vectoriels — §9"
        uuid userId FK
        datetime createdAt
        datetime updatedAt
    }
```

Deux tables. C'est tout, et c'est délibéré.

### Notes de conception

| #   | Décision                                            | Pourquoi                                                                                                                                                                                                                    |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Les traits en `jsonb`, pas en table `Stroke`**     | Un dessin est lu et écrit **en entier, toujours**. On ne requête jamais « les traits rouges », on ne met jamais à jour un point isolé. Une table `Stroke` + une table `Point` produirait des milliers de lignes par dessin pour un agrégat qui n'est jamais découpé — un coût de jointure pur, sans bénéfice |
| 2   | `role` sur `User`, pas de table `Role`              | Deux valeurs, aucune permission granulaire. Une énumération suffit ; une table de rôles serait une abstraction sans second cas                                                                                              |
| 3   | Un seul `userName`, pas d'email                  | Aucune fonctionnalité n'a besoin d'un email (ni réinitialisation, ni notification). Un nom unique sert à la fois d'identifiant de connexion et de nom d'auteur affiché dans l'admin — un champ de moins, une donnée personnelle de moins |
| 4   | Pas de champ `thumbnail`                            | La vignette se rend côté client en rejouant les traits sur un petit canvas. Stocker un PNG dérivé dupliquerait la source de vérité pour un gain invisible à cette échelle ([§19](#19-questions-ouvertes) Q4)               |
| 5   | `onDelete: Cascade` sur `Drawing.userId`            | Supprimer un compte supprime son dessin. Aucun intérêt à conserver des dessins orphelins                                                                                                                                  |
| 6   | **`userId` unique**, aucun autre index              | Un seul dessin par utilisateur (réponse de l'IRCAM) : la base l'impose, deux enregistrements simultanés ne peuvent pas créer deux lignes, et remplacer devient un `upsert` sur cette colonne. L'index unique sert aussi la seule requête côté utilisateur. La liste admin tient en quelques dizaines de lignes : un index de tri n'y serait même pas utilisé |
| 7   | Pas de soft delete                                  | Aucune exigence de corbeille dans l'énoncé. `DELETE` supprime                                                                                                                                                              |

> **Le `jsonb` est le point qu'un relecteur va challenger.** La réponse tient en une phrase :
> *le critère de choix n'est pas la forme de la donnée mais son unité d'accès — les traits
> d'un dessin sont toujours lus ensemble, écrits ensemble et supprimés ensemble, donc ils
> forment un document et pas une relation.* Le jour où il faudrait requêter les traits
> individuellement — chercher tous les dessins contenant du rouge, par exemple — la
> normalisation deviendrait justifiée, et Postgres permet de le faire progressivement avec
> un index GIN sur la colonne `jsonb` avant d'en arriver là.

---

## 9. Le format d'un dessin

**C'est la décision structurante du projet.** Elle conditionne le rejeu, la sonification,
la robustesse au redimensionnement, et l'essentiel de la discussion d'entretien.

```ts
// types/drawing.ts — copie canonique dans backend/, dupliquée dans frontend/ (§7)

/** Un point, en coordonnées NORMALISÉES dans [0, 1] relativement à la boîte du canvas. */
export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  /** Couleur au format hexadécimal, ex. "#e11d48". */
  color: string;
  /** Épaisseur normalisée : fraction de la LARGEUR du canvas, pas des pixels. */
  width: number;
  points: Point[];
}

export interface DrawingData {
  /** Version du format. Permet de faire évoluer le schéma sans casser l'existant. */
  version: 1;
  /** Ratio largeur / hauteur du canvas de création. Nécessaire pour rejouer sans déformer. */
  aspectRatio: number;
  background: string;
  strokes: Stroke[];
}
```

### Les quatre décisions contenues dans ces vingt lignes

**1. Coordonnées normalisées dans `[0, 1]`, jamais des pixels.**
Le canvas de création fait 1200 px de large sur un écran de bureau, 380 px sur un téléphone,
et 240 px dans une vignette de la galerie admin. Des coordonnées en pixels ne seraient
valides que sur l'écran qui les a produites. Normaliser à la capture et dénormaliser au rendu
rend le dessin **indépendant de sa surface d'affichage** — c'est ce qui permet à la même
donnée d'alimenter le canvas plein écran, la vignette et la tête de lecture audio.

**2. `aspectRatio` stocké avec le dessin.**
Normaliser `x` et `y` indépendamment sur `[0, 1]` écrase l'information de proportion : un
cercle dessiné sur un canvas 16:9 redeviendrait un cercle sur un canvas carré — donc un
ovale déformé en pratique. On mémorise le ratio de création, et le rejeu le respecte en
adaptant sa boîte (letterbox) plutôt qu'en étirant le dessin.

**3. `width` normalisé sur la largeur, pas sur les deux axes.**
Un trait a une épaisseur scalaire, pas un vecteur. On la normalise sur une seule dimension —
la largeur, par convention — pour qu'elle reste cohérente quelle que soit la taille de rendu.

**4. `version: 1` littéral.**
Un octet dans la base, une garantie pour la suite : le jour où le format évolue, on sait
distinguer les anciens dessins sans deviner. Le type littéral fait que TypeScript refuse
une valeur autre que `1`, et le schéma Zod refuse un `version: 2` inconnu à l'entrée.

### Validation côté serveur

Le serveur **ne fait jamais confiance** au JSON reçu. Le même schéma Zod sert de validateur
et de source du type :

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
  title: z.string().trim().min(1).max(80),
  data: DrawingDataSchema,
});
```

> **Les bornes `max()` ne sont pas décoratives.** Sans elles, un client malveillant poste un
> `jsonb` de 200 Mo et sature la base. 1 000 traits × 5 000 points est très au-delà d'un
> usage réel tout en restant un plafond dur. C'est la seule mesure de sécurité applicative
> du projet au-delà de l'authentification, et elle mérite d'être mentionnée à l'oral.

### Simplification de la trajectoire à la capture

Un `pointermove` émet un événement tous les quelques millisecondes : un trait de deux
secondes produit facilement 300 points, dont l'immense majorité sont visuellement redondants.
On filtre à la capture, avec la règle la plus simple qui marche : **on ignore un point situé
à moins d'une distance seuil du précédent** (~0,002 en coordonnées normalisées, soit ~2 px
sur un canvas de 1000 px).

Résultat : un dessin passe typiquement de ~400 Ko à ~40 Ko de JSON, le rejeu est plus fluide,
et la sonification produit moins de notes parasites. L'algorithme de Ramer–Douglas–Peucker
ferait mieux — il est cité au [§19](#19-questions-ouvertes) Q5 comme évolution, pas comme
prérequis.

---

## 10. Schéma Prisma

```prisma
// backend/prisma/schema.prisma

generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"   // non commité
  importFileExtension = "js"                        // résout sous tsx comme sous node
}

// Prisma 7 : l'URL de connexion vit dans prisma.config.ts, plus dans le schéma.
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
  title     String   @db.VarChar(80)

  /// Traits vectoriels, conformes à DrawingDataSchema (§9).
  /// Document lu et écrit en entier — jamais requêté par trait.
  data      Json     @db.JsonB

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  /// Unique : un seul dessin par utilisateur, imposé par la base. Remplacer = upsert.
  userId    String   @unique @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("drawings")
}
```

### Points d'attention

- **`@db.JsonB` explicitement**, même si Prisma mappe déjà `Json` vers `jsonb` sur
  PostgreSQL. L'écrire rend l'intention lisible dans le schéma, et protège d'un changement
  de comportement par défaut.
- **Le `Json` de Prisma n'est pas typé.** `drawing.data` arrive en `Prisma.JsonValue` côté
  TypeScript. On le parse systématiquement avec `DrawingDataSchema.parse()` en sortie de
  service plutôt que de faire un `as DrawingData` — un cast masquerait une donnée corrompue
  jusqu'au crash côté client.
- **`@@map` vers des noms de tables au pluriel en minuscules.** Convention SQL, découplée
  du nommage des modèles.
- Migrations générées (`prisma migrate dev`), **jamais** `prisma db push` : `db push`
  diverge silencieusement de l'historique et rend la base non reproductible.

### Seed

```
backend/prisma/seed.ts
```

Crée, si absents : un compte `admin` (rôle `ADMIN`), deux comptes
utilisateur, et trois à quatre dessins générés programmatiquement (spirales, ondes) répartis
entre eux. Chaque étape est gardée par un test d'existence, donc rejouable sans doublon.

Objectif : un relecteur qui clone le repo et lance `docker compose up` voit une interface
d'administration **peuplée**, sans avoir à créer trois comptes et dessiner à la souris. C'est
un détail d'accueil qui pèse plus lourd qu'il n'en a l'air sur la première impression.

> **Le seed est gardé par `NODE_ENV !== "production"` et sort en erreur explicite sinon.** Ces
> comptes ont des mots de passe connus, écrits dans un dépôt Git public. Les laisser s'insérer
> dans la base déployée serait une porte d'entrée, pas une commodité. Sur la démonstration en
> ligne, un compte de test est créé une fois à la main et son identifiant figure dans le
> README — jamais dans le code.

---

## 11. Routing & surface API

### Pages Vue

| Route            | Garde              | Description                                              |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `/login`         | invité             | Connexion                                                |
| `/register`      | invité             | Inscription                                              |
| `/`              | authentifié        | Le canvas — écran d'accueil, on dessine tout de suite    |
| `/drawing`       | authentifié        | « Mon dessin » : rejeu visuel, puis audio (P2), suppression |
| `/admin`         | authentifié + ADMIN | Tous les dessins, tous utilisateurs confondus, suppression |
| `/admin/drawings/:id` | authentifié + ADMIN | Lecture d'un dessin de n'importe quel utilisateur   |

> **Le canvas est la page d'accueil, pas la galerie.** L'application sert à dessiner ; la
> première action possible après connexion doit être de dessiner, pas de naviguer vers un
> écran qui permet de dessiner.

### API Express

| Route                  | Méthode  | Garde   | Description                                            |
| ---------------------- | -------- | ------- | ------------------------------------------------------ |
| `/api/auth/register`   | `POST`   | —       | Crée le compte, pose le cookie, retourne l'utilisateur |
| `/api/auth/login`      | `POST`   | —       | Pose le cookie, retourne l'utilisateur                 |
| `/api/auth/me`         | `GET`    | auth    | L'utilisateur courant — seule source fiable de l'identité et du rôle ([§12](#12-authentification)) |
| `/api/drawing`         | `GET`    | auth    | Mon dessin, `data` compris — 404 si je n'en ai pas     |
| `/api/drawing`         | `PUT`    | auth    | Crée ou remplace mon dessin                            |
| `/api/drawing`         | `DELETE` | auth    | Supprime mon dessin                                    |
| `/api/admin/drawings`  | `GET`    | admin   | Tous les dessins avec leur auteur, sans le `data`      |
| `/api/admin/drawings/:id` | `GET` | admin   | N'importe quel dessin, `data` compris                  |
| `/api/admin/drawings/:id` | `DELETE` | admin | Supprime n'importe quel dessin (modération)           |

> **`/api/drawing` est au singulier, sans identifiant.** Un utilisateur a au plus un dessin :
> le jeton suffit à le désigner. Aucun id n'est accepté du client sur ces routes, donc aucun
> moyen d'en viser un autre — l'isolation est structurelle, pas seulement vérifiée.

> **`PUT` et pas `POST`.** Enregistrer remplace une ressource unique : envoyer deux fois la
> même requête laisse le même état. C'est la définition d'une opération idempotente, donc
> de `PUT`. La ligne est conservée (même id, `createdAt` d'origine), seuls `title`, `data`
> et `updatedAt` changent.

> **`GET /api/admin/drawings` ne renvoie pas le `data`.** Une liste de vingt dessins complets,
> c'est plusieurs mégaoctets de JSON pour afficher vingt titres. La liste renvoie
> `{ id, title, updatedAt, author, strokeCount }` ; le `data` n'arrive qu'à l'ouverture.

### Pipeline d'une écriture

Chaque mutation suit le même enchaînement. Sauter une étape, c'est la fuite de données garantie.

```
1. requireAuth               → 401 si l'en-tête Authorization est absent ou le JWT invalide
2. Validation Zod du corps   → 400 avec le détail des champs en échec
3. Chargement via le service, avec le userId dans la signature (§6)
                             → 404 si absent OU si la ressource appartient à un autre
4. Mutation via Prisma
5. Retour d'un DTO — jamais l'entité brute (le passwordHash ne sort jamais du service)
```

### Format d'erreur

Une seule forme, produite par l'`errorHandler` :

```json
{ "code": "drawing.notFound", "message": "Drawing not found." }
```

Le `code` est stable et machine-lisible ; le `message` est pour le développeur. Le client
réagit sur le `code`, jamais en parsant le texte — c'est ce qui permettrait d'ajouter une
traduction plus tard sans rien casser.

---

## 12. Authentification

**JWT signé (HS256), stocké en `localStorage`, transmis dans l'en-tête
`Authorization: Bearer`.** Email + mot de passe, haché avec bcrypt (coût 10).

### Pourquoi ce choix, et ce qu'il coûte

C'est le pattern le plus répandu pour une SPA devant une API sans état, et celui que le
développeur maîtrise. Sur un exercice dont le critère explicite est *« il est important que
vous compreniez le code que vous produisez »*, travailler dans un pattern connu vaut mieux
qu'en découvrir un autre pendant la semaine : le temps gagné va au canvas, qui est le vrai
sujet.

Il a aussi deux propriétés qui vont bien à cette architecture : **l'API reste sans état et
indépendante du navigateur** — le même endpoint servirait un client mobile ou un client tiers
sans rien changer — et **le transport est universel**, là où un cookie est une mécanique
propre au navigateur.

**Le coût est réel et il est assumé : un jeton en `localStorage` est lisible par n'importe
quel script de la page.** Une faille XSS, et l'attaquant repart avec un jeton portable,
valable sept jours, utilisable depuis chez lui. Un cookie `httpOnly` fermerait ce vecteur —
au prix d'une exposition au CSRF, laquelle se neutralise avec un seul attribut
(`sameSite: "lax"`), alors que le vol de jeton en `localStorage` n'a aucune parade
équivalente.

Le compromis se tient ici parce que l'application ne manipule aucune donnée sensible — des
dessins — et que la surface XSS est réduite par construction (voir ci-dessous). Il ne se
tiendrait pas sur une application bancaire ou médicale.

> **La condition qui ferait basculer la décision**, et c'est elle qu'il faut savoir énoncer :
> dès que l'application afficherait du contenu produit par d'autres utilisateurs sous forme de
> HTML, ou manipulerait des données sensibles, le cookie `httpOnly` redeviendrait le bon
> choix. Le changement est d'ailleurs peu coûteux : le jeton n'est lu qu'à **un seul endroit**
> côté serveur, dans `requireAuth`, et un middleware peut accepter les deux transports en
> trois lignes.
>
> ```ts
> const token = req.headers.authorization?.replace("Bearer ", "")
>             ?? req.cookies?.token;
> ```
>
> On ne l'écrit pas maintenant — ce serait de l'anticipation ([§4 règle 7](#règle-7--ne-pas-anticiper-les-paliers)) —
> mais le savoir transforme « et si ça devait évoluer ? » en réponse d'une phrase.

### Ce qui réduit réellement le risque XSS

Puisque le jeton est exposé au JavaScript de la page, les mesures qui limitent l'exécution de
JavaScript hostile ne sont pas optionnelles :

- **Aucun `v-html`, nulle part.** Vue échappe tout par défaut via `{{ }}` ; `v-html` est
  précisément la porte d'entrée du XSS. Le projet n'en contient aucun, et c'est une règle
  vérifiable en relecture ([§18](#18-règles-dingénierie) règle 27).
- **Aucun contenu utilisateur rendu en HTML.** Un titre de dessin est du texte, affiché comme
  du texte. Le seul champ libre de l'application est ce titre, borné à 80 caractères.
- **Aucune dépendance frontend au-delà du socle Vue** ([§5](#5-architecture-système)). Chaque
  bibliothèque tierce est du JavaScript exécuté dans la page, donc une surface de plus.
- **Durée de vie du jeton à 7 jours**, pas davantage, et `logout` l'efface.

### Pourquoi un JWT et pas une session serveur

Avec un seul serveur et une base déjà présente, une session en base serait tout aussi
valable — et même plus simple à révoquer. Le JWT est retenu parce qu'il **ne demande aucun
stockage de session** et se vérifie par une signature. Le prix payé est réel : **un jeton émis
n'est pas révocable avant son expiration**. Sur une application de dessin, c'est acceptable ;
sur une application traitant des données sensibles, ce ne le serait pas.

### Pas de refresh token

Un couple access court + refresh long sert à réduire la fenêtre d'exploitation d'un jeton
volé. Ajouter ce mécanisme doublerait la surface de code d'authentification pour un gain
marginal sur un exercice d'une semaine. C'est — avec le passage au cookie `httpOnly` — la
première chose à ajouter si le projet devenait réel.

### Le client stocke le jeton, mais ne lui fait jamais confiance

Le payload d'un JWT est en base64, pas chiffré : **n'importe qui peut le lire, donc il ne
prouve rien côté client**. Le frontend peut y lire `exp` pour se déconnecter proprement à
l'expiration, mais il ne déduit **jamais** de son contenu qu'il est administrateur.

Au démarrage de l'application, si un jeton est présent en `localStorage`, le client appelle
`GET /api/auth/me`. C'est le serveur — seul détenteur du secret de signature — qui confirme
l'identité et le rôle. Un `401` sur n'importe quel appel vide le store et redirige vers
`/login`.

```ts
// stores/auth.ts — esquisse
const TOKEN_KEY = "soniclight.token";

// localStorage peut lever (navigation privée, stockage bloqué) : jamais d'accès nu.
function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
```

Corollaire : **`POST /api/auth/logout` n'existe pas.** Avec un jeton sans état stocké côté
client, la déconnexion est un `removeItem` — un appel serveur ne révoquerait rien et
donnerait l'illusion inverse. C'est une simplification réelle du choix retenu, et un bon
exemple de cohérence entre une décision et ses conséquences.

### Le transport des appels

Toutes les requêtes passent par un unique wrapper dans `src/api/http.ts`, seul endroit où
l'en-tête est injecté. Aucun composant, aucune vue n'ajoute d'en-tête à la main.

```ts
// api/http.ts — le seul endroit qui connaît le jeton
const token = readToken();
const res = await fetch(path, {
  ...init,
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  },
});
```

### Pas de proxy Vite : le cross-origin est assumé de bout en bout

**Il n'y a délibérément pas de proxy dans `vite.config.ts`.** Le client appelle l'API par son
URL absolue, lue dans `VITE_API_URL`, en développement comme en production.

Un proxy Vite ferait que le navigateur ne voit qu'une seule origine en développement — donc
zéro CORS, donc un confort réel. Mais le front et l'API sont **déployés séparément** : un
build statique sur un CDN d'un côté, un conteneur de l'autre, deux domaines distincts
([§16](#16-docker-déploiement--variables-denvironnement)). Un proxy modéliserait donc en
développement une topologie qui n'existera jamais en production, et repousserait la première
erreur CORS au moment du déploiement — c'est-à-dire au pire moment possible.

**Développer dans la même configuration que celle qu'on déploie coûte une configuration CORS
et évite une classe entière de mauvaises surprises.** C'est aussi ce qui rend le transport par
en-tête `Bearer` pertinent plutôt qu'arbitraire : un cookie, sur deux origines réelles,
exigerait `SameSite=None`, donc `Secure`, donc HTTPS des deux côtés, plus `credentials: true`
avec une liste d'origines exacte — le joker `*` étant interdit dès qu'il y a des credentials.
Le choix du stockage et le choix du déploiement se tiennent l'un l'autre.

```ts
// backend/src/index.ts
app.use(cors({ origin: env.CLIENT_ORIGINS }));   // liste explicite, jamais "*"
```

```ts
// frontend/src/api/http.ts
const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { /* … */ });
```

`credentials: true` n'est **pas** activé : plus aucun cookie ne circule, l'en-tête
`Authorization` suffit.

> **Le préliminaire CORS est réel, pas théorique.** Un en-tête `Authorization` rend la requête
> « non simple », donc le navigateur envoie un `OPTIONS` avant chaque appel. Le paquet `cors`
> y répond automatiquement — mais si l'origine ne figure pas exactement dans la liste (un
> `https://` oublié, un slash final de trop), l'échec se manifeste comme une erreur réseau
> opaque côté client, sans rien dans les logs du serveur. C'est le premier endroit à regarder
> quand un appel marche en `curl` et échoue dans le navigateur.

### Les gardes

- `requireAuth` : lit l'en-tête `Authorization`, vérifie la signature, pose
  `req.user = { id, role }`, sinon 401.
- `requireAdmin` : s'applique **après** `requireAuth`, vérifie `role === "ADMIN"`, sinon 403.
- Le rôle vient **du jeton vérifié côté serveur**, jamais d'un champ envoyé par le client.
- Côté Vue : un `beforeEach` du router protège `/admin` — **confort d'interface, pas
  sécurité**. La vraie barrière est le middleware serveur, et elle doit être testée comme telle.

---

## 13. Canvas — capture et rejeu

### Capture

```
pointerdown  → ouvrir un trait, capturer le premier point, setPointerCapture()
pointermove  → si la distance au point précédent > seuil, ajouter le point + tracer le segment
pointerup    → fermer le trait, le pousser dans la pile
```

| Décision                                     | Pourquoi                                                                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pointer*` et non `mouse*` / `touch*`        | Un seul jeu d'événements couvre souris, doigt et stylet. Gérer les deux familles séparément est la source de bugs tactiles la plus courante   |
| `setPointerCapture()` sur `pointerdown`      | Le trait continue même si le curseur sort du canvas, et le `pointerup` arrive toujours. Sans ça, un trait reste « ouvert » indéfiniment        |
| `touch-action: none` en CSS sur le canvas    | Sans cette ligne, dessiner au doigt fait défiler la page au lieu de tracer. Une ligne de CSS, un bug mobile en moins                           |
| Backing store × `devicePixelRatio`           | `canvas.width = cssWidth * dpr` puis `ctx.scale(dpr, dpr)`. Sans ça, le trait est flou sur tout écran haute densité                            |
| `lineCap` et `lineJoin` en `"round"`         | Sans arrondi, un trait rapide montre ses segments et ses angles. Deux propriétés pour un rendu de crayon crédible                              |
| Pile d'annulation en mémoire                 | `undo` retire le dernier trait et redessine tout. À quelques centaines de traits, redessiner est instantané — inutile de gérer un cache d'image |

### Rejeu

Le rendu et le rejeu partagent **la même fonction** : `renderStrokes(ctx, data, box, upTo)`,
où `upTo` est le nombre de points à tracer. Rendre un dessin complet, c'est appeler cette
fonction une fois avec le total ; le rejouer, c'est l'appeler dans une boucle
`requestAnimationFrame` avec un `upTo` croissant.

Une seule fonction de rendu, trois usages : le canvas d'édition, la vue de lecture, la
vignette. C'est la seule factorisation vraiment justifiée du frontend.

`box` est calculée depuis `aspectRatio` ([§9](#9-le-format-dun-dessin)) : le dessin est
centré dans le conteneur disponible en respectant sa proportion d'origine, avec des marges
si nécessaire, plutôt qu'étiré.

---

## 14. Sonification (bonus)

> **Palier P2 — aucune ligne avant que le P0 ne soit terminé et commité**
> ([§4 règle 7](#règle-7--ne-pas-anticiper-les-paliers)).

### Filiation — Kandinsky

La référence directe est **[Kandinsky](https://musiclab.chromeexperiments.com/Kandinsky/)**, du
Chrome Music Lab de Google : on dessine, le dessin est lu de gauche à droite, et ce qu'on a
tracé devient du son. C'est le même geste que SonicLight, et il vaut d'aller le manipuler avant
d'écrire une ligne de code.

Derrière l'expérience il y a **Wassily Kandinsky** lui-même, qui percevait des correspondances
entre couleur, forme et son — il associait par exemple le jaune à une trompette, le bleu à un
violoncelle — et a théorisé ces correspondances dans *Du spirituel dans l'art* (1911). Ce n'est
pas de l'habillage : ça donne une **généalogie** au mapping choisi ici, plutôt qu'un choix
arbitraire. Sur un entretien à l'IRCAM, savoir d'où vient l'idée de faire correspondre une
teinte à un timbre vaut mieux que de l'avoir inventée dans son coin.

> **Ce qu'on prend, et ce qu'on ne prend pas.** On reprend la tête de lecture horizontale, la
> lecture en boucle, et surtout le fait qu'**on entend quelque chose immédiatement, sans rien
> régler**. On ne reprend **pas** la reconnaissance de formes (Kandinsky distingue traits,
> points et formes fermées, et leur attribue des instruments différents) : c'est un problème de
> vision par ordinateur, hors de portée du temps imparti, et le mapping du §14 s'en passe très
> bien. Savoir nommer cette limite est une meilleure réponse que d'essayer de la franchir.

### Le principe

Le dessin est lu **de gauche à droite comme une partition**. Une tête de lecture balaie
l'axe `x` sur une durée fixe ; chaque point de trait qu'elle croise déclenche une note.

**La lecture est en boucle**, pas en un seul passage. C'est trois lignes de plus, et ça change
la nature du produit : une lecture unique donne l'impression d'un fichier qu'on écoute, une
boucle donne l'impression d'un instrument qu'on manipule — on peut modifier le dessin en
écoutant. C'est la leçon la plus rentable à prendre chez Kandinsky.

```mermaid
flowchart LR
    A["Point du trait<br/>(x, y, couleur, épaisseur)"] --> B["x → temps<br/>position de la tête de lecture"]
    A --> C["y → hauteur<br/>quantifiée sur une gamme pentatonique"]
    A --> D["épaisseur → gain"]
    A --> E["teinte → timbre<br/>type d'oscillateur"]
    B & C & D & E --> F["OscillatorNode → GainNode → destination"]
```

### Le mapping

| Dimension du dessin | Paramètre sonore     | Détail                                                                    |
| ------------------- | -------------------- | ------------------------------------------------------------------------- |
| `x` ∈ [0, 1]        | Temps                | Position dans une lecture de durée fixe (8 s par défaut)                 |
| `y` ∈ [0, 1]        | Hauteur              | Inversé (haut = aigu), **quantifié sur une gamme pentatonique**          |
| `width`             | Gain                 | Un trait épais sonne plus fort                                            |
| `color` (teinte)    | Forme d'onde         | `sine` · `triangle` · `square` · `sawtooth` selon le secteur de teinte    |

### Pourquoi la quantification pentatonique

C'est le choix le plus intéressant à défendre. Un mapping linéaire `y → fréquence` produit
un glissando continu : tout dessin sonne comme une sirène, et deux dessins différents se
ressemblent. En projetant la hauteur sur une **gamme pentatonique mineure** — cinq degrés
par octave, sans demi-ton adjacent — n'importe quelle combinaison de notes reste consonante.
Le résultat est musical quel que soit le dessin, ce qui est exactement le but d'un produit
qui s'appelle SonicLight.

```ts
// Pentatonique mineure : 5 degrés par octave, aucun intervalle dissonant possible
const SCALE = [0, 3, 5, 7, 10];       // demi-tons depuis la tonique
const ROOT = 220;                      // La3
const OCTAVES = 3;

function pitchFromY(y: number): number {
  const step = Math.round((1 - y) * (SCALE.length * OCTAVES - 1));
  const semitones = SCALE[step % SCALE.length] + 12 * Math.floor(step / SCALE.length);
  return ROOT * Math.pow(2, semitones / 12);
}
```

C'est une décision **esthétique**, pas technique — et elle est défendable comme telle :
sur un produit de l'IRCAM, assumer un parti pris musical et savoir l'expliquer vaut mieux
qu'un mapping neutre choisi par défaut.

### Les trois pièges de la Web Audio API

1. **`AudioContext` ne démarre pas sans geste utilisateur.** Les navigateurs bloquent
   l'audio automatique. Le contexte est créé — ou repris par `ctx.resume()` — au premier
   clic sur « Écouter », jamais au montage du composant.
2. **Un `OscillatorNode` ne se réutilise pas.** Il est à usage unique : `start()`, `stop()`,
   jeté. Une note = un oscillateur créé à la volée, et on le déconnecte à la fin pour ne pas
   accumuler des nœuds morts.
3. **Une enveloppe est obligatoire.** Couper un oscillateur net produit un clic audible.
   Une attaque et une extinction courtes — `setValueAtTime` puis
   `exponentialRampToValueAtTime` sur le gain — suffisent à rendre le tout écoutable.

### Ce qu'on ne fait pas

Pas de réverbération ni d'effets · pas de polyphonie non bornée (limite dure au nombre de
notes simultanées, sinon un dessin dense sature) · pas de synchronisation à l'échantillon
près — un `requestAnimationFrame` pilotant la tête de lecture visuelle et un ordonnancement
audio à ~100 ms d'avance suffisent largement · pas d'export audio.

---

## 15. UI/UX & design tokens

### Principes

Sombre, sobre, l'interface disparaît derrière le dessin.

**Tailwind 4 + DaisyUI 5, avec un thème sur mesure.** Deux dépendances de développement, aucun
runtime, aucun composant JavaScript.

| Zone                                                  | Traitement                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Boutons, champs, cartes, modale, badges, alertes      | **DaisyUI** — du générique, aucune raison de le réécrire                |
| Canvas, barre d'outils, palette, vue de lecture       | **CSS écrit à la main** — c'est là que vit l'identité du produit         |

> **Ce partage est la décision, pas le choix de l'outil.** DaisyUI là où le travail est
> générique, du CSS à la main là où il porte le produit. Adopter une bibliothèque en bloc
> donnerait une application de gestion ; la refuser en bloc ferait réécrire des états de focus
> et des styles de champ sans rien y gagner.

**Pourquoi Tailwind plutôt que du CSS écrit entièrement à la main.** Tailwind n'est pas une
bibliothèque de composants, c'est une méthode d'écriture du CSS : aucun runtime, et la sortie
ne contient que les classes réellement utilisées. En v4 la configuration vit dans le CSS via
`@theme` — les tokens sont à un seul endroit, et l'espacement comme les couleurs deviennent
cohérents par construction plutôt que par discipline.

**Pourquoi DaisyUI plutôt qu'une bibliothèque de composants Vue.** DaisyUI est un plugin
Tailwind qui émet du CSS : zéro JavaScript, rien à importer, aucune API de composant à
apprendre. Les templates restent du Vue ordinaire. Une bibliothèque JS demanderait de savoir
expliquer son cycle de vie et ses props — un plugin CSS s'explique en une phrase, ce qui
compte vu le critère d'évaluation.

**Pourquoi un thème sur mesure et pas un thème fourni.** Livrer l'apparence par défaut d'un
outil, c'est livrer l'apparence de personne. DaisyUI 5 permet de définir un thème directement
dans le CSS (`@plugin "daisyui/theme"`) avec ses propres couleurs sémantiques : on garde les
composants, on change l'identité. C'est précisément ce qu'une bibliothèque JS lourde ne
laisserait pas faire à ce coût.

> **Écartés, et pourquoi :** PrimeVue (familier venant de PrimeNG, mais look d'application de
> gestion, et PrimeTek a fait passer PrimeNG en licence commerciale à partir de la v22 — à
> vérifier côté Vue avant tout engagement) ; Vuetify et Quasar (surdimensionnés d'un ordre de
> grandeur) ; shadcn-vue (le meilleur compromis si l'on veut posséder le code de ses
> composants, mais Tailwind + Reka UI + un CLI, plus de mise en place que de gain sur cinq
> écrans).

### Parti pris & références

Aucune maquette n'a été fournie. Sur ce terrain, le jury évalue la **cohérence**, pas la
beauté — et le moyen le plus sûr d'en produire une est de tenir **une seule contrainte forte**
de bout en bout :

> **Rien n'est coloré à l'écran, sauf le dessin.** Toute l'interface est en niveaux de gris,
> plus un accent unique. Les seules couleurs saturées de l'application sont celles des traits.

Cette règle est perceptible par un relecteur, se justifie en une phrase, et tranche
automatiquement les cent micro-décisions qu'on n'a pas le temps d'arbitrer une par une. Trois
corollaires en découlent :

- **Rien ne flotte au-dessus du canvas.** Aucun panneau, aucune infobulle, aucune barre
  d'outils par-dessus la zone de dessin.
- **Le monospace est réservé au technique et au méta** — compteurs, noms d'événements,
  horodatages. Le reste est en sans-serif.
- **La seule animation du produit est le rejeu**, parce qu'elle signifie quelque chose. Tout le
  reste est immobile.

**Références, et ce qu'on prend à chacune :**

| Référence                                                                       | Ce qu'on en tire                                                                                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Kandinsky](https://musiclab.chromeexperiments.com/Kandinsky/) (Chrome Music Lab) | **La référence centrale** — dessin → son, tête de lecture, lecture immédiate sans réglage ([§14](#14-sonification-bonus)) |
| [Chrome Music Lab](https://musiclab.chromeexperiments.com/Experiments), *Song Maker* | On entend quelque chose avant d'avoir rien configuré. Zéro écran de paramètres              |
| [Ableton Learning Synths](https://learningsynths.ableton.com/)                    | Le pôle **instrument** : manipulation directe, cibles généreuses, aucun chrome — pour l'écran de dessin |
| [Padlet](https://padlet.com/) · [Are.na](https://www.are.na/)                     | Le pôle **tableau** : grille calme, le contenu porte tout — pour la galerie et la vue admin        |
| [tldraw](https://tldraw.com/) · [Excalidraw](https://excalidraw.com/)             | L'UX de canvas : traitement de la barre d'outils, chrome qui s'efface pendant le tracé             |
| [Teenage Engineering](https://teenage.engineering/)                              | Le vocabulaire visuel : étiquettes en monospace, retenue extrême, objets qui ressemblent à des instruments |

> Les deux premières références tirent vers l'**instrument**, les deux suivantes vers le
> **tableau**. Ce n'est pas une contradiction mais une répartition : l'écran de dessin suit le
> premier pôle, la galerie et l'admin suivent le second. Savoir nommer cette répartition est
> une réponse d'entretien à part entière.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  ◈ SonicLight        Dessiner   Mon dessin    Admin    👤  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│     ┌────────────────────────────────────────────────┐     │
│     │                                                │     │
│     │                   CANVAS                       │     │
│     │                                                │     │
│     └────────────────────────────────────────────────┘     │
│                                                            │
│   ● ● ● ● ● ●      ▁▂▃▅      ↶ Annuler   ✕ Effacer         │
│   couleurs       épaisseur                    [ Enregistrer ]│
└────────────────────────────────────────────────────────────┘
```

- **Barre d'outils sous le canvas**, jamais par-dessus : un outil flottant finit toujours
  sous le curseur au moment où l'on dessine.
- **Palette fermée de six couleurs**, pas de sélecteur libre. Une palette restreinte donne
  une cohérence visuelle à la galerie admin, et rend le mapping teinte → timbre
  ([§14](#14-sonification-bonus)) lisible plutôt qu'aléatoire.
- **Enregistrer ouvre une modale** demandant le titre. Pas de champ de titre permanent qui
  encombre l'écran de dessin.
- **Galerie en grille de cartes**, chacune rendant le dessin sur un petit canvas.
- **Vue admin = la même grille**, plus le nom de l'auteur sur chaque carte et un tri par date.
  Réutiliser le composant de carte est la bonne réponse : l'admin ne mérite pas une seconde
  interface.

### La modale repose sur `<dialog>`, pas sur une div

La modale de DaisyUI s'appuie sur l'élément **`<dialog>` natif**, ouvert par `showModal()`.
C'est ce qui règle gratuitement le seul vrai problème d'accessibilité du projet : piège à
focus, restitution du focus à la fermeture, touche `Échap`, fond semi-opaque — tout est
assuré par le navigateur.

Réécrire ça à la main, c'est quatre-vingts lignes qu'on rate subtilement. C'est aussi la
raison pour laquelle DaisyUI et le choix « pas de bibliothèque JS » se renforcent au lieu de
se concurrencer.

### Six décisions d'UX qui pèsent plus que le choix de l'outil

1. **Le rejeu se déclenche à l'ouverture d'un dessin, pas au clic.** Le dessin se reconstruit
   trait par trait, automatiquement, en deux secondes. C'est l'effet marquant du projet, et il
   démontre à lui seul qu'on a stocké de la géométrie et non une image. Le cacher derrière un
   bouton, c'est le perdre.
2. **Sombre par défaut.** Les couleurs de trait ressortent, et c'est la convention des outils
   créatifs.
3. **Barre d'outils sous le canvas**, jamais par-dessus (voir plus haut).
4. **Raccourcis clavier** : `Cmd/Ctrl+Z` annule, `Échap` ferme la modale, `Entrée` valide le
   titre. Trois lignes de code, et c'est ce qui sépare une démonstration d'un outil.
5. **États vides travaillés.** « Mon dessin » pour un nouvel utilisateur, et la liste admin
   sans aucun dessin, sont des écrans réellement vus. Un cadre en pointillés avec « Aucun
   dessin — commencez à dessiner » vaut mieux qu'une page vide.
6. **Pas de scintillement au chargement.** Les vignettes se rendent depuis les traits : prévoir
   un squelette à la hauteur finale, sinon la grille saute quand les données arrivent.

### Design tokens

Un seul fichier, `frontend/src/style.css`, sans fichier de configuration JavaScript :

```css
@import "tailwindcss";
@plugin "daisyui";

/* Thème DaisyUI sur mesure — ce qui évite de livrer l'apparence par défaut de l'outil. */
@plugin "daisyui/theme" {
  name: "soniclight";
  default: true;
  color-scheme: dark;

  --color-base-100:  #12121a;   /* surfaces (cartes, modale) */
  --color-base-200:  #0d0d14;   /* fond de page */
  --color-base-300:  #2a2a36;   /* bordures */
  --color-base-content: #e8e8ef;
  --color-primary:   #7c5cff;
  --color-primary-content: #ffffff;

  --radius-box:   0.75rem;
  --radius-field: 0.5rem;
}

/* Tokens propres au canvas, hors du vocabulaire DaisyUI. */
@theme {
  --color-canvas: #ffffff;
  --color-ink:    #12121a;
}
```

> **Les couleurs de trait ne sont pas des tokens de thème.** Elles sont **des données** : elles
> arrivent du `jsonb` d'un dessin et se posent en variable CSS en ligne
> (`:style="{ '--stroke': stroke.color }"`), jamais en classe générée dynamiquement — une
> classe construite à l'exécution n'existe pas dans la sortie de Tailwind, qui ne connaît que
> ce qu'il a lu dans les fichiers source. C'est le piège classique, et il est silencieux : la
> couleur disparaît en production sans erreur.

Palette de dessin — six teintes réparties sur le cercle chromatique, pour que le mapping
teinte → timbre distingue clairement les quatre formes d'onde :

| Couleur | Hex       | Forme d'onde associée |
| ------- | --------- | --------------------- |
| Rouge   | `#e11d48` | `sawtooth`            |
| Orange  | `#f97316` | `sawtooth`            |
| Jaune   | `#eab308` | `square`              |
| Vert    | `#22c55e` | `triangle`            |
| Cyan    | `#06b6d4` | `sine`                |
| Violet  | `#8b5cf6` | `sine`                |

### Accessibilité

Le minimum, mais fait : focus visible sur tous les contrôles, `aria-label` sur chaque bouton
icône seul, palette de couleurs annoncée par son nom et non par sa seule pastille, contraste
du texte vérifié sur le fond sombre.

Le canvas lui-même n'est pas accessible au clavier — c'est une limite réelle du produit, à
citer honnêtement en entretien plutôt qu'à masquer.

---

## 16. Docker, déploiement & variables d'environnement

### `docker compose` — deux services, pas trois

```yaml
services:
  db:      # postgres:16-alpine, volume nommé, healthcheck pg_isready
  server:  # build ./backend, depends_on db (condition: service_healthy), migrate deploy + seed (dev uniquement)
```

**Il n'y a délibérément pas de conteneur pour le client.** C'est une décision, pas un oubli,
et elle se défend en une phrase : le `Dockerfile` du serveur sera **réellement utilisé en
production** — un hébergeur de conteneurs le consomme tel quel — tandis qu'un `Dockerfile` du
client ne servirait jamais, puisque le front part sur un CDN qui ingère le `dist/` directement.

Trois raisons s'empilent derrière :

- **La sortie du build est statique.** `npm run build` produit du HTML, du CSS et du JS.
  Ajouter nginx dans un conteneur, c'est mettre un serveur applicatif sur un problème qui
  n'en a pas.
- **Ça ferait une troisième topologie.** Développement = serveur Vite ; production = CDN ;
  Docker = nginx. Trois façons de servir les mêmes fichiers, dont deux seulement existent —
  exactement le défaut pour lequel le proxy Vite a été écarté ([§12](#12-authentification)).
- **Ça supprime le piège du build arg.** Une variable `VITE_*` est inlinée au moment du
  build, pas lue à l'exécution. Construire une image du client obligerait à lui passer
  `VITE_API_URL` en `build arg` ; sans image, le problème disparaît.

Docker garde donc son utilité là où elle est réelle : reproduire **Postgres**, qu'un relecteur
n'a pas forcément installé en version 16, et empaqueter l'API telle qu'elle sera déployée. Le
bonus Docker de l'énoncé reste coché — un `docker compose up` qui donne une API fonctionnelle
avec sa base, c'est du Docker.

| Point d'attention                                         | Pourquoi                                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `healthcheck` sur `db` + `condition: service_healthy`      | `depends_on` seul attend que le conteneur démarre, pas que Postgres accepte les connexions — l'API planterait au premier démarrage |
| `prisma migrate deploy` au lancement du serveur, pas `dev` | `deploy` applique les migrations existantes sans jamais en générer ni réinitialiser la base           |
| Le seed est gardé par `NODE_ENV !== "production"`          | Le même point d'entrée déployé tel quel insérerait des comptes de démonstration, mots de passe connus et versionnés, dans la base de production |
| En production, les migrations passent par le hook de release de l'hébergeur, pas par le démarrage du conteneur | Une migration qui échoue doit annuler le déploiement, pas mettre l'application en boucle de redémarrage |
| Build multi-étapes côté serveur                            | Une étape compile le TypeScript, l'image finale ne garde que `dist/` et les dépendances de production  |
| Volume nommé pour les données Postgres                     | `docker compose down` ne perd pas les dessins ; `down -v` les efface volontairement                   |
| `.dockerignore` dans `backend/`                             | Sans lui, `node_modules` part dans le contexte de build et le rend dix fois plus lent                  |

### Déploiement — front et API séparés

| Brique      | Cible                                                  | Mécanisme                                                    |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **Front**   | CDN statique (Vercel, Netlify ou GitHub Pages)         | Build Vite → `dist/` publié                                  |
| **API**     | Hébergeur de conteneurs (Railway, Render, Fly.io)      | Le `Dockerfile` de `backend/`                                 |
| **Base**    | Postgres managé (celui de l'hébergeur, ou Neon)        | `DATABASE_URL` fournie par l'hébergeur                       |

Deux domaines distincts, donc **un vrai cross-origin en production** — ce que la configuration
de développement reproduit déjà à l'identique ([§12](#12-authentification)).

**Les trois pièges du déploiement, dans l'ordre où ils se présentent :**

1. **`VITE_API_URL` est inliné au build, pas lu à l'exécution.** Le définir dans les variables
   d'environnement du service après coup ne change rien : il faut rebuilder. C'est l'erreur
   la plus fréquente de ce montage, et elle se manifeste par un front qui appelle
   `undefined/api/drawing`.
2. **GitHub Pages demande deux réglages que Vercel et Netlify font seuls.** Le site est servi
   depuis un sous-chemin (`/nom-du-depot/`), donc `base` doit être renseigné dans
   `vite.config.ts`, sinon aucun asset ne se charge. Et une SPA a besoin d'un repli pour les
   routes profondes : sur Pages, ça se règle en copiant `index.html` en `404.html` ; Vercel et
   Netlify ont un réglage natif (`rewrites` / `_redirects`). **Recommandation : Vercel ou
   Netlify**, qui suppriment les deux problèmes et déploient sur simple `git push`.
3. **`CLIENT_ORIGINS` doit contenir l'origine exacte** du front déployé — schéma compris, sans
   slash final. Une liste, pas une valeur unique : l'origine de développement et celle de
   production y coexistent.

Sur les paliers gratuits, le service API et la base managée se mettent en veille après
inactivité : le premier appel après une pause prend quelques secondes. Sans conséquence
fonctionnelle, mais à mentionner dans le README pour qu'un relecteur ne prenne pas la latence
initiale pour un défaut.

### CI — GitHub Actions

Un workflow, `.github/workflows/ci.yml`, déclenché sur chaque `push` et chaque
`pull_request` :

```yaml
jobs:
  server:   # npm ci → npx prisma generate → npx tsc --noEmit → npm test
  client:   # npm ci → npm run type-check → npm run build
```

| Point d'attention                                | Pourquoi                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `npx prisma generate` avant le typecheck serveur | Sans le client généré, `tsc` échoue sur des types absents — l'erreur n'indique jamais la cause  |
| `npm ci`, jamais `npm install`                   | `ci` respecte le lockfile à la lettre ; `install` peut le réécrire et masquer une dérive        |
| `package-lock.json` généré sur la même plateforme| Un lockfile produit sur macOS peut omettre des résolutions Linux et faire échouer `npm ci` en CI |
| Cache npm via `actions/setup-node`               | `cache: "npm"` avec le chemin du lockfile — quelques secondes par run, gratuit                   |
| Matrice inutile ici                              | Une seule version de Node (22 LTS). Tester trois versions sur un exercice serait de la cérémonie |

### CD — le déploiement de l'API et les migrations

Le CD du backend pose une question que le front n'a pas : **où tournent les migrations de
base de données ?** C'est le cœur du sujet, bien avant le choix de l'outil qui déclenche le
déploiement.

#### Où tournent `prisma migrate deploy` — trois emplacements, un seul recommandé

| Emplacement                               | Verdict | Pourquoi                                                                                                                                                                  |
| ----------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Au **démarrage du conteneur**             | ❌       | Tourne à chaque redémarrage et sur chaque réplique. Surtout : une migration qui échoue fait planter l'application **en boucle**, au lieu d'échouer une fois, proprement       |
| Dans un **job GitHub Actions**            | ⚠️       | Marche, mais oblige à exposer la base de production aux plages d'adresses de GitHub et à stocker `DATABASE_URL` en secret de dépôt. Une surface d'exposition pour rien        |
| Dans le **hook de release de l'hébergeur**| ✅       | `release_command` chez Fly.io, *pre-deploy command* chez Render, équivalent chez Railway. Tourne une fois, dans le réseau de l'hébergeur, **et fait échouer le déploiement** si la migration échoue — l'ancienne version reste en ligne |

Le troisième est le bon, et l'argument tient en une phrase : **une migration qui échoue doit
annuler le déploiement, pas mettre l'application en boucle de redémarrage.**

> `prisma migrate deploy` est idempotent et prend un verrou consultatif Postgres, donc deux
> exécutions concurrentes ne se marchent pas dessus. Ce n'est pas la concurrence le problème
> du démarrage-conteneur, c'est le mode d'échec.

#### Le seed ne tourne **jamais** en production

Le `docker-compose` local lance `migrate deploy` **puis** le seed. Le déploiement lance
`migrate deploy` **seul**.

C'est la distinction à ne pas rater : la même image, déployée avec le même point d'entrée,
insérerait le compte `admin` et deux comptes de démonstration dans la base de
production — avec des mots de passe connus, écrits dans un dépôt Git. Le seed est gardé par
`NODE_ENV !== "production"`, et cette garde est du code, pas une intention.

#### Ce qui déclenche le déploiement

Même arbitrage que pour le front, et il dépend de l'hébergeur :

| Hébergeur de l'API   | Intégration Git native | Workflow Actions de déploiement |
| -------------------- | ---------------------- | --------------------------------- |
| Render, Railway      | Oui                    | **Inutile** — ce serait dupliquer |
| Fly.io               | Non                    | **Nécessaire** — `flyctl deploy`  |

Avec Render ou Railway, la CI reste le seul workflow, et le déploiement suit le `push` sur
`main`. Avec Fly.io, un second workflow devient légitime :

```yaml
# .github/workflows/deploy-api.yml
on:
  push:
    branches: [main]
    paths: ["backend/**", ".github/workflows/deploy-api.yml"]
concurrency:
  group: deploy-api          # jamais deux déploiements en vol en même temps
  cancel-in-progress: false  # on laisse finir, on n'interrompt pas un déploiement
jobs:
  deploy:
    needs: [server]          # ne déploie que si la CI est verte
    # flyctl deploy — la migration tourne dans le release_command de fly.toml
```

**Recommandation : Render ou Railway**, pour la même raison que Vercel côté front — moins de
mécanique à écrire, et un workflow Actions de déploiement qui n'apporterait rien. Fly.io reste
un choix valable si tu préfères piloter le déploiement depuis le dépôt.

> **Les paliers gratuits changent souvent** — durée de vie d'une base offerte, crédits
> mensuels, mise en veille. Vérifier les conditions du jour sur le site de l'hébergeur plutôt
> que de se fier à une comparaison écrite il y a six mois.

#### Ce qu'on n'écrit pas

Pas d'environnement de préproduction, pas de déploiement bleu-vert, pas de rollback
automatique, pas de migration réversible (`down`). Sur un exercice d'une semaine, la
réversibilité, c'est « redéployer le commit précédent » — et savoir dire que le vrai sujet en
production serait la **migration expand/contract** (ajouter une colonne, la remplir, basculer
le code, puis seulement supprimer l'ancienne) vaut mieux que de l'implémenter ici pour deux
tables.

### Variables d'environnement

```bash
# backend/.env — jamais commité ; backend/.env.example l'est
DATABASE_URL="postgresql://soniclight:soniclight@localhost:5433/soniclight"
JWT_SECRET=""              # généré : openssl rand -base64 32
JWT_EXPIRES_IN="7d"
PORT="3000"
NODE_ENV="development"
CLIENT_ORIGINS="http://localhost:5173"   # liste d'origines autorisées par CORS, séparées par des virgules
```

```bash
# frontend/.env — jamais commité ; frontend/.env.example l'est
VITE_API_URL="http://localhost:3000"     # inliné au build (voir les pièges ci-dessus)
```

Le client a donc **une** variable d'environnement, et une seule. C'est le prix du déploiement
séparé, assumé au même titre que la configuration CORS.

La configuration serveur est validée au démarrage par un schéma Zod dans `lib/env.ts` : une
variable manquante fait échouer le boot avec un message clair, plutôt que de produire un
`undefined` qui se manifestera en `JWT_SECRET` vide et en jetons signés avec une clé vide.

---

## 17. Plan de commits

Git est un critère d'évaluation. L'historique cible, dans l'ordre :

| #   | Commit                                                        | Contenu                                           |
| --- | ------------------------------------------------------------- | ------------------------------------------------- |
| 1   | `chore: init repo, gitignore, readme skeleton`                | Le squelette. **Premier commit dès l'heure 1**    |
| 2   | `chore(server): scaffold express + typescript`                | Le serveur répond sur `/api/health`               |
| 3   | `chore(db): add docker compose with postgres`                 | La base démarre                                   |
| 4   | `feat(db): add user and drawing models`                       | Schéma Prisma + première migration                |
| 5   | `feat(auth): register, login, logout with httpOnly jwt`       | Backend d'authentification                        |
| 6   | `feat(auth): require auth and admin middlewares`              | Les gardes                                        |
| 7   | `chore(client): scaffold vue 3 + router + pinia`              | Le front démarre, `VITE_API_URL` et CORS câblés   |
| 8   | `feat(client): login and register screens`                    | Le cycle d'authentification est bouclé de bout en bout |
| 9   | `feat(drawing): canvas capture with normalised coordinates`   | **Le cœur du projet**                             |
| 10  | `feat(drawing): color, width, undo and clear controls`        | La barre d'outils                                 |
| 11  | `feat(drawing): save or replace the user's single drawing`    | API `PUT/GET/DELETE /api/drawing`                 |
| 12  | `feat(drawing): open and render a saved drawing`              | « Retrouver son dessin »                          |
| 13  | `feat(admin): list and moderate all drawings`                 | Liste, lecture, suppression — **le P0 est complet** |
| 14  | `test(server): cover ownership isolation in drawing service`  | Les tests qui comptent                            |
| 15  | `feat(db): seed demo users and drawings`                      | Le jeu de démonstration                           |
| 16  | `feat(drawing): animate stroke-by-stroke replay`              | P1                                                |
| 17  | `chore(docker): containerise the api and its database`        | P1 — le bonus Docker (pas de conteneur client)    |
| 18  | `ci: typecheck, test and build both packages on push`         | P1b — GitHub Actions                              |
| 19  | `chore(db): gate the seed behind a non-production check`      | Avant tout déploiement, jamais après              |
| 20  | `chore(deploy): configure api, database and static front`     | P1c — migrations dans le hook de release          |
| 21  | `feat(audio): sonify drawings with the web audio api`         | P2                                                |
| 22  | `docs: document architecture choices and trade-offs`          | Le README final, avec le lien de la démo          |

> **Le commit 1 part le premier jour, pas le dernier.** Un `git log` dont tous les commits
> portent la même date à trois minutes d'intervalle contredit l'énoncé de façon visible, quelle
> que soit la qualité du code. Committer au fil de l'eau n'est pas une performance : c'est une
> trace.

> Les commits 16 à 22 sautent sans dommage si le temps manque. Les commits 1 à 15 forment un
> livrable cohérent et suffisant. Si un seul devait être sauvé parmi les bonus, ce serait le
> 20 : un lien cliquable change la façon dont le projet est reçu. Le 19 n'est pas optionnel
> dès lors que le 20 existe.

---

## 18. Règles d'ingénierie

### Collaboration

| #   | Règle                                                                                       |
| --- | ------------------------------------------------------------------------------------------- |
| 1   | Annoncer le plan avant toute étape non triviale, et attendre l'accord.                      |
| 2   | Aucun fichier que Quentin ne puisse relire d'une traite. Pas de génération en masse.        |
| 3   | Un commit par étape cohérente qui compile. Jamais de `wip`, jamais de dump final.           |
| 4   | Pas de nouvelle dépendance sans validation. La liste du [§5](#5-architecture-système) est figée. |
| 5   | `tsc --noEmit`, `npm run type-check`, `npm test`, `npm run build` passent avant de rendre la main. |
| 6   | Aucune ligne de P1 avant la fin du P0, aucune ligne de P2 avant la fin du P1.               |

### Architecture

| #   | Règle                                                                                         |
| --- | --------------------------------------------------------------------------------------------- |
| 7   | Couches à sens unique : Route → Controller → Service → Prisma.                                |
| 8   | Seul un service importe `prisma`. Un controller qui l'importe est un bug.                     |
| 9   | Un service ne connaît ni `req` ni `res` ; il lève une `AppError`, qui porte son statut.       |
| 10  | Pas de couche repository par-dessus Prisma.                                                   |
| 11  | On abstrait au troisième cas réel, pas au premier.                                            |
| 12  | Une fonction de rendu des traits, partagée par l'édition, la lecture et la vignette.          |

### Données & sécurité

| #   | Règle                                                                                              |
| --- | -------------------------------------------------------------------------------------------------- |
| 13  | Toute lecture ou écriture d'un dessin prend le `userId` en paramètre. Sans exception.              |
| 14  | L'accès admin passe par une fonction de service distincte, jamais par un `userId?` optionnel.      |
| 15  | Une ressource appartenant à un autre utilisateur renvoie **404**, jamais 403.                      |
| 16  | Tout corps de requête est validé par un schéma Zod avant d'atteindre un service.                   |
| 17  | Le `data` d'un dessin est parsé par `DrawingDataSchema`, jamais casté avec `as`.                    |
| 18  | Les coordonnées sont normalisées dans `[0, 1]`. Aucun pixel ne franchit jamais la frontière réseau. |
| 19  | `passwordHash` ne sort jamais d'un service. Les DTO de sortie sont construits explicitement.        |
| 20  | Tout changement de schéma passe par une migration Prisma générée. Jamais `db push`.                |
| 21  | `.env` n'est jamais commité. `.env.example` l'est, avec des valeurs factices.                       |
| 30  | Le seed ne s'exécute **jamais** en production : garde `NODE_ENV !== "production"` dans le code.     |
| 31  | En production, les migrations tournent dans le hook de release de l'hébergeur, jamais au démarrage du conteneur. |

### Frontend

| #   | Règle                                                                                       |
| --- | ------------------------------------------------------------------------------------------- |
| 22  | Les appels API passent tous par `api/http.ts`, qui préfixe `VITE_API_URL`. Aucune URL d'API en dur ailleurs. |
| 23  | Le canvas utilise `pointer*`, jamais `mouse*` ni `touch*`.                                  |
| 24  | Le backing store du canvas est dimensionné avec `devicePixelRatio`.                         |
| 25  | La garde de route Vue est un confort d'interface ; la sécurité est le middleware serveur.   |
| 26  | `AudioContext` n'est créé ou repris que dans un gestionnaire d'événement utilisateur.       |
| 27  | **Aucun `v-html`, nulle part.** Le jeton vit en `localStorage` : le XSS est le risque n°1 ([§12](#12-authentification)). |
| 28  | Le jeton n'est lu et injecté qu'à un seul endroit, `api/http.ts`. Tout accès à `localStorage` est protégé par un `try/catch`. |
| 29  | Le rôle affiché vient de `GET /api/auth/me`, jamais du payload du JWT décodé côté client.   |

---

## 19. Questions ouvertes

### À poser à l'IRCAM avant de développer

| #   | Question                                                                            | Hypothèse retenue en attendant                                                                                        |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Q1  | Le compte administrateur est-il attribué (seed / variable d'environnement) ou un utilisateur peut-il s'inscrire comme admin ? | Attribué au seed. Aucune escalade possible depuis l'interface                                                          |
| Q2  | Un utilisateur a-t-il **un** dessin ou **plusieurs** ? L'énoncé dit « son dessin » au singulier, puis « les dessins enregistrés par les différents utilisateurs » au pluriel | ~~Plusieurs~~ → **Un seul, remplaçable** (réponse IRCAM). `userId` unique, `PUT /api/drawing` |
| Q3  | L'admin doit-il pouvoir supprimer ou modérer, ou seulement consulter ?              | ~~Consulter seulement~~ → **Il peut modérer, notamment supprimer** (réponse IRCAM) |
| Q4  | Les dessins doivent-ils être publics entre utilisateurs, ou strictement privés hors admin ? | **Strictement privés** — hypothèse confirmée par l'IRCAM                                  |

**Réponses reçues le 17 septembre 2026** (reprises dans `@context/exercise-brief.md`). Deux
hypothèses sur trois étaient fausses : c'est exactement pour ça que la question devait être
posée avant d'écrire le code métier. Le coût du changement s'est limité à une migration,
parce qu'aucun service ni écran n'existait encore. L'IRCAM a aussi précisé que l'application
doit être **responsive** (desktop et mobile) et laissé **le mapping de sonification libre**.

### Tranchées unilatéralement — sujets d'entretien

| #   | Question                                                          | Décision                                                                                                                                       |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Q5  | Simplifier les trajectoires avec Ramer–Douglas–Peucker ?          | Non. Un filtre par distance minimale suffit et tient en cinq lignes. RDP serait la bonne évolution si le volume devenait un problème            |
| Q6  | Package partagé pour les types entre client et serveur ?          | Non. Vingt lignes dupliquées avec un en-tête explicite, plutôt qu'un workspace npm. Premier chantier si le projet grossissait                   |
| Q7  | Stocker un horodatage par point pour rejouer au tempo réel ?      | Non en P0. Le rejeu est à vitesse constante. C'est l'évolution la plus séduisante du format — et elle ne coûterait qu'un champ (`t`) de plus     |
| Q8  | Vignette PNG pré-calculée en base ?                               | Non. Rendue côté client depuis les traits. Dupliquer la source de vérité pour vingt cartes ne se justifie pas                                   |
| Q9  | Édition d'un dessin déjà enregistré ?                             | Hors périmètre. On crée, on consulte, on supprime. L'édition ouvrirait la question du versionnement, sans rapport avec ce qui est évalué        |
| Q15 | Bibliothèque de composants pour l'interface ?                     | Tailwind 4 + DaisyUI 5 avec un **thème sur mesure**, et rien d'autre. DaisyUI est un plugin purement CSS : aucun JavaScript, aucune API de composant à apprendre. Il couvre le générique (boutons, champs, cartes, modale) ; le canvas, la barre d'outils et la palette sont écrits à la main, parce que c'est là que vit l'identité du produit ([§15](#15-uiux--design-tokens)) |
| Q10 | Tests end-to-end (Playwright) ?                                   | Non. Les tests unitaires sur l'isolation par utilisateur couvrent le risque réel ; un E2E coûterait deux heures pour une couverture superficielle |
| Q11 | Déploiement en ligne d'une démonstration ?                        | **Oui.** Front statique sur CDN, API en conteneur, base managée — trois briques déployées séparément ([§16](#16-docker-déploiement--variables-denvironnement)). Un lien cliquable change la façon dont le projet est reçu : un relecteur voit le produit avant de lire le code. Budgété à 3 h, coupable en dernier recours |
| Q13 | Pipeline CI/CD complète en GitHub Actions ?                       | **CI oui, CD selon l'hébergeur.** La CI vérifie types, tests et build à chaque push — rien d'autre ne le fait. Le déclenchement du déploiement passe par l'intégration Git de l'hébergeur quand il en a une (Vercel, Render, Railway) ; un workflow Actions n'est écrit que chez Fly.io, qui n'en a pas ([§16](#16-docker-déploiement--variables-denvironnement)) |
| Q14 | Où tournent les migrations au déploiement ?                       | Dans le **hook de release de l'hébergeur**, jamais au démarrage du conteneur ni depuis un runner Actions. Au démarrage, une migration ratée fait boucler l'application ; dans un hook de release, elle échoue une fois et annule le déploiement, l'ancienne version restant en ligne. Depuis un runner, il faudrait exposer la base de production aux adresses de GitHub ([§16](#16-docker-déploiement--variables-denvironnement)) |
| Q12 | Jeton en `localStorage` ou en cookie `httpOnly` ?                 | `localStorage` + en-tête `Bearer`. Pattern standard d'une SPA devant une API sans état, maîtrisé, et qui garde l'API indépendante du navigateur. **Le risque XSS est assumé**, compensé par l'absence totale de `v-html` et de dépendance frontend tierce, et par le fait qu'aucune donnée sensible n'est manipulée. Bascule vers le cookie `httpOnly` dès que l'un de ces trois points changerait ([§12](#12-authentification)) |

---

## 20. Liens de référence

### Stack

- [Vue 3](https://vuejs.org/) · [`<script setup>`](https://vuejs.org/api/sfc-script-setup.html) · [Pinia](https://pinia.vuejs.org/) · [Vue Router](https://router.vuejs.org/)
- [Vite](https://vite.dev/) · [Variables d'environnement et modes](https://vite.dev/guide/env-and-mode) · [Déploiement d'un site statique](https://vite.dev/guide/static-deploy)
- [GitHub Actions](https://docs.github.com/actions) · [`actions/setup-node`](https://github.com/actions/setup-node)
- [CORS sur MDN](https://developer.mozilla.org/docs/Web/HTTP/CORS) · [Requêtes préliminaires](https://developer.mozilla.org/docs/Web/HTTP/CORS#preflighted_requests)
- [Express 5](https://expressjs.com/) · [Migration 4 → 5](https://expressjs.com/en/guide/migrating-5.html)
- [Prisma](https://www.prisma.io/docs) · [Champs `Json`](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) · [Migrations](https://www.prisma.io/docs/orm/prisma-migrate)
- [Zod](https://zod.dev/)

### Interface

- [Tailwind CSS 4](https://tailwindcss.com/docs) · [Configuration en CSS (`@theme`)](https://tailwindcss.com/docs/theme) · [Plugin Vite](https://tailwindcss.com/docs/installation/using-vite)
- [DaisyUI](https://daisyui.com/) · [Thèmes sur mesure](https://daisyui.com/docs/themes/) · [Modale](https://daisyui.com/components/modal/)
- [`<dialog>` sur MDN](https://developer.mozilla.org/docs/Web/HTML/Element/dialog) · [`showModal()`](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/showModal)

### Canvas & audio

- [Canvas API](https://developer.mozilla.org/docs/Web/API/Canvas_API) · [Tutoriel de dessin](https://developer.mozilla.org/docs/Web/API/Canvas_API/Tutorial)
- [Pointer Events](https://developer.mozilla.org/docs/Web/API/Pointer_events) · [`setPointerCapture`](https://developer.mozilla.org/docs/Web/API/Element/setPointerCapture)
- [Web Audio API](https://developer.mozilla.org/docs/Web/API/Web_Audio_API) · [Bonnes pratiques](https://developer.mozilla.org/docs/Web/API/Web_Audio_API/Best_practices) · [`OscillatorNode`](https://developer.mozilla.org/docs/Web/API/OscillatorNode) · [Politique d'autoplay](https://developer.mozilla.org/docs/Web/Media/Autoplay_guide)

### Sécurité

- [OWASP — Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP — JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [MDN — Cookies `SameSite`](https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

### Git

- [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/)

---

_Document vivant — à mettre à jour quand une décision change, en notant le changement en
[§19](#19-questions-ouvertes)._
