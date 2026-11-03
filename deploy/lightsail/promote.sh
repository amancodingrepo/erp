set -euo pipefail

ENV_FILE=/opt/campus-erp/app.env
NET=campus-net
CADDY_IMAGE=caddy:2.8.4-alpine

echo "$GHCR_TOKEN" | sudo docker login ghcr.io -u "$GHCR_USER" --password-stdin
prev="$(sudo docker inspect -f '{{.Image}}' campus-erp 2>/dev/null || true)"

# HTTPS is switched on by the server, not by this script: when AUTH_URL in app.env is
# https://<domain> (a name, not an IP), Caddy fronts the app on 80/443 and gets a free
# certificate for that domain. Otherwise the app serves plain HTTP on port 80, as before.
auth_url="$(sudo grep -E '^(AUTH_URL|NEXTAUTH_URL)=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"' \r" || true)"
domain=""
case "$auth_url" in
  https://*)
    host="${auth_url#https://}"; host="${host%%/*}"; host="${host%%:*}"
    if ! printf '%s' "$host" | grep -Eq '^[0-9.]+$'; then domain="$host"; fi
    ;;
esac
if [ -n "$domain" ]; then echo "Mode: HTTPS for $domain"; else echo "Mode: plain HTTP (AUTH_URL is not an https domain)"; fi

# Back up the database with the running container before anything changes. If the dump fails,
# set -e stops the deploy here and the current version keeps running. The file lands in the
# uploads volume, so it survives the image swap and shows in Backup / Restore. Keeps the last 5.
running="$(sudo docker inspect -f '{{.State.Running}}' campus-erp 2>/dev/null || echo false)"
if [ "$running" != true ]; then
  echo "No running campus-erp container, so no pre-deploy backup (nothing is serving)."
else
  sudo docker exec campus-erp sh -c '
    set -e
    dir="${UPLOAD_DIR:-/app/uploads}/backups"
    mkdir -p "$dir"
    file="$dir/erp-predeploy-$(date -u +%Y-%m-%dT%H-%M-%SZ).dump"
    pg_dump --format=custom --file="$file" "$DATABASE_URL"
    test -s "$file"
    ls -1t "$dir"/erp-predeploy-*.dump | tail -n +6 | xargs -r rm -f
    echo "Pre-deploy backup: $file ($(wc -c < "$file") bytes)"
  '
fi

sudo docker network inspect "$NET" >/dev/null 2>&1 || sudo docker network create "$NET" >/dev/null

# run_app IMAGE MODE: MODE "https" keeps the app off the host ports (Caddy owns 80/443).
run_app() {
  sudo docker rm -f campus-erp >/dev/null 2>&1 || true
  local ports="-p 80:3000"
  if [ "$2" = https ]; then ports=""; fi
  # shellcheck disable=SC2086
  sudo docker run -d --name campus-erp --restart unless-stopped \
    --network "$NET" \
    --env-file "$ENV_FILE" \
    $ports \
    -v /opt/campus-erp/uploads:/app/uploads \
    "$1" >/dev/null
}

start_caddy() {
  sudo docker rm -f campus-caddy >/dev/null 2>&1 || true
  sudo mkdir -p /opt/campus-erp/caddy/data /opt/campus-erp/caddy/config
  sudo docker run -d --name campus-caddy --restart unless-stopped \
    --network "$NET" \
    -p 80:80 -p 443:443 \
    -v /opt/campus-erp/caddy/data:/data \
    -v /opt/campus-erp/caddy/config:/config \
    "$CADDY_IMAGE" \
    caddy reverse-proxy --from "$1" --to campus-erp:3000 >/dev/null
}

mode=http
if [ -n "$domain" ]; then mode=https; fi

sudo docker pull "$IMAGE"
if [ "$mode" = http ]; then sudo docker rm -f campus-caddy >/dev/null 2>&1 || true; fi
run_app "$IMAGE" "$mode"

# Quoted heredoc so the JavaScript quotes survive this shell.
check=$(cat <<'EOF'
const health = await fetch("http://127.0.0.1:3000/api/health");
const body = await health.text();
if (!health.ok || !body.includes('"db":"up"')) process.exit(1);
const page = await fetch("http://127.0.0.1:3000/");
const html = await page.text();
if (!page.ok || !html.includes("School World")) process.exit(1);
EOF
)

healthy=0
for _ in $(seq 1 30); do
  if sudo docker exec campus-erp node --input-type=module -e "$check"; then
    healthy=1
    break
  fi
  sleep 3
done

if [ "$healthy" != 1 ]; then
  sudo docker logout ghcr.io >/dev/null 2>&1 || true
  echo "New container failed the health check. Restoring the previous image."
  if [ -n "$prev" ]; then run_app "$prev" "$mode"; else sudo docker rm -f campus-erp >/dev/null 2>&1 || true; fi
  exit 1
fi

if [ "$mode" = https ]; then
  start_caddy "$domain"
  # Caddy must be running and able to reach the app; the certificate itself may take a minute.
  proxied=0
  for _ in $(seq 1 20); do
    if [ "$(sudo docker inspect -f '{{.State.Running}}' campus-caddy 2>/dev/null)" = true ] \
      && sudo docker exec campus-caddy wget -q -O /dev/null http://campus-erp:3000/api/health; then
      proxied=1
      break
    fi
    sleep 3
  done
  if [ "$proxied" != 1 ]; then
    echo "Caddy did not come up. Falling back to plain HTTP on port 80 so the site stays reachable."
    sudo docker logs --tail 30 campus-caddy || true
    sudo docker rm -f campus-caddy >/dev/null 2>&1 || true
    run_app "$IMAGE" http
    sudo docker logout ghcr.io >/dev/null 2>&1 || true
    exit 1
  fi
  echo "HTTPS proxy is up for https://$domain"
fi

sudo docker logout ghcr.io >/dev/null 2>&1 || true
sudo docker ps --filter name=campus-
