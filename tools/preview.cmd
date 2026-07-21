@echo off
REM ============================================================
REM  PREVIEW — double-click to view the site locally.
REM
REM  Starts a small local web server and opens your browser.
REM  Opening index.html directly from the folder does NOT work:
REM  the browser blocks the data loading and folder links show a
REM  file listing instead of the page. This fixes both.
REM
REM  Close this window (or Ctrl+C) when you're done.
REM ============================================================
setlocal
cd /d "%~dp0.."

set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if not defined NODE (
  echo.
  echo   Node.js not found. Get it from https://nodejs.org
  echo   If you just installed it, sign out and back in first.
  echo.
  pause
  exit /b 1
)

start "" http://localhost:8080/
"%NODE%" tools\serve.js

pause
endlocal
