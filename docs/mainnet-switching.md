# Mainnet Switching Guide

## Current Defaults (Safe)

Local and develop environments use **Base Sepolia** (chainId `84532`) with:

```
ALLOW_MAINNET_TRANSACTIONS=false
MAINNET_ENABLED=false
CHAIN_ID=84532
```

Any attempt to transact on mainnet (chainId `8453`) returns **403 Forbidden**.

## Switching to Mainnet

### Step 1 — Update chain config

In `.env.production`:

```
CHAIN=base
CHAIN_ID=8453
MAINNET_ENABLED=true
ALLOW_MAINNET_TRANSACTIONS=true
```

Ensure `CHAINS_CONFIG` includes Base mainnet (`chainId: 8453`) and `AAVE_VAULTS_CONFIG` points to mainnet pool/aToken addresses.

### Step 2 — Update assets

`ASSETS_CONFIG` must include mainnet USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on Base).

### Step 3 — Verify RPC

Confirm `RPC_URL` and per-chain `rpcUrl` in `CHAINS_CONFIG` use mainnet Alchemy endpoints.

### Step 4 — Privy wallets

Users need wallets on chainId `8453`. Create wallets with matching chain before depositing.

### Step 5 — Smoke test (small amounts)

1. `POST /earn/vaults/:vaultId/deposit/preview` — verify balance/allowance
2. `POST /earn/vaults/:vaultId/approve` with idempotency key
3. `POST /earn/vaults/:vaultId/deposit` with idempotency key
4. `GET /earn/positions` — confirm position ACTIVE
5. `POST /earn/positions/:positionId/withdraw` partial, then full

### Step 6 — Emergency stop

Set `ALLOW_MAINNET_TRANSACTIONS=false` and redeploy. Existing on-chain txs continue; new submissions are blocked.

## Validation Rules (Enforced in Code)

| Check | Service |
|-------|---------|
| Chain matches environment | `EarnTransactionValidationService.assertChainMatchesEnvironment` |
| Vault belongs to chain | `assertVaultBelongsToChain` |
| RPC configured for chain | `assertRpcBelongsToChain` |
| Wallet belongs to user | `assertWalletBelongsToUser` |
| Idempotency key present | `IdempotencyInterceptor` (mutations) |
| Balance sufficient | Deposit flow |
| Allowance sufficient | Deposit / approve flow |
| Position shares sufficient | Withdraw flow |
