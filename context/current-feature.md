# Current Feature

<!-- Un seul chantier à la fois. Quand celui-ci est terminé, résumer en une ligne
     dans History, puis remplacer Goals / Notes / Status par le lot suivant. -->

## Feature

README final et livraison

## Status

En cours — 20 septembre 2026. **L'application est déployée et fonctionnelle en ligne.**
Il reste le README : choix techniques, arbitrages, périmètre écarté, liens et identifiants
de démonstration.

## Goals

- Les deux liens cliquables, front et API, en tête de README.
- Les identifiants de démonstration : les comptes `USER` du seed, et le compte
  d'administration créé à la main — son mot de passe ne va **pas** dans le dépôt.
- Les décisions structurantes, chacune en trois lignes : format vectoriel, coordonnées
  normalisées, isolation par la signature des services, quantification pentatonique.
- La liste de ce qui est **hors périmètre**, reprise de l'overview §3 : c'est la preuve
  qu'un arbitrage a eu lieu.
- La mise en veille des paliers gratuits, pour qu'un relecteur ne prenne pas la latence du
  premier appel pour un défaut.

## Notes

**Hors périmètre du README** — refaire la documentation : `context/` porte déjà le détail,
le README renvoie dessus plutôt que de le recopier.

**Ce qui reste ouvert**, à trancher ou à assumer :

- La branche `experiment/audio-engine` (un trait = sa propre forme d'onde) n'est pas
  fusionnée. À garder comme trace d'exploration, ou à supprimer.
- `AdminView.vue` fait 207 lignes, au-dessus de la limite de 150 : les deux `<dialog>`
  restent à extraire.
- L'image serveur pèse 1,2 Go faute de build multi-étapes — choix « le plus simple d'abord »,
  à assumer ou à corriger.

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

### 20/09 — Sonification ✅

Un dessin devient une partition : `x` → temps, `y` → hauteur quantifiée sur une pentatonique
mineure, épaisseur → gain, couleur → timbre. Lecture en boucle de 8 s, tête de lecture
dessinée dans le canvas, écoute depuis l'écran de dessin et depuis chaque carte de la vue
admin. Branches `feature/sonification` puis `feature/audio-effects`, commits `ba106d6` →
`923d494`.

Écarts au plan, et pourquoi :

- **Un dossier `audio/` et un dossier `canvas/`**, hors de `composables/`, qui ne garde que
  ce qui touche à Vue. Le mapping et le moteur ne connaissent ni `ref` ni cycle de vie.
- **Un port `AudioEngine` et une classe `WebAudioEngine`** : remplacer la Web Audio brute par
  Tone.js, des samples, un AudioWorklet, RNBO ou Faust devient une seconde implémentation, pas
  une modification. C'est une demande explicite, et le seul endroit du projet où l'ouverture à
  l'extension a été payée d'avance.
- **Le timbre est nommé comme un son** (`pure`, `soft`, `hollow`, `bright`), jamais comme une
  forme d'onde : un moteur à base de samples n'a pas d'oscillateur à nommer.
- **La palette descend à cinq couleurs**, une par voix. Elle devient la liste des instruments,
  donc une sixième couleur devrait sonner comme quelque chose.
- **Simplifié après coup** : l'ordonnanceur à horizon glissant, la fusion des notes tenues et
  le calcul de teinte ont été retirés — 336 lignes ramenées à 229. Web Audio sait dater ses
  propres événements, donc une passe entière est programmée d'un coup.
- **Delay et réverbération** en sends parallèles, master en bout de chaîne. L'impulsion de la
  réverbération est générée (bruit décroissant), pas embarquée en fichier.
- **Écarté : le bruit comme timbre** — il n'existe pas comme type d'oscillateur, il aurait
  fallu un `AudioBufferSourceNode` filtré. Trop de complexité pour une cinquième voix.
- **Écarté : le trait comme forme d'onde** (DFT du tracé → `setPeriodicWave`). Écrit, essayé,
  conservé sur `experiment/audio-engine`.

Pièges qui mordent encore :

- **`AudioContext` ne démarre que dans un geste utilisateur**, d'où sa création au premier clic.
- **Un oscillateur est à usage unique** : sans `onended` qui déconnecte, chaque passe laisse
  ses nœuds derrière elle.
- **`exponentialRampToValueAtTime` lève sur 0** : on descend vers `0.0001`.
- **Une seule instance du moteur pour toute la vue admin**, sinon deux dessins sonnent ensemble.
- **Tailwind lit du texte, pas du code** : une constante nommée `STEPS` et une fonction `toggle`
  ont suffi à faire émettre à DaisyUI ses composants `steps` et `toggle` — 7 kB de CSS mort.

### 20/09 — Docker et déploiement ✅

`docker compose up --build` lance la base, l'API et le client. En ligne : API et Postgres sur
Railway, front sur Vercel. Branche `feature/docker`, commits `b6f3e06` → `16bbaf3`.

Écarts au plan, et pourquoi :

- **Le client est containerisé**, alors que la documentation disait l'inverse. L'argument a
  changé de forme, pas de fond : l'image sert à la **démonstration locale** — une commande doit
  donner une application entière — mais le déploiement reste un `dist/` sur CDN, et l'image
  contient `http://localhost:3000` en dur, ce qui prouve qu'elle n'est pas un artefact de
  déploiement.
- **Images en une seule étape**, pas de multi-étapes : le plus simple qui marche. Conséquence
  heureuse, la CLI Prisma reste dans l'image, donc le hook de release peut y lancer
  `migrate deploy`. Conséquence coûteuse, 1,2 Go côté serveur.
- **Le seed tourne en production, mais sans l'`ADMIN`.** La règle a changé de nature : elle
  porte sur le **rôle**, plus sur l'environnement. Un compte `USER` aux identifiants publics
  n'ouvre rien qu'une inscription n'ouvrirait ; l'administrateur, lui, peut supprimer le
  travail de tous. Il est créé à la main, avec un mot de passe absent du dépôt.

Pièges qui mordent encore :

- **`railway.json` écrase le tableau de bord**, silencieusement : une commande de pre-deploy
  réglée dans l'interface n'a jamais tourné parce que le fichier disait autre chose.
- **Railway lit sa configuration à la racine du service**, pas du dépôt : sans `Root Directory`
  sur `backend`, ni le `Dockerfile` ni le `railway.json` ne sont vus.
- **Une entrée de `preDeployCommand` n'est pas passée à un shell** : `a && b` n'y fonctionne
  pas. Un script npm, si.
- **`VITE_API_URL` sans `https://` produit une URL relative**, résolue contre l'origine du
  front — d'où un `POST` sur `index.html` et un 405 incompréhensible.
- **Un 404 sur `/` d'une API n'est pas une panne** : aucune route n'y est montée, et c'est le
  `notFoundHandler` qui répond au bon format.
- **`docker compose run` démarre les dépendances du service** : sans `--no-deps`, tester le
  client seul réveille l'API et bute sur un port déjà pris.
- **Le titre de l'onglet était resté `Vite App`** jusqu'à la veille du rendu.
