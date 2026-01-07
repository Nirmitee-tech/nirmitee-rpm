# Contributing to NirmiteeRPM

Thank you for your interest in contributing to NirmiteeRPM! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 8+
- PostgreSQL 15+
- Docker (optional but recommended)

### Setup
```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/NirmiteeRPM.git
cd NirmiteeRPM

# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Run database migrations
pnpm --filter api prisma migrate dev

# Start development servers
pnpm dev
```

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes
- Follow code style guidelines (below)
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass

### 3. Commit Your Changes
Follow conventional commit format:
```bash
git commit -m "feat: add patient enrollment feature"
git commit -m "fix: resolve authentication token expiry issue"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for billing service"
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Add or update tests
- `chore`: Build/tooling changes

### 4. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Create PR via GitHub with:
- Clear title and description
- Link to related issue (if applicable)
- Screenshots for UI changes
- List of changes made

## Code Style Guidelines

### TypeScript
```typescript
// ✅ CORRECT
interface UserInput {
  email: string
  password: string
}

async function createUser(data: UserInput): Promise<User> {
  // Implementation
}

// ❌ WRONG
function createUser(data) {  // Missing types
  // Implementation
}
```

### Naming Conventions
- **Files**: kebab-case (`user-service.ts`, `auth-middleware.ts`)
- **Components**: PascalCase (`UserMenu.tsx`, `LoginForm.tsx`)
- **Functions**: camelCase (`getUserById`, `validateEmail`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- **Interfaces**: PascalCase (`User`, `PatientInput`)

### Internationalization (i18n)
ALL user-facing text must be translated:
```tsx
// ✅ CORRECT
const { t } = useTranslations('dashboard')
return <h1>{t('title')}</h1>

// ❌ WRONG
return <h1>Dashboard</h1>  // Hardcoded English
```

Add translations to both `en.json` and `hi.json`.

### Multi-Tenancy
ALWAYS include `organizationId` in queries:
```typescript
// ✅ CORRECT
const patients = await prisma.patient.findMany({
  where: { organizationId: req.user.organizationId }
})

// ❌ WRONG
const patients = await prisma.patient.findMany()
```

### Database Schema
New tables MUST include:
```prisma
model NewTable {
  id              String   @id @default(cuid())
  organizationId  String   // MANDATORY for multi-tenancy
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(...)

  @@index([organizationId])
}
```

## Testing

### Run Tests
```bash
# All tests
pnpm test

# Specific package
pnpm --filter api test
pnpm --filter web test

# Watch mode
pnpm --filter api test:watch
```

### Writing Tests
```typescript
// Example service test
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const input = { email: 'test@example.com', password: 'Test123!@#' }
      const user = await userService.createUser(input)

      expect(user.email).toBe(input.email)
      expect(user.passwordHash).not.toBe(input.password)
    })

    it('should throw error for duplicate email', async () => {
      await expect(userService.createUser({ email: 'existing@example.com' }))
        .rejects.toThrow('Email already exists')
    })
  })
})
```

### Test Coverage
- Unit tests for all service layer functions
- Integration tests for API endpoints
- Component tests for complex UI components
- Aim for >80% code coverage

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] i18n translations added (en + hi)
- [ ] Multi-tenancy patterns followed
- [ ] No console.log or debugging code
- [ ] Type-safe (no `any` types)

### PR Description Template
```markdown
## Description
[Clear description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #123

## Testing
[How to test these changes]

## Screenshots
[For UI changes]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] i18n translations added
```

### Review Process
1. Automated checks run (linting, tests, type-check)
2. Code review by maintainer
3. Address review comments
4. Approval and merge

## Documentation

### Update Documentation When:
- Adding new API endpoints
- Changing database schema
- Adding new features
- Changing configuration
- Updating dependencies

### Documentation Locations
- API docs: `/docs/api/`
- Architecture: `/docs/architecture/`
- Database: `/docs/database/`
- Deployment: `/docs/deployment/`
- Runbooks: `/docs/runbooks/`

## Database Migrations

### Creating Migrations
```bash
# Create migration
pnpm --filter api prisma migrate dev --name descriptive_name

# Example
pnpm --filter api prisma migrate dev --name add_patient_table
```

### Migration Best Practices
- Descriptive names
- Small, focused changes
- Test on dev/staging first
- Include rollback strategy
- Document breaking changes

## Security

### Reporting Vulnerabilities
Email: security@nirmitee.io

Do NOT create public issues for security vulnerabilities.

### Security Guidelines
- Never commit secrets (API keys, passwords)
- Always hash passwords (bcrypt)
- Validate all user input (Zod schemas)
- Use parameterized queries (Prisma)
- Implement rate limiting
- Follow OWASP guidelines

## Community

### Getting Help
- GitHub Discussions: Ask questions, share ideas
- Issues: Report bugs, request features
- Community: https://community.nirmitee.io

### Communication
- Be respectful and professional
- Provide context and details
- Share reproducible examples
- Help others when possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open a discussion on GitHub or email: dev@nirmitee.io

Thank you for contributing to NirmiteeRPM!
