# Railway Deployment Guide

## 1. Create Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Add **PostgreSQL** plugin → copy `DATABASE_URL`
3. Add **Redis** or use external Upstash → set `REDIS_URL` and Upstash REST vars

## 2. Connect Repository

1. **New Service** → Deploy from GitHub repo
2. Set root directory to project root
3. Build command: `npm run build`
4. Start command: `npm run start:prod`

## 3. Environment Variables

In Railway **Variables**, add all vars from `.env.production`:

```
NODE_ENV=production
APP_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=<upstash-tcp-url>
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<token>
# ... remaining vars from .env.example
```

Use Railway variable references for `DATABASE_URL` when using Railway Postgres.

## 4. Run Migrations

Add a one-off deploy command or Railway **Pre-deploy** hook:

```bash
npm run db:deploy:production
```

Or run locally against production DB:

```bash
APP_ENV=production npm run db:deploy:production
```

## 5. Health Checks

Configure Railway health check:

- **Path:** `/api/v1/health/ready`
- **Timeout:** 10s
- **Interval:** 30s

## 6. Custom Domain

1. Railway → Settings → Networking → Custom Domain
2. Update `CORS_ORIGINS` to your frontend domain

## 7. Worker / Queue

BullMQ worker runs inside the same NestJS process (`ReconciliationModule`). For high load, deploy a dedicated worker service with `QUEUE_ENABLED=true` on one instance and `QUEUE_ENABLED=false` on API-only instances.

## 8. Verify

```bash
curl https://your-app.up.railway.app/api/v1/health
curl https://your-app.up.railway.app/api/v1/health/ready
```
