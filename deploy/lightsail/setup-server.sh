#!/usr/bin/env bash
# Run once on a fresh Ubuntu Lightsail instance: installs Docker and adds 1GB swap.
set -euo pipefail
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
if ! swapon --show | grep -q swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
echo "Done. Log out and back in so the docker group applies."
