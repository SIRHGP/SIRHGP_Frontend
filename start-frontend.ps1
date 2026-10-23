# ============================================================
#  start-frontend.ps1  ?  Lance le frontend SIRHGP (Vite)
#  Usage : .\start-frontend.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Frontend SIRHGP - Vite dev server (port 5000)" -ForegroundColor Cyan
Write-Host "  Proxy /api -> http://localhost:8080 (backend)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# --- Lancement du frontend ---
Write-Host "Démarrage du frontend sur le port 5000..." -ForegroundColor Green
npm run dev