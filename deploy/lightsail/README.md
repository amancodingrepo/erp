# Deploy to AWS Lightsail

## How the live server runs today
- A push to `main` runs `ci` and then `docker-image`. That workflow builds the image, then SSHes in and runs `promote.sh`, which:
  - backs up the database;
  - swaps the `campus-erp` container;
  - health-checks it, and rolls back if it's unhealthy.
- Settings live in `/opt/campus-erp/app.env` on the server. The database is the managed Lightsail Postgres `campus-erp-db`.
- The Docker Compose steps further down are the original single-box setup. They're not what the live server uses.

### Turning on HTTPS (one time)
1. **DNS:** add an A record for the domain pointing at the static IP `15.134.63.44`, with no AAAA record. Wait until `nslookup <domain>` returns that IP. (Live: `erp.schoolworld.online`.)
2. **Name the domain:** GitHub → repository Settings → Secrets and variables → Actions → **Variables**: set `PUBLIC_DOMAIN` to the domain. Setting `AUTH_URL=https://<domain>` in `/opt/campus-erp/app.env` also works; `PUBLIC_DOMAIN` takes priority.
3. **Redeploy:** re-run the latest `docker-image` workflow, or merge any change to `main`.
   - `promote.sh` starts Caddy on 80/443. Caddy gets a free Let's Encrypt certificate and proxies to the app, which leaves the host ports.
   - The app gets `AUTH_URL=https://<domain>`, so sign-in cookies are HTTPS-only.
   - `http://` and the bare IP both redirect to `https://<domain>`.
   - HTTPS turns on only if the domain resolves to this server. Otherwise the script stays on plain HTTP and says why in the deploy log.
   - If a real HTTPS request through Caddy doesn't succeed within about 2 minutes, the script goes back to plain HTTP on port 80, so the site stays reachable, and the deploy is marked failed.
4. **Check:** open `https://<domain>`.
5. **Turning it off:** clear `PUBLIC_DOMAIN` (and any https `AUTH_URL`) and redeploy.

Certificates are kept in `/opt/campus-erp/caddy` and renew automatically.

---

## Original single-box setup (Docker Compose)

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
