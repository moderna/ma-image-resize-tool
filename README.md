# ma-image-resize-tool

A generic image resizing tool based on node.js optimized for making mobile app screenshots and icons. It´s supposed to make screenshot and icon generation easy and flexible (future proof).

### Setup
1. Install ImageMagick binaries from http://www.imagemagick.org/script/binary-releases.php

   Make sure to tick the box "Install legacy utilities (e.g. convert)" during installation on windows.

2. `sudo npm install https://github.com/moderna/ma-image-resize-tool.git`

   Make sure you have npm version 3.5.3 or higher installed.

3. A "#setup-ma-image-tool" file is created if installed locally. Use it to call the "setup" command on local installs.

### Use as Commandline tool (that´s the tools primary purpose)

The tool uses a config file in JSON format. Here is the simplest setup you can make:

1. Create a "config.json" in your image source folder.
    ```javascript
    {
        "images":
        [
            { "sourcePath" : "./_screens/16to10/image.jpg", "targetPath" : "./someTargetDirectory/image.jpg", "resolution":"100x100" }
        ]
    }
    ```
    You may have noticed that the paths are all relative. The base for those paths is always the location of your "config.json" file (no matter which directory you call the tool from). You can of course use absolute paths too.

2. Run it with this command
    ```
    ma-image-resize-tool --config path/to/your/config/config.json
    ```
    The path of the --config parameter is relative to the current working directory.

### Templates (optional setup)
The tool includes config.json templates for mobile developers. These include icons, screenshots and promo gfx for Apple iOS, Google Play, Windows Store, Amazon, BlackBerry and Samsung.

Here is the setup command:
```
ma-image-resize-tool setup --orientation portrait --location yourInstallDir
```
"--orientation" has to be either "landscape" or "portrait"

" --location" is optional (default is the current working directory)

### Advanced config files
To help with version control the tool supports two config files: "config.json" and "config-local.json". Values in config-local.json will be merged with (overwrite) values in config.json. We recommend to add "config-local.json" to your .gitignore file and store only workstation specific configs in it.
Use the "--config-local" parameter to specify the location of "config-local.json" (the path is relative to the current working directory).

Here is an example of a config-local.json file (don´t forget to remove the comments if you copy it):
```javascript
{
     // If you want to build only the "test" images on your machine
     "tags": "test"

     // This is optional. Leave it empty or remove this line altogether to use the location of your "config.json" as basePath.
     ,"basePath" : "/your/optional/image/source/base/path"
}
```

A complete "config.json" file (all options are used here):
```javascript
{
    // This is optional. Leave it empty or remove this line altogether to use the
    // location of your "config.json" as basePath.
    // We recommend to skip the basePath since using the config.json's location as
    // base path is more intuitive and less error-prone (copy friendly).
    "basePath": "/your/optional/base/path",

    // Aliases are variables. They can be a single string or an array of strings.
    // If you specify an array then every path which contains this alias will be expanded into
    // multiple paths.
    //
    // You can freely choose the name of your alias. In these examples we use "<name>"
    // with "<" and ">" for better readability.
    //
    // Example for an array alias:
    //   Alias: { "name": "<language>", "value" : ["en","de"] }
    //     and
    //   Image: { "sourcePath" : "image.jpg", "targetPath" : "./target/dir/image-<language>.jpg", "resolution":"960x640" }
    //     will result in two images:
    //   ./target/dir/image-en.jpg
    //   ./target/dir/image-de.jpg
    //
    // You can also define aliases in the commandline with one or
    // more "--alias name value" parameters (Example: --alias <language> en,de).
    //
    "aliases":
    [
        // this is an array alias which will be expanded into multiple paths
        { "name": "<language>", "value" : ["en","de"] },
        // This is a single string alias which contains the last part of
        // a glob path (see: https://github.com/isaacs/node-glob)
        { "name": "<extensions>", "value": "{png,jpg,jpeg}" },

        // This is a comment which can remain in the JSON file
        // (JSON does not easily support comments, thus we have "invented" this workaround.)
        "// SCREENSHOTS (source paths for screens by aspect ratio)",

        // Two more single string aliases to shorten paths in the "images" section
        // (We like to sort our source images by aspect ratio.)
        { "name": "<source-screens-16:9>",  "value" : "./_screens/16to9" },
        { "name": "<source-screens-4:3>",   "value" : "./_screens/4to3"  }
    ],

    // This is an optional object which defines whether or not to run image optimizations
    // on png (optipng, pngquant) and/or jepg images (jpgtran).
    // Set the value to false or delete an entry to avoid optimization for all images of that type.
    //
    // The given value (string) is directly passed through to the given tool, thus you can use all
    // options documented for:
    //   optipng  - http://gsp.com/cgi-bin/man.cgi?topic=optipng
    //   pngquant - http://pngquant.org
    //   jpgtran  - http://gsp.com/cgi-bin/man.cgi?topic=jpegtran
    // Notice that "optipng" and "pngquant" require no default options. They therefore have an empty string as value.
    // Also notice that the lossy compression of pngquant is only used if "quality" is < 1.0 for png images.
    "optimize":
    {
        "optipng" : "",
        "pngquant" : "",
        "jpgtran" : "-copy none -optimize"
    },

    // This tool uses ImageMagick (legacy) to resize your images. The given value (string) is directly
    // passed through to the ImageMagick "convert" command (except for -resize, that one is used
    // by the tool itself).
    //
    // You can use all options documented under:
    // http://www.imagemagick.org/script/convert.php
    // and
    // http://www.imagemagick.org/Usage/resize/
    //
    // We recommend to use "-unsharp 1.5x1+0.7+0.02" for photoshop like results ;)
    // You can also skip this line (will result in default: "")
    //
    // Notice that these parameters are added AFTER the "-resize" command. ImageMagick executes the
    // given command IN ORDER. Why this important?
    // Here is an example (resize and rotate an image):
    //   Image: { ... targetPath:"img_400x800.jpg", "resolution":"800x400", "imageMagicParameters" : "-rotate 90" }
    //  This will give you an image with dimensions of 400x800, even though you
    //  specified 800x400 as "resolution". That´s because ImageMagick first resizes
    //  the image to "resolution" (800x400) and then executes "-rotate 90" afterwards.
    "imageMagicParameters" : "-unsharp 1.5x1+0.7+0.02",

    // Makes iOS app icon like round corners in your PNGs - default is 0.0 (no round corners)
    // Specify a value between 0.0 (no round corners) and 1.0 (a half circle on the smaller side).
    // You can also skip this line (will result in default: 0.0)
    "roundCorners" : 0.0,

    // Specify a value between 0.0 (low quality) and 1.0 (high quality) - default is 0.75
    // You can also skip this line (will result in default: 0.75)
    "quality" : 0.0,

    // Would you like to preserve the aspect ratio of your images? (default: false)
    // If TRUE then the image "resolution" will be used as the bounding box for the resulting image.
    // You can also skip this line (will result in default: false)
    "proportional" : true,

    // This defines which images to resize.
    // You can specify each image with it´s onw path or use glob paths
    // (as https://github.com/isaacs/node-glob) as "sourcePath".
    "images":
    [
        // A comment
        "// APPLE_APPSTORE SCREENSHOTS",

        // The first image contains all possible options for illustration.
        {
            // "tags": (optional)
            // This defines the tags an image has (comma separated).
            // If an image has not tags. It will be automatically tagged with "all".
            // Choose with "defaultBuildTags" or the "--tags" parameter which tags to build.
            "tags" : "all,ios",

            // "sourcePath":
            // It has to be an absolute or relative file path. It can use the "glob" path syntax
            // (see: https://www.npmjs.com/package/glob).
            // This path is relative to "basePath" or the location of "confiog.json" if "basePath" is
            // not specified.
            "sourcePath" : "<source-screens-16:9>/screen1.png",

            // "targetPath":
            // It has to be a real file path (no "glob" syntax support) and end with
            //   *.[extension] (Examples: testDir/*.jpg, *.png)
            // or
            //    [filename].[extension] (Example: testDir/myImage.png).
            // or
            //   *
            // The [extension] part defines the output image format.
            // The tool will automatically create all necessary folders and subfolders for
            // the given targetPath.
            // The star character "*" in target path is replaced by the source file name.
            // The targetPath also supports some dynamic values which are taken from the image:
            //  [resolution] (e.g 1024x768)
            //  [width] (e.g. 1024)
            //  [height] (e.g. 768)
            //  This means that a target path path like "./3.5-inch/screen_[resolution].png" will
            //  be resolved to "./3.5-inch/screen_1024x768.png".
            "targetPath" : "../target/apple-appstore/<language>/screens/3.5-inch/screen1.png",

            // "resolution":
            // Defines the images' target resolution or bounding box (if "proportional" is true).
            // The format is [width]x[height] (Example: 1024x768)
            "resolution" : "960x640",

            // "optimize" (optional)
            // Set it to false to exclude this image from optimization with jpgtran or
            // optipng (default is true).
            "optimize"   : true,

            // imageMagicParameters": (optional)
            // Will replace the globally defined "imageMagicParameters" for this image.
            // You can use any parameter documented on http://www.imagemagick.org/script/command-line-options.php
            // except for -resize (which is used by the tool itself).
            "imageMagicParameters" : "-unsharp 1.5x1+0.7+0.02 -grayscale", // Example: make grayscale

            // "roundCorners": (optional)
            // Will replace the globally defined "roundCorners" for this image.
            "roundCorners" : 0.2,

            // "quality": (optional)
            // Will replace the globally defined "quality" for this image.
            "quality" : 0.75,

            // "proportional": (optional)
            // Will replace the globally defined "proportional" for this image.
            "proportional" : true
        },

        // Some examples of glob paths (/*) in source and an alias (<language>) in target.
        // All files in the source path will be converted to jpg images.
        { "tags" : "all,ios", "sourcePath" : "<source-screens-16:9>/*", "targetPath" : "../target/apple-appstore/<language>/screens/4.0-inch/*.jpg", "resolution":"1136x640"  },
        { "tags" : "all,ios", "sourcePath" : "<source-screens-16:9>/*", "targetPath" : "../target/apple-appstore/<language>/screens/4.7-inch/*.jpg", "resolution":"1334x750"  },
        { "tags" : "all,ios", "sourcePath" : "<source-screens-16:9>/*", "targetPath" : "../target/apple-appstore/<language>/screens/5.5-inch/*.jpg", "resolution":"2208x1242" },

        // An example of a glob path in source with limitation to certain file types.
        { "tags" : "all,ios", "sourcePath" : "<source-screens-4:3>/*.{png,jpg,jpeg}",  "targetPath" : "../target/apple-appstore/<language>/screens/iPad/*.jpg",   "resolution":"2048x1536" },

        // An example of a glob path in source with limitation to certain file types defined by an alias.
        { "tags" : "all,ios", "sourcePath" : "<source-screens-4:3>/*.<extensions>",  "targetPath" : "../target/apple-appstore/<language>/screens/iPadPro/*.jpg",  "resolution":"2732x2048" }
    ],

    // The (comma separated) tags define which "image" entries to take into account during execution.
    // You can also define them at runtime with the "--tags <taglist>" parameter (Example: "--tags all,ios").
    // You can also skip this line (will result in default: "all")
    "tags" : "all,ios"
}
```

Run it with these (optional) parameters:

```
    ma-image-resize-tool --config config.json --config-local config-local.json --alias "<language>" "en,de" --tags "all,test"
```
All parameters are optional:
   * Default for --config is "config.json"
   * Default for --config-local is "config-local.json"
   * Default for --tags is "all" (separate multiple tags with commas ",")
   * Default for --alias is "" (separate multiple values with commas ",")

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
    maImageResizeTool.configure( "config.json", "config-local.json", "all,test", ["<language>", "en,de"] );
    maImageResizeTool.run();
```

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

    // configLocal is optional (you can use Null instead)
    var configLocal = {
        // "basePath" : "ENTER YOUR ABSOLUTE BASE PATH HERE (it´s optional)",
        "buildTags": "all"
    };

    maImageResizeTool.configureWithData( config, configLocal, "all,test", ["<language>", "en,de"] );
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
:: Call image tool
call ma-image-resize-tool --config source/config.json
pause
@echo on
```

Mac (console.command):
```
#!/bin/sh
cd "$(dirname "$0")"
export PATH=./node_modules/.bin:$PATH
ma-image-resize-tool --config source/config.json
bash
```

### Credits
Developed by Georg Kamptner, Modern Alchemists OG, http://modalog.at

### License

MIT
