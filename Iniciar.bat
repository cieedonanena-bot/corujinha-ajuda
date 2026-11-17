@echo off
title Corujinha Ajuda
cd /d "%~dp0"

echo ============================================
echo        🦉 CORUJINHA AJUDA - INICIANDO
echo ============================================
echo.

if not exist ".venv\Scripts\activate.bat" (
    echo [ERRO] Ambiente virtual .venv nao encontrado.
    echo Crie o ambiente com: python -m venv .venv
    echo Depois instale as dependencias: .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo [1/3] Ativando ambiente virtual...
call ".venv\Scripts\activate.bat"

python -c "import flask" 2>nul
if errorlevel 1 (
    echo [2/3] Instalando dependencias...
    pip install -r requirements.txt
) else (
    echo [2/3] Dependencias OK.
)

echo [3/3] Iniciando servidor Flask...
start "" cmd /c "timeout /t 2 >nul & start http://localhost:5000"

python app.py

echo.
echo Servidor encerrado. Pressione qualquer tecla para sair.
pause >nul