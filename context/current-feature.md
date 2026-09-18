# Current Feature

<!-- Un seul chantier à la fois. Quand celui-ci est terminé, résumer en une ligne
     dans History, puis remplacer Goals / Notes / Status par le lot suivant. -->

## Feature

Dessin — canvas, capture vectorielle, enregistrement, rejeu (branche `feature/drawing`)

## Status

In Progress — démarré le 18 septembre 2026.

## Goals

**Format et backend**

- `types/drawing.ts` (copie canonique serveur, dupliquée côté client) : `Point`, `Stroke`,
  `DrawingData` — coordonnées normalisées `[0,1]`, `width` normalisée sur la largeur,
  `aspectRatio`, `version: 1`.
- `schemas/drawing.schema.ts` : `DrawingDataSchema` avec ses bornes dures
  (≤ 1 000 traits, ≤ 5 000 points, couleurs hex, `version` littérale) — la seule protection
  applicative contre un `jsonb` de 200 Mo.
- `services/drawing.service.ts` : `getMine(userId)`, `saveMine(userId, input)` (upsert sur
  `userId`), `removeMine(userId)`. Aucune route utilisateur n'accepte d'id de dessin.
- **Titre facultatif** : `title` optionnel dans le schéma. Vide sur un dessin existant, le
  titre déjà enregistré est conservé ; vide au premier enregistrement, le `userName` du
  propriétaire est repris. Le repli vit côté serveur, à un seul endroit.
- Routes : `GET`, `PUT`, `DELETE /api/drawing`, toutes derrière `requireAuth`. **`DELETE`
  n'a volontairement aucun bouton dans l'interface pour l'instant** : la route reste écrite
  et testée (elle porte un test d'isolation), l'exposer sera un bouton à ajouter.
- Tests : isolation (le dessin d'un autre est invisible), remplacement (deux `PUT` = une
  ligne), bornes du schéma, `data` relu par `DrawingDataSchema` en sortie.

**Frontend**

- `composables/useDrawing.ts` : capture `pointerdown/move/up`, `setPointerCapture`,
  normalisation à la capture, filtre de distance (~0,002), pile d'annulation, effacer tout.
- `composables/renderStrokes.ts` : **une seule** fonction de rendu, partagée par l'édition et
  (plus tard) la vignette admin — `renderStrokes(ctx, data, box)`.
- `DrawView` : canvas **ratio fixe 3:2**, responsive, `touch-action: none`, backing store à
  `devicePixelRatio`, barre d'outils **sous** le canvas (palette fermée de 6 couleurs,
  3 épaisseurs, annuler, effacer), **champ titre facultatif** à côté du bouton « Save » —
  pas de modale : avec un seul dessin par utilisateur, un champ suffit.
- **Un seul écran** (`/`) : il s'ouvre sur le dessin déjà enregistré, on le modifie et on
  l'enregistre (remplacement). Pas de page de consultation séparée : avec
  un dessin par utilisateur, deux écrans pour la même donnée n'apportaient rien. Titre
  modifiable en cliquant dessus ; laissé vide, le serveur garde le titre enregistré.
  Pas de suppression côté utilisateur (seulement `Clear`, qui vide le canvas sans toucher à
  l'enregistrement). **Pas de rejeu animé** : bonus P1, repoussé pour rester simple.
- Palette assombrie pour le fond clair, toutes ≥ 4,7:1 sur blanc :
  rouge `#e11d48`, orange `#c2410c`, jaune `#a16207`, vert `#15803d`, cyan `#0e7490`,
  violet `#7c3aed`.

## Notes

**Hors périmètre** — interface d'administration (lot suivant), rejeu animé trait par trait
(P1), sonification (P2), édition d'un dessin existant, calques, formes, export.

**Décisions prises avant de coder** :

- **Canvas en ratio fixe 3:2**, desktop comme mobile : tous les dessins ont le même
  `aspectRatio`, donc le rejeu et les futures vignettes n'ont jamais à letterboxer. Le champ
  `aspectRatio` reste dans le format : il coûte un nombre et rend le format indépendant de
  ce choix d'interface.
- **Un dessin par utilisateur** (réponse IRCAM) : `PUT /api/drawing` crée ou remplace, aucun
  id de dessin ne transite côté utilisateur.
- **Palette fermée de 6 couleurs**, assombries pour rester lisibles sur fond clair.
- **Pas de modale `<dialog>` pour l'enregistrement** : le titre est un champ de la barre
  d'outils, facultatif. Le gain d'accessibilité de `<dialog>` (piège à focus, `Échap`) n'a
  d'intérêt que s'il y a une vraie modale à afficher.

**Pièges attendus** :

- Backing store à `devicePixelRatio` (`canvas.width = cssWidth * dpr`, puis `ctx.scale`),
  sinon le trait est flou sur écran haute densité.
- `touch-action: none` en CSS, sinon dessiner au doigt fait défiler la page.
- `pointer*` uniquement, jamais `mouse*` ni `touch*` ; `setPointerCapture` sur `pointerdown`.
- Redimensionner le canvas **efface** son contenu : il faut redessiner depuis les traits.
- `drawing.data` arrive en `Prisma.JsonValue` : `DrawingDataSchema.parse()`, jamais `as`.
- Aucun pixel ne franchit la frontière réseau : normalisation à la capture, dénormalisation
  au rendu.

**Definition of done** : `demo` dessine, enregistre, **retrouve son dessin sur le canvas au
rechargement**, le modifie, un second enregistrement remplace le premier, la suppression
fonctionne. Tests d'isolation verts. `tsc`, tests, `type-check`, build et CI verts avant
fusion en `--no-ff`.

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
