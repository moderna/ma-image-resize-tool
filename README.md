# ma-image-resize-tool

An generic image resizing tool based on node.js

### Setup
1. Install ImageMagic binaries from http://www.imagemagick.org/script/binary-releases.php

2. `npm install https://github.com/moderna/ma-image-resize-tool.git`

### Use as Commandline tool
1. Create a config-local.json (we recommend to add this to your .gitignore file). Vales in config-local.json will overwrite values in config.json (see "BuildTags" as example).
Be aware that the paths of --config and --config-local are NOT based on basePath (since that's yet known at config load time).
    ```javascript
    {
        "basePath" : "ENTER YOUR ABSOLUTE BASE PATH HERE (it´s optional)",
        "buildTags": "test"
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

        "optimize":
        {
            "optipng" : "",
            "jpgtran" : "-copy none -optimize"
        },

        "options": {
            "unsharp" : [1.5, 1, 0.7, 0.02]
        },

        "images":
        [
            { "tags" : "all", "sourcePath" : "./testDirAllToJpg/*", "targetPath" : "testOutput/jpgs/*.jpg", "resolution":"800x600" },
            { "tags" : "all", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-1024x768.jpg", "resolution":"1024x768" },
            { "tags" : "all,test", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-2048x1536.jpg", "resolution":"2048x1536", "proportional" : "false", "quality" : 100, "optimize" : false },
            {
                "tags" : "all,test", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-lowq-flipped.jpg", "resolution":"2048x1536", "proportional" : "false",
                "options": {
                    "quality" : [20],
                    "flip" : null
                }
            }
        ],

        "defaultBuildTags" : "all"
    }
    ```
   * "optimize" is an optional object which defines whether or not to run image optimizations (optipng and jpgtran). Set them false or delete an entry to avoid optimization for all images. You can use all options documented on the optipng (http://gsp.com/cgi-bin/man.cgi?topic=optipng) and jpgtran (http://gsp.com/cgi-bin/man.cgi?topic=jpegtran) websites.
   * "options" is an optional object which defines the default resize options (ImageMagic/GraphicsMagic) for all images. You can use any of the option functions documented here: https://aheckmann.github.io/gm/docs.html. Use Null or an empty Array if a function has no parameters.
   * images: "tags" defines the tags an image has (comma separated). You can choose in the config or with the --tags parameter which tags to build.
   * images: "sourcePath" has to be a file path or a glob path (see: https://www.npmjs.com/package/glob).
   * images: "targetPath" has to be a real file path (no glob support) and end with ```*.<extension>``` or ```<filename>.<extension>``` (example: testDir/*.jpg, *.png, testDir/myImg.png ...). The extension defines the output image format.
   * images: "resolution" defines the images' target resolution or bounding box (if "proportional" is true)
   * images: "proportional" is optional (default is false). Defines whether or not to resize the image proportionally. The "resolution" is used as bounding box if "proportional" is true.
   * images: "quality" is optional and defines the jpg or png quality (range 0 to 100).
   * images: "optimize" is optional (default is true, set it to false to exclude this image from optimization with jpgtran or optipng).
   * images: "options" is optional and will extend (be merged with) the global "options" object. You can use any of the option functions documented here: https://aheckmann.github.io/gm/docs.html

3. Run it with these (optional) parameters:
    ```
    ma-image-resize-tool --config config.json --config-local config-local.json --tags all,test
    ```
All parameters are optional:
   * Default for --config is "config.json"
   * Default for --config-local is "config-local.json"
   * Default for --tags is "all" (separate multiple tags with commas ",")

### Use as node module
1. Create the config.json and config-local.json file (see above) or use the configure() and configureWithData() methods.

2. A: Run without any configs
    ```javascript
    var maImageResizeTool = require("ma-image-resize-tool");
    maImageResizeTool.run();
    ```

2. B: Run with config file paths set in js
    ```javascript
    var maImageResizeTool = require("ma-image-resize-tool");
    maImageResizeTool.configure( "config.json", "config-local.json", "all,test" );
    maImageResizeTool.run();
    ```javascript

2. C: Run with config data set in js
    ```javascript
    var maImageResizeTool = require("ma-image-resize-tool");
    var config = {
        "aliases":
            [
                { "name": "<testImage>", "path" : "./testImages/Test.png" }
            ],

        "optimize":
            {
                "optipng" : "",
                "jpgtran" : "-copy none -optimize"
            },

        "images":
            [
                { "tags" : "all", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-1024x768.png", "resolution":"1024x768", "proportional" : "false" },
                { "tags" : "all,test", "sourcePath" : "<testImage>", "targetPath" : "testOutput/Test-2048x1536.png", "resolution":"2048x1536", "proportional" : "false" }
            ],

        "buildTags" : "all"
    };

    // configLocal is optional (you may want to use Null instead)
    var configLocal = {
        // "basePath" : "ENTER YOUR ABSOLUTE BASE PATH HERE (it´s optional)",
        "buildTags": "all"
    };

    maImageResizeTool.configureWithData( config, configLocal || null, "all,test" );
    maImageResizeTool.run();
    ```

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
