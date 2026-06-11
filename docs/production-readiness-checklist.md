# Production Readiness Checklist

Complete every item before enabling `ALLOW_MAINNET_TRANSACTIONS=true` with real user funds.

## Infrastructure

- [ ] Production PostgreSQL provisioned and migrated (`db:deploy:production`)
- [ ] Upstash Redis REST + TCP URLs configured
- [ ] `REDIS_URL` uses `rediss://` (TLS)
- [ ] Alchemy mainnet RPC key funded and rate limits understood
- [ ] Privy production app configured with correct domains
- [ ] HTTPS termination on API domain
- [ ] `CORS_ORIGINS` set to frontend domain(s) only (not `*`)
- [ ] `JWT_SECRET` is 32+ random characters, not committed to git
- [ ] Railway / hosting health check points to `/api/v1/health/ready`

## Configuration

- [ ] `APP_ENV=production`
- [ ] `NODE_ENV=production`
- [ ] `CHAIN_ID=8453` (or target mainnet)
- [ ] `CHAINS_CONFIG` includes correct mainnet chain
- [ ] `ASSETS_CONFIG` includes mainnet token addresses
- [ ] `AAVE_VAULTS_CONFIG` uses audited mainnet pool and aToken addresses
- [ ] `RPC_URL` points to mainnet Alchemy endpoint
- [ ] `RATE_LIMIT_MAX` tuned for expected traffic

## Pre-Transaction Validation (verify in staging)

- [ ] **Chain matches environment** — testnet blocked when `ALLOW_MAINNET_TRANSACTIONS=false`
- [ ] **Vault belongs to chain** — wrong chainId rejected
- [ ] **RPC belongs to chain** — disabled chains rejected
- [ ] **Wallet belongs to user** — other user's wallet returns 404
- [ ] **Idempotency key exists** — mutation without header rejected
- [ ] **Balance sufficient** — deposit with excess amount rejected
- [ ] **Allowance sufficient** — deposit without approve rejected
- [ ] **Position shares sufficient** — over-withdraw rejected

## Functional Smoke Tests

- [ ] `GET /api/v1/health` returns ok
- [ ] `GET /api/v1/health/ready` — database + redis up
- [ ] `GET /api/v1/earn/vaults` returns enabled vaults
- [ ] `POST deposit/preview` returns balance, allowance, gas estimate
- [ ] `POST approve` with idempotency key succeeds
- [ ] `POST deposit` with idempotency key succeeds
- [ ] `GET /earn/positions` shows ACTIVE position with currentValue
- [ ] `POST /earn/positions/:id/withdraw` partial succeeds
- [ ] `POST /earn/positions/:id/withdraw` full closes position (CLOSED)
- [ ] BullMQ reconciliation logs show no stuck SUBMITTED txs
- [ ] Idempotency replay returns same response on retry

## Security

- [ ] Review [security-review.md](./security-review.md)
- [ ] No secrets in repository
- [ ] Rate limiting active (verify 429 after burst)
- [ ] Helmet headers present (`curl -I`)
- [ ] Swagger not exposed publicly (optional: restrict `/docs` in prod)

## Monitoring & Operations

- [ ] Log aggregation configured (Railway logs, Datadog, etc.)
- [ ] Alert on `/health/ready` failures
- [ ] Alert on reconciliation `failed` count spikes
- [ ] Runbook for `ALLOW_MAINNET_TRANSACTIONS=false` emergency stop
- [ ] Database backup schedule confirmed

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Security | | |
| Product | | |
