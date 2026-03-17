// Types d'authentification et autorisation
export type UserRole = 'admin' | 'bureau-etude' | 'logistique' | 'technicien'

export interface User {
  id: string
  username: string
  email: string
  fullName: string
  role: UserRole
  avatar?: string
  active: boolean
}

export interface AuthToken {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

// Permissions par rôle
export const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'view_dashboard',
    'manage_users',
    'manage_orders',
    'manage_inventory',
    'manage_technicians',
    'generate_reports',
    'configure_system',
    'view_all_data',
  ],
  'bureau-etude': [
    'view_dashboard',
    'create_orders',
    'view_orders',
    'manage_gammes',
    'manage_retrofit_operations',
    'view_inventory',
  ],
  logistique: [
    'view_dashboard',
    'manage_inventory',
    'view_orders',
    'view_parts_alerts',
    'manage_stock',
    'view_parts_requirements',
  ],
  technicien: [
    'view_dashboard',
    'view_assigned_orders',
    'update_order_status',
    'view_gammes',
    'log_hours',
    'report_issues',
  ],
}
