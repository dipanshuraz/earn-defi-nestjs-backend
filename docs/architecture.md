# Architecture

## Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│  NestJS API      │────▶│ PostgreSQL  │
│  (JWT)      │     │  /api/v1         │     │  Prisma     │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │  Redis   │  │  BullMQ  │  │ Alchemy RPC  │
        │ Upstash  │  │ Worker   │  │ + Aave RPC   │
        └──────────┘  └──────────┘  └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Privy Wallet │
                      │  (tx submit) │
                      └──────────────┘
```

## Source layout

```
src/
  app.module.ts          # Root module wiring
  main.ts                # Bootstrap, Swagger, global middleware

  auth/                  # JWT + Privy JWKS
  users/                 # Profile API
  wallets/               # Privy wallet CRUD + faucet
  chains/                # Supported chains (config-backed)
  assets/                # Token metadata (config-backed)
  system/                # Runtime environment endpoint
  health/                # Liveness, readiness, dependency probes

  earn/                  # Earn product surface
    controllers/         # Vault, position, transaction HTTP handlers
    services/            # Approval, deposit, withdraw, queries, blockchain I/O
    persistence/         # Position + transaction DB layer
      positions/
      transactions/
      earn-persistence.module.ts
    repositories/        # Vault slug upsert (Prisma)
    dto/
    exceptions/
    validators/
    utils/
    earn.module.ts

  protocols/             # Lending protocol adapters (read/preview)
    aave/
  blockchain/            # Shared contract ABIs (viem)
    abis/

  reconciliation/        # BullMQ worker for stuck SUBMITTED txs
  idempotency/           # Mutation replay safety
  audit/                 # Auth / wallet / earn audit trail
  prisma/                # Database client
  redis/                 # Cache + BullMQ connection
  config/                # Typed env config
  common/                # Middleware, filters, shared utils
```

### Layering inside `earn/`

| Layer | Role |
|-------|------|
| `controllers/` | HTTP, auth guards, idempotency headers, DTO mapping |
| `services/` | Orchestration: validate → create tx → Privy submit → confirm → position update |
| `persistence/` | Prisma repositories for positions and on-chain transaction records |
| `repositories/` | Vault metadata synced from protocol provider |
| `protocols/` (external) | On-chain vault reads, APY/TVL, deposit/withdraw previews |

`EarnBlockchainService` lives in `earn/services/` and owns viem RPC calls, calldata encoding, and receipt polling. Protocol-specific **read** logic stays in `protocols/aave/`.

## Modules

| Module | Responsibility |
|--------|----------------|
| `AuthModule` | JWT + Privy JWKS validation |
| `WalletsModule` | Privy wallet CRUD, balances, server signing |
| `EarnModule` | Vaults, deposits, approvals, positions, withdrawals |
| `EarnPersistenceModule` | `PositionsModule` + `TransactionsModule` bundle |
| `ProtocolsModule` | Aave V3 provider abstraction |
| `IdempotencyModule` | Safe retries for approve / deposit / withdraw |
| `ReconciliationModule` | BullMQ job every 30s for stuck txs |
| `AuditModule` | Persistent audit trail |
| `HealthModule` | Liveness, readiness, dependency detail probes |
| `SystemModule` | Runtime environment introspection |

## Transaction flow (deposit / withdraw)

1. **Validate** — ownership, chain, balance / allowance / shares, mainnet guard
2. **Create** — `CREATED` transaction record inside a Prisma transaction
3. **Submit** — Privy `eth_sendTransaction` → `SUBMITTED`
4. **Confirm** — wait for receipt; `confirmSubmitted()` atomically marks `CONFIRMED` and updates position once
5. **Reconcile** — BullMQ catches any `SUBMITTED` txs the sync path missed

Position balances update **only after on-chain confirmation**. `confirmSubmitted()` prevents duplicate position updates when reconciliation and the request handler race.

## Data model

- **Vault** — protocol vault synced by slug (`aave-base-sepolia-usdc`, etc.)
- **Position** — one per user per vault (`PENDING`, `ACTIVE`, `WITHDRAWING`, `CLOSED`, `FAILED`)
- **Transaction** — `APPROVAL`, `DEPOSIT`, `WITHDRAW` with status lifecycle
- **IdempotencyKey** — keyed by header + operation + request body hash
- **AuditLog** — append-only user action trail

## Protocol abstraction

`EarnProtocolProvider` is the swap point for lending protocols. Vault addresses come from env JSON (`AAVE_VAULTS_CONFIG`). Adding Morpho means a new provider under `protocols/` and a factory branch — earn orchestration stays unchanged.

## Security layers

1. JWT on protected routes
2. Wallet / position ownership checks
3. Idempotency on approve, deposit, withdraw
4. Mainnet guard (`ALLOW_MAINNET_TRANSACTIONS`)
5. Helmet, CORS, global + per-user rate limits
6. Request correlation via `X-Request-Id`
