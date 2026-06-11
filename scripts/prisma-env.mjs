#!/usr/bin/env node
/**
 * Loads `.env.{APP_ENV}` and runs Prisma CLI with migration safety guards.
 *
 * Migration strategy:
 *   local     → db:migrate:local   (migrate dev — creates/applies migrations)
 *   develop   → db:migrate:develop (migrate dev — shared staging DB)
 *   production → db:deploy:production (migrate deploy — requires ALLOW_PRODUCTION_MIGRATION=true)
 *   production → db:reset:production   (migrate reset — requires ALLOW_PRODUCTION_DB_RESET=true)
 *
 * Blocked:
 *   - migrate dev on production
 *   - migrate deploy on production without ALLOW_PRODUCTION_MIGRATION=true
 *   - migrate reset on production without ALLOW_PRODUCTION_DB_RESET=true
 *   - migrate dev / migrate reset on unknown APP_ENV values
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ALLOWED_DEV_ENVS = new Set(['local', 'develop']);
const VALID_ENVS = new Set(['local', 'develop', 'production']);

const appEnv = process.env.APP_ENV ?? 'local';
const command = process.argv[2];
const extraArgs = process.argv.slice(3);

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function loadEnvFile() {
  if (!VALID_ENVS.has(appEnv)) {
    fail(`Invalid APP_ENV "${appEnv}". Use local, develop, or production.`);
  }

  const envFile = resolve(process.cwd(), `.env.${appEnv}`);

  if (existsSync(envFile)) {
    const content = readFileSync(envFile, 'utf8');

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      process.env[key] ??= value;
    }
  } else if (!process.env.DATABASE_URL) {
    fail(
      `Environment file not found: .env.${appEnv}, and DATABASE_URL is not set in the process environment.`,
    );
  } else {
    console.log(`▶ Using process environment variables (no .env.${appEnv} file found)`);
  }

  if (!process.env.DATABASE_URL && command !== 'generate') {
    fail(`DATABASE_URL is missing for APP_ENV=${appEnv}`);
  }
}

function assertMigrationSafety() {
  if (command === 'migrate:dev') {
    if (appEnv === 'production') {
      fail(
        'Blocked: "migrate dev" cannot run against production. Use "db:deploy:production" instead.',
      );
    }

    if (!ALLOWED_DEV_ENVS.has(appEnv)) {
      fail(
        `Blocked: "migrate dev" is only allowed for APP_ENV=local or APP_ENV=develop (current: ${appEnv}).`,
      );
    }
  }

  if (command === 'migrate:reset') {
    if (!VALID_ENVS.has(appEnv)) {
      fail(
        `Blocked: "migrate reset" is only allowed for APP_ENV=local, develop, or production (current: ${appEnv}).`,
      );
    }

    if (appEnv === 'production' && process.env.ALLOW_PRODUCTION_DB_RESET !== 'true') {
      fail(
        'Blocked: production migrate reset requires ALLOW_PRODUCTION_DB_RESET=true.\n' +
          'Set this explicitly in your shell before running db:reset:production.',
      );
    }

    console.warn(
      '\n⚠️  migrate reset drops all tables and reapplies migrations. All data will be lost.\n',
    );

    if (appEnv === 'production') {
      console.warn(
        '⚠️  You are resetting the PRODUCTION database. This cannot be undone.\n',
      );
    }
  }

  if (command === 'migrate:deploy' && appEnv === 'production') {
    if (process.env.ALLOW_PRODUCTION_MIGRATION !== 'true') {
      fail(
        'Blocked: production migrate deploy requires ALLOW_PRODUCTION_MIGRATION=true.\n' +
          'Set this explicitly in Railway production variables before deploying schema changes.',
      );
    }

    console.warn(
      '\n⚠️  Running production migration deploy. Ensure migrations were tested on develop first.\n',
    );
  }
}

function buildPrismaArgs() {
  switch (command) {
    case 'generate':
      return ['generate', ...extraArgs];
    case 'migrate:dev':
      return ['migrate', 'dev', ...extraArgs];
    case 'migrate:deploy':
      return ['migrate', 'deploy', ...extraArgs];
    case 'migrate:status':
      return ['migrate', 'status', ...extraArgs];
    case 'migrate:resolve':
      return ['migrate', 'resolve', ...extraArgs];
    case 'migrate:reset':
      return ['migrate', 'reset', '--force', ...extraArgs];
    case 'studio':
      return ['studio', ...extraArgs];
    default:
      fail(
        `Unknown command "${command}". Supported: generate, migrate:dev, migrate:deploy, migrate:status, migrate:resolve, migrate:reset, studio`,
      );
  }
}

loadEnvFile();
assertMigrationSafety();

const prismaArgs = buildPrismaArgs();

console.log(`▶ APP_ENV=${appEnv} npx prisma ${prismaArgs.join(' ')}`);

const result = spawnSync('npx', ['prisma', ...prismaArgs], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
