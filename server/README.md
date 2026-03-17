# AI Backend Proxy

Petit backend HTTP pour faire le proxy entre la GMAO, Flowise et la base de connaissance des gammes.

## Endpoints

- `GET /health`
- `POST /api/ai/unit-history/analyze`
- `POST /api/ai/gammes/search`
- `POST /api/ai/gammes/ask`

## Variables d'environnement

```env
AI_BACKEND_PORT=8787
AI_BACKEND_ALLOWED_ORIGIN=http://localhost:5173
FLOWISE_BASE_URL=http://192.168.1.77:3002
FLOWISE_CHATFLOW_ID=replace-me
FLOWISE_GAMMES_CHATFLOW_ID=replace-me
FLOWISE_API_KEY=replace-me
GAMMES_SOURCE_DIR=e:\Lift\OneDrive_2026-03-16\104_GAMME D'ASSEMBLAGE
GAMMES_OUTPUT_DIR=e:\Lift\gmao-sav\server\generated\gammes-kb
```

## Lancement

```powershell
Set-Location "e:\Lift\gmao-sav"
$env:AI_BACKEND_ALLOWED_ORIGIN="http://localhost:5173"
$env:FLOWISE_BASE_URL="http://192.168.1.77:3002"
$env:FLOWISE_CHATFLOW_ID="replace-me"
$env:FLOWISE_GAMMES_CHATFLOW_ID="replace-me"
$env:FLOWISE_API_KEY="replace-me"
npm.cmd run ai:server
```

## Construire la base de connaissance gammes

```powershell
Set-Location "e:\Lift\gmao-sav"
$env:GAMMES_SOURCE_DIR="e:\Lift\OneDrive_2026-03-16\104_GAMME D'ASSEMBLAGE"
npm.cmd run gammes:build
```

Le script genere :

- `server/generated/gammes-kb/documents.json`
- `server/generated/gammes-kb/chunks.json`
- `server/generated/gammes-kb/manifest.json`

## Exemple unit-history analyze

```json
{
  "question": "Analyse l'historique et propose les controles prioritaires.",
  "sessionId": "unit-LIFT-001",
  "unit": {
    "id": "LIFT-001",
    "serialNumber": "SN-ALST-2019-001",
    "site": "Gare du Nord",
    "currentConfig": "H"
  },
  "history": [
    {
      "date": "2026-03-10",
      "type": "maintenance",
      "label": "Vibration sur motorisation Z"
    }
  ],
  "workOrders": [],
  "documents": [],
  "technicianNotes": "Bruit intermittent signale sur site."
}
```

## Exemple gammes search

```json
{
  "question": "Je cherche la gamme de motorisation Z en configuration H",
  "configuration": "H",
  "section": "PARTIE MOBILE",
  "discipline": "MECA",
  "limit": 6
}
```

## Exemple gammes ask

```json
{
  "question": "Quelles sont les etapes principales pour la motorisation Z ?",
  "configuration": "H",
  "section": "PARTIE MOBILE",
  "discipline": "MECA",
  "limit": 6,
  "sessionId": "gammes-LIFT-001"
}
```
