# LIFT GMAO SAV (ALSTOM) - MVP

Application frontend de GMAO/SAV orientee retrofit et maintenance pour le parc LIFT client ALSTOM.

## Vision metier

Le MVP couvre les flux prioritaires identifies dans les documents d'assemblage/retrofit:

- Pilotage des OT terrain (retrofit, correctif, preventif)
- Suivi des configurations produit (CONF E', F, G, H, I)
- Gestion des operations de retrofit (motorisation, bord sensible, linings, structures)
- Visibilite parc installe et statut unite
- Suivi FNC (fiches de non-conformite) et alertes pieces

## Fonctionnalites MVP

- Vue Pilotage: KPIs operations, alertes stock, repartition des configurations
- Vue Ordres de travail: filtres, detail OT, progression des operations, pieces requises
- Vue Parc LIFT: inventaire des unites, conf actuelle/cible, OT actif
- Vue Gammes: catalogue des gammes/refs WP, filtres section/disciplines
- Panneau lateral: disponibilites techniciens + suivi FNC

## Modele metier (frontend mock)

Le dataset TypeScript dans src/data.ts inclut:

- LiftUnit
- WorkOrder
- RetrofitOperation
- GammeAssemblage
- Technician
- FNC
- PartAlert

## Stack technique

- React 19
- TypeScript 5
- Vite 8
- ESLint

## Lancer en local

```powershell
Set-Location "e:\Lift\gmao-sav"
npm.cmd install
npm.cmd run dev
```

Puis ouvrir l'URL Vite (par defaut http://localhost:5173).

## Build production

```powershell
Set-Location "e:\Lift\gmao-sav"
npm.cmd run build
npm.cmd run preview
```

Le bundle est genere dans dist.

## GitHub Actions

Deux workflows sont inclus:

- CI: .github/workflows/ci.yml
  - npm ci
  - npm run lint
  - npm run build
- Deploy Pages: .github/workflows/deploy-pages.yml
  - Build Vite
  - Upload artifact dist
  - Deploy via actions/deploy-pages

## Deploiement GitHub Pages

Le projet est configure pour publier sur le repo sav (base Vite /sav/ en CI GitHub).

Activation a verifier une seule fois dans GitHub:

1. Repository Settings > Pages
2. Build and deployment > Source: GitHub Actions

Ensuite chaque push sur main declenche le deploiement.

## Architecture applicative cible (apres MVP)

- Frontend: React (ce repo)
- Backend API: Node.js + NestJS ou FastAPI
- DB: PostgreSQL
- Auth: JWT + roles (Coordinateur, Technicien, Qualite, Manager)
- Fichiers techniques: stockage objet (S3/Blob) pour gammes/FI/PV

## Roadmap

1. Sprint 1 - Stabilisation MVP
	- CRUD OT
	- Workflow statut OT
	- Historique unite
2. Sprint 2 - Donnees reelles
	- Import XLSX (gammes + FI)
	- Normalisation refs WP/PSF
	- Gestion stock pieces
3. Sprint 3 - Terrain
	- Checklists execution mobile
	- Signature PV
	- Photos et preuves d'intervention
4. Sprint 4 - Qualite & SLA
	- Workflow complet FNC
	- Alertes SLA / KPI qualite
	- Reporting client ALSTOM
