# Current Feature

<!-- Un seul chantier à la fois. Quand celui-ci est terminé, résumer en une ligne
     dans History, puis remplacer Goals / Notes / Status par le lot suivant. -->

## Feature

Administration — consulter et modérer les dessins de tous (branche `feature/admin`)

## Status

In Progress — démarré le 18 septembre 2026.

## Goals

**Backend**

- `GET /api/admin/drawings` : tous les dessins avec leur auteur, **sans le `data`** —
  `{ id, title, userName, strokeCount, updatedAt }`, triés du plus récent au plus ancien.
- `GET /api/admin/drawings/:id` : un dessin, `data` compris, relu par `DrawingDataSchema`.
- `DELETE /api/admin/drawings/:id` : modération (réponse IRCAM n°4). 404 si l'id n'existe pas.
- Services **séparés et explicitement nommés** : `listAllForAdmin`, `getByIdForAdmin`,
  `removeForAdmin` — jamais un `userId?` optionnel sur les fonctions utilisateur, qui
  rendrait un oubli silencieux.
- Toutes les routes derrière `requireAuth` **puis** `requireAdmin`.
- Tests : un `USER` reçoit **403 sur les trois routes**, un invité 401 ; la liste ne contient
  jamais de `data` ; un admin voit les dessins de tous ; la suppression admin atteint le
  dessin d'un autre (contrairement à la route utilisateur).

**Frontend**

- `AdminView` : grille de cartes, une par dessin — vignette rendue par `renderStrokes`,
  titre, auteur, date, nombre de traits.
- Ouverture d'un dessin (vue agrandie) et suppression avec confirmation.
- État vide travaillé si aucun dessin n'existe.
- Le lien « Admin » de l'en-tête existe déjà, affiché seulement si `isAdmin`.

## Notes

**Hors périmètre** — modification d'un dessin par l'admin (l'IRCAM parle de consulter et de
supprimer), gestion des comptes, pagination, recherche, export, rejeu animé, sonification.

**Décisions prises avant de coder** :

- **La liste ne renvoie pas le `data`.** Vingt dessins complets, c'est plusieurs mégaoctets
  pour afficher vingt titres. Conséquence assumée : les vignettes demandent un second appel
  par dessin — acceptable à cette échelle, et la limite est nommée plutôt que masquée.
- **L'id du dessin n'apparaît que côté admin.** Les routes utilisateur restent au singulier
  et sans id : c'est la seule surface où un identifiant transite, et elle est derrière
  `requireAdmin`.
- **Le seed devra créer des dessins** pour que la vue admin ne soit pas vide au clonage.

**Pièges attendus** :

- `requireAdmin` s'applique **après** `requireAuth` : sans jeton c'est 401, avec un jeton
  `USER` c'est 403 — deux cas distincts, tous deux testés.
- Le rôle vient du jeton **vérifié**, jamais d'un champ du client.
- Les vignettes rendent du canvas : dimensionner le backing store avec `devicePixelRatio`,
  et réserver la hauteur finale pour que la grille ne saute pas quand les données arrivent.

**Definition of done** : `admin` voit les dessins de `demo` et des autres, en ouvre un, en
supprime un ; `demo` reçoit un 403 sur les routes admin et ne voit pas le lien. Tests verts,
`tsc`, `type-check`, build et CI verts avant fusion en `--no-ff`.

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

### 18/09 — Dessin ✅

Format vectoriel validé par Zod, API `GET/PUT/DELETE /api/drawing`, canvas au pointeur en
coordonnées normalisées, palette et épaisseurs, enregistrement et réouverture sur un écran
unique. 54 tests backend. Branche `feature/drawing`, commits `a918b43` → `1a41891`.

Écarts au plan, et pourquoi :

- **Un seul écran au lieu de deux.** `MyDrawingView` (lecture seule) faisait doublon avec
  l'éditeur dès lors qu'un utilisateur n'a qu'un dessin. `/` s'ouvre désormais sur le dessin
  enregistré : « retrouver son dessin » au sens fort, et la modification devient possible —
  ce que l'IRCAM décrit (« il peut écraser son ancien dessin »).
- **Pas de rejeu animé** (bonus P1) : `renderStrokes` a perdu son paramètre `upTo`, trois
  lignes à remettre le jour où le rejeu arrive.
- **Titre modifiable en cliquant dessus**, champ dimensionné sur le texte, plus de champ
  permanent dans la barre d'outils. Vide sur un dessin existant → l'ancien titre est
  conservé (branche `update` de l'upsert sans `title`) ; vide au premier enregistrement →
  le `userName`.
- **Dessin vide autorisé** (`strokes` sans minimum) : sans bouton de suppression côté
  utilisateur, enregistrer un canvas vide est la façon d'effacer ce qui était enregistré.
- **`DELETE /api/drawing` écrite et testée, mais pas exposée** : décision d'interface, pas
  de périmètre — la route porte un test d'isolation utile.
- **Undo/Clear/Save désactivés tant que rien n'a bougé** depuis le dernier enregistrement,
  via un compteur de révisions dans le composable. Save réagit aussi au titre.
- **Palette assombrie** : les teintes vives d'origine passaient sous 3:1 sur blanc.

Pièges qui mordent encore :

- **`app.use(router)` déclenche la première navigation** : la session doit être restaurée
  avant, sinon la garde lit un état périmé et redirige vers `/login` au rechargement.
- **Une panne réseau ne doit pas effacer le jeton** : seul un 401 du serveur invalide une
  session.
- **`interface` ne suffit pas pour une colonne `Json`** : Prisma exige la signature d'index
  implicite d'un alias `type`.
- **Redimensionner un canvas l'efface** : tout redessiner depuis les traits, ce qui est
  gratuit grâce aux coordonnées normalisées.
- **Une classe Tailwind construite à l'exécution n'existe pas** dans le CSS produit : les
  couleurs de trait passent par une variable CSS en ligne.
