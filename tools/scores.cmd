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

REM Locate node.exe and git.exe. Sets NODE and GIT; see the comments
REM in find-tools.cmd for why PATH alone isn't enough for either.
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
REM Parentheses matter: without them cmd reads the & as a plain
REM command separator and runs pause + exit unconditionally, so the
REM script quits right here every time regardless of what you typed.
if "%WEEK%"=="" (echo   No week entered. & pause & exit /b 1)

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
  if not defined GIT (
    echo.
    echo   Couldn't find git anywhere - not on PATH, not in the usual
    echo   install folders, and not bundled with GitHub Desktop.
    echo   The scores are already saved to schedule-data.js - only
    echo   publishing is left. Open GitHub Desktop, commit the
    echo   change, and hit Push.
  ) else (
    "%GIT%" add -A
    "%GIT%" commit -m "%LEAGUE%: Week %WEEK% scores"
    "%GIT%" push
    if errorlevel 1 (
      echo.
      echo   Push failed - see the message above. The scores are saved
      echo   and committed either way, so opening GitHub Desktop and
      echo   hitting Push will finish the job.
    ) else (
      echo.
      echo   Pushed. GitHub Pages usually updates within a minute.
    )
  )
) else (
  echo.
  echo   Skipped. Run tools\preview.cmd to check the site locally,
  echo   then push when you're happy with it.
)

echo.
pause
endlocal
