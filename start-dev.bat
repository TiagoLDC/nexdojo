@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo Verificando portas 3002 e 3005...

set "porta_em_uso="
netstat -ano | findstr ":3002" >nul 2>&1
if not errorlevel 1 set "porta_em_uso=1"
netstat -ano | findstr ":3005" >nul 2>&1
if not errorlevel 1 set "porta_em_uso=1"

if defined porta_em_uso (
    echo AVISO: Uma ou mais portas ja estao em uso:
    netstat -ano | findstr ":3002 :3005"
    echo.
    set /p "resposta=Deseja continuar mesmo assim? (S/N): "
    if /i not "!resposta!"=="S" (
        echo Abortando.
        exit /b
    )
)

echo.
echo Iniciando NexDojo (Frontend :3002 + API :3005)...
npm run dev:all
