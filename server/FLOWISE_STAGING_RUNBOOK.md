# Flowise Staging Runbook

Mini note d'exploitation pour l'instance Flowise staging sur `192.168.1.77:3002`.

## Emplacement

- Serveur: `lo@192.168.1.77`
- Dossier compose: `/opt/agent-server`
- Compose staging: `/opt/agent-server/docker-compose.staging.yml`
- Proxy GPU hote: `127.0.0.1:11435 -> 192.168.1.61:11434`

## Services utiles

- `flowise-pg`: Flowise staging sur `3002`
- `ollama-gpu-proxy`: pont entre Docker et l'Ollama GPU distant
- `litellm-proxy`: proxy modeles sur `4000`

## Commandes utiles

### 1. Redemarrer le staging proprement

```bash
ssh -i C:\Users\lo_st\.ssh\id_server_lo lo@192.168.1.77 "cd /opt/agent-server && docker compose -f docker-compose.staging.yml up -d"
```

### 2. Verifier les conteneurs et le proxy GPU

```bash
ssh -i C:\Users\lo_st\.ssh\id_server_lo lo@192.168.1.77 "docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'flowise-pg|ollama-gpu-proxy|litellm-proxy'"
```

```bash
ssh -i C:\Users\lo_st\.ssh\id_server_lo lo@192.168.1.77 "docker exec flowise-pg sh -lc 'curl -s http://192.168.1.77:11435/api/tags'"
```

### 3. Tester un flow GMAO

```bash
curl -s -X POST "http://192.168.1.77:3002/api/v1/prediction/c1701b0b-9dc5-43a7-8afb-1a5dd11de6fa" ^
  -H "Content-Type: application/json" ^
  --data "{\"question\":\"Reply only: OK UNIT\",\"overrideConfig\":{\"sessionId\":\"runbook-unit-test\"}}"
```

```bash
curl -s -X POST "http://192.168.1.77:3002/api/v1/prediction/7fdc432a-6a60-4e8b-9dab-9b93050fde18" ^
  -H "Content-Type: application/json" ^
  --data "{\"question\":\"Reply only: OK GAMMES\",\"overrideConfig\":{\"sessionId\":\"runbook-gammes-test\"}}"
```

## Chatflows GMAO

- `GMAO Unit History Assistant`: `c1701b0b-9dc5-43a7-8afb-1a5dd11de6fa`
- `GMAO Gammes Assistant`: `7fdc432a-6a60-4e8b-9dab-9b93050fde18`

## Si ca casse

- Verifier d'abord `ollama-gpu-proxy`
- Puis verifier que `192.168.1.77:11435/api/tags` repond
- Puis verifier `flowise-pg` avec les endpoints `/api/v1/prediction/...`
- Enfin verifier le proxy local GMAO sur `http://127.0.0.1:8787/health`
