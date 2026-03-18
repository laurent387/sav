// Service API pour communiquer avec le serveur 87.106.26.179
import type { User, LoginRequest, AuthToken } from '../types/auth'

const API_BASE_URL = '/lift-gmao/api'

// Classe pour gérer les requêtes API
export class ApiService {
  private static token: string | null = localStorage.getItem('access_token')

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  public static setToken(token: string): void {
    this.token = token
    localStorage.setItem('access_token', token)
  }

  public static clearToken(): void {
    this.token = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    })

    if (response.status === 401) {
      this.clearToken()
      window.location.href = '/login'
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  public static async login(credentials: LoginRequest): Promise<{ user: User; token: AuthToken }> {
    const response = await this.request<{ user: User; token: AuthToken }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    this.setToken(response.token.access_token)
    localStorage.setItem('user', JSON.stringify(response.user))
    return response
  }

  public static async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' }).catch(() => {
      // Logout côté client même si le serveur échoue
    })
    this.clearToken()
  }

  public static async refreshToken(): Promise<AuthToken> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await this.request<AuthToken>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    this.setToken(response.access_token)
    return response
  }

  public static async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  // Data endpoints
  public static async getWorkOrders(filters?: Record<string, unknown>) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    return this.request(`/orders?${params.toString()}`)
  }

  public static async getWorkOrderDetail(id: string) {
    return this.request(`/orders/${id}`)
  }

  public static async createWorkOrder(data: unknown) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  public static async updateWorkOrder(id: string, data: unknown) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  public static async getLiftUnits(filters?: Record<string, unknown>) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    return this.request(`/lift-units?${params.toString()}`)
  }

  public static async getGammes() {
    return this.request('/gammes')
  }

  public static async getTechnicians() {
    return this.request('/technicians')
  }

  public static async getPartsAlerts() {
    return this.request('/parts-alerts')
  }

  public static async getFncs() {
    return this.request('/fncs')
  }

  public static async createFnc(data: unknown) {
    return this.request('/fncs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  public static async getRetrofitOperations() {
    return this.request('/retrofit-operations')
  }

  // Mock fallback si serveur non disponible
  public static async loginMock(credentials: LoginRequest) {
    // Simulation locale pour développement
    await new Promise((resolve) => setTimeout(resolve, 500))

    const mockUsers: Record<string, { user: User; password: string }> = {
      admin: {
        password: 'admin123',
        user: {
          id: '1',
          username: 'admin',
          email: 'admin@lift.fr',
          fullName: 'Administrateur',
          role: 'admin',
          active: true,
        },
      },
      'be@lift.fr': {
        password: 'be123',
        user: {
          id: '2',
          username: 'be@lift.fr',
          email: 'be@lift.fr',
          fullName: 'Jean-Pierre Bureau',
          role: 'bureau-etude',
          active: true,
        },
      },
      'logistique@lift.fr': {
        password: 'log123',
        user: {
          id: '3',
          username: 'logistique@lift.fr',
          email: 'logistique@lift.fr',
          fullName: 'Marie Logistique',
          role: 'logistique',
          active: true,
        },
      },
      'tech@lift.fr': {
        password: 'tech123',
        user: {
          id: '4',
          username: 'tech@lift.fr',
          email: 'tech@lift.fr',
          fullName: 'Pierre Technicien',
          role: 'technicien',
          active: true,
        },
      },
    }

    const user = mockUsers[credentials.username]
    if (!user || user.password !== credentials.password) {
      throw new Error('Identifiants invalides')
    }

    return {
      user: user.user,
      token: {
        access_token: 'mock-token-' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
      },
    }
  }
}
