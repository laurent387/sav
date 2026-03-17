# Déploiement LIFT GMAO sur 87.106.26.179

## Status: ✅ Déployé avec succès

### Informations de déploiement

**Date**: 17 Mars 2026  
**Serveur**: 87.106.26.179  
**OS**: Ubuntu/Debian  
**Serveur Web**: Nginx (Docker)  
**Répertoire**: `/var/www/lift-gmao`  
**Taille**: ~264 KB (build optimisé)

### Accès

#### URLs disponibles:

1. **Accès interne serveur**:
   ```
   http://lift.87.106.26.179/
   http://localhost:80/lift-gmao/
   ```

2. **Infrastructure Docker existante**:
   ```
   https://in-spectra.com/lift-gmao/
   ```

### Architecture de déploiement

```
┌─────────────────────────────────────────┐
│  Docker Infrastructure (Port 80/443)    │
├─────────────────────────────────────────┤
│  Nginx (Router/Load Balancer)           │
│  - SSL/TLS Termination                  │
│  - Domain Routing (in-spectra.com)      │
├─────────────────────────────────────────┤
│  /var/www/lift-gmao (Build React)       │
│  - index.html + assets                  │
│  - JS compilé + CSS minifié             │
│  - Compression gzip                     │
└─────────────────────────────────────────┘
```

### Fichiers déployés

```
/var/www/lift-gmao/
├── index.html              (SPA entry point)
├── assets/
│   ├── index-BGY5Hycm.js   (220 KB - app bundle)
│   └── index-NETXDt6d.css  (10 KB - styles)
├── favicon.svg
└── icons.svg
```

### Fonctionnalités déployées

✅ **Authentification** - Système login avec 4 rôles  
✅ **Role-Based Access Control** - Vues filtrées par rôle  
✅ **Session Persistence** - localStorage auto-restore  
✅ **API Integration** - Client prêt pour 87.106.26.179:5000/api  
✅ **Production Build** - Build Vite optimisé  
✅ **Static Caching** - Headers Cache-Control configurés  
✅ **SPA Routing** - try_files pour React Router  
✅ **Security Headers** - X-Frame-Options, X-Content-Type-Options  

### Comptes de test

| Rôle | Username | Password | Accès |
|------|----------|----------|-------|
| Admin | `admin` | `admin123` | Voir toutes les vues |
| Bureau d'Études | `be@lift.fr` | `be123` | OT + Gammes |
| Logistique | `logistique@lift.fr` | `log123` | Pilotage + Parc |
| Technicien | `tech@lift.fr` | `tech123` | Pilotage + OT |

### Configuration Nginx

**Fichier de configuration**: `/etc/nginx/sites-available/lift-gmao`

Fonctionnalités:
- Virtual host sur `lift.87.106.26.179`
- Compression gzip automatique
- Cache d'assets statiques (30 jours)
- SPA routing (404 → index.html)
- Headers de sécurité
- Fichiers cachés bloqués

### Processus de déploiement

1. **Build local** (npm run build)
   ```bash
   Vite compile TypeScript → JavaScript optimisé
   Output: dist/ (~250 KB)
   ```

2. **Transfer SSH** (SCP)
   ```bash
   dist/* → /var/www/lift-gmao/
   ```

3. **Configuration Nginx** 
   ```bash
   /etc/nginx/sites-available/lift-gmao
   /etc/nginx/sites-enabled/lift-gmao (symlink)
   ```

4. **Activation**
   ```bash
   sudo nginx -t (validation)
   sudo systemctl restart nginx
   ```

### Infrastructure serveur

**Services actifs**:
- Docker daemon (container orchestration)
- Nginx (web server + reverse proxy)
- PostgreSQL (à vérifier)
- Node.js/bun (développement)
- PM2 (process manager)

**Ports mapping**:
- Port 80 → docker-proxy → Nginx
- Port 443 → docker-proxy → Nginx (SSL)

### Connexion API

L'app est configurée pour communiquer avec le backend API sur:
```
http://87.106.26.179:5000/api
```

**Endpoints attendus** (à implémenter):
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/refresh`
- `GET /lift-units`
- `GET /orders`
- `GET /gammes`
- `GET /technicians`
- `GET /parts-alerts`
- `GET /fncs`

### Mise à jour du déploiement

Pour déployer une nouvelle version:

```bash
# 1. Build local
npm run build

# 2. Transfer files
scp -r dist/* deploy@87.106.26.179:/var/www/lift-gmao/

# 3. Clear server cache (optionnel)
ssh deploy@87.106.26.179 "sudo systemctl reload nginx"
```

### Monitoring

**Vérifier le status Nginx**:
```bash
ssh deploy@87.106.26.179 "sudo systemctl status nginx"
```

**Vérifier les logs**:
```bash
ssh deploy@87.106.26.179 "sudo journalctl -u nginx -f"
```

**Vérifier l'accès**:
```bash
curl -I http://lift.87.106.26.179/
```

### Troubleshooting

| Problème | Solution |
|----------|----------|
| 404 sur les routes SPA | Vérifier que try_files règle est active dans /etc/nginx/sites-available/lift-gmao |
| Assets ne charge pas | Vérifier les headers Cache-Control dans la response |
| CORS errors | Configurer les headers Access-Control-Allow-* sur le backend API |
| SSL certificate | Infrastructure Docker gère automatiquement via in-spectra.com |
| Port conflict | Docker-proxy contrôle les ports - vérifier via `sudo ss -tulnp` |

### Notes

- La configuration Nginx peut être surpassée par Docker compose
- Vérifier les secrets Docker pour les configurations sensibles
- Le cache des assets peut nécessiter un cache bust si modificati
ons critiques
- Session utilisateur stockée en localStorage (non sécurisé pour production)

### Prochaines étapes

1. **Backend API** - Implémenter les endpoints sur 87.106.26.179:5000
2. **Database** - Configurer PostgreSQL pour auth/data
3. **HTTPS** - Vérifier certificats SSL en production
4. **Sessions** - Migrer localStorage → httpOnly cookies
5. **2FA** - Ajouter authentification multi-facteur si nécessaire
