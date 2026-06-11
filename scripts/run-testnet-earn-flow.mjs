#!/usr/bin/env node
/**
 * End-to-end earn flow against a running API + funded Base Sepolia wallet.
 *
 * Prerequisites:
 *   1. Server running: npm run start:dev
 *   2. Valid Privy + Alchemy + Redis + Postgres config in .env.local
 *   3. Wallet funded with Aave USDC on Base Sepolia (0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f)
 *   4. Some ETH on the wallet for gas
 *
 * Usage:
 *   npm run integration:testnet
 *
 * Env (optional overrides):
 *   INTEGRATION_BASE_URL=http://localhost:3000/api/v1
 *   INTEGRATION_EMAIL=earn-test@example.com
 *   INTEGRATION_PASSWORD=secure-test-password-32chars!!
 *   INTEGRATION_REGISTER=true          # register instead of login when set
 *   INTEGRATION_VAULT_ID=aave-base-sepolia-usdc
 *   INTEGRATION_CHAIN_ID=84532
 *   INTEGRATION_DEPOSIT_AMOUNT=100000  # 0.1 USDC (6 decimals)
 *   INTEGRATION_SKIP_WITHDRAW=true     # stop after deposit (debug)
 */

import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const IDEMPOTENCY_HEADER = 'idempotency-key';

function loadEnvFile() {
  const appEnv = process.env.APP_ENV ?? 'local';
  const envFile = resolve(process.cwd(), `.env.${appEnv}`);

  if (!existsSync(envFile)) {
    return;
  }

  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    process.env[key] ??= value;
  }
}

function config() {
  const baseUrl = (process.env.INTEGRATION_BASE_URL ?? 'http://localhost:3000/api/v1').replace(
    /\/$/,
    '',
  );

  return {
    baseUrl,
    email: process.env.INTEGRATION_EMAIL ?? `earn-integration-${Date.now()}@test.local`,
    password: process.env.INTEGRATION_PASSWORD ?? 'IntegrationTestPass-32chars-min!!',
    register: process.env.INTEGRATION_REGISTER === 'true',
    vaultId: process.env.INTEGRATION_VAULT_ID ?? 'aave-base-sepolia-usdc',
    chainId: Number(process.env.INTEGRATION_CHAIN_ID ?? '84532'),
    depositAmount: process.env.INTEGRATION_DEPOSIT_AMOUNT ?? '100000',
    skipWithdraw: process.env.INTEGRATION_SKIP_WITHDRAW === 'true',
  };
}

function log(step, message, data) {
  const prefix = `[${step}]`;
  if (data !== undefined) {
    console.log(prefix, message, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

function fail(step, message, detail) {
  console.error(`\n❌ [${step}] ${message}`);
  if (detail) {
    console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

async function apiRequest(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${options.method ?? 'GET'} ${path}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function idempotencyHeaders() {
  return { [IDEMPOTENCY_HEADER]: randomUUID() };
}

async function ensureAuth(cfg) {
  if (cfg.register) {
    log('auth', `Registering ${cfg.email}`);
    const result = await apiRequest(cfg.baseUrl, '/auth/register', {
      method: 'POST',
      body: { email: cfg.email, password: cfg.password },
    });
    return result.accessToken;
  }

  try {
    log('auth', `Logging in as ${cfg.email}`);
    const result = await apiRequest(cfg.baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: cfg.email, password: cfg.password },
    });
    return result.accessToken;
  } catch (error) {
    if (error.status === 401) {
      log('auth', 'Login failed — registering new user');
      const result = await apiRequest(cfg.baseUrl, '/auth/register', {
        method: 'POST',
        body: { email: cfg.email, password: cfg.password },
      });
      return result.accessToken;
    }

    throw error;
  }
}

async function ensureWallet(cfg, token) {
  const auth = { Authorization: `Bearer ${token}` };
  const wallets = await apiRequest(cfg.baseUrl, '/wallets', { headers: auth });
  const existing = wallets.find((wallet) => wallet.chainId === cfg.chainId);

  if (existing) {
    log('wallet', `Using existing wallet ${existing.walletId}`, {
      address: existing.walletAddress,
      chainId: existing.chainId,
    });
    return existing;
  }

  log('wallet', `Creating wallet on chain ${cfg.chainId}`);
  const created = await apiRequest(cfg.baseUrl, '/wallets', {
    method: 'POST',
    headers: auth,
    body: { chainId: cfg.chainId, isPrimary: true },
  });

  log('wallet', `Created wallet ${created.walletId}`, {
    address: created.walletAddress,
  });

  return created;
}

async function main() {
  loadEnvFile();
  const cfg = config();

  console.log('\n=== Base Sepolia Earn Integration Flow ===\n');
  log('config', 'Configuration', {
    baseUrl: cfg.baseUrl,
    vaultId: cfg.vaultId,
    chainId: cfg.chainId,
    depositAmount: cfg.depositAmount,
    email: cfg.email,
    skipWithdraw: cfg.skipWithdraw,
  });

  try {
    const health = await apiRequest(cfg.baseUrl, '/health/ready');
    log('health', 'API ready', health);
  } catch (error) {
    fail(
      'health',
      'API is not reachable or not ready. Start the server with: npm run start:dev',
      error.payload ?? error.message,
    );
  }

  let token;

  try {
    token = await ensureAuth(cfg);
  } catch (error) {
    fail('auth', 'Authentication failed', error.payload ?? error.message);
  }

  const auth = { Authorization: `Bearer ${token}` };

  let wallet;

  try {
    wallet = await ensureWallet(cfg, token);
  } catch (error) {
    fail(
      'wallet',
      'Wallet creation failed (check Privy credentials and server logs)',
      error.payload ?? error.message,
    );
  }

  let vaults;

  try {
    vaults = await apiRequest(
      cfg.baseUrl,
      `/earn/vaults?chainId=${cfg.chainId}&protocol=aave&assetSymbol=USDC`,
    );
    log('vaults', `Found ${vaults.length} vault(s)`, vaults.map((v) => v.vaultId));
  } catch (error) {
    fail('vaults', 'Failed to list vaults', error.payload ?? error.message);
  }

  const vault = vaults.find((entry) => entry.vaultId === cfg.vaultId);

  if (!vault) {
    fail('vaults', `Vault not found: ${cfg.vaultId}`, vaults);
  }

  let preview;

  try {
    preview = await apiRequest(cfg.baseUrl, `/earn/vaults/${cfg.vaultId}/deposit/preview`, {
      method: 'POST',
      headers: auth,
      body: { walletId: wallet.walletId, amount: cfg.depositAmount },
    });
    log('preview', 'Deposit preview', preview);

    if (BigInt(preview.walletBalance) < BigInt(cfg.depositAmount)) {
      fail(
        'preview',
        `Insufficient USDC. Need ${cfg.depositAmount} base units, have ${preview.walletBalance}. ` +
          'Fund the wallet with Aave USDC on Base Sepolia (0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f).',
      );
    }
  } catch (error) {
    fail('preview', 'Deposit preview failed', error.payload ?? error.message);
  }

  if (preview.requiresApproval) {
    try {
      log('approve', 'Submitting ERC-20 approval to Aave pool...');
      const approve = await apiRequest(cfg.baseUrl, `/earn/vaults/${cfg.vaultId}/approve`, {
        method: 'POST',
        headers: { ...auth, ...idempotencyHeaders() },
        body: { walletId: wallet.walletId, amount: cfg.depositAmount },
      });
      log('approve', 'Approval result', {
        status: approve.status,
        txHash: approve.txHash,
        transactionId: approve.transactionId,
      });
    } catch (error) {
      fail('approve', 'Approval failed', error.payload ?? error.message);
    }
  } else {
    log('approve', 'Sufficient allowance — skipping on-chain approve');
  }

  let deposit;

  try {
    log('deposit', 'Submitting Aave supply (deposit)...');
    deposit = await apiRequest(cfg.baseUrl, `/earn/vaults/${cfg.vaultId}/deposit`, {
      method: 'POST',
      headers: { ...auth, ...idempotencyHeaders() },
      body: { walletId: wallet.walletId, amount: cfg.depositAmount },
    });
    log('deposit', 'Deposit result', {
      status: deposit.status,
      positionId: deposit.positionId,
      positionStatus: deposit.positionStatus,
      txHash: deposit.txHash,
      shares: deposit.shares,
    });

    if (deposit.status !== 'CONFIRMED') {
      fail('deposit', `Expected CONFIRMED deposit, got ${deposit.status}`, deposit);
    }
  } catch (error) {
    fail('deposit', 'Deposit failed', error.payload ?? error.message);
  }

  let positionDetail;

  try {
    positionDetail = await apiRequest(
      cfg.baseUrl,
      `/earn/positions/${deposit.positionId}`,
      { headers: auth },
    );
    log('position', 'Position detail', {
      positionId: positionDetail.positionId,
      status: positionDetail.status,
      currentAmount: positionDetail.currentAmount,
      transactionCount: positionDetail.transactions?.length ?? 0,
    });
  } catch (error) {
    fail('position', 'Failed to fetch position detail', error.payload ?? error.message);
  }

  try {
    const transactions = await apiRequest(cfg.baseUrl, '/earn/transactions?limit=10', {
      headers: auth,
    });
    log('transactions', `Listed ${transactions.total} transaction(s)`, transactions.items);
  } catch (error) {
    fail('transactions', 'Failed to list transactions', error.payload ?? error.message);
  }

  if (cfg.skipWithdraw) {
    console.log('\n✅ Integration flow completed (deposit only — INTEGRATION_SKIP_WITHDRAW=true)\n');
    return;
  }

  let withdraw;

  try {
    log('withdraw', 'Submitting full Aave withdraw...');
    withdraw = await apiRequest(
      cfg.baseUrl,
      `/earn/positions/${deposit.positionId}/withdraw`,
      {
        method: 'POST',
        headers: { ...auth, ...idempotencyHeaders() },
        body: { walletId: wallet.walletId, fullWithdraw: true },
      },
    );
    log('withdraw', 'Withdraw result', {
      status: withdraw.status,
      positionStatus: withdraw.positionStatus,
      txHash: withdraw.txHash,
      sharesBurned: withdraw.sharesBurned,
    });

    if (withdraw.status !== 'CONFIRMED') {
      fail('withdraw', `Expected CONFIRMED withdraw, got ${withdraw.status}`, withdraw);
    }
  } catch (error) {
    fail('withdraw', 'Withdraw failed', error.payload ?? error.message);
  }

  console.log('\n✅ Full integration flow completed successfully');
  console.log('   approve → deposit → position → transactions → withdraw\n');
}

main().catch((error) => {
  fail('fatal', error.message, error.payload ?? error.stack);
});
