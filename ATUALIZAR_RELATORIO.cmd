@echo off
setlocal
cd /d "%~dp0"
set "LEADS_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%LEADS_PYTHON%" (
  "%LEADS_PYTHON%" -X utf8 atualizar_relatorio.py
) else (
  py -3 -X utf8 atualizar_relatorio.py
)
if errorlevel 1 (
  echo.
  echo A atualizacao falhou. Confira a mensagem acima. O HTML anterior foi preservado se a validacao da base falhou.
) else (
  echo.
  echo Atualizacao concluida. Abra dashboard_leads.html ou recarregue a pagina.
)
pause
