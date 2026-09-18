# Current Feature

<!-- Un seul chantier à la fois. Quand celui-ci est terminé, résumer en une ligne
     dans History, puis remplacer Goals / Notes / Status par le lot suivant. -->

## Feature

Retours d'interface — toasts, états de chargement, page 404 (branche `feature/toasts`)

## Status

Done — 18 septembre 2026, testé dans le navigateur. À fusionner dans `main` en `--no-ff`.
Prochains chantiers : README, déploiement, sonification.

## Goals

- **Toast de confirmation** sur l'issue d'une action : enregistrement d'un dessin,
  suppression côté admin, connexion et inscription. L'échec de ces mêmes actions part en
  toast rouge.
- Fermeture **manuelle** (bouton ✕) en plus de la disparition automatique à trois secondes.
- **Spinners** sur les attentes qui n'en avaient pas : chargement du dessin, liste admin,
  suppression en cours.
- **Page 404** pour toute URL inconnue, avec une sortie adaptée à la session.

## Notes

**Hors périmètre** — file d'attente bornée, priorités ou catégories de toasts, annulation
d'une suppression, page d'erreur 500, rejeu animé, sonification.

**Décisions prises avant de coder** :

- **La liste de toasts vit au scope module**, pas dans un composant ni dans Pinia : un toast
  doit survivre à la navigation qui le déclenche (connexion puis redirection). La règle
  « un seul store » tient.
- **Deux mécanismes, deux rôles** : les `alert` en ligne gardent les erreurs attachées à un
  écran (chargement en échec, identifiants refusés), le toast prend l'issue d'une action.
- **Le succès est vert** — exception assumée à « rien n'est coloré sauf le dessin », bornée
  aux notifications et au rouge des suppressions.

**Definition of done** : les quatre toasts apparaissent et se ferment à la main comme au
bout de trois secondes ; Clear est actif sur un dessin rechargé ; `/nimportequoi` affiche le
404 et sa sortie mène au bon écran. `type-check` et build verts avant fusion en `--no-ff`.

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

### 18/09 — Administration ✅

`GET/DELETE /api/admin/drawings(/:id)` derrière `requireAuth` + `requireAdmin`, services
séparés et explicitement nommés, dessins de démonstration générés, vue admin en grille avec
ouverture et suppression. 64 tests backend. Branche `feature/admin`, commits `7d92cf1` →
`32513ed`.

Écarts au plan, et pourquoi :

- **Suppression derrière une modale de confirmation dédiée**, atteinte depuis l'icône d'une
  carte comme depuis le dessin ouvert, et nommant ce qui va disparaître. Les boutons de
  suppression sont le seul rouge de l'application : l'exception assumée à « rien n'est
  coloré sauf le dessin ».
- **`strokeCount` retiré** de la liste et de l'interface : conséquence utile, la requête
  n'a plus besoin de charger la colonne `jsonb` du tout.
- **Un admin atterrit sur `/admin`** après connexion ; l'écran de dessin reste accessible.
- **Le compte `admin` du seed n'a pas de dessin** : la démonstration sépare mieux les rôles,
  et ça fait tester le canvas vide.
- **`DELETE /api/drawing` côté utilisateur reste non exposée** (décision du lot précédent).

Pièges qui mordent encore :

- **Le rôle vient du jeton vérifié** : promouvoir un compte en base ne suffit pas, un jeton
  émis avant dit encore `USER`. C'est ce qui a fait échouer le premier test admin, et c'est
  la limite assumée du JWT sans état.
- **Une réponse `204` n'a pas de corps** : `res.json()` y échoue, la suppression paraissait
  échouer alors qu'elle avait réussi, et le `404` du second essai n'était que la conséquence.
- **`clamp()` masque une erreur de géométrie** : la spirale sortait aplatie parce qu'un rayon
  rond ne peut pas dépasser `0,5 / aspectRatio` de la largeur.
- **Le rechargement à chaud de Vite peut garder un module périmé** quand script et template
  changent coup sur coup : rechargement forcé avant de conclure à un bug.
- **Sur une suppression, « déjà absent » n'est pas un échec** : un 404 se traite comme un
  succès.

### 18/09 — Retours d'interface ✅

Toasts de succès et d'erreur sur l'enregistrement, la suppression admin et l'authentification ;
spinners de chargement ; page 404. Branche `feature/toasts`, commits `4fee97f` → `5b81de3`.

Écarts au plan, et pourquoi :

- **Le succès est vert** (`#15803d`, 5,0:1 sur blanc), alors que la règle disait « rien n'est
  coloré sauf le dessin ». L'exception est assumée et **bornée** : les notifications et le
  rouge des suppressions, rien d'autre. Overview §15 mis à jour en conséquence.
- **Undo réactivé en même temps que Clear** : même garde, même défaut. Un dessin rechargé
  n'avait « rien changé depuis la sauvegarde », donc les deux boutons restaient éteints —
  et le seul moyen d'effacer son dessin (Clear puis Save d'un canvas vide) devenait
  injoignable.
- **Pas de `<Transition>` sur les toasts** : le rejeu reste la seule animation du produit.
- **Page 404 sans `meta`** : une URL inconnue est un 404 pour tout le monde. La passer
  derrière `requiresAuth` ferait croire qu'elle existe derrière une session, et ne
  protégerait rien — la table des routes est dans le bundle.

Pièges qui mordent encore :

- **Une région `aria-live` insérée en même temps que son message n'est pas annoncée** : le
  conteneur reste dans le DOM en permanence, donc en `pointer-events-none` tant qu'il est
  vide, sinon il intercepte les clics.
- **`load()` incrémente la révision**, et la vue aligne `savedRevision` dessus : après un
  chargement, « a-t-il changé depuis la sauvegarde ? » répond non alors que le canvas est
  plein. C'est la mauvaise question pour Undo et Clear.
- **Le 404 d'une SPA dépend de l'hébergeur** : sans repli sur `index.html`, une URL inconnue
  n'atteint jamais le routeur. Natif chez Vercel et Netlify, à câbler sur GitHub Pages.
- **`btn-ghost` sur un fond coloré** pose un voile gris qui jure : sur vert ou rouge, seul un
  changement d'opacité tient.
- **Le formateur de l'éditeur réécrit tout le fichier** (guillemets, points-virgules) dès
  qu'il est ouvert : les diffs mélangent le fond et la forme, et découper un commit par lot
  devient impossible. Un `.prettierrc` commité réglerait le sujet une fois pour toutes.
