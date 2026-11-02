export async function register() {
  // Daily dumps are triggered by GitHub Actions (.github/workflows/backup.yml).
  // This file must not import Node-only modules or Next webpack fails on Railway.
}
