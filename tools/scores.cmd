@echo off
REM ============================================================
REM  SCORES — double-click this file to record a week's finals.
REM
REM  Walks you through every game that week, one at a time. For
REM  head-to-head games it writes BOTH coaches' schedule entries
REM  so the result shows correctly on both, which is the part
REM  that's easy to get wrong by hand.
REM
REM  Blank line skips a game. Type q to stop and save what you've
REM  entered so far. Nothing is posted to Discord.
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
echo    NCAA LEGENDS - RECORD SCORES
echo   ============================================
echo.

echo   League:  [1] Main   [2] 3-Star   [3] 1-Star
echo.
set "LEAGUE=main"
set /p LCHOICE="  Which league? (1/2/3, blank = Main): "
if "%LCHOICE%"=="2" set "LEAGUE=3star"
if "%LCHOICE%"=="3" set "LEAGUE=1star"

echo.
set /p WEEK="  Week whose games are final (0-15): "
if "%WEEK%"=="" echo   No week entered. & pause & exit /b 1

echo.
echo   Include games that are ALREADY final?
echo   (Say y only if you need to fix a score you entered wrong.)
echo.
set "ALLFLAG="
set /p REDO="  Revisit finished games? (y/n, blank = no): "
if /i "%REDO%"=="y" set "ALLFLAG=--all"

echo.
echo   ---------- ENTER SCORES ----------
"%NODE%" tools\scores.js --league %LEAGUE% --week %WEEK% %ALLFLAG%
if errorlevel 1 (
  echo.
  echo   Something went wrong - check the message above.
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
    echo   The scores are already saved to schedule-data.js - only
    echo   publishing is left. Open GitHub Desktop, commit the
    echo   change, and hit Push.
  ) else (
    git add -A
    git commit -m "%LEAGUE%: Week %WEEK% scores"
    git push
    echo.
    echo   Pushed. GitHub Pages usually updates within a minute.
  )
) else (
  echo.
  echo   Skipped. Run tools\preview.cmd to check the site locally,
  echo   then push when you're happy with it.
)

echo.
pause
endlocal
