# SonicLight

> Dessiner, puis écouter son dessin : un trait devient une phrase sonore.

Exercice technique — IRCAM, Service Web. Une application web où l'on s'identifie, on dessine
sur un canvas, on enregistre son dessin et on le retrouve ; une interface d'administration
liste les dessins de tous les utilisateurs.

## Stack

| Côté      | Technologies                                                   |
| --------- | -------------------------------------------------------------- |
| Frontend  | Vue 3 (`<script setup>`), Vite, TypeScript, Vue Router, Pinia   |
| Backend   | Express 5, TypeScript, Prisma 7                                 |
| Base      | PostgreSQL 16 (Docker)                                          |

Deux packages npm indépendants, `frontend/` et `backend/`, installés et lancés séparément.

## Démarrage

```bash
docker compose up -d db          # PostgreSQL

cd backend  && npm install && npm run dev    # API   — http://localhost:3000
cd frontend && npm install && npm run dev    # Front — http://localhost:5173
```

Copier `backend/.env.example` vers `backend/.env` et `frontend/.env.example` vers
`frontend/.env` avant le premier lancement.

## Documentation

Les choix d'architecture, les arbitrages et le périmètre retenu sont détaillés dans
[`context/project-overview.md`](context/project-overview.md). Le brief de l'exercice est
dans [`context/exercise-brief.md`](context/exercise-brief.md).

---

_Work in progress — ce README sera complété en fin de parcours (choix techniques,
compromis assumés, lien de démonstration)._
