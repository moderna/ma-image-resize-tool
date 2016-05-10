# ma-image-resize-tool

An generic image resizing tool based on node.js

### Setup
1. Install ImageMagic binaries from http://www.imagemagick.org/script/binary-releases.php

2. `npm install https://github.com/moderna/ma-image-resize-tool.git --save`

### Use as Commandline tool
1. Create a config-local.json (we recommend to add this to your .gitignore file). Vales in config-local.json will overwrite values in config.json (see "BuildTags" as example).
Be aware that the paths of --config and --config-local are NOT based on basePath (since that's yet known at config load time).
    ```javascript
    {
        "basePath" : "ENTER YOUR ABSOLUTE BASE PATH HERE (it´s optional)",
        "BuildTags": "test"
    }
    ```

2. Create a config.json
The "<" and ">" in the alias are optional (added to increase visibility). You can choose whatever string you want as long as it´s js RegExp compatible.
    ```javascript
    {
        "aliases":
        [
            { "name": "<testImage>", "path" : "./testImages/Test.png" }
        ],

        "images":
        [
            { "tags" : "all", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-1024x768.png", "resolution":"24x768", "proportional" : "false" },
            { "tags" : "all,test", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-1024x768.png", "resolution":"24x768", "proportional" : "false" }
        ],

        "defaultBuildTags" : "all"
    }
    ```

3. Run it with these (optional) parameters:
    ```
    ma-image-resize-tool --config config.json --config-local config-local.json --tags all,test
    ```
All parameters are optional:
- Default for --config is "config.json"
- Default for --config.local is "config-local.json"
- Default for --tags is "all" (separate multiple tags with commas ",")

### Use as node module
1. Create the config.json and confiog-local.json file (see above) or use the configure() and configureWithData() methods.

2a. Run without any configs
    ```javascript
    var maImageResizeTool = require("ma-image-resize-tool");
    maImageResizeTool.run();
    ```javascript

2b. Run with config file paths set in js
    ```javascript
    var maImageResizeTool = require("ma-image-resize-tool");
    maImageResizeTool.configure( "config.json", "config-local.json", "all,test" );
    maImageResizeTool.run();
    ```javascript

2c. Run with config data set in js
    ```javascript
    var maImageResizeTool = require("ma-image-resize-tool");
    var config = {
        "aliases":
            [
                { "name": "<testImage>", "path" : "./testImages/Test.png" }
            ],

        "images":
            [
                { "tags" : "all", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-1024x768.png", "resolution":"1024x768", "proportional" : "false" },
                { "tags" : "all,test", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-2048x1536.png", "resolution":"2048x1536", "proportional" : "false" }
            ],

        "defaultBuildTags" : "all"
    };

    var configLocal = {
        // "basePath" : "ENTER YOUR ABSOLUTE BASE PATH HERE (it´s optional)",
        "BuildTags": "all"
    };

    maImageResizeTool.configureWithData( config, configLocal || null, "all,test" );
    maImageResizeTool.run();
    ```javascript

### Requirements
- Installed Node.js
- Installed ImageMagic
- Node GraphicsMagick package ("gm")

### Local Commandline Install
If you are like us and don't like global package installs then please consider using these console command files to execute the module locally:

Windows (console.cmd):
    ```
    @echo off
    %~d1
    cd "%~p1"
    SET PATH=./node_modules/.bin;%PATH%
    call cmd
    @echo on
    ```

Mac (console.command):
    ```
    #!/bin/sh
    cd "$(dirname "$0")"
    export PATH=./node_modules/.bin:$PATH
    bash
    ```

### Credits
Developed by Georg Kamptner, Modern Alchemists OG, http://modalog.at

### License

MIT
