/**
 * Google OAuth Provider Implementation
 * Supports Google Workspace and personal Google accounts
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

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export class GoogleOAuthProvider implements IOAuthProvider {
  readonly type = 'GOOGLE';

  async getAuthorizationUrl(config: OAuthConfig, state: string): Promise<OAuthAuthorizationUrl> {
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to get refresh token
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Add domain restriction for Google Workspace
    if (config.domain) {
      params.append('hd', config.domain);
    }

    return {
      url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  async exchangeCodeForTokens(config: OAuthConfig, params: OAuthCallbackParams): Promise<OAuthTokens> {
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

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google token exchange failed: ${error.error_description || error.error}`);
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
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `${tokens.tokenType} ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Google user profile');
    }

    const data = await response.json();

    return {
      id: data.id,
      email: data.email,
      firstName: data.given_name || data.name?.split(' ')[0] || '',
      lastName: data.family_name || data.name?.split(' ').slice(1).join(' ') || '',
      avatar: data.picture,
      emailVerified: data.verified_email,
      rawProfile: data,
    };
  }

  async refreshAccessToken(config: OAuthConfig, refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google token refresh failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Google may not return a new refresh token
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async revokeTokens(tokens: OAuthTokens): Promise<void> {
    const params = new URLSearchParams({
      token: tokens.accessToken,
    });

    await fetch(`${GOOGLE_REVOKE_URL}?${params.toString()}`, {
      method: 'POST',
    });
    // Google revoke returns 200 even if token is invalid, so we don't throw
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}

// Register the provider
oauthProviderRegistry.register(new GoogleOAuthProvider());
