# Production Deployment Guide

## Prerequisites

- PostgreSQL 15+ (managed, e.g. Neon, Supabase, Railway Postgres)
- Upstash Redis (REST + TCP URL for BullMQ)
- Alchemy API key with Base mainnet access
- Privy production app credentials
- Domain with HTTPS termination

## Environment Variables

Copy `.env.production` and set:

| Variable | Production value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `APP_ENV` | `production` |
| `ALLOW_MAINNET_TRANSACTIONS` | `true` (only when ready) |
| `MAINNET_ENABLED` | `true` |
| `CHAIN_ID` | `8453` (Base mainnet) |
| `CORS_ORIGINS` | Your frontend origin(s), comma-separated |
| `RATE_LIMIT_MAX` | Tune per expected traffic (e.g. `60`) |
| `JWT_SECRET` | Strong random 32+ char secret |
| `DATABASE_URL` | Production Postgres connection string |
| `REDIS_URL` | Upstash TCP `rediss://` URL |

## Deploy Steps

1. **Database**
   ```bash
   APP_ENV=production npm run db:deploy:production
   ```

2. **Build**
   ```bash
   npm ci
   npm run build
   ```

3. **Start**
   ```bash
   npm run start:prod
   ```

4. **Verify**
   - `GET /api/v1/health` → `{ "status": "ok" }`
   - `GET /api/v1/health/ready` → database + redis `up`
   - `GET /docs` → Swagger loads

## Pre-Transaction Checklist

Before enabling live transactions, complete [production-readiness-checklist.md](./production-readiness-checklist.md).

## Monitoring

- Watch structured JSON logs for `type: "http_request"` entries
- Alert on `/health/ready` 503 responses
- Monitor BullMQ reconciliation logs for high `failed` counts
- Track Privy and Alchemy error rates

## Rollback

1. Set `ALLOW_MAINNET_TRANSACTIONS=false` immediately
2. Deploy previous container/image
3. Run `db:status:production` — migrations are forward-only; avoid destructive rollbacks

## Scaling

- API: horizontal scale (stateless except BullMQ worker — run one worker per deployment or dedicated worker service)
- Postgres: connection pooling (PgBouncer)
- Redis: Upstash scales automatically
