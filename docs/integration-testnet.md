# Base Sepolia Integration Script

Automated end-to-end test against a **running** API server and a **funded** Base Sepolia wallet.

## Prerequisites

1. **Server running** with valid config:
   ```bash
   npm run db:deploy:local
   npm run start:dev
   ```

2. **Credentials configured** in `.env.local`:
   - `DATABASE_URL`, `REDIS_URL`, `PRIVY_*`, `ALCHEMY_API_KEY`
   - `AAVE_VAULTS_CONFIG` with `aave-base-sepolia-usdc` enabled
   - `ALLOW_MAINNET_TRANSACTIONS=false` (testnet only)

3. **Funded wallet** on Base Sepolia (`chainId: 84532`):
   - **ETH** for gas — [Coinbase Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
   - **Aave USDC** (`0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f`) — **not** Circle USDC (`0x036CbD...`)
   - If [staging.aave.com/faucet](https://staging.aave.com/faucet/) is down, use one of:
     - [app.aave.com](https://app.aave.com/) → gear icon → **Testnet mode** → **Base Sepolia** → **Faucet** tab
     - BaseScan **Write Contract** on [Aave faucet `0xD914...A6Dc`](https://sepolia.basescan.org/address/0xD9145b5F45Ad4519c7ACcD6E0A4A82e83bB8A6Dc#writeContract): `mint(token=0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f, to=<wallet>, amount=1000000)` — max **1 USDC/hour**
     - Local API (when Privy tx signing is configured): `POST /api/v1/wallets/:walletId/faucet/aave-usdc`

## Run

```bash
# Default: login (or auto-register), deposit 0.1 USDC, full withdraw
npm run integration:testnet
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INTEGRATION_BASE_URL` | `http://localhost:3000/api/v1` | API base URL |
| `INTEGRATION_EMAIL` | random `@test.local` | Test user email |
| `INTEGRATION_PASSWORD` | built-in test password | Min 32 chars recommended |
| `INTEGRATION_REGISTER` | `false` | Force register instead of login |
| `INTEGRATION_VAULT_ID` | `aave-base-sepolia-usdc` | Vault slug |
| `INTEGRATION_CHAIN_ID` | `84532` | Base Sepolia |
| `INTEGRATION_DEPOSIT_AMOUNT` | `100000` | 0.1 USDC (6 decimals) |
| `INTEGRATION_SKIP_WITHDRAW` | `false` | Stop after deposit |

### Examples

```bash
# Reuse an existing funded account
INTEGRATION_EMAIL=you@example.com \
INTEGRATION_PASSWORD='your-secure-password' \
npm run integration:testnet

# Deposit only (no withdraw)
INTEGRATION_SKIP_WITHDRAW=true npm run integration:testnet

# Against a deployed staging API
INTEGRATION_BASE_URL=https://staging.example.com/api/v1 \
INTEGRATION_EMAIL=staging@test.com \
INTEGRATION_PASSWORD='...' \
npm run integration:testnet
```

## What the script does

1. `GET /health/ready` — verify API + DB + Redis
2. `POST /auth/login` (or register on 401)
3. `POST /wallets` — create wallet on Base Sepolia if none exists
4. `GET /earn/vaults` — verify Aave USDC vault
5. `POST /earn/vaults/:id/deposit/preview` — check USDC balance
6. `POST /earn/vaults/:id/approve` — if allowance insufficient
7. `POST /earn/vaults/:id/deposit` — Aave `supply` via Privy
8. `GET /earn/positions/:id` — position + `transactions[]`
9. `GET /earn/transactions` — list user transactions
10. `POST /earn/positions/:id/withdraw` — full withdraw (`fullWithdraw: true`)

Each mutation uses a fresh `idempotency-key` header.

## Troubleshooting

| Error | Fix |
|-------|-----|
| API not ready | Start server, check DB/Redis |
| Wallet 502 | Verify Privy `PRIVY_APP_ID` / `PRIVY_APP_SECRET` |
| Insufficient USDC | Fund wallet with Aave USDC on Base Sepolia |
| Insufficient allowance | Script auto-approves; ensure ETH for gas |
| Mainnet blocked | Keep `ALLOW_MAINNET_TRANSACTIONS=false` for testnet |
| Deposit timeout | Check Alchemy RPC; verify Privy wallet can sign |
