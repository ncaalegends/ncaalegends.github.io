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
echo    NCAA LEGENDS - ADVANCE
echo   ============================================
echo.

echo   League:  [1] Main   [2] 3-Star   [3] 1-Star
echo   (All three post to their own Discord now. To skip the post on
echo    a given run - say the webhook's down - answer n at the push
echo    prompt, or run advance.js by hand with --no-post.)
echo.
set "LEAGUE=main"
set "POSTFLAG="
set /p LCHOICE="  Which league? (1/2/3, blank = Main): "
if "%LCHOICE%"=="2" set "LEAGUE=3star"
if "%LCHOICE%"=="3" set "LEAGUE=1star"

echo.
set /p WEEK="  Week we're advancing TO (0-15): "
if "%WEEK%"=="" (echo   No week entered. & pause & exit /b 1)

REM ------------------------------------------------------------
REM  The deadline is now a DATE, not a sentence. The sentence the
REM  site shows ("Sunday, July 26th - 6:00 PM EDT") is generated
REM  from it — see /deadline.js. Typing prose here is rejected,
REM  because a deadline nothing can read is how the advance-day
REM  heads-up post silently stops firing.
REM
REM  Time is optional. Leave it blank and the badge shows the day
REM  with no clock time, the way 1-star and 3-star have always read.
REM ------------------------------------------------------------
echo.
echo   Next advance deadline.
echo   Date, as YYYY-MM-DD. Example: 2026-07-26
echo.
set /p NEXTDATE="  Next deadline date: "
if "%NEXTDATE%"=="" (echo   No date entered. & pause & exit /b 1)

echo.
echo   Time, 24-hour, Eastern. Example: 18:00
echo   Leave blank for a date with no time shown.
echo.
set /p NEXTTIME="  Next deadline time: "

set "NEXTADV=%NEXTDATE%"
if not "%NEXTTIME%"=="" set "NEXTADV=%NEXTDATE% %NEXTTIME%"

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
  if not defined GIT (
    echo.
    echo   Couldn't find git anywhere - not on PATH, not in the usual
    echo   install folders, and not bundled with GitHub Desktop.
    echo   Discord is already posted and league-data.js is already
    echo   updated - only publishing is left. Open GitHub Desktop,
    echo   commit the change, and hit Push.
  ) else (
    "%GIT%" add -A
    "%GIT%" commit -m "%LEAGUE%: advance to Week %WEEK%"
    "%GIT%" push
    if errorlevel 1 (
      echo.
      echo   Push failed - see the message above. The files are saved
      echo   and committed either way, so opening GitHub Desktop and
      echo   hitting Push will finish the job.
    ) else (
      echo.
      echo   Pushed. GitHub Pages usually updates within a minute.
    )
  )
) else (
  echo.
  echo   Skipped. The site won't show the new week until you push.
)

echo.
pause
endlocal
