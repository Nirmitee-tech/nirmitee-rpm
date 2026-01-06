/**
 * Microsoft OAuth Provider Implementation
 * Supports Microsoft Entra ID (Azure AD) and personal Microsoft accounts
 */

import {
  IOAuthProvider,
  OAuthConfig,
  OAuthAuthorizationUrl,
  OAuthCallbackParams,
  OAuthTokens,
  OAuthUserProfile,
  oauthProviderRegistry,
} from './oauth-provider.interface';
import crypto from 'crypto';

// Microsoft identity platform endpoints
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com';
const MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me';

export class MicrosoftOAuthProvider implements IOAuthProvider {
  readonly type = 'MICROSOFT';

  private getAuthEndpoint(tenantId?: string): string {
    // Use 'common' for both personal and work accounts
    // Use 'organizations' for work/school accounts only
    // Use specific tenant ID for single-tenant apps
    const tenant = tenantId || 'common';
    return `${MICROSOFT_AUTH_URL}/${tenant}/oauth2/v2.0`;
  }

  async getAuthorizationUrl(config: OAuthConfig, state: string): Promise<OAuthAuthorizationUrl> {
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const authEndpoint = this.getAuthEndpoint(config.tenantId);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      response_mode: 'query',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Add domain hint if specified
    if (config.domain) {
      params.append('domain_hint', config.domain);
    }

    return {
      url: `${authEndpoint}/authorize?${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  async exchangeCodeForTokens(config: OAuthConfig, params: OAuthCallbackParams): Promise<OAuthTokens> {
    const authEndpoint = this.getAuthEndpoint(config.tenantId);

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    });

    // Add PKCE code verifier if available
    if (params.codeVerifier) {
      body.append('code_verifier', params.codeVerifier);
    }

    const response = await fetch(`${authEndpoint}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Microsoft token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async getUserProfile(tokens: OAuthTokens): Promise<OAuthUserProfile> {
    const response = await fetch(MICROSOFT_GRAPH_URL, {
      headers: {
        Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Microsoft user profile');
    }

    const data = await response.json();

    // Try to get profile photo
    let avatar: string | undefined;
    try {
      const photoResponse = await fetch(`${MICROSOFT_GRAPH_URL}/photo/$value`, {
        headers: {
          Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
        },
      });
      if (photoResponse.ok) {
        const blob = await photoResponse.blob();
        const buffer = await blob.arrayBuffer();
        avatar = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
      }
    } catch {
      // Photo not available, continue without it
    }

    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      firstName: data.givenName || data.displayName?.split(' ')[0] || '',
      lastName: data.surname || data.displayName?.split(' ').slice(1).join(' ') || '',
      avatar,
      emailVerified: true, // Microsoft accounts are verified
      rawProfile: data,
    };
  }

  async refreshAccessToken(config: OAuthConfig, refreshToken: string): Promise<OAuthTokens> {
    const authEndpoint = this.getAuthEndpoint(config.tenantId);

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: config.scopes.join(' '),
    });

    const response = await fetch(`${authEndpoint}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Microsoft token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async revokeTokens(tokens: OAuthTokens): Promise<void> {
    // Microsoft doesn't have a standard token revocation endpoint for OAuth2
    // The token will expire naturally
    // For proper logout, redirect user to Microsoft logout URL
    console.log('Microsoft OAuth tokens will expire naturally');
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}

// Register the provider
oauthProviderRegistry.register(new MicrosoftOAuthProvider());
