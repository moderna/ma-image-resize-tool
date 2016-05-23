@echo off
%~d1
cd "%~p1"
SET PATH=./node_modules/.bin;%PATH%
:: Setup
call ma-image-resize-tool setup --info
pause
@echo on