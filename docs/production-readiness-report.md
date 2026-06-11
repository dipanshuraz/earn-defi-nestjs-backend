# Production Readiness Report

Date: 2026-06-12

## Infrastructure

| Item | Status |
|------|--------|
| Railway deploy config | ✅ `railway.json` |
| Health liveness `/health` | ✅ |
| Health readiness `/health/ready` | ✅ DB + Redis |
| Health details `/health/details` | ✅ DB + Redis + RPC + Privy |
| Graceful shutdown hooks | ✅ Prisma, BullMQ worker/queue |
| Env profiles local/develop/production | ✅ |

## Security

| Control | Status |
|---------|--------|
| Helmet headers | ✅ |
| CORS with exposed `x-request-id` | ✅ |
| Global rate limiting | ✅ ThrottlerGuard |
| Health/system throttle exempt | ✅ `@SkipThrottle` |
| Per-user earn mutation limits | ✅ Redis counters |
| JWT auth on protected routes | ✅ |
| Wallet/position ownership | ✅ |
| Mainnet transaction guard | ✅ `ALLOW_MAINNET_TRANSACTIONS` |
| Input validation (whitelist) | ✅ ValidationPipe |
| Global exception filter | ✅ No stack traces to clients |
| Request correlation | ✅ `X-Request-Id` |
| Audit logging | ✅ `audit_logs` table |
| Secrets in env only | ✅ |

## Reliability

| Item | Status |
|------|--------|
| Idempotency on mutations | ✅ |
| Transaction reconciliation (30s) | ✅ BullMQ |
| Reconciliation Redis lock | ✅ Prevents duplicate workers |
| Receipt fetch retry/backoff | ✅ `getTransactionReceiptWithRetry` |
| Worker job backoff | ✅ Exponential on scheduler failures |
| Stale CREATED tx cleanup | ✅ 10 min threshold |

## Observability

| Item | Status |
|------|--------|
| Structured JSON HTTP logs | ✅ Includes `requestId` |
| Structured reconciliation logs | ✅ Includes job id as correlation |
| Error responses include `requestId` + `code` | ✅ |

## Database

| Item | Status |
|------|--------|
| Prisma migrations | ✅ Including `audit_logs` |
| `db:reset:local/develop/production` scripts | ✅ Production requires explicit opt-in |

## Pre-Production Checklist

- [ ] Set `CORS_ORIGINS` to real frontend origins (not `*`)
- [ ] Rotate `JWT_SECRET` and Privy authorization private key
- [ ] Point `.env.production` at production Postgres/Redis/RPC
- [ ] Set `ALLOW_MAINNET_TRANSACTIONS=true` only when ready
- [ ] Run `npm run db:deploy:production` on Railway
- [ ] Verify `GET /health/details` all `up` after deploy
- [ ] Fund and verify one mainnet smoke transaction manually

## Known Limitations

- Throttler uses in-memory storage (not shared across multiple instances)
- TVL/APY are on-chain reads only (no Aave GraphQL enrichment)
- Full automated HTTP e2e against funded wallet not in CI yet
