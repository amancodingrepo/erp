set -euo pipefail

echo "$GHCR_TOKEN" | sudo docker login ghcr.io -u "$GHCR_USER" --password-stdin
prev="$(sudo docker inspect -f '{{.Image}}' campus-erp 2>/dev/null || true)"

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

sudo docker pull "$IMAGE"
sudo docker rm -f campus-erp >/dev/null 2>&1 || true
sudo docker run -d --name campus-erp --restart unless-stopped \
  --env-file /opt/campus-erp/app.env \
  -p 80:3000 \
  -v /opt/campus-erp/uploads:/app/uploads \
  "$IMAGE"

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

sudo docker logout ghcr.io >/dev/null 2>&1 || true

if [ "$healthy" != 1 ]; then
  echo "New container failed the health check. Restoring the previous image."
  sudo docker rm -f campus-erp >/dev/null 2>&1 || true
  if [ -n "$prev" ]; then
    sudo docker run -d --name campus-erp --restart unless-stopped \
      --env-file /opt/campus-erp/app.env \
      -p 80:3000 \
      -v /opt/campus-erp/uploads:/app/uploads \
      "$prev"
  fi
  exit 1
fi

sudo docker ps --filter name=campus-erp
