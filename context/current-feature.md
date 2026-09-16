# Current Feature

<!-- Un seul chantier à la fois. Quand celui-ci est terminé, résumer en une ligne
     dans History, puis remplacer Goals / Notes / Status par le lot suivant. -->

## Feature

Fondations — squelette, base de données, schéma

## Status

Not Started

## Goals

- Dépôt Git initialisé (`.gitignore`, `README.md` squelette) et **premier commit dans
  l'heure qui suit le démarrage**, pas en fin de parcours.
- `backend/` : Express 5 + TypeScript, `tsx watch` en développement, `GET /api/health`
  répond `200`.
- `docker-compose.yml` : PostgreSQL 16, `healthcheck` (`pg_isready`), volume nommé.
  `docker compose up -d db` suffit à démarrer la base.
- Prisma : `schema.prisma` conforme au §10 de l'overview (`User`, `Drawing`, enum `Role`),
  première migration générée et appliquée, client généré.
- `src/lib/env.ts` : validation Zod des variables d'environnement **au boot**. Une clé
  manquante fait échouer le démarrage avec un message explicite.
- `src/middleware/errorHandler.ts` : forme d'erreur unique `{ code, message }` (§11).
- `frontend/` : Vite + Vue 3 + TypeScript + Vue Router + Pinia, `VITE_API_URL` câblé,
  une page qui appelle `/api/health` **en cross-origin** et affiche le résultat — la chaîne
  complète est prouvée de bout en bout, CORS compris.
- `.github/workflows/ci.yml` : typecheck, tests et build sur les deux packages à chaque
  push. Le workflow doit être vert avant la fin de ce lot.
- `CLAUDE.md` repasse de `Status: prescriptive` à `Status: descriptive`, chaque commande
  corrigée après avoir été **réellement exécutée**.

Commits attendus : les n° 1 à 4 et 7 du plan (§17 de l'overview).

## Notes

**Hors périmètre de ce lot** — authentification, canvas, dessins, interface
d'administration. Ce lot ne produit aucune fonctionnalité visible : il produit un socle
qui démarre. C'est volontaire, et c'est ce qui permet aux lots suivants de ne parler que
de métier.

**Pièges attendus** (déjà documentés, à ne pas redécouvrir) :

- `depends_on` seul n'attend pas que Postgres accepte les connexions — il faut
  `condition: service_healthy` adossé au `healthcheck`, sinon l'API plante au premier
  démarrage.
- `prisma migrate dev`, jamais `prisma db push`.
- `.dockerignore` dans les deux packages, sinon `node_modules` part dans le contexte de
  build.
- Express 5 propage nativement les rejets de promesse vers le middleware d'erreur —
  **le vérifier** plutôt que le supposer.
- Pas de proxy Vite : le premier appel `/api/health` doit passer en cross-origin, donc
  CORS doit être configuré dès ce lot. C'est le but — découvrir CORS ici, pas au
  déploiement.
- En CI, `npx prisma generate` avant `tsc --noEmit` côté serveur, sinon l'échec porte sur
  des types absents sans jamais nommer la cause.

**Definition of done** : `docker compose up -d db`, puis `npm run dev` dans `backend/` et
dans `frontend/`, et la page d'accueil affiche la réponse de `/api/health` — en cross-origin,
sans erreur CORS. `npx tsc --noEmit` et `npx vue-tsc --noEmit` passent, et le workflow CI
est vert sur GitHub. Le tout tient en 5 à 6 commits.

## History

<!-- Tenir à jour, du plus ancien au plus récent. Une entrée par lot terminé.
     Consigner les décisions et les pièges qui mordent encore — pas les étapes de
     vérification, qui sont les mêmes à chaque fois (typecheck, build, tests). -->

_(rien encore — premier lot en attente de démarrage)_
