# ADR-001: Monorepo Structure with pnpm Workspaces

## Status
Accepted

## Context
NirmiteeRPM requires managing multiple interconnected applications (web frontend, API backend) and shared packages (UI components, types, configs). Need unified dependency management, simplified development workflow, and ability to share code efficiently without publishing to npm registry.

Traditional multi-repo approach would require:
- Separate git repositories for each package
- Complex versioning and publishing workflow
- Difficulty coordinating changes across repos
- Duplicate dependencies and configuration

## Decision
Use monorepo structure with **pnpm workspaces** for managing all applications and packages.

Structure:
```
NirmiteeRPM/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared configs
└── pnpm-workspace.yaml
```

## Consequences

### Positive
- **Single source of truth**: All code in one repository
- **Simplified dependency management**: pnpm handles workspace linking automatically
- **Atomic commits**: Changes across multiple packages in single commit
- **Type safety**: Direct TypeScript imports between packages without build step
- **Faster CI/CD**: Can detect and build only changed packages
- **Efficient storage**: pnpm uses content-addressable storage, sharing dependencies
- **Consistent tooling**: Single ESLint, Prettier, TypeScript config

### Negative
- **Larger repository size**: Full clone includes all apps/packages
- **Learning curve**: Team needs to understand workspace protocol
- **Potential for tight coupling**: Easy to create unwanted dependencies
- **Build complexity**: Need to manage build order for dependent packages
- **CI/CD duration**: May need to run tests for all affected packages

## Alternatives Considered

### 1. Multi-repo with npm packages
- Each package published to private npm registry
- **Rejected**: Overhead of versioning, publishing, and coordinating changes

### 2. Lerna monorepo
- Popular monorepo tool with npm/yarn
- **Rejected**: pnpm is faster, more efficient, and has better workspace support

### 3. Turborepo
- Build system for monorepos with caching
- **Deferred**: May add later for build optimization, but pnpm workspaces sufficient for now

### 4. Nx monorepo
- Full-featured monorepo toolkit
- **Rejected**: Too heavyweight for current needs, steeper learning curve

## Implementation Notes
- Use `workspace:*` protocol in package.json for internal dependencies
- Shared packages should export via index.ts for clean imports
- Run commands with `pnpm --filter <package>` for specific apps
- Root-level scripts use `--parallel` or `--filter` appropriately

## Related
- TypeScript path mapping configured for `@/` imports
- ESLint shared config in `packages/config`
- Tailwind config shared across web and ui packages
