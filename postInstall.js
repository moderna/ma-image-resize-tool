var fs          = require('fs');
var colors      = require('colors');
var path        = require('path');
var fse          = require('fs-extra');

/**
 * @var {Object} console utils
 */
var display = {};
display.success = function (str) {
    str = 'OK  '.green + str;
    console.log('  ' + str);
};
display.warning = function (str) {
    str = 'WARNING  '.yellow + str;
    console.log('  ' + str);
};
display.error = function (str) {
    str = 'ERROR  '.red + str;
    console.log('  ' + str);
};
display.info = function (str) {
    str = 'INFO  '.cyan + str;
    console.log('  ' + str);
};
display.header = function (str) {
    console.log('');
    console.log(' ' + str.cyan.underline);
    console.log('');
};

var postInstall = function ()
{
    var isWin = /^win/.test(process.platform);
    var setupFilename = isWin ? "#setup-ma-image-tool.cmd" : "#setup-ma-image-tool.command" ;

    if( process.env.npm_config_global != null && process.env.npm_config_global !== "true" )
    {
        var sourceFile = __dirname + path.sep + "setup" + path.sep + setupFilename;
        // usually local dir is two dirs up from node_modules install dir
        var targetDir = path.normalize(path.normalize(process.cwd()) + path.sep + ".." + path.sep + ".." + path.sep) + path.sep;
        var targetFile = targetDir + setupFilename;

        // copy files
        fse.copy(sourceFile, targetFile, function (err) {
            if (err)
            {
                display.error("Error in setup:\n" + err);
            }
            else
            {
                console.log(targetFile);

                var isWin = /^win/.test(process.platform);
                var replacementPathSeparator = isWin ?  ";" : ":";
                var replacementString = isWin ?  ";%PATH%" : ":$PATH";
                var replacementStringRegExp = isWin ?  ";%PATH%" : ":\$PATH";

                // patch "generate_image" paths
                fs.readFile(sourceFile, 'utf8', function (err,data) {
                    if (err) {
                        display.error("Error in setup:\n    " + err);
                    }
                    else
                    {
                        var node_modules_dir = path.normalize(__dirname + path.sep + ".." + path.sep + ".bin");
                        var replacement = replacementPathSeparator + path.relative(targetDir,node_modules_dir) + replacementString;
                        var result = data.replace( new RegExp(replacementString,"g"), replacement );

                        fs.writeFile(targetFile, result, 'utf8', function (err) {
                            if (err) {
                                display.error("Error in setup:\n    " + err);
                            }
                            else
                            {
                                console.log("\n");
                                display.success("Creation of '" + targetFile + "' completed.");
                                display.info("You should call \""+setupFilename+"\" now.");
                                console.log("\n");
                            }
                        });
                    }
                });
            }
        });
    }
    else
    {
        display.info("Skipped creation of '"+setupFilename+"' due to global install.");
        display.info("You should call \"ma-image-resize-tool setup --info\" now.\n\n");
    }
}();