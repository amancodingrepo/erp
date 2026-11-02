# Deploy to AWS Lightsail (single instance, Docker Compose)

Runs Postgres + the Next.js app + Caddy (automatic HTTPS) on one Lightsail Linux instance.

## 1. Create the instance
- Lightsail console > Create instance > Linux/Unix > OS only > Ubuntu 24.04.
- Plan: **2 GB RAM or more** (the Next.js build needs it; the setup script adds swap as a safety net).
- Networking: create a **static IP** and attach it. Firewall: allow 22, 80, 443.
- DNS: point an A record for your domain at the static IP (needed for HTTPS).

## 2. Prepare the server
```bash
ssh ubuntu@<static-ip>
git clone <your-repo-url> erp && cd erp/deploy/lightsail
bash setup-server.sh        # then log out and back in
```

## 3. Configure
```bash
cd erp/deploy/lightsail
cp .env.example .env
# fill in: DOMAIN, POSTGRES_PASSWORD, SEED_ADMIN_PASSWORD
# AUTH_SECRET:  openssl rand -base64 32
nano .env
```

## 4. Launch
```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml logs -f app   # wait for "Ready"
```
Migrations run automatically on every start (`prisma migrate deploy`).

## 5. Seed the first admin (one time only)
```bash
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```
Then sign in at https://<DOMAIN> and change the admin password.

## Updates
```bash
git pull && docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## Backups
```bash
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U erp erp | gzip > erp-$(date +%F).sql.gz
```
Also enable Lightsail **automatic snapshots** on the instance.
