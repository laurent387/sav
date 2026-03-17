# LIFT GMAO Authentication & Server Configuration

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Server Configuration
VITE_API_BASE_URL=http://87.106.26.179:5000/api
VITE_API_TIMEOUT=10000

# Feature Flags
VITE_ENABLE_MOCK_AUTH=true
VITE_ENABLE_DEBUG_LOGS=false

# Server Settings
VITE_SERVER_HOST=87.106.26.179
VITE_SERVER_PORT=5000
```

## Production Deployment

### GitHub Pages Deployment

The app automatically deploys to GitHub Pages when you push to `main`:

1. **Workflow**: `.github/workflows/deploy-pages.yml`
2. **URL**: `https://laurent387.github.io/sav/`
3. **Base Path**: `/sav/` (configured in vite.config.ts)

### Server Configuration

The backend API is configured to run on the server at:
```
http://87.106.26.179:5000/api
```

### Required Server Endpoints

The backend must implement these endpoints:

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

#### Data Endpoints
- `GET /lift-units` - List all lift units
- `GET /lift-units/:id` - Get lift unit details
- `GET /orders` - List work orders
- `GET /orders/:id` - Get work order details
- `POST /orders` - Create new work order
- `PUT /orders/:id` - Update work order
- `GET /gammes` - List assembly guides
- `GET /technicians` - List technicians
- `GET /parts-alerts` - List part alerts
- `GET /fncs` - List non-conformity forms

## Testing

### Local Development

1. **Start local dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   ```
   http://localhost:5173
   ```

3. **Login with test account:**
   - Username: `admin`
   - Password: `admin123`

### Test Accounts

| Role | Username | Password | Note |
|------|----------|----------|------|
| Admin | `admin` | `admin123` | Full system access |
| Bureau d'Études | `be@lift.fr` | `be123` | Create/manage OTs |
| Logistique | `logistique@lift.fr` | `log123` | Manage inventory |
| Technicien | `tech@lift.fr` | `tech123` | Execute field work |

### Manual Testing Scenario

1. Login as `admin`
2. Navigate through all 4 tabs (should see all)
3. Check user profile in header (should show admin role)
4. Logout and re-login as `technicien`
5. Verify only 2 tabs visible (Pilotage, Ordres de travail)
6. Check localStorage to confirm session persistence

## Build & Deployment Process

### Development Build
```bash
npm run build
```

Generates production-optimized output in `dist/`

### TypeScript Check
```bash
npx tsc --noEmit
```

Validates all TypeScript without generating files

### Lint Check
```bash
npm run lint
```

Runs ESLint on source code

## File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── hooks/
│   └── useAuth.ts               # Custom auth hook
├── pages/
│   └── LoginPage.tsx            # Login UI component
├── services/
│   └── api.ts                   # HTTP client & server API
├── styles/
│   └── LoginPage.css            # Login page styles
├── types/
│   └── auth.ts                  # TypeScript auth types
├── App.tsx                      # Main app + role-based routing
├── App.css                      # App styles (updated)
├── data.ts                      # Mock data (unchanged)
└── main.tsx                     # Entry point (updated)
```

## Security Considerations

- [ ] Move tokens from localStorage to httpOnly cookies
- [ ] Implement CSRF protection
- [ ] Add rate limiting on auth endpoints
- [ ] Implement 2FA for admin and bureau-etude roles
- [ ] Add request signing for API calls
- [ ] Implement TLS certificate validation
- [ ] Add audit logging for auth events
- [ ] Use secure session management with redis/database

## Troubleshooting

### Login fails with "Identifiants invalides"

1. Check if server (87.106.26.179:5000) is accessible
2. If server down, app falls back to mock auth
3. Use test account credentials (see table above)

### User data not loading after login

1. Check browser console for API errors
2. Verify CORS is enabled on backend
3. Check Authorization header in network tab
4. Verify token format: `Bearer <token>`

### Session not persisting

1. Check localStorage in DevTools
2. Verify `user` and `access_token` keys exist
3. Clear localStorage and re-login if corrupted

## Next Phase

Integration with real backend requires:
1. Server implementation at 87.106.26.179
2. Database schema for users and audit logs
3. JWT token generation and validation
4. CORS configuration for GitHub Pages URL
5. Database connections for data endpoints
