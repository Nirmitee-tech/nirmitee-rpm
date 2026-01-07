# ADR-002: JWT Authentication with Refresh Tokens

## Status
Accepted

## Context
Healthcare SaaS platform requires secure, scalable authentication supporting:
- Multi-tenant access (organization-scoped sessions)
- OAuth/SSO integration (Google, Microsoft)
- Mobile/web clients
- Session management and revocation
- Security best practices for healthcare data (HIPAA-ready)

Need authentication mechanism balancing security, performance, and user experience.

## Decision
Implement **JWT-based authentication with refresh token rotation**:

### Access Tokens
- Short-lived (15 minutes)
- Stored in memory (React context)
- Contains: userId, organizationId, role, permissions
- Used for API authorization

### Refresh Tokens
- Long-lived (7 days)
- Stored in httpOnly secure cookie
- One-time use with rotation (new token on each refresh)
- Stored in database for revocation capability

### Token Structure
```typescript
AccessToken: {
  userId: string
  organizationId: string
  role: string
  permissions: string[]
  exp: number
}

RefreshToken: {
  userId: string
  sessionId: string
  exp: number
}
```

## Consequences

### Positive
- **Stateless authorization**: API doesn't need session lookup for most requests
- **Scalable**: No session storage bottleneck
- **Revocable**: Refresh tokens in DB enable logout and session management
- **Short attack window**: 15-min access token limits exposure if compromised
- **OAuth-friendly**: Works seamlessly with SSO flows
- **XSS protection**: httpOnly cookies prevent JavaScript access
- **Mobile-ready**: Token-based auth works across platforms

### Negative
- **Complexity**: More complex than session-based auth
- **Token size**: JWT payload increases request size slightly
- **Refresh overhead**: Client must handle token refresh logic
- **Database dependency**: Refresh token validation requires DB lookup
- **No immediate revocation**: Access tokens valid until expiry (max 15 min)

## Alternatives Considered

### 1. Session-based authentication
- Server-side sessions in Redis or database
- **Rejected**: Harder to scale, requires sticky sessions or shared session store, not ideal for mobile

### 2. Long-lived JWT without refresh
- Single JWT valid for days/weeks
- **Rejected**: Security risk if token compromised, no revocation mechanism

### 3. Short-lived JWT without refresh
- User re-authenticates frequently
- **Rejected**: Poor UX, interrupts workflow

### 4. Opaque tokens with token introspection
- Random tokens, server validates each request
- **Rejected**: Requires DB lookup for every request, scaling bottleneck

## Implementation Details

### Token Generation
```typescript
// apps/api/src/utils/jwt.ts
generateTokens(user, organization) {
  const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' })
  const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' })

  // Store refresh token in database
  await createSession(userId, refreshToken)

  return { accessToken, refreshToken }
}
```

### Token Refresh Flow
1. Client detects 401 or expired access token
2. Sends refresh token to `/api/auth/refresh`
3. Server validates refresh token from DB
4. Issues new access + refresh tokens
5. Invalidates old refresh token
6. Client stores new tokens

### Security Measures
- Refresh token rotation (one-time use)
- httpOnly secure cookies for refresh tokens
- CSRF protection for cookie-based requests
- Token family tracking (detect token reuse attacks)
- Rate limiting on refresh endpoint

## OAuth Integration
OAuth providers (Google, Microsoft) return their own tokens. We:
1. Validate OAuth token
2. Create/find user
3. Issue our own JWT pair
4. Store OAuth tokens encrypted in database

## Migration Path
If switching from JWT needed:
1. Dual-token period (support both old and new)
2. Gradual rollout via feature flag
3. Force re-login after cutoff date

## Related
- ADR-003: Multi-tenancy approach (organizationId in token)
- Security documentation on token handling
- MFA implementation (additional verification layer)
