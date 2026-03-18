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
AI_BACKEND_ALLOWED_ORIGIN=*
FLOWISE_BASE_URL=http://192.168.1.77:3002
FLOWISE_CHATFLOW_ID=replace-me
FLOWISE_GAMMES_CHATFLOW_ID=replace-me
FLOWISE_API_KEY=replace-me
LITELLM_BASE_URL=http://192.168.1.77:4000
LITELLM_API_KEY=replace-me
LITELLM_MODEL=fast
AI_PROVIDER_TIMEOUT_MS=4000
FLOWISE_COOLDOWN_MS=300000
GAMMES_SOURCE_DIR=e:\Lift\OneDrive_2026-03-16\104_GAMME D'ASSEMBLAGE
GAMMES_OUTPUT_DIR=e:\Lift\gmao-sav\server\generated\gammes-kb
VITE_AI_API_BASE_URL=
VITE_AI_PROXY_TARGET=http://localhost:8787
```

Le backend charge automatiquement `.env` et `.env.local` a la racine du projet.
`VITE_AI_API_BASE_URL` est optionnelle. Si elle est vide, le front appelle `/api/ai/...` sur le meme host.
En dev Vite, `/api/ai/...` est automatiquement proxyfi vers `VITE_AI_PROXY_TARGET`.
Si `FLOWISE_CHATFLOW_ID` n'est pas renseigne, le proxy bascule automatiquement sur LiteLLM.

## Lancement

```powershell
Set-Location "e:\Lift\gmao-sav"
npm.cmd run ai:server
```

Pour lancer le front et le backend IA ensemble en local :

```powershell
Set-Location "e:\Lift\gmao-sav"
npm.cmd run dev:ai
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
