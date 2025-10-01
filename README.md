# ExecSuite Construction Platform

_Construction assistant app built from ExecSuite v3.3 specs with Notion integration, email/Telegram automation, and Make.com workflows._

ExecSuite is a full-stack operations platform that keeps field, office, and subcontractors aligned. The system runs on a Notion-first data model with Fastify APIs, a Next.js dashboard, and automation hooks for Telegram, Stripe, and Make.com.

## System Overview

- **Backend**: Fastify (Node 20) with service layer, Zod validation, and OpenTelemetry instrumentation. Notion databases are the system of record with idempotent upserts and retry/backoff wrappers.
- **Frontend**: Next.js 14 App Router with React Server Components, Tailwind, shadcn-style UI primitives, and server actions that keep the admin token off the client.
- **Shared Core**: Typed schemas (`packages/core`) provide a single source of truth for Projects, Tasks, Daily Logs, Extracted Elements, and Look Ahead rows. Services wrap Notion, geofencing, plan ingestion stubs, Gantt rendering, Telegram messaging, and Stripe placeholders.
- **Observability**: Pino structured logs, OpenTelemetry OTLP exporter hooks, and consistent idempotency keys across write paths.

```
apps/
  api/        Fastify service (routes, telemetry, scripts)
  web/        Next.js dashboard (RSC + server actions)
packages/
  core/       Shared schemas and services
  ui/         Tailwind-based component library
integrations/
  make/       Make.com automation blueprints
```

## Prerequisites

- Node 20 (`nvm use 20`)
- npm 10.x (workspace enabled)
- Notion Internal Integration token with read/write access to required databases
- Telegram bot token (optional but recommended)
- Stripe test secret key (placeholder OK)

## Environment

Copy `.env.example` to `.env` and fill in secrets:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `ADMIN_API_TOKEN` | Shared header token (`X-Admin-Token`) for all protected routes |
| `NOTION_TOKEN` | Notion integration token with DB access |
| `API_BASE_URL` | URL the Next.js dashboard uses to reach the Fastify API |
| `TELEGRAM_BOT_TOKEN` | Bot token, required for command registration |
| `FO_CHECKIN_WEBHOOK` | Make.com webhook for field operations alerts |
| `COO_DIGEST_WEBHOOK` | Digest webhook |
| `MEAL_PLAN_WEBHOOK` | Meal plan webhook |
| `STRIPE_SECRET_KEY` | Stripe test key (placeholder until live) |

## Local Development

Install dependencies (workspace-aware):

```bash
npm install --workspaces --include-workspace-root
```

Start the API and web apps in separate terminals:

```bash
npm run dev:api
npm run dev  # Next.js dashboard (proxied through server actions)
```

The Fastify server listens on `http://localhost:3001`. The Next.js dashboard defaults to `http://localhost:3000` and talks to the API using server actions so credentials remain server-side.

## Testing

Unit tests live in the shared core package:

```bash
npm run test --workspace @execsuite/core
```

Add more coverage (Vitest + Playwright) before production deployment.

### Automated Checks

- `npm run check` runs linting, type checks, and tests across all workspaces.
- `npm run ci` chains `npm run check` followed by full builds; it mirrors the GitHub Actions pipeline.
- GitHub Actions (`.github/workflows/ci.yml`) installs dependencies, then runs lint → typecheck → test → build on every push and pull request.

## Seeding & Automation Scripts

| Script | Purpose |
| --- | --- |
| `npm run seed:notion` | Applies baseline feature flags inside the Admin Settings database |
| `npm run register:telegram` | Ensures Telegram commands are registered with quiet hours respected |
| `npm run render:gantt:demo` | Builds a sample 3WLA and renders a PNG (persists as data URL unless storage adapter is configured) |

Make sure the Admin Settings database already contains an initial row—`seed:notion` updates feature flags but does not create the first record.

## Deploying

### API (Fastify)

- Deploy to Vercel functions or another Node 20 platform (Railway/Fly). Configure environment variables listed above.
- Enable the OTLP exporter (`OTEL_EXPORTER_OTLP_ENDPOINT`) to send traces to your APM provider.
- Provision a persistent storage adapter if you need public Gantt PNG URLs (e.g., Vercel Blob, S3). Implement a `GanttStorageAdapter` and inject it in `container.ts`.

### Web (Next.js)

- Deploy `apps/web` to Vercel. Set a Project Environment Variable `API_BASE_URL` pointing at the deployed Fastify instance.
- Populate `ADMIN_API_TOKEN` in the Vercel environment to let server actions authenticate.

### Integrations

- Import `integrations/make/smoke-import.json` into Make.com for the smoke test blueprint.
- Configure Telegram topics & quiet hours inside the Admin Settings database (DBID `2718b7ee283b80939b7cd5d080804e4c`).

## API Contract

The OpenAPI contract lives at `apps/api/openapi.yaml`. Key endpoints:

- `POST /api/checkin` – GPS check-in -> geofence -> daily log upsert.
- `POST /api/ingest/plan` – Upload plans/POs and extract elements.
- `GET /api/elements/search` – Search extracted elements (door/wall/base cabinets).
- `POST /api/lookahead/build` – Generate 3WLA rows with idempotency keys.
- `POST /api/gantt/render` – Render PNG and optionally persist the public URL.
- `POST /api/telegram/register-commands` – Sync Telegram commands respecting quiet hours.
- `POST /api/smoke` – Trigger Make webhooks in dry-run mode.

All mutating endpoints require `X-Admin-Token`.

## Observability & Reliability Notes

- All Notion writes are idempotent (`Idempotency Key` property) with retry/backoff.
- `ConfigService` caches Admin Settings for 60s but refreshes on writes.
- Quiet hours guard Telegram topics, with bypass for OPS/ALERTS.
- Gantt rendering produces SVG->PNG via `sharp`; configure a storage adapter to publish real URLs.
- Web dashboard uses server actions to keep secrets off the client and provides quick actions for check-ins, plan ingestion, look-ahead builds, and operational smoke tests.

## Next Steps

- Wire a persistent storage adapter (e.g., Vercel Blob) by implementing `GanttStorageAdapter`.
- Expand `PlanIngestService` with a real parser (PDF text extraction, ML hooks).
- Add Playwright smoke tests for the dashboard flows.
- Harden Notion property mapping by generating types directly from database metadata.
