# Serveur de dev Docker (Optiplex)

Environnement de développement complet en conteneurs : PostgreSQL + API Node + front Vite (rechargement à chaud).

```
navigateur ──► web (Vite :5173) ──/lift-gmao/api──► api (Node :5000) ──► db (PostgreSQL :5432)
                                 └─/api/ai────────► ai  (proxy IA :8787, optionnel)
```

## Prérequis

- Docker Engine + Docker Compose v2 (Linux), ou Docker Desktop (Windows / WSL2)
- Git

## Premier lancement

```bash
git clone https://github.com/laurent387/sav.git
cd sav
git checkout claude/eloquent-brown-e2ihwe
docker compose -f docker-compose.dev.yml up --build
```

Au premier démarrage :

1. `db` crée la base `lift_gmao` et applique `server/db/schema.sql` ;
2. `db-init` insère les données de référence (`seed.mjs`) et la mission Belfort TR15 & TR18, puis s'arrête ;
3. `api` et `web` démarrent.

Ouvrir **http://localhost:5173/lift-gmao/** (ou `http://<ip-de-l-optiplex>:5173/lift-gmao/` depuis un autre poste du réseau).

Comptes de dev (définis dans `server/db/seed.mjs`) :

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Admin | `admin` | `LiftGmao@2026!` |
| Bureau d'études | `jp.bureau@lift.fr` | `Bureau@2026!` |
| Logistique | `m.logistique@lift.fr` | `Logistique@2026!` |
| Technicien | `a.belkacem@lift.fr` | `Tech@2026!` |

## Au quotidien

Lancer en arrière-plan :

```bash
docker compose -f docker-compose.dev.yml up -d
```

Suivre les logs :

```bash
docker compose -f docker-compose.dev.yml logs -f api web
```

Arrêter :

```bash
docker compose -f docker-compose.dev.yml down
```

Le code est monté en volume : une modification dans `src/` recharge le navigateur, une modification dans `server/` redémarre l'API.

Après un changement de `package.json` (nouvelle dépendance), reconstruire l'image :

```bash
docker compose -f docker-compose.dev.yml up --build -V
```

## Base de données

Ouvrir un shell `psql` :

```bash
docker compose -f docker-compose.dev.yml exec db psql -U lift -d lift_gmao
```

PostgreSQL est aussi exposé sur le port 5432 de l'Optiplex (utilisateur `lift`, mot de passe `lift`) pour DBeaver, pgAdmin, etc.

Repartir d'une base vierge (supprime toutes les données, puis réapplique schéma + seed + mission Belfort) :

```bash
docker compose -f docker-compose.dev.yml down -v
```

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Proxy IA (optionnel)

Renseigner `FLOWISE_*` / `LITELLM_*` dans un fichier `.env.local` à la racine (voir `.env.example`), puis :

```bash
docker compose -f docker-compose.dev.yml --profile ai up -d
```

## Ports

Modifiables via des variables d'environnement ou un fichier `.env` :

| Variable | Défaut | Service |
|---|---|---|
| `WEB_PORT` | 5173 | Front Vite |
| `API_PORT` | 5000 | API Node |
| `DB_PORT` | 5432 | PostgreSQL |

Exemple si un PostgreSQL tourne déjà sur l'Optiplex : `DB_PORT=5433 docker compose -f docker-compose.dev.yml up -d`.

## Dépannage

- **Le rechargement à chaud ne marche pas** (fréquent sous Windows quand le dépôt est sur `C:\` ou `E:\` plutôt que dans WSL) : lancer avec `VITE_USE_POLLING=true`, ou cloner le dépôt dans le système de fichiers WSL.
- **`db-init` échoue** : `docker compose -f docker-compose.dev.yml logs db-init`, puis repartir d'une base vierge (`down -v`).
- **Port déjà utilisé** : changer `WEB_PORT` / `API_PORT` / `DB_PORT` (voir ci-dessus).
