import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Use host machine IP for simulator connectivity (localhost refers to simulator itself)
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.38:4000/api';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

// Callback for when auth expires - will be set by auth store
let onAuthExpired: (() => void) | null = null;

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setOnAuthExpired(callback: () => void) {
    onAuthExpired = callback;
  }

  async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem('accessToken');
  }

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem('refreshToken');
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem('accessToken', accessToken),
      AsyncStorage.setItem('refreshToken', refreshToken),
    ]);
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem('accessToken'),
      AsyncStorage.removeItem('refreshToken'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('organization'),
    ]);
  }

  private async refreshAccessToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh calls
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      console.log('[API] No refresh token available');
      return false;
    }

    try {
      console.log('[API] Attempting token refresh...');
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.log('[API] Refresh failed with status:', response.status);
        return false;
      }

      const json = await response.json();

      // Handle both wrapped {success, data} and direct response formats
      let accessToken: string | undefined;
      let newRefreshToken: string | undefined;

      if ('success' in json && json.success && json.data) {
        accessToken = json.data.accessToken;
        newRefreshToken = json.data.refreshToken;
      } else if (json.accessToken) {
        accessToken = json.accessToken;
        newRefreshToken = json.refreshToken;
      }

      if (accessToken) {
        await this.setTokens(accessToken, newRefreshToken || refreshToken);
        console.log('[API] Token refresh successful');
        return true;
      }

      console.log('[API] No access token in refresh response');
      return false;
    } catch (error) {
      console.error('[API] Token refresh error:', error);
      return false;
    }
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Add auth header if not skipping auth
    if (!skipAuth) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 - try refresh token
    if (response.status === 401 && !skipAuth) {
      console.log('[API] Got 401, attempting refresh...');
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        // Retry with new token
        const newToken = await this.getAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
          });
        }
      }

      // If still 401 after refresh attempt, auth has expired
      if (response.status === 401) {
        console.log('[API] Auth expired, clearing tokens...');
        await this.clearTokens();
        if (onAuthExpired) {
          onAuthExpired();
        }
        throw new Error('Session expired. Please log in again.');
      }
    }

    // Parse response
    let json: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      json = await response.json();
    } else {
      const text = await response.text();
      throw new Error(text || 'Request failed');
    }

    // Handle error responses
    if (!response.ok) {
      const errorMessage = json?.error || json?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Handle both wrapped {success, data} and direct response formats
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      if (!json.success) {
        throw new Error(json.error || 'Request failed');
      }
      return json.data as T;
    }

    return json as T;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
