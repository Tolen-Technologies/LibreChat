# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (use ci for exact versions)
npm ci

# Build packages (must be done in order for first-time setup)
npm run build:data-provider
npm run build:data-schemas
npm run build:api
npm run build:client-package

# Or build all frontend packages at once
npm run frontend

# Development servers (run in separate terminals)
npm run backend:dev          # Backend at localhost:3080
npm run frontend:dev         # Client at localhost:3090 (proxies to 3080)

# Production
npm run backend              # NODE_ENV=production
npm run build:client         # Build client for production
```

## Testing

```bash
# Unit tests
npm run test:api             # Backend tests
npm run test:client          # Client tests
npm run test:packages:api    # API package tests
npm run test:packages:data-provider
npm run test:packages:data-schemas

# E2E tests (requires MongoDB, built client)
npm run e2e                  # Playwright tests
npm run e2e:headed           # With visible browser
npm run e2e:debug            # Debug mode

# Linting
npm run lint                 # Check for issues
npm run lint:fix             # Auto-fix issues
npm run format               # Prettier formatting
```

## Architecture Overview

### Monorepo Structure

LibreChat uses npm workspaces with these key packages:

- **`api/`** - Express.js backend server (JavaScript)
- **`client/`** - React frontend with Vite (TypeScript)
- **`packages/data-provider/`** - Shared API client, React Query hooks, types
- **`packages/data-schemas/`** - Mongoose schemas, models, methods (TypeScript)
- **`packages/api/`** - MCP services, utilities (TypeScript)
- **`packages/client/`** - Reusable React component library

Package dependencies flow: `data-schemas` → `data-provider` → `api/client`

### Frontend-Backend Communication

1. **HTTP Client**: Axios-based with automatic 401 token refresh (`packages/data-provider/src/request.ts`)
2. **Streaming**: Server-Sent Events via `sse.js` for LLM responses (`client/src/hooks/SSE/useSSE.ts`)
3. **State**: Jotai atoms (global) + React Context (feature) + TanStack React Query (server)

### Key Backend Entry Points

- **Server**: `api/server/index.js` - Express setup, middleware, routes
- **Routes**: `api/server/routes/` - API endpoints
- **Middleware**: `api/server/middleware/` - Auth, validation, config
- **Database**: `api/models/` - Mongoose model operations

### Configuration

- **`.env`** - Environment variables (API keys, database, auth)
- **`librechat.yaml`** - Application config (endpoints, interface, features)
- **Config loading**: `api/server/services/Config/`

### Database Patterns (packages/data-schemas)

Uses factory pattern for models and methods:
```typescript
// Creating a new entity requires:
// 1. Type definition in src/types/
// 2. Schema in src/schema/
// 3. Model factory in src/models/
// 4. Methods in src/methods/
// 5. Export in respective index.ts files
```

See `packages/data-schemas/README.md` for detailed patterns.

### Endpoint System

AI providers are configured in `librechat.yaml` under `endpoints`. Each endpoint type (openAI, anthropic, google, custom, etc.) has:
- Configuration builder in `api/server/services/Endpoints/`
- Client implementation extending base patterns
- Frontend handler for streaming responses

## Conventions

### Git Workflow

- Branch naming: slash-based (e.g., `new/feature/x`, `fix/bug/y`)
- Commits: semantic format (`feat:`, `fix:`, `docs:`, `refactor:`)
- Squash commits before PR when possible

### Code Style

- **JS/TS files**: camelCase, React components PascalCase
- **Import order**: npm packages (longest to shortest) → types → local imports
- ESLint enforces import ordering via `npm run lint:fix`

### TypeScript Notes

- Frontend is TypeScript, backend remains JavaScript
- Shared packages (`data-provider`, `data-schemas`, `api`, `client`) are TypeScript
- Build packages before running if you modify them

## Common Tasks

### Adding a New API Route

1. Create route file in `api/server/routes/`
2. Mount in `api/server/routes/index.js`
3. Add React Query hooks in `packages/data-provider/` if needed

### Adding a Database Entity

Follow the pattern in `packages/data-schemas/README.md`:
1. Type in `src/types/`
2. Schema in `src/schema/`
3. Model factory in `src/models/`
4. Methods in `src/methods/`
5. Update index files

### Adding a Custom AI Endpoint

Configure in `librechat.yaml` under `endpoints.custom`:
```yaml
endpoints:
  custom:
    - name: 'provider-name'
      apiKey: '${API_KEY}'
      baseURL: 'https://api.example.com/v1/'
      models:
        default: ['model-1', 'model-2']
```
