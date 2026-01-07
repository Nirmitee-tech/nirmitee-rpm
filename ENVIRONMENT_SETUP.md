# Environment Configuration Guide

This guide explains how to set up environment variables for the NirmiteeRPM project.

## Quick Start

### API Backend (`apps/api`)

1. Copy the example file:
   ```bash
   cd apps/api
   cp .env.example .env
   ```

2. Update required variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Generate with: `openssl rand -base64 32`
   - `JWT_REFRESH_SECRET` - Generate with: `openssl rand -base64 32`

3. Start the API:
   ```bash
   pnpm dev
   ```

### Web Frontend (`apps/web`)

1. Copy the example file:
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```

2. Update required variables:
   - `NEXT_PUBLIC_API_URL` - Your API backend URL (default: http://localhost:4000)

3. Start the frontend:
   ```bash
   pnpm dev
   ```

## Required Variables

### API Backend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes | - |
| `JWT_SECRET` | Secret for access tokens | ✅ Yes | - |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | ✅ Yes | - |
| `PORT` | Server port | No | 4000 |
| `NODE_ENV` | Environment (development/production) | No | development |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:3000 |

### Web Frontend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | API backend URL | ✅ Yes | http://localhost:4000 |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | No | Same as API URL |
| `NEXT_PUBLIC_APP_NAME` | Application name | No | NirmiteeRPM |

## Optional Features

### Email (SMTP)

Configure SMTP to enable email notifications:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="NirmiteeRPM <noreply@yourdomain.com>"
```

**Development Tip:** Use [MailHog](https://github.com/mailhog/MailHog) or [Mailpit](https://github.com/axllent/mailpit) for local email testing without sending real emails.

### Redis (Caching & Job Queues)

Redis improves performance and enables background jobs:

```env
REDIS_URL=redis://localhost:6379
```

**Note:** The application will work without Redis, but caching and background jobs will be disabled.

### File Storage (S3-Compatible)

Configure S3 or MinIO for file uploads:

**MinIO (Local Development):**
```env
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=nirmitee-uploads
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_USE_PATH_STYLE=true
```

**AWS S3 (Production):**
```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
S3_USE_PATH_STYLE=false
```

### Stripe Billing

Enable subscription billing with Stripe:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Get your keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys).

For frontend (in `apps/web/.env.local`):
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### OAuth 2.0 Authentication

Enable social login with OAuth providers.

#### Google OAuth

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URI: `http://localhost:4000/api/oauth/callback`
3. Configure in backend:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

#### Microsoft OAuth (Azure AD)

1. Register app in [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Add redirect URI: `http://localhost:4000/api/oauth/callback`
3. Configure in backend:
   ```env
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_TENANT_ID=common
   ```

#### GitHub OAuth

1. Create OAuth app in [GitHub Developer Settings](https://github.com/settings/developers)
2. Add authorization callback URL: `http://localhost:4000/api/oauth/callback`
3. Configure in backend:
   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

## Development Tools

### Local Email Testing

**MailHog:**
```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```
View emails at: http://localhost:8025

**Mailpit:**
```bash
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit
```
View emails at: http://localhost:8025

### Local Object Storage (MinIO)

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

Access MinIO console at: http://localhost:9001

### Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

## Production Deployment

### Security Checklist

- [ ] Generate strong random secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Use production database with SSL enabled
- [ ] Configure SMTP with real email provider
- [ ] Use production S3 bucket with proper IAM permissions
- [ ] Use Stripe live keys (not test keys)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Configure Redis with password authentication
- [ ] Review and restrict CORS origins in `FRONTEND_URL`
- [ ] Set up proper monitoring and error tracking

### Environment-Specific Variables

**Staging:**
```env
NODE_ENV=production
API_URL=https://api-staging.yourdomain.com
FRONTEND_URL=https://app-staging.yourdomain.com
```

**Production:**
```env
NODE_ENV=production
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

## Troubleshooting

### Database Connection Issues

**Error:** `Unable to connect to database`

**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check connection string format
- Ensure database exists: `createdb nirmitee_rpm`
- Run migrations: `pnpm prisma migrate deploy`

### Email Not Sending

**Error:** `SMTP connection failed`

**Solution:**
- Verify SMTP credentials
- Check firewall/network restrictions
- Use MailHog/Mailpit for local testing
- Enable "Less secure apps" for Gmail (or use App Password)

### Redis Connection Failed

**Note:** Redis is optional. The app will continue to work without it.

**Solution:**
- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` format
- Ensure Redis port (6379) is accessible

### File Upload Errors

**Error:** `S3 credentials invalid`

**Solution:**
- Verify S3/MinIO credentials
- Check bucket exists and is accessible
- For MinIO, ensure `S3_USE_PATH_STYLE=true`
- For AWS S3, verify IAM permissions

### OAuth Callback Errors

**Error:** `Invalid redirect_uri`

**Solution:**
- Verify redirect URI matches OAuth provider configuration
- Check exact URL including protocol (http/https)
- Ensure no trailing slashes in URLs

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [MinIO Documentation](https://docs.min.io/)

## Support

For issues or questions:
- Check existing [GitHub Issues](https://github.com/yourusername/nirmiteerpm/issues)
- Create a new issue with environment details
- Join our community discussions
