# DeFi Earn Backend

Production-ready NestJS backend for a DeFi Earn platform. Supports Aave V3 vault discovery, ERC-20 approvals, pool supply/withdraw, position and transaction tracking, idempotent mutations, and BullMQ transaction reconciliation.

## Stack

- **Runtime:** Node.js 20+, NestJS 11, TypeScript
- **Database:** PostgreSQL + Prisma 6
- **Cache / Queues:** Upstash Redis + BullMQ
- **Blockchain:** viem, Alchemy RPC, Privy embedded wallets
- **Protocols:** Aave V3 (Pool supply/withdraw + aToken positions)

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in DATABASE_URL, Redis, Privy, Alchemy, and config JSON vars

npm run db:deploy:local
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

## API Overview

| Method | Path | Auth | Idempotency |
|--------|------|------|-------------|
| POST | `/auth/register` | — | — |
| POST | `/auth/login` | — | — |
| GET | `/users/me` | JWT | — |
| POST | `/wallets` | JWT | — |
| GET | `/wallets` | JWT | — |
| GET | `/wallets/:walletId` | JWT | — |
| GET | `/chains` | — | — |
| GET | `/assets` | — | — |
| GET | `/earn/vaults` | — | — |
| GET | `/earn/vaults/:vaultId` | — | — |
| POST | `/earn/vaults/:vaultId/deposit/preview` | JWT | — |
| POST | `/earn/vaults/:vaultId/approve` | JWT | Required |
| POST | `/earn/vaults/:vaultId/deposit` | JWT | Required |
| GET | `/earn/positions` | JWT | — |
| GET | `/earn/positions/:positionId` | JWT | — |
| POST | `/earn/positions/:positionId/withdraw` | JWT | Required |
| GET | `/earn/transactions` | JWT | — |
| GET | `/earn/transactions/:transactionId` | JWT | — |
| GET | `/health` | — | — |
| GET | `/health/ready` | — | — |
| GET | `/health/details` | — | — |
| GET | `/system/environment` | — | — |

**Query filters**

- `GET /earn/vaults` — `chainId`, `assetSymbol`, `protocol`
- `GET /earn/positions` — `walletId`, `vaultId`, `status`
- `GET /earn/transactions` — `walletId`, `vaultId`, `positionId`, `type`, `status`, `page`, `limit`

All amounts are **bigint strings** in asset base units (e.g. USDC `1000000` = 1 USDC).

Mutations return `explorerUrl` when a `txHash` is available. Errors include `requestId` (from `X-Request-Id`) and machine-readable `code` values such as `APPROVAL_REQUIRED`.

## APY, TVL, Share Price, and Position Value

### APY source

Read on-chain from the Aave V3 Pool `getReserveData(asset).currentLiquidityRate` via viem (`src/protocols/aave/aave-viem.service.ts`).

Formula:

```
apyPercent = (currentLiquidityRate / 1e27) * 100
```

`currentLiquidityRate` is already the annual rate in RAY (1e27) units.

### TVL source

Read on-chain from the reserve aToken ERC-20 `totalSupply()` via viem.

- Returned as a **bigint string in aToken base units** (same decimals as the underlying asset).
- This is **not USD TVL**; it is total supplied liquidity for the reserve.

### Share price source

For Aave supply positions the API treats underlying amount and aToken balance as 1:1 at deposit/withdraw time.

```
sharePrice ≈ 1.0 (asset decimals)
estimatedShares ≈ deposit amount (base units)
```

On-chain aToken `balanceOf` is used for live position share reads during withdraw validation.

### Position value calculation

For live API responses, position value is computed from on-chain liquidity index:

```
currentValue = shares * liquidityIndex / 1e27   (asset base units)
```

DB `currentAmount` updates only after on-chain confirmation. `fullWithdraw` uses the lesser of DB balance and on-chain aToken balance (Aave rounding).

See `src/earn/utils/position-value.util.ts` and `src/earn/persistence/positions/positions.service.ts`.

## Environment Profiles

| File | Use |
|------|-----|
| `.env.local` | Local development |
| `.env.develop` | Shared develop/staging |
| `.env.production` | Production |

Set `APP_ENV=local|develop|production` to select the env file.

## Scripts

```bash
npm run build          # Compile
npm test               # Unit tests
npm run test:e2e       # App bootstrap e2e
npm run integration:testnet  # Full approve→deposit→withdraw on Base Sepolia (see docs)
npm run start:dev      # Dev server with watch
npm run db:migrate:local
npm run db:deploy:local
npm run db:status:local
npm run db:reset:local   # destructive — drops all tables and reapplies migrations
```

## Rate Limits

| Variable | Default | Scope |
|----------|---------|-------|
| `RATE_LIMIT_MAX` | 100 | Global HTTP requests per `RATE_LIMIT_TTL_MS` |
| `MAX_DEPOSITS_PER_MINUTE` | 10 | Per-user deposit mutations |
| `MAX_WITHDRAWALS_PER_MINUTE` | 10 | Per-user withdraw mutations |

## Project structure

```
src/earn/
  controllers/     # vault, position, transaction routes
  services/        # deposit, withdraw, approve, blockchain I/O
  persistence/     # positions + transactions (Prisma)
  repositories/    # vault metadata
  dto/ exceptions/ validators/ utils/
src/protocols/     # Aave provider (vault reads, previews)
src/blockchain/abis/   # shared viem contract ABIs
```

Full layout: [Architecture](docs/architecture.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Production Deployment](docs/production-deployment.md)
- [Railway Deployment](docs/railway-deployment.md)
- [Mainnet Switching](docs/mainnet-switching.md)
- [Security Review](docs/security-review.md)
- [Production Readiness Checklist](docs/production-readiness-checklist.md)
- [Postman Collection](docs/postman/defi-earn-backend.postman_collection.json)
- [Base Sepolia Integration Script](docs/integration-testnet.md)
- [Assignment Compliance Report](docs/assignment-compliance-report.md)
- [Production Readiness Report](docs/production-readiness-report.md)
- [Privy Server Signing](docs/privy-server-signing.md)

## Production Hardening

- Helmet security headers
- CORS (`CORS_ORIGINS`)
- Rate limiting (`RATE_LIMIT_TTL_MS`, `RATE_LIMIT_MAX`, per-user earn limits)
- Structured JSON HTTP logging with `X-Request-Id` correlation
- Health (`/health`), readiness (`/health/ready`), and details (`/health/details`)
- Audit logging for auth, wallet, and earn lifecycle events
- Global API prefix (`API_PREFIX`)
- Mainnet transaction guard (`ALLOW_MAINNET_TRANSACTIONS`)

## Assumptions and Limitations

- **Protocol:** Aave V3 only (`EARN_PROTOCOL_PROVIDER=aave`). Vaults are config-driven via `AAVE_VAULTS_CONFIG`.
- **Amounts:** API amounts are bigint strings in asset base units (e.g. `1000000` = 1 USDC), not human decimals.
- **Idempotency:** Mutation endpoints use the `idempotency-key` header (not a JSON body field).
- **Positions:** One position per user per vault. Status lifecycle: `PENDING` → `ACTIVE` → `WITHDRAWING` → `ACTIVE`/`CLOSED`, with `FAILED` for abandoned deposits.
- **Wallets:** Privy embedded wallets sign and broadcast transactions. Email/password JWT is used for API auth.
- **Reconciliation:** BullMQ polls submitted transactions every 30s. Stale `CREATED` transactions are marked failed.
- **Testnet default:** Base Sepolia (`chainId: 84532`). Mainnet requires `ALLOW_MAINNET_TRANSACTIONS=true`.

## Known Improvements (with more time)

- Human-readable decimal amount conversion in API responses
- Aave GraphQL enrichment for APY/TVL instead of on-chain-only reads
- Full HTTP e2e suite against a funded testnet wallet
- Position retry flow for `FAILED` deposits (explicit reopen endpoint)
- Multi-protocol provider registry (Morpho, Compound, etc.)

## License

UNLICENSED — private project.
