#!/bin/sh
cd "$(dirname "$0")"
export PATH=./node_modules/.bin:$PATH
ma-image-resize-tool --config source/config.json
bash