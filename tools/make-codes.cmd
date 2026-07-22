@echo off
REM ============================================================
REM  MAKE CODES — double-click to generate commissioner access
REM  codes for the web admin page.
REM
REM  Asks for a name and which leagues, one person at a time,
REM  then prints the JSON to paste into Cloudflare.
REM
REM  Nothing is saved to disk. The output is a secret — paste it
REM  into the Worker, hand out the individual codes, then close
REM  this window.
REM ============================================================
setlocal
cd /d "%~dp0.."

REM Locate node.exe. Sets NODE; see the comments in find-tools.cmd
REM for why PATH alone isn't enough.
call "%~dp0find-tools.cmd"

if not defined NODE (
  echo.
  echo   Node.js not found.
  echo.
  echo   If you HAVEN'T installed it yet:
  echo     https://nodejs.org  - take the LTS build, default options.
  echo.
  echo   If you JUST installed it:
  echo     Windows hasn't picked up the new PATH yet. Sign out and back
  echo     in ^(or restart^), then double-click this file again.
  echo.
  pause
  exit /b 1
)

"%NODE%" tools\make-codes.js

echo.
echo   ============================================================
echo    Copy what you need from above BEFORE closing this window.
echo    It isn't saved anywhere and can't be shown again - though
echo    you can always run this script a second time and paste the
echo    existing JSON in to add someone.
echo   ============================================================
echo.
pause
endlocal
