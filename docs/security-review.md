# Security Review

## Authentication & Authorization

| Control | Status | Notes |
|---------|--------|-------|
| JWT on protected routes | ✅ | `JwtAuthGuard` + `@ApiBearerAuth()` |
| Wallet ownership | ✅ | `WalletsService.findOwnedWallet` |
| Position ownership | ✅ | `userId` match, 404 on mismatch |
| Privy JWKS validation | ✅ | Via `PRIVY_JWKS_URL` |

## Transaction Safety

| Control | Status | Notes |
|---------|--------|-------|
| Idempotency (approve/deposit/withdraw) | ✅ | Header required; body hash fingerprint |
| Mainnet guard | ✅ | `ALLOW_MAINNET_TRANSACTIONS` |
| Duplicate deposit prevention | ✅ | Open tx + PENDING position checks |
| Duplicate withdraw prevention | ✅ | `hasOpenWithdraw` per position |
| Position update after confirmation | ✅ | No optimistic position writes |
| DB transactions | ✅ | Prisma `$transaction` for atomic updates |
| Amounts as bigint strings | ✅ | No floating-point on-chain values |

## HTTP Hardening

| Control | Status | Notes |
|---------|--------|-------|
| Helmet | ✅ | Security headers |
| CORS | ✅ | Configurable `CORS_ORIGINS` |
| Rate limiting | ✅ | `@nestjs/throttler` global guard |
| Input validation | ✅ | `class-validator` + whitelist |
| Global exception filter | ✅ | No stack traces leaked to clients |

## Infrastructure

| Control | Status | Notes |
|---------|--------|-------|
| Secrets in env (not code) | ✅ | `.env.*` gitignored |
| Redis TLS | ✅ | `rediss://` URL |
| Structured logging | ✅ | JSON HTTP logs |
| Health/readiness probes | ✅ | DB + Redis |
| Graceful shutdown | ✅ | `enableShutdownHooks()` |

## Recommendations (Future)

1. **Request ID tracing** — add `X-Request-Id` middleware for log correlation
2. **WAF / DDoS** — Cloudflare or Railway edge protection in production
3. **Secret rotation** — schedule JWT secret and Privy credential rotation
4. **Audit log table** — persist mutation events for compliance
5. **Withdraw limits** — per-user daily caps configurable in env
6. **2FA / step-up auth** — for high-value withdrawals
7. **Penetration test** — before mainnet launch with real funds

## Threat Model Summary

| Threat | Mitigation |
|--------|------------|
| Replay of mutation requests | Idempotency keys |
| Unauthorized wallet use | Ownership validation |
| Unauthorized position access | userId check |
| Mainnet accident on testnet config | `ALLOW_MAINNET_TRANSACTIONS` |
| Double deposit/withdraw | Open transaction guards |
| RPC / chain mismatch | Validation service chain checks |
| Rate abuse | Throttler |
