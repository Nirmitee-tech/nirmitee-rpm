# NirmiteeRPM

Enterprise Risk and Performance Management Platform

## Tech Stack

- **Frontend**: Next.js 14 (App Router, React 18, TypeScript)
- **Backend**: Node.js (structure placeholder)
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS 3.4, CVA, tailwind-merge
- **Icons**: Lucide React
- **Package Manager**: pnpm with workspaces
- **Orchestration**: Docker Compose

## Project Structure

```
NirmiteeRPM/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities
│   └── api/                 # Node.js backend (placeholder)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── types/               # TypeScript types
│   └── config/              # Shared configs (Tailwind, TS, ESLint)
├── docker/                  # Dockerfiles
├── docs/                    # Documentation
└── plans/                   # Implementation plans
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose (optional)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Development Commands

```bash
# Start Next.js dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type check
pnpm type-check

# Lint
pnpm lint

# Clean all
pnpm clean
```

### Docker

```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# Build containers
pnpm docker:build
```

## Features

### Authentication (Mock UI)
- Login page
- Signup page
- Forgot password page

### Dashboard
- Overview with stats
- User management
- Reports
- Analytics
- Security monitoring
- Settings

### Multi-Organization
- Organization switcher
- Role-based access (owner, admin, member)

## Design System

The design follows the RaptorX Design System with:
- Brand color: `#745EE1` (Purple)
- Dark mode support
- CVA-based component variants
- Tailwind utility classes

See `DESIGN_SYSTEM.md` for complete design specifications.

## License

Private - All rights reserved.
