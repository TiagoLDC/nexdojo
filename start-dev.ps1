# start-dev.ps1 — Sobe API (porta 3005) + Frontend (porta 3002) simultaneamente
# Uso: .\start-dev.ps1  ou  ! .\start-dev.ps1  no chat do Claude

Set-Location $PSScriptRoot
npm run dev:all
