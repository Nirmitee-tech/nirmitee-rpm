# Swagger/OpenAPI Documentation Guide

## Quick Start

View API documentation: http://localhost:4000/api/docs (when server is running)

## Adding Documentation to New Routes

### 1. Basic Endpoint Documentation

```typescript
/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users
 *     description: Get a paginated list of users in the organization
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, async (req, res) => {
  // ... handler code
});
```

### 2. POST Endpoint with Request Body

```typescript
/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/', async (req, res) => {
  // ... handler code
});
```

### 3. Endpoint with Path Parameters

```typescript
/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:userId', async (req, res) => {
  // ... handler code
});
```

### 4. Unauthenticated Endpoint

```typescript
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     security: []  # This endpoint doesn't require authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  // ... handler code
});
```

## Available Schema References

Use these pre-defined schemas in your responses:

```typescript
$ref: '#/components/schemas/User'
$ref: '#/components/schemas/Organization'
$ref: '#/components/schemas/Team'
$ref: '#/components/schemas/Role'
$ref: '#/components/schemas/Permission'
$ref: '#/components/schemas/Notification'
$ref: '#/components/schemas/AuditLog'
$ref: '#/components/schemas/Invitation'
$ref: '#/components/schemas/Error'
$ref: '#/components/schemas/ValidationError'
$ref: '#/components/schemas/LoginResponse'
$ref: '#/components/schemas/SignupResponse'
$ref: '#/components/schemas/RefreshTokenResponse'
$ref: '#/components/schemas/MfaStatus'
$ref: '#/components/schemas/OAuthProvider'
$ref: '#/components/schemas/DashboardStats'
```

## Adding New Schemas

Add new component schemas to `apps/api/src/config/swagger-schemas.ts`:

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     Patient:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         medicalRecordNumber:
 *           type: string
 */
```

## Common Tags

Use these tags to organize endpoints:

- `Authentication` - Login, signup, password reset
- `MFA` - Multi-factor authentication
- `OAuth` - OAuth providers
- `Users` - User management
- `Teams` - Team management
- `Roles` - Role-based access control
- `Organizations` - Organization management
- `Invitations` - User invitations
- `Notifications` - Notification system
- `Audit` - Audit logging
- `Dashboard` - Dashboard statistics

## Response Status Codes

Standard HTTP status codes to use:

- `200` - OK (successful GET, PATCH, PUT)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Security

### Authenticated Endpoints

By default, all endpoints require JWT authentication. This is set globally in `swagger.ts`.

### Public Endpoints

To mark an endpoint as public (no authentication required):

```typescript
/**
 * @openapi
 * /public-endpoint:
 *   get:
 *     security: []  # Override global security
 *     ...
 */
```

## Best Practices

1. **Always document:**
   - Summary (brief, 1 line)
   - Description (detailed, multi-line)
   - All parameters (path, query, body)
   - All possible responses
   - Error cases

2. **Use schema refs:**
   - Define schemas once in `swagger-schemas.ts`
   - Reference with `$ref` instead of inline schemas
   - Keeps documentation DRY and consistent

3. **Include examples:**
   ```typescript
   properties:
     email:
       type: string
       format: email
       example: user@example.com
   ```

4. **Document validation:**
   - Use `required` array for mandatory fields
   - Use `minLength`, `maxLength`, `minimum`, `maximum`
   - Use `format` for common types (email, date, uuid, url, etc.)
   - Use `enum` for fixed values

5. **Organize by tags:**
   - Group related endpoints with same tag
   - Use existing tags when possible
   - Add new tags to `swagger.ts` if needed

## Testing Documentation

1. Start the API server: `pnpm --filter api dev`
2. Open browser: http://localhost:4000/api/docs
3. Test endpoints directly in Swagger UI
4. Verify request/response schemas
5. Check authentication flows

## Generating API Clients

Once documentation is complete, generate client SDKs:

```bash
# Install openapi-generator-cli
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:4000/api/docs.json \
  -g typescript-axios \
  -o ./generated/typescript-client

# Generate Python client
openapi-generator-cli generate \
  -i http://localhost:4000/api/docs.json \
  -g python \
  -o ./generated/python-client
```

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
- [OpenAPI Generator](https://openapi-generator.tech/)

## Need Help?

Check existing documentation in:
- `apps/api/src/routes/v1/auth-routes.ts` - Complete examples
- `apps/api/src/config/swagger-schemas.ts` - Schema definitions
- `apps/api/src/config/swagger.ts` - Configuration

---

**Quick Checklist for New Endpoints:**

- [ ] Add `@openapi` JSDoc comment above route handler
- [ ] Include summary and description
- [ ] Add appropriate tag(s)
- [ ] Document all parameters (path, query, body)
- [ ] Document all responses (success + errors)
- [ ] Use schema refs where possible
- [ ] Mark public endpoints with `security: []`
- [ ] Test in Swagger UI
