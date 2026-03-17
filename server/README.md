# AI Backend Proxy

Petit backend HTTP pour faire le proxy entre la GMAO et Flowise.

## Endpoint

- `GET /health`
- `POST /api/ai/unit-history/analyze`

## Variables d'environnement

```env
AI_BACKEND_PORT=8787
AI_BACKEND_ALLOWED_ORIGIN=http://localhost:5173
FLOWISE_BASE_URL=http://192.168.1.77:3002
FLOWISE_CHATFLOW_ID=replace-me
FLOWISE_API_KEY=replace-me
```

## Lancement

```powershell
Set-Location "e:\Lift\gmao-sav"
$env:AI_BACKEND_ALLOWED_ORIGIN="http://localhost:5173"
$env:FLOWISE_BASE_URL="http://192.168.1.77:3002"
$env:FLOWISE_CHATFLOW_ID="replace-me"
$env:FLOWISE_API_KEY="replace-me"
npm.cmd run ai:server
```

## Exemple de payload

```json
{
  "question": "Analyse l'historique et propose les contrôles prioritaires.",
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
  "technicianNotes": "Bruit intermittent signalé sur site."
}
```

## Réponse attendue

Le backend renvoie:

- `answer`: texte brut issu de Flowise
- `structured`: JSON parsé si le flow répond bien au format demandé
- `sessionId`: identifiant de session transmis à Flowise
