# Privy Server-Side Transaction Signing

Approve, deposit, and withdraw require Privy to sign transactions from embedded wallets.
Without authorization keys, you will see:

```
No valid authorization keys or user signing keys available
```

## One-time Privy Dashboard setup

1. Open [Privy Dashboard](https://dashboard.privy.io) → your app → **Authorization keys**.
2. Click **New key** → **Generate key pair**.
3. Save the **private key** locally (Privy does not store it).
4. Register the public key as a **1-of-1 key quorum** (note the **key quorum ID**).

## Configure `.env.local`

```bash
PRIVY_AUTHORIZATION_PRIVATE_KEY=<base64-pkcs8-private-key-from-dashboard>
PRIVY_WALLET_SIGNER_KEY_QUORUM_ID=<key-quorum-id-from-dashboard>
```

Restart the server after updating env.

## Wallet ownership model

When both env vars are set, **new** wallets are created with `owner_id` set to your key quorum. The server can sign transactions with your authorization private key.

**Older wallets** created with a Privy user owner **cannot** be upgraded for server signing. Create a fresh wallet:

```bash
POST /api/v1/wallets
{ "chainId": 84532 }
```

Fund the new `walletAddress`, then use that `walletId` for approve/deposit.

## Key quorum must match private key

In Privy Dashboard → Authorization, the **private key you saved** must belong to the same key quorum as `PRIVY_WALLET_SIGNER_KEY_QUORUM_ID`. If you created multiple keys (`earn`, `earn2`), use the ID and private key from the **same** key pair.

## Verify

```bash
POST /api/v1/earn/vaults/aave-base-sepolia-usdc/approve
Header: idempotency-key: <uuid>
Body: { "walletId": "<id>", "amount": "1000000" }
```

Expect `status: CONFIRMED` (or `SUBMITTED` briefly) with a `txHash`.
