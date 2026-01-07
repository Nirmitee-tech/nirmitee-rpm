# API Documentation

## Base URL
```
Development: http://localhost:4000/api/v1
Production: https://api.nirmitee.io/api/v1
```

## Authentication

### JWT Access Token
All authenticated endpoints require Bearer token in Authorization header:
```http
Authorization: Bearer <access_token>
```

### Token Refresh
Access tokens expire after 15 minutes. Use refresh token to get new tokens:
```http
POST /api/v1/auth/refresh
Cookie: refreshToken=<token>
```

### OAuth Login
```http
GET /api/v1/oauth/providers
GET /api/v1/oauth/{provider}/authorize
GET /api/v1/oauth/{provider}/callback?code=...
```

## Request/Response Format

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <access_token>
X-Organization-Id: <org_id>  # Optional, defaults to user's org
```

### Success Response (200)
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be valid email" }
    ]
  }
}
```

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Pagination

### Cursor-Based (Recommended)
```http
GET /api/v1/patients?cursor=abc123&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "nextCursor": "def456",
    "hasMore": true
  }
}
```

### Offset-Based
```http
GET /api/v1/patients?page=1&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Filtering & Sorting

### Query Parameters
```http
# Filtering
GET /api/v1/patients?status=ACTIVE&condition=HYPERTENSION

# Sorting
GET /api/v1/patients?sortBy=createdAt&sortOrder=desc

# Combined
GET /api/v1/patients?status=ACTIVE&sortBy=lastName&limit=50
```

## Rate Limiting

### Default Limits
- Authenticated: 100 requests/minute
- Unauthenticated: 20 requests/minute
- OAuth callback: 10 requests/minute

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1609459200
```

### Rate Limit Exceeded
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 60 seconds."
  }
}
```

## Webhooks

### Supported Events
- `patient.created`
- `patient.updated`
- `alert.critical`
- `vital_reading.created`
- `care_plan.updated`

### Webhook Payload
```json
{
  "event": "alert.critical",
  "timestamp": "2026-01-07T10:30:00Z",
  "organizationId": "org_123",
  "data": {
    "alertId": "alert_456",
    "patientId": "pat_789",
    "severity": "CRITICAL",
    "message": "Blood pressure critically high"
  }
}
```

### Webhook Signature Verification
```javascript
const crypto = require('crypto')

const signature = req.headers['x-webhook-signature']
const payload = JSON.stringify(req.body)
const secret = process.env.WEBHOOK_SECRET

const expected = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex')

if (signature !== expected) {
  throw new Error('Invalid signature')
}
```

## Batch Operations

### Batch Create
```http
POST /api/v1/vital-readings/batch

{
  "readings": [
    { "patientId": "...", "type": "BLOOD_PRESSURE", ... },
    { "patientId": "...", "type": "WEIGHT", ... }
  ]
}

Response:
{
  "success": true,
  "data": {
    "created": 2,
    "failed": 0,
    "results": [...]
  }
}
```

## File Uploads

### Upload Endpoint
```http
POST /api/v1/upload
Content-Type: multipart/form-data

file: <binary>
```

### Response
```json
{
  "success": true,
  "data": {
    "fileId": "file_123",
    "key": "uploads/org_456/file_123.pdf",
    "url": "https://cdn.nirmitee.io/uploads/...",
    "contentType": "application/pdf",
    "size": 102400
  }
}
```

## API Versioning

Current version: **v1**

Future versions accessible at `/api/v2`, `/api/v3`, etc.

### Version Lifecycle
- **Active**: Current version, full support
- **Deprecated**: 6-month warning before removal
- **Sunset**: Scheduled removal date announced

### Deprecation Headers
```http
X-API-Deprecation: true
X-API-Sunset-Date: 2027-01-01
Link: <https://docs.nirmitee.io/v1-to-v2>; rel="migration"
```

## SDK & Client Libraries

### Official SDKs
- JavaScript/TypeScript: `@nirmitee/sdk-js`
- Python: `nirmitee-sdk`
- C#: `NirmiteeRPM.SDK`

### Example Usage (JavaScript)
```javascript
import { NirmiteeClient } from '@nirmitee/sdk-js'

const client = new NirmiteeClient({
  apiKey: process.env.NIRMITEE_API_KEY,
  baseUrl: 'https://api.nirmitee.io/api/v1'
})

const patients = await client.patients.list({
  status: 'ACTIVE',
  limit: 20
})
```

## Sandbox Environment

### Test API
```
Sandbox URL: https://sandbox-api.nirmitee.io/api/v1
```

### Test Credentials
```
Email: test@example.com
Password: Test123!@#
Org: sandbox_org_123
```

### Test Data
- Pre-seeded with sample patients, devices, vitals
- Reset daily at 00:00 UTC
- Rate limits: 1000 requests/minute

## Support

- **Documentation**: https://docs.nirmitee.io
- **API Status**: https://status.nirmitee.io
- **Support Email**: api-support@nirmitee.io
- **Community**: https://community.nirmitee.io
