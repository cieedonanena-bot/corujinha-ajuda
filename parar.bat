@echo off
title Parar Corujinha Ajuda
echo ============================================
echo    🦉 CORUJINHA AJUDA - ENCERRANDO
echo ============================================
echo.

REM Procura processos Python que estao rodando o app.py
set encontrado=0

for /f "tokens=2 delims=," %%P in ('tasklist /fi "imagename eq python.exe" /fo csv /nh 2^>nul') do (
    set encontrado=1
)

if "%encontrado%"=="0" (
    echo Nenhum servidor Python em execucao.
    timeout /t 2 >nul
    exit /b 0
)

echo Encerrando servidor...
taskkill /F /IM python.exe /T >nul 2>&1

if errorlevel 1 (
    echo [ERRO] Nao foi possivel encerrar o processo.
    echo Tente fechar manualmente pelo Gerenciador de Tarefas.
) else (
    echo Servidor encerrado com sucesso.
)

timeout /t 2 >nul