# Deployment Runbook

## Production Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] All tests passing (unit, integration)
- [ ] Security scan completed
- [ ] Database migrations tested on staging
- [ ] Environment variables configured
- [ ] Backup current database
- [ ] Notify team of deployment window

### Deployment Steps

#### 1. Database Migration
```bash
# Connect to production database
 psql $DATABASE_URL

# Backup database
pg_dump -Fc $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).dump

# Run migrations
cd apps/api
pnpm prisma migrate deploy

# Verify migration
pnpm prisma migrate status
```

#### 2. Build Application
```bash
# Build all packages
pnpm build

# Verify build artifacts
ls -la apps/api/dist
ls -la apps/web/.next
```

#### 3. Deploy API (Blue-Green)
```bash
# Tag Docker image
docker build -t nirmitee-api:$(git rev-parse --short HEAD) -f docker/Dockerfile.api .
docker tag nirmitee-api:$(git rev-parse --short HEAD) registry.example.com/nirmitee-api:latest

# Push to registry
docker push registry.example.com/nirmitee-api:latest

# Deploy to new environment (green)
kubectl apply -f k8s/api-deployment-green.yaml

# Wait for health check
kubectl rollout status deployment/nirmitee-api-green

# Switch traffic (update service selector)
kubectl patch service nirmitee-api -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for errors (5 minutes)
# If errors, rollback:
# kubectl patch service nirmitee-api -p '{"spec":{"selector":{"version":"blue"}}}'

# If successful, scale down blue
kubectl scale deployment nirmitee-api-blue --replicas=0
```

#### 4. Deploy Web (Next.js)
```bash
# Deploy to Vercel (or custom hosting)
vercel --prod

# Or Docker
docker build -t nirmitee-web:$(git rev-parse --short HEAD) -f docker/Dockerfile.web .
docker push registry.example.com/nirmitee-web:latest
kubectl apply -f k8s/web-deployment.yaml
```

#### 5. Smoke Tests
```bash
# API health check
curl https://api.nirmitee.io/api/v1/health

# Test login
curl -X POST https://api.nirmitee.io/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"..."}'

# Web accessibility
curl https://app.nirmitee.io
```

### Post-Deployment
- [ ] Verify health checks passing
- [ ] Check error rates in monitoring
- [ ] Verify critical user flows working
- [ ] Update deployment log
- [ ] Monitor for 30 minutes
- [ ] Notify team of completion

### Rollback Procedure
```bash
# Revert deployment
kubectl patch service nirmitee-api -p '{"spec":{"selector":{"version":"blue"}}}'
kubectl scale deployment nirmitee-api-blue --replicas=3

# Revert database migration (if needed)
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.dump

# Notify team of rollback
```

## Zero-Downtime Deployment

### Strategy: Blue-Green
1. Deploy new version to "green" environment
2. Run health checks on green
3. Switch traffic from blue to green
4. Monitor green for issues
5. Scale down blue if successful
6. Keep blue for quick rollback

### Database Migrations
- Backward-compatible migrations only
- No column drops in same deployment as code
- Multi-phase migrations for breaking changes:
  - Phase 1: Add new column, dual-write
  - Phase 2: Backfill data
  - Phase 3: Switch reads to new column
  - Phase 4: Drop old column (separate deployment)

## Deployment Environments

### Development
- Auto-deploy on push to `develop` branch
- Database: dev.nirmitee.io
- URL: https://dev.nirmitee.io

### Staging
- Auto-deploy on push to `staging` branch
- Database: staging.nirmitee.io (copy of production)
- URL: https://staging.nirmitee.io
- Test migrations here first

### Production
- Manual deploy from `main` branch
- Database: production cluster
- URL: https://app.nirmitee.io
- Requires approval from 2 reviewers

## Emergency Hotfix Procedure
1. Create hotfix branch from `main`
2. Make minimal fix
3. Test on staging
4. Fast-track review
5. Deploy to production
6. Merge back to `develop`

## Deployment Monitoring
- Error rate dashboard
- Response time metrics
- Database connection pool
- Memory/CPU usage
- Active WebSocket connections
