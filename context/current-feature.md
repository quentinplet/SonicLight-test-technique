# Current Feature

<!-- Un seul chantier à la fois. Quand celui-ci est terminé, résumer en une ligne
     dans History, puis remplacer Goals / Notes / Status par le lot suivant. -->

## Feature

Authentification — inscription, connexion, identité, gardes (branche `feature/auth`)

## Status

Done — 17 septembre 2026, fusionné dans `main` en `--no-ff`. Prochain lot à définir.

## Goals

**Backend**

- `POST /api/auth/register` : `{ userName, password }` validé par Zod, mot de passe haché
  (bcrypt coût 10), rôle toujours `USER` — aucun champ du corps ne peut fixer le rôle.
  `409` si le `userName` est pris. Retourne `{ token, user }`.
- `POST /api/auth/login` : `401` avec **le même message** que le compte existe ou non
  (pas d'énumération des comptes). Retourne `{ token, user }`.
- `GET /api/auth/me` : l'utilisateur courant, relu **en base** — seule source fiable de
  l'identité et du rôle côté client.
- `lib/jwt.ts` : signature et vérification HS256 (algorithme épinglé), `JWT_SECRET` validé
  au boot dans `env.ts` (32 caractères minimum). Durée de vie fixe de 7 jours, constante
  dans le code : aucune raison de la rendre configurable.
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
- **Interface en anglais**, pour l'instant (l'i18n reste hors périmètre). Le front réagit au
  `code` d'erreur avec ses propres textes (`auth.invalidCredentials`, `auth.userNameTaken`…),
  et n'affiche tel quel le `message` de l'API que pour `request.invalidBody` : les messages
  des schémas Zod sont écrits pour être lus, et le formulaire vérifie déjà les mêmes règles.
- **Deux schémas Zod** : `RegisterSchema` applique les règles de format, un message clair par
  champ (`abort: true`) ; `LoginSchema` vérifie seulement que les champs sont remplis — un
  identifiant hors format est un 401, pas un 400.

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

### 17/09 — Authentification ✅

Inscription, connexion et `/api/auth/me` côté API ; `requireAuth` / `requireAdmin` ; session
restaurée au rechargement ; écrans login / register, en-tête, gardes de route. 31 tests
backend contre une vraie base, CI avec Postgres. Branche `feature/auth`, commits `4d8b104` →
`7f336a4`.

Écarts au plan, et pourquoi :

- **Erreurs métier `AppError`** (400, 401, 403, 404, 409), dans `src/errors/app-error.ts`, qui
  **portent leur statut HTTP**. Plus simple qu'une table de correspondance ; la règle « un
  service ne connaît pas HTTP » a été assouplie et documentée. Plus aucune réponse d'erreur
  construite à la main, `notFoundHandler` compris.
- **Tests dans `backend/tests/`**, arborescence miroir de `src/`, au lieu d'à côté du code.
  Base `soniclight_test` distincte (`npm run test:db`), fichiers exécutés en série.
- **Pas de `JWT_EXPIRES_IN`** : durée de vie fixe de 7 jours, constante dans `jwt.ts`.
- **Deux schémas Zod** : `RegisterSchema` (règles de format, un message clair par champ via
  `abort: true`) et `LoginSchema` (champs remplis seulement : hors format = 401, pas 400).
- **Pas d'`id` dans les réponses** : `{ userName, role }` suffit, le jeton désigne l'utilisateur.
- **`http.ts` organisé comme un client axios** (`buildHeaders` avant, `handleErrorResponse`
  après), qui importe directement store et router. Une erreur réseau devient une `ApiError`
  `network.unreachable` : une seule sorte d'erreur pour les vues.
- **Mode clair uniquement**, thème sur mesure ; violet assombri à `#6d4aff` pour le contraste AA.
- **Interface en anglais** pour l'instant.

Pièges qui mordent encore :

- **Un 401 ne doit rediriger que si la requête portait un jeton.** Un login raté est aussi un
  401 ; rediriger dessus viderait le formulaire de son message d'erreur.
- **`prisma migrate dev` refuse un shell non interactif** dès qu'il a un avertissement à faire
  confirmer : `migrate diff` + `migrate deploy` (procédure dans `CLAUDE.md`).
- **Deux commits simultanés échouent en silence** : l'extension Git de VS Code verrouille
  l'index. Relancer, puis vérifier le contenu de chaque commit.
- **Le `?redirect=` d'une page de login est une redirection ouverte** si on ne le limite pas aux
  chemins internes.
- **Couleurs de trait trop claires sur fond blanc** (jaune 1,9:1, vert, cyan, orange) : à
  assombrir à 3:1 minimum au lot dessin.
