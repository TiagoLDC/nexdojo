@echo off
rem Sobe o simulador da catraca. Argumentos extras são repassados, ex.:
rem   iniciar.bat --porta 8091 --nome "Catraca 2" --device-id 4408801109306066
cd /d "%~dp0"
py simulador.py %*
pause
