@echo off
REM ============================================================
REM  FIND-TOOLS — locates node.exe and git.exe.
REM
REM  Not meant to be double-clicked. advance.cmd, scores.cmd and
REM  preview.cmd all "call" this so the search logic lives in one
REM  place instead of being copy-pasted three times.
REM
REM  WHY THIS EXISTS. Two things look identical to "not installed"
REM  but aren't:
REM    - A fresh Node install often doesn't reach Explorer's
REM      environment until you sign out and back in, so "where
REM      node" fails even though node.exe is sitting right there.
REM    - GitHub Desktop ships its own private copy of git and
REM      never adds it to PATH. If that's your only git, "where
REM      git" will never find it, no matter how many times you
REM      restart.
REM  So: check PATH first, then the usual install locations.
REM
REM  ON RETURN:
REM    NODE  full path to node.exe, or empty if not found
REM    GIT   full path to git.exe,  or empty if not found
REM  Empty is not treated as fatal here — each caller decides what
REM  to do about it. advance/scores can't run at all without node,
REM  but a missing git only costs you the automatic push.
REM
REM  NOTE: no "setlocal" in this file, on purpose. setlocal would
REM  scope NODE and GIT to this script and the caller would get
REM  nothing back.
REM ============================================================

REM ---------------------------- NODE ----------------------------
set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "NODE=%LOCALAPPDATA%\Programs\node\node.exe"

REM ---------------------------- GIT -----------------------------
REM GITHOME is the root of a git installation (the folder holding
REM cmd\ and mingw64\). We keep it around because GitHub Desktop's
REM bundled git needs mingw64\bin on PATH to find its credential
REM helper — without that, "git push" prompts for a password that
REM a modern GitHub account doesn't even have.
set "GIT="
set "GITHOME="

where git >nul 2>&1 && set "GIT=git"

if not defined GIT if exist "%ProgramFiles%\Git\cmd\git.exe" set "GITHOME=%ProgramFiles%\Git"
if not defined GITHOME if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" set "GITHOME=%ProgramFiles(x86)%\Git"
if not defined GITHOME if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "GITHOME=%LOCALAPPDATA%\Programs\Git"

REM GitHub Desktop's app folder is version-stamped (app-3.4.13),
REM and an upgrade leaves the old one behind, so sort descending
REM and take the first hit. Layout has moved between releases —
REM check cmd\ first, then mingw64\bin\.
if defined GIT goto :gitfound
if defined GITHOME goto :gitfound
for /f "delims=" %%D in ('dir /b /a:d /o:-n "%LOCALAPPDATA%\GitHubDesktop\app-*" 2^>nul') do (
  if not defined GITHOME if exist "%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git\cmd\git.exe" set "GITHOME=%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git"
  if not defined GITHOME if exist "%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git\mingw64\bin\git.exe" set "GITHOME=%LOCALAPPDATA%\GitHubDesktop\%%D\resources\app\git\mingw64"
)

:gitfound
REM Found git somewhere off-PATH: point GIT at it and put its own
REM bin folders at the front of PATH for this window only, so the
REM credential helper and the other git-* executables resolve.
if not defined GIT if defined GITHOME (
  if exist "%GITHOME%\cmd\git.exe" set "GIT=%GITHOME%\cmd\git.exe"
  if not defined GIT if exist "%GITHOME%\bin\git.exe" set "GIT=%GITHOME%\bin\git.exe"
  set "PATH=%GITHOME%\cmd;%GITHOME%\bin;%GITHOME%\mingw64\bin;%PATH%"
)

exit /b 0
