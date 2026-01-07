# ADR-005: API Versioning with /v1/ Prefix Strategy

## Status
Accepted

## Context
Healthcare platform API will evolve over time with:
- New features and endpoints
- Breaking changes to existing endpoints
- Bug fixes and improvements
- Mobile and web clients with different update cycles

Need versioning strategy that:
- Supports multiple API versions concurrently
- Allows breaking changes without disrupting existing clients
- Clear communication of API evolution
- Simple for clients to adopt
- Maintainable for development team

## Decision
Implement **URL path-based versioning with /v1/ prefix**.

### API Structure
```
/api/v1/auth/login
/api/v1/patients
/api/v1/vital-readings
```

### Version in Request Path
```bash
# Version 1
POST https://api.nirmitee.io/api/v1/auth/login

# Future version 2
POST https://api.nirmitee.io/api/v2/auth/login
```

### Route Organization
```
apps/api/src/routes/
├── index.ts           # Route aggregator
├── v1/
│   ├── index.ts       # v1 route aggregator
│   ├── auth-routes.ts
│   ├── patient-routes.ts
│   └── ...
└── v2/               # Future versions
    └── ...
```

## Consequences

### Positive
- **Explicit versioning**: Clear which API version client uses
- **Concurrent versions**: Run v1 and v2 simultaneously during migration
- **Simple routing**: Standard Express routing, no custom middleware
- **Client control**: Clients choose when to upgrade
- **Cache-friendly**: Different URLs = different cache entries
- **Documentation clarity**: Docs organized by version
- **Easy testing**: Test multiple versions in parallel

### Negative
- **URL length**: Slightly longer URLs
- **Code duplication**: May duplicate code between versions
- **Maintenance burden**: Supporting multiple versions simultaneously
- **Route proliferation**: More route files as versions increase
- **Migration complexity**: Clients must update base URL

## Alternatives Considered

### 1. Header-based versioning
```
GET /api/patients
Accept-Version: v1
```
- **Rejected**: Less visible, harder to test, cache-unfriendly, not RESTful

### 2. Query parameter versioning
```
GET /api/patients?version=v1
```
- **Rejected**: Messy, easy to omit, cache issues, not standard

### 3. Subdomain versioning
```
https://v1.api.nirmitee.io/patients
```
- **Rejected**: Requires DNS/cert management per version, complex deployment

### 4. Content negotiation
```
Accept: application/vnd.nirmitee.v1+json
```
- **Rejected**: Over-engineered for our needs, poor developer experience

### 5. No versioning
- Breaking changes force all clients to update
- **Rejected**: Breaks mobile apps, poor UX

## Versioning Policy

### When to Increment Version

**Major version (v1 → v2)**: Breaking changes
- Removing endpoints
- Renaming fields
- Changing data types
- Altering authentication flow
- Modifying error response format

**Do NOT increment for**:
- Adding new endpoints (backwards compatible)
- Adding optional fields to responses
- Adding optional parameters to requests
- Bug fixes
- Performance improvements

### Version Lifecycle
1. **Active**: Current version, full support
2. **Deprecated**: Still functional, migrate encouraged
3. **Sunset**: Scheduled for removal, warnings in responses
4. **Removed**: No longer available

### Deprecation Process
1. Announce deprecation with migration guide
2. Add deprecation warnings in API responses:
   ```json
   {
     "deprecated": true,
     "sunset_date": "2027-01-01",
     "migration_guide": "https://docs.nirmitee.io/v1-to-v2"
   }
   ```
3. Minimum 6-month deprecation period
4. Remove after sunset date

## Implementation Details

### Route Registration
```typescript
// apps/api/src/index.ts
import v1Routes from './routes/v1'
import v2Routes from './routes/v2'  // Future

app.use('/api/v1', v1Routes)
app.use('/api/v2', v2Routes)  // Future
```

### Version-Specific Logic
```typescript
// apps/api/src/routes/v1/index.ts
const router = Router()

router.use('/auth', authRoutes)
router.use('/patients', patientRoutes)
router.use('/vital-readings', vitalReadingRoutes)

export default router
```

### Shared Business Logic
```typescript
// apps/api/src/services/patient-service.ts
// Services are version-agnostic
export class PatientService {
  async getPatient(id: string) { ... }
}

// Routes adapt service responses to version format
// apps/api/src/routes/v1/patient-routes.ts
router.get('/:id', async (req, res) => {
  const patient = await patientService.getPatient(req.params.id)
  res.json(transformToV1Format(patient))  // Version adapter
})
```

### Version Detection
Middleware to track API version usage:
```typescript
app.use('/api/:version', (req, res, next) => {
  req.apiVersion = req.params.version
  metrics.increment(`api.version.${req.apiVersion}.requests`)
  next()
})
```

## Migration Strategy

### Client Migration from v1 to v2
1. Review v2 migration guide
2. Update base URL in client config
3. Test against v2 in staging
4. Gradual rollout with feature flag
5. Monitor errors and rollback if needed
6. Complete migration before v1 sunset

### Maintaining Multiple Versions
- Separate route files per version
- Shared service layer (version-agnostic business logic)
- Version adapters transform responses
- Shared middleware (auth, rate limiting)
- Version-specific tests

### Code Sharing
```
services/          # Shared business logic
  patient-service.ts
routes/
  v1/
    patient-routes.ts  # Calls service, formats as v1
    adapters/
      patient-adapter.ts
  v2/
    patient-routes.ts  # Calls service, formats as v2
    adapters/
      patient-adapter.ts
```

## Documentation

### API Docs Structure
```
docs/api/
├── README.md         # API overview
├── v1/
│   ├── endpoints.md
│   ├── auth.md
│   └── examples.md
└── v2/              # Future
    └── ...
```

### Swagger/OpenAPI
Separate specs per version:
```
/api/v1/docs       # Swagger UI for v1
/api/v2/docs       # Swagger UI for v2
```

## Monitoring
- Track request count per version
- Alert when deprecated version usage increases
- Dashboard showing version adoption rate
- Sunset countdown warnings

## Related
- API reference documentation
- Client SDK versioning strategy
- Breaking change policy
- Deprecation timeline
