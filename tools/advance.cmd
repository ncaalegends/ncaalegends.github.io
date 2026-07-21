@echo off
REM ============================================================
REM  ADVANCE — double-click this file to advance the league.
REM
REM  Prompts for the week and the next deadline, shows you a
REM  preview, then updates the site, posts to Discord, and offers
REM  to commit and push. Nothing happens without you confirming.
REM ============================================================
setlocal
cd /d "%~dp0.."

REM Find Node. PATH first, then the two default install locations —
REM a fresh install often doesn't reach Explorer's environment until
REM you sign out, and that looks identical to "not installed".
set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

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

echo.
echo   ============================================
echo    NCAA LEGENDS - ADVANCE
echo   ============================================
echo.

echo   League:  [1] Main   [2] 3-Star   [3] 1-Star
echo   (3-Star and 1-Star update the site only - no Discord post,
echo    since those commissioners aren't on the automation.)
echo.
set "LEAGUE=main"
set "POSTFLAG="
set /p LCHOICE="  Which league? (1/2/3, blank = Main): "
if "%LCHOICE%"=="2" set "LEAGUE=3star" & set "POSTFLAG=--no-post"
if "%LCHOICE%"=="3" set "LEAGUE=1star" & set "POSTFLAG=--no-post"

echo.
set /p WEEK="  Week we're advancing TO (0-15): "
if "%WEEK%"=="" echo   No week entered. & pause & exit /b 1

echo.
echo   Next advance deadline, as it should read on the site.
echo   Example: Sunday, July 26 - 6:00 PM EDT
echo.
set /p NEXTADV="  Next deadline: "
if "%NEXTADV%"=="" echo   No deadline entered. & pause & exit /b 1

echo.
echo   ---------- PREVIEW ----------
"%NODE%" tools\advance.js --league %LEAGUE% --week %WEEK% --next "%NEXTADV%" %POSTFLAG% --dry-run
if errorlevel 1 (
  echo.
  echo   Preview failed - nothing was changed.
  pause
  exit /b 1
)

echo   -----------------------------
echo.
set /p OK="  Apply this? (y/n): "
if /i not "%OK%"=="y" (
  echo.
  echo   Cancelled. Nothing changed, nothing posted.
  pause
  exit /b 0
)

echo.
"%NODE%" tools\advance.js --league %LEAGUE% --week %WEEK% --next "%NEXTADV%" %POSTFLAG%
if errorlevel 1 (
  echo.
  echo   Something went wrong - check the message above.
  echo   If the site file was updated but Discord failed, you can
  echo   retry just the post with:
  echo     node tools\advance.js --league %LEAGUE% --week %WEEK% --next "%NEXTADV%" --no-write
  pause
  exit /b 1
)

echo.
set /p PUSH="  Commit and push so the site goes live? (y/n): "
if /i "%PUSH%"=="y" (
  where git >nul 2>&1
  if errorlevel 1 (
    echo.
    echo   git isn't on your PATH, so I can't push from here.
    echo   Discord is already posted and league-data.js is already
    echo   updated - only publishing is left. Open GitHub Desktop,
    echo   commit the change, and hit Push.
  ) else (
    git add -A
    git commit -m "%LEAGUE%: advance to Week %WEEK%"
    git push
    echo.
    echo   Pushed. GitHub Pages usually updates within a minute.
  )
) else (
  echo.
  echo   Skipped. The site won't show the new week until you push.
)

echo.
pause
endlocal
