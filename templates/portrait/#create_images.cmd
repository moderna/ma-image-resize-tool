@echo off
%~d1
cd "%~p1"
SET PATH=./node_modules/.bin;%PATH%
:: Call the image tool
call ma-image-resize-tool --config source/config.json
pause
@echo on