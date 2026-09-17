# Current Feature

<!-- Un seul chantier à la fois. Quand celui-ci est terminé, résumer en une ligne
     dans History, puis remplacer Goals / Notes / Status par le lot suivant. -->

## Feature

Authentification — inscription, connexion, identité, gardes (branche `feature/auth`)

## Status

In Progress — démarré le 17 septembre 2026.

## Goals

**Backend**

- `POST /api/auth/register` : `{ userName, password }` validé par Zod, mot de passe haché
  (bcrypt coût 10), rôle toujours `USER` — aucun champ du corps ne peut fixer le rôle.
  `409` si le `userName` est pris. Retourne `{ token, user }`.
- `POST /api/auth/login` : `401` avec **le même message** que le compte existe ou non
  (pas d'énumération des comptes). Retourne `{ token, user }`.
- `GET /api/auth/me` : l'utilisateur courant, relu **en base** — seule source fiable de
  l'identité et du rôle côté client.
- `lib/jwt.ts` : signature et vérification HS256, `JWT_SECRET` et `JWT_EXPIRES_IN` validés
  au boot dans `env.ts`.
- `requireAuth` (en-tête `Authorization: Bearer`, sinon `401`) et `requireAdmin` (après
  `requireAuth`, sinon `403`).
- DTO de sortie construit explicitement : `{ id, userName, role }` — `passwordHash` ne sort
  jamais du service.
- Tests : jeton falsifié (rôle passé à `ADMIN` sans resignature) rejeté ; `requireAdmin`
  refuse un `USER` ; mot de passe et identifiant inconnus donnent la même réponse.

**Frontend**

- `api/http.ts` injecte le jeton — seul endroit qui lit `localStorage`, toujours dans un
  `try/catch`. Un `401` vide la session.
- Store Pinia `auth` (le seul du projet) : `user`, `login`, `register`, `logout`
  (`removeItem`, aucun appel serveur), `restore` au démarrage via `/api/auth/me`.
- Vues `/login` et `/register`, gardes de route (invité / authentifié / admin) — confort
  d'interface, la sécurité est côté serveur.
- Responsive dès ces écrans (réponse IRCAM n°1).

## Notes

**Hors périmètre** — dessin, canvas, routes `/api/drawing`, interface admin (au-delà d'une
garde de route prête à servir), sonification.

**Décisions prises avant de coder** :

- **`userName`** : 3 à 30 caractères, lettres, chiffres, `_` et `-`, **converti en
  minuscules** à l'inscription et au login — « Demo » et « demo » sont le même compte, deux
  auteurs visuellement identiques ne peuvent pas coexister dans la vue admin.
- **Mot de passe** : 8 à **72** caractères — bcrypt ignore silencieusement tout ce qui dépasse
  72 octets ; au-delà, deux mots de passe différents seraient acceptés comme identiques.
- **Tailwind 4 + DaisyUI 5** installés dans ce lot, commit dédié avant les écrans : les vues
  d'auth sont écrites une fois, responsive d'emblée.
- **Tests contre une vraie base**, dans une base `soniclight_test` distincte (les tests ne
  vident jamais la base de dev ni le seed), et un service Postgres dans le job `server` de
  la CI. C'est l'infrastructure qu'exigeront les tests d'isolation des dessins.
- Dépendances : `jsonwebtoken` (liste figée) + `@types/jsonwebtoken` (types, dev).

**Pièges attendus** :

- Pas de `POST /api/auth/logout` : un jeton sans état ne se révoque pas côté serveur.
- Le payload du JWT ne prouve rien côté client : le rôle vient de `/api/auth/me`.
- Le rôle de `req.user` vient du jeton **vérifié**, jamais du corps de la requête.
- Un `userName` unique en base : la course entre deux inscriptions simultanées se règle
  sur l'erreur d'unicité Prisma (`P2002`), pas sur un `findUnique` préalable seul.
- `localStorage` lève en navigation privée : jamais d'accès nu.

**Definition of done** : avec la base seedée, `demo` / `demo1234` se connecte, recharge la
page sans perdre sa session, et n'accède pas à `/admin` ; `admin` / `admin1234` y accède ;
un nouveau compte s'inscrit et se connecte. Les gardes serveur sont testées. `tsc`, tests,
`type-check`, build et CI verts ; branche fusionnée dans `main` en `--no-ff`.

## History

<!-- Tenir à jour, du plus ancien au plus récent. Une entrée par lot terminé.
     Consigner les décisions et les pièges qui mordent encore — pas les étapes de
     vérification, qui sont les mêmes à chaque fois (typecheck, build, tests). -->

### 17/09 — Fondations ✅

Express 5 + TS (ESM) avec `/api/health`, env validé au boot, erreurs `{ code, message }` ;
Postgres 16 en compose ; schéma Prisma + migration `init` ; seed ; front qui appelle l'API
en cross-origin ; CI verte. Commits `204ba96` → `51a497a`.

Écarts au plan, et pourquoi :

- **Prisma 7, pas 6.** Adaptateur `@prisma/adapter-pg` + `pg` obligatoire ; URL et seed dans
  `prisma.config.ts` (`.env` chargé par `process.loadEnvFile()`, pas `dotenv`) ; client
  généré dans `src/generated/` (non commité), `importFileExtension = "js"` pour tourner
  sous `tsx` comme sous `node`. `migrate dev` ne régénère plus le client.
- **Postgres sur le port hôte 5433**, pour coexister avec un Postgres local déjà sur 5432.
- **`userName` unique, ni email ni `displayName`.** Aucune fonctionnalité n'a besoin d'un
  email ; un seul champ sert d'identifiant et de nom d'auteur. Overview §8/§10 mis à jour.
- **Seed avancé** (prévu au P1) : `demo` / `admin`, bcrypt coût 10, pour tester l'auth dès
  qu'elle existe. Pas de dessins.
- **Pas de `.dockerignore`** : pas encore de Dockerfile — il arrive avec lui.
- **Pas de tests front** : Vitest non installé dans `frontend/`.

Pièges qui mordent encore :

- **`npx vue-tsc --noEmit` ne vérifie rien** (tsconfig racine « solution » à `files: []`).
  Toujours `npm run type-check`. Corrigé dans toutes les docs.
- **« Failed to fetch » = API éteinte ou origine refusée** — même erreur opaque côté page ;
  la console du navigateur distingue les deux.
- **`tsx -e` compile en CommonJS** : pas de top-level await dans un one-liner, alors que les
  fichiers du projet (ESM) l'acceptent.
