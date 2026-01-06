/**
 * OAuth Provider Interface
 * Extensible interface for implementing different OAuth providers
 */

export interface OAuthUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  emailVerified: boolean;
  rawProfile: Record<string, unknown>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType: string;
  scope?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  tenantId?: string; // For Microsoft
  domain?: string; // For Google Workspace domain restriction
  settings?: Record<string, unknown>;
}

export interface OAuthAuthorizationUrl {
  url: string;
  state: string;
  codeVerifier?: string; // For PKCE
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  codeVerifier?: string;
}

/**
 * Abstract OAuth Provider Interface
 * Implement this for each OAuth provider (Google, Microsoft, etc.)
 */
export interface IOAuthProvider {
  /**
   * Provider type identifier
   */
  readonly type: string;

  /**
   * Get the authorization URL to redirect users to
   */
  getAuthorizationUrl(config: OAuthConfig, state: string): Promise<OAuthAuthorizationUrl>;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(config: OAuthConfig, params: OAuthCallbackParams): Promise<OAuthTokens>;

  /**
   * Get user profile from provider
   */
  getUserProfile(tokens: OAuthTokens): Promise<OAuthUserProfile>;

  /**
   * Refresh expired access token
   */
  refreshAccessToken(config: OAuthConfig, refreshToken: string): Promise<OAuthTokens>;

  /**
   * Revoke tokens (logout from provider)
   */
  revokeTokens?(tokens: OAuthTokens): Promise<void>;

  /**
   * Validate token is still valid
   */
  validateToken?(accessToken: string): Promise<boolean>;
}

/**
 * OAuth Provider Registry
 * Manages available OAuth providers
 */
export class OAuthProviderRegistry {
  private providers: Map<string, IOAuthProvider> = new Map();

  register(provider: IOAuthProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: string): IOAuthProvider | undefined {
    return this.providers.get(type);
  }

  has(type: string): boolean {
    return this.providers.has(type);
  }

  getAll(): IOAuthProvider[] {
    return Array.from(this.providers.values());
  }

  getSupportedTypes(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Global provider registry
export const oauthProviderRegistry = new OAuthProviderRegistry();
