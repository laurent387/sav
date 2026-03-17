## Système d'Authentification & Rôles

### Vue d'ensemble

L'application LIFT GMAO intègre un système d'authentification complet avec gestion des rôles et des permissions. Le système se connecte au serveur **87.106.26.179** pour mutualiser la base de données.

### Rôles disponibles

#### 1. **Admin** 🔐
- **Accès complet** à toutes les vues et fonctionnalités
- Gestion des utilisateurs
- Configuration système
- Visualisation complète des données
- Génération de rapports

**Vues accessibles**: Pilotage, Ordres de travail, Parc LIFT, Gammes

#### 2. **Bureau d'Études** 📋
- Création et gestion des ordres de travail
- Gestion des gammes d'assemblage
- Gestion des opérations de retrofit
- Accès à la documentation technique
- Visualisation du parc disponible

**Vues accessibles**: Pilotage, Ordres de travail, Parc LIFT, Gammes

#### 3. **Logistique** 📦
- Gestion du stock et des pièces
- Visualisation des alertes pièces
- Suivi des demandes de pièces
- Gestion des exigences en matériel
- Parc LIFT pour planification

**Vues accessibles**: Pilotage, Parc LIFT

#### 4. **Technicien** 👷
- Consultation des OT assignés
- Mise à jour du statut des ordres
- Accès aux gammes d'exécution
- Logging des heures travaillées
- Signalement des problèmes sur site

**Vues accessibles**: Pilotage, Ordres de travail

### Architecture d'Authentification

#### Composants clés

- **AuthContext** (`src/contexts/AuthContext.tsx`)
  - Fournit l'état d'authentification globale
  - Gère la persistence de session (localStorage)
  - Expose les méthodes: `login()`, `logout()`, `refreshToken()`

- **useAuth Hook** (`src/hooks/useAuth.ts`)
  - Hook personnalisé pour accéder au contexte d'authentification
  - À utiliser dans tout composant nécessitant l'auth

- **LoginPage** (`src/pages/LoginPage.tsx`)
  - Interface de connexion avec champs de formulaire
  - Boutons de test rapide pour chaque rôle (développement)
  - Affichage des erreurs d'authentification

- **ApiService** (`src/services/api.ts`)
  - Classe singleton pour toutes les requêtes HTTP
  - Gère les tokens d'authentification
  - Fallback en mode mock (développement)

### Serveur d'authentification

**URL**: `http://87.106.26.179:5000/api`

#### Endpoints requis

- `POST /auth/login` - Authentification utilisateur
- `POST /auth/logout` - Déconnexion
- `POST /auth/refresh` - Renouvellement du token
- `GET /auth/me` - Récupération des infos utilisateur

#### Format de requête login

```json
{
  "username": "string",
  "password": "string"
}
```

#### Format de réponse

```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "role": "admin|bureau-etude|logistique|technicien",
    "active": boolean,
    "avatar": "string (optional)"
  },
  "token": {
    "access_token": "string",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

### Utilisation du hook useAuth

```typescript
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <>
      <p>Utilisateur: {user?.fullName}</p>
      <p>Rôle: {user?.role}</p>
      <button onClick={logout}>Se déconnecter</button>
    </>
  )
}
```

### Contrôle d'accès par rôle

L'accès aux vues est contrôlé par la configuration `roleViews` dans `App.tsx`:

```typescript
const roleViews: Record<string, View[]> = {
  admin: ['overview', 'ordres-travail', 'parc', 'gammes'],
  'bureau-etude': ['overview', 'ordres-travail', 'parc', 'gammes'],
  logistique: ['overview', 'parc'],
  technicien: ['overview', 'ordres-travail'],
}
```

### Mode développement

En développement, si le serveur n'est pas accessible, le système utilise automatiquement une authentification mock avec les comptes de test suivants:

| Rôle | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Bureau d'Études | `be@lift.fr` | `be123` |
| Logistique | `logistique@lift.fr` | `log123` |
| Technicien | `tech@lift.fr` | `tech123` |

Ces comptes sont également disponibles comme boutons de test rapide sur la page de connexion.

### Gestion de session

- Les tokens sont stockés dans `localStorage` avec la clé `access_token`
- Les données utilisateur sont sauvegardées dans `localStorage` avec la clé `user`
- La session est restaurée automatiquement au chargement de l'app
- Types de réponse d'authentification non valide déclenchent une redirection vers le login

### Flux d'authentification

```
1. Utilisateur arrive sur l'app
2. AuthProvider vérifie si une session existe dans localStorage
3. Si pas de session → Affichage LoginPage
4. Utilisateur saisit identifiants et soumet
5. ApiService tente authentification serveur réel
6. Si erreur → Essai du fallback mock (développement)
7. Réussite → Token stocké, données utilisateur sauvegardées
8. Redirection vers App avec accès aux vues du rôle
9. Header affiche nom utilisateur, rôle, et bouton déconnexion
10. Déconnexion → Suppression localStorage, retour LoginPage
```

### Intégration avec les données

Actuellement, l'app utilise des **données mock** importées de `data.ts`. Pour une intégration complète avec le serveur, modifier `ApiService` pour appeler:

- `GET /lift-units` - Liste des unités
- `GET /orders` - Ordres de travail
- `GET /orders/:id` - Détail d'un OT
- `GET /gammes` - Gammes d'assemblage
- `GET /technicians` - Liste techniciens
- `GET /parts-alerts` - Alertes pièces
- `GET /fncs` - Fiches non-conformités

### Sécurité

- Les tokens Bearer sont envoyés automatiquement en header `Authorization`
- Récupération d'un 401 → Déconnexion automatique
- Tokens stockés en localStorage (à vérifier pour la production — httpOnly cookies recommandé)
- Sensitive data à ne jamais logguer

### Prochaines étapes

1. **Configurer le serveur réel** sur 87.106.26.179
2. **Implémenter les endpoints d'auth** suivant le format spécifié
3. **Mettre en place les appels API réels** pour les données
4. **Ajouter refresh automatique** de token longue durée
5. **Implémenter httpOnly cookies** pour plus de sécurité
6. **Ajouter 2FA** pour certains rôles (optionnel)
