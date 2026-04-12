@echo off
REM Bypass PowerShell execution policy: uses npm.cmd instead of npm.ps1
cd /d "%~dp0"
call npm.cmd run dev
