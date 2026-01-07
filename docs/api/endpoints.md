# API Endpoints Reference

Base URL: `/api/v1`

## Authentication

### POST /auth/signup
Create new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "user": { "id": "...", "email": "...", "firstName": "John", "lastName": "Doe" },
  "accessToken": "eyJhbGc...",
  "refreshToken": "..."
}
```

### POST /auth/login
Authenticate user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": { "id": "...", "email": "...", "organizations": [...] },
  "accessToken": "eyJhbGc...",
  "requiresMfa": false
}
```

### POST /auth/refresh
Refresh access token.

**Headers:** `Cookie: refreshToken=...`

**Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "..."
}
```

### POST /auth/logout
Logout user.

**Response (200):**
```json
{ "success": true }
```

### POST /auth/forgot-password
Request password reset.

**Request:**
```json
{ "email": "user@example.com" }
```

### POST /auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset_token",
  "password": "NewSecurePass123!"
}
```

## MFA

### GET /mfa/status
Get MFA status for user.

**Response:**
```json
{
  "enabled": true,
  "method": "TOTP",
  "backupCodesRemaining": 8
}
```

### POST /mfa/enable
Enable TOTP MFA.

**Request:**
```json
{ "method": "TOTP" }
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "secret": "BASE32SECRET",
  "backupCodes": ["123456", "234567", ...]
}
```

### POST /mfa/verify
Verify MFA code.

**Request:**
```json
{ "code": "123456" }
```

### POST /mfa/disable
Disable MFA.

**Request:**
```json
{ "password": "current_password" }
```

## Users

### GET /users
List organization users.

**Query Params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search query
- `role`: Filter by role ID
- `status`: Filter by status

**Response:**
```json
{
  "data": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": { "id": "...", "name": "Admin" },
      "status": "ACTIVE",
      "joinedAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

### GET /users/:id
Get user by ID.

### PUT /users/:id
Update user.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

### DELETE /users/:id
Soft delete user.

## Organizations

### GET /organizations
List user's organizations.

### POST /organizations
Create new organization.

**Request:**
```json
{
  "name": "Acme Health",
  "slug": "acme-health"
}
```

### GET /organizations/:id
Get organization details.

### PUT /organizations/:id
Update organization.

### PUT /organizations/:id/settings
Update organization settings.

**Request:**
```json
{
  "brandingColors": { "primary": "#0070f3" },
  "mfaRequired": true,
  "sessionTimeout": 3600
}
```

## Teams

### GET /teams
List organization teams.

### POST /teams
Create team.

**Request:**
```json
{
  "name": "Clinical Team Alpha",
  "description": "Primary clinical care team"
}
```

### GET /teams/:id
Get team details.

### POST /teams/:id/members
Add team member.

**Request:**
```json
{
  "userId": "user_123",
  "role": "MEMBER"  // or "LEAD"
}
```

### DELETE /teams/:id/members/:userId
Remove team member.

## Roles

### GET /roles
List roles.

### POST /roles
Create custom role.

**Request:**
```json
{
  "name": "Care Coordinator",
  "description": "Manages patient care plans",
  "permissions": ["patients:read", "patients:write", "care_plans:manage"]
}
```

### GET /roles/:id
Get role with permissions.

### PUT /roles/:id
Update role.

### DELETE /roles/:id
Delete custom role.

## Invitations

### GET /invitations
List pending invitations.

### POST /invitations
Invite user to organization.

**Request:**
```json
{
  "email": "newuser@example.com",
  "roleId": "role_123"
}
```

### POST /invitations/:token/accept
Accept invitation.

### DELETE /invitations/:id
Revoke invitation.

## Notifications

### GET /notifications
Get user notifications.

**Query Params:**
- `unread`: true (filter unread only)
- `limit`: Items per page

**Response:**
```json
{
  "data": [
    {
      "id": "notif_123",
      "type": "TEAM_INVITE",
      "title": "Team Invitation",
      "message": "You were added to Clinical Team Alpha",
      "isRead": false,
      "createdAt": "2026-01-07T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

### PUT /notifications/:id/read
Mark notification as read.

### PUT /notifications/read-all
Mark all as read.

### GET /notification-preferences
Get notification preferences.

### PUT /notification-preferences
Update preferences.

**Request:**
```json
{
  "emailEnabled": true,
  "pushEnabled": true,
  "securityAlerts": true,
  "teamUpdates": false,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00"
}
```

## Sessions

### GET /sessions
List active sessions.

**Response:**
```json
{
  "data": [
    {
      "id": "session_123",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-01-07T10:00:00Z",
      "expiresAt": "2026-01-14T10:00:00Z",
      "isCurrent": true
    }
  ]
}
```

### DELETE /sessions/:id
Revoke specific session.

### DELETE /sessions
Revoke all sessions except current.

## Audit Logs

### GET /audit
List audit logs.

**Query Params:**
- `userId`: Filter by user
- `action`: Filter by action
- `entity`: Filter by entity type
- `startDate`: Filter by date range
- `endDate`: Filter by date range

**Response:**
```json
{
  "data": [
    {
      "id": "log_123",
      "userId": "user_456",
      "action": "patient.viewed",
      "entity": "patient",
      "entityId": "pat_789",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-01-07T10:30:00Z"
    }
  ]
}
```

## Activity Feed

### GET /activity
Get organization activity feed.

**Query Params:**
- `limit`: Items per page
- `entityType`: Filter by entity type

**Response:**
```json
{
  "data": [
    {
      "id": "activity_123",
      "actorName": "John Doe",
      "action": "created",
      "entityType": "patient",
      "entityName": "Jane Smith",
      "createdAt": "2026-01-07T11:00:00Z"
    }
  ]
}
```

## Billing

### GET /billing/subscription
Get current subscription.

**Response:**
```json
{
  "status": "ACTIVE",
  "plan": "Professional",
  "currentPeriodStart": "2026-01-01T00:00:00Z",
  "currentPeriodEnd": "2026-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

### POST /billing/subscription
Create subscription.

**Request:**
```json
{
  "priceId": "price_pro_monthly"
}
```

### PUT /billing/subscription
Update subscription.

### DELETE /billing/subscription
Cancel subscription.

### GET /billing/invoices
List invoices.

**Response:**
```json
{
  "data": [
    {
      "id": "inv_123",
      "amount": 9900,  // cents
      "currency": "usd",
      "status": "PAID",
      "paidAt": "2026-01-01T00:00:00Z",
      "invoiceUrl": "https://...",
      "invoicePdf": "https://..."
    }
  ]
}
```

## File Upload

### POST /upload
Upload file.

**Content-Type:** `multipart/form-data`

**Response:**
```json
{
  "fileId": "file_123",
  "key": "uploads/org_456/file_123.pdf",
  "url": "https://cdn.nirmitee.io/uploads/...",
  "contentType": "application/pdf",
  "size": 102400
}
```

## Search

### GET /search
Search across entities.

**Query Params:**
- `q`: Search query
- `type`: Entity type (users, teams, patients)

**Response:**
```json
{
  "results": {
    "users": [...],
    "teams": [...]
  }
}
```

## OAuth

### GET /oauth/providers
List available OAuth providers.

### GET /oauth/{provider}/authorize
Redirect to OAuth provider.

### GET /oauth/{provider}/callback
OAuth callback (handles code exchange).

## Webhooks

### GET /webhooks
List webhooks.

### POST /webhooks
Create webhook.

**Request:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["patient.created", "alert.critical"],
  "secret": "webhook_secret_123"
}
```

### DELETE /webhooks/:id
Delete webhook.

## Health Check

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-07T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "email", "message": "Must be valid email" }
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 429 Rate Limit Exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 60 seconds."
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```
