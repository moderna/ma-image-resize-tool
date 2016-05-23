var fs          = require('fs');
var path        = require('path');
var gm          = require('gm');
var imageMagick = gm.subClass({imageMagick: true});
var colors      = require('colors');
var _           = require('underscore');
var Q           = require('q');
var mkdirp      = require('mkdirp');
var exec        = require('child_process').exec;
var execFile    = require('child_process').execFile;
var jpegtran    = require('jpegtran-bin');
var optipng     = require('optipng-bin');
var glob        = require("glob");
var fse         = require('fs-extra');


/**
 * @var {Object} settings - default values of configuration (will be used if no commandline parameters are given)
 */
var settings = {};
settings.LOAD_CONFIGS_FROM_FILES = true;
settings.CONFIG_DATA = null; // used only if LOAD_CONFIGS_FROM_FILES is false
settings.CONFIG_FILE = 'config.json';
settings.CONFIG_LOCAL_FILE = 'config-local.json';
settings.TAGS = [];
settings.ALIASES = [];

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

/**
 * Sets the configuration
 *
 * @param {string} configPath
 * @param {string} configLocalPath
 * @param {string} tags
 * @param {Array} aliases
 */
var configure = function( configPath, configLocalPath, tags, aliases )
{
    settings.CONFIG_FILE = (typeof configPath != "undefined" && configPath != null ) ? configPath : settings.CONFIG_LOCAL_FILE;
    settings.CONFIG_LOCAL_FILE = (typeof configLocalPath != "undefined" && configLocalPath != null ) ? configLocalPath : settings.CONFIG_LOCAL_FILE;
    settings.TAGS = (typeof tags != "undefined" && tags != null ) ? tags.split(",") : [];
    settings.ALIASES = settings.ALIASES.concat( typeof aliases != "undefined" && aliases != null ? aliases : [] );
    settings.LOAD_CONFIGS_FROM_FILES = true;
}

/**
 * Sets the configuration data directly.
 *
 * @param {Object} configPath
 * @param {Object} configLocalPath
 * @param {Array} tags
 * @param {Array} aliases
 */
var configureWithData = function( configData, configLocalData, tags, aliases )
{
    settings.CONFIG_DATA = _.extend( {}, configData, configLocalData || {} );
    settings.TAGS = typeof tags != "undefined" && tags != null ? tags : [];
    settings.LOAD_CONFIGS_FROM_FILES = false;
    settings.ALIASES = typeof aliases != "undefined" && aliases != null ? aliases : [];
}

/**
 * Read commandline parameters into settings.
 *
 * @param  {Array} argv
 * @param  {Object} settings
 * @return {Promise} resolves to an object{} - settings
 */
var readParameters = function (argv, settings)
{
    var deferred = Q.defer();

    // Command
    var command = "default";
    if( argv[2] == "setup" )
    {
        command = "setup";
    }

    var installLocation = null;
    var orientation = null;
    var setupInfo = false;

    argv.forEach(function (val, index, array)
    {
        if( index > 1) // index 2,3,4,5,6 ...
        {
            if( command == "setup" )
            {
                // --orientation
                if( argv[index-1] == "--orientation" || argv[index-1] == "-orientation" || argv[index-1] == "orientation" )
                {
                    orientation = argv[index]
                }

                // --location
                if( argv[index-1] == "--location" || argv[index-1] == "-location" || argv[index-1] == "location" )
                {
                    installLocation = argv[index]
                }

                // --info
                if( argv[index] == "--info" || argv[index] == "-info" || argv[index] == "info" )
                {
                    setupInfo = true;
                }
            }
            // normal commandline
            else
            {
                // --config
                if( argv[index-1] == "--config" || argv[index-1] == "-config" || argv[index-1] == "config" )
                {
                    settings.CONFIG_FILE = argv[index];
                }

                // --config-local
                if( argv[index-1] == "--config-local" || argv[index-1] == "-config-local" || argv[index-1] == "config-local" )
                {
                    settings.CONFIG_LOCAL_FILE = argv[index];
                }
                else
                {
                    // local config not defined > search for it in the same path as config
                    settings.CONFIG_LOCAL_FILE = path.normalize(path.dirname(settings.CONFIG_FILE) + path.sep + settings.CONFIG_LOCAL_FILE);
                }

                // --tags
                if( argv[index-1] == "--tags" || argv[index-1] == "-tags" || argv[index-1] == "tags" )
                {
                    settings.TAGS = argv[index].split(",");
                }

                // --alias
                if( argv[index-2] == "--alias" || argv[index-2] == "-alias" || argv[index-2] == "alias" )
                {
                    settings.ALIASES.push( { "name" : argv[index-1], "value" : argv[index].split(",") } );
                }
            }
        }
    });

    if( command == "setup" )
    {
        display.header('Setup');

        // check if info is required
        if( setupInfo == true )
        {
            console.log( "    Environment variables have been set up." );
            console.log( "    Now please use the 'setup' command in this window.");
            console.log( "" );
            console.log( "    Check https://github.com/moderna/ma-image-resize-tool for the docs." );
            console.log( "" );
            console.log( "    Examples:");
            console.log( "      ma-image-resize-tool setup --orientation portrait");
            console.log( "      ma-image-resize-tool setup --orientation landscape");
            console.log( "      ma-image-resize-tool setup --orientation portrait --location yourRelativeInstallDir");
            deferred.reject();
            return deferred.promise;
        }

        // check if orientation is set
        if(
            orientation == "landscape" ||
                orientation == "portrait" )
        {
            setup( orientation, installLocation );
            deferred.reject();
        }
        else
        {
            display.error('Please specify an orientation.\n  Examples:\n    ma-image-resize-tool setup --orientation portrait\n    ma-image-resize-tool setup --orientation landscape');
            deferred.reject();
        }
    }
    else
    {
        // log used settings
        console.log("  Settings: ");
        Object.keys(settings).forEach(function(key) {
            console.log( "   - " + key + ": " + settings[key] );
        });
        console.log("  Current working dir is:\n   - " + process.cwd());

        deferred.resolve(settings);
    }

    return deferred.promise;
};

var setup = function ( orientation, installLocation )
{
    var deferred = Q.defer();

    var sourceDir = __dirname + path.sep + "templates" + path.sep + orientation;
    var targetDir = path.normalize(installLocation || process.cwd());

    // copy files
    fse.copy(sourceDir, targetDir, function (err) {
        if (err)
        {
            display.error("Error in setup.     \n      Copy\n        '" + sourceDir + "'\n      to\n        '" + targetDir + "'\n      failed:\n    " + err);
            deferred.reject();
        }
        else
        {
            var isWin = /^win/.test(process.platform);
            var replacementPathSeparator = isWin ?  ";" : ":";
            var replacementString = isWin ?  ";%PATH%" : ":$PATH";
            var replacementStringRegExp = isWin ?  ";%PATH%" : ":\$PATH";

            // patch "generate_image" paths
            var targetDirCommandFile = isWin ? "#create_images.cmd" : "#create_images.command" ;
            fs.readFile(targetDir + path.sep + targetDirCommandFile, 'utf8', function (err,data) {
                if (err) {
                    display.error("Error in setup.     \n      Updating PATH in '" + targetDirCommandFile + "' failed:\n    " + err);
                    deferred.reject();
                }
                else
                {
                    var node_modules_dir = path.normalize(__dirname + path.sep + ".." + path.sep + ".bin");
                    var replacement = replacementPathSeparator + path.relative(targetDir,node_modules_dir) + replacementString;
                    var result = data.replace( new RegExp(replacementString,"g"), replacement );

                    fs.writeFile(targetDir + path.sep + targetDirCommandFile, result, 'utf8', function (err) {
                        if (err) {
                            display.error("Error in setup.     \n      Updating PATH in '" + targetDirCommandFile + "' failed:\n    " + err);
                            deferred.reject();
                        }
                        else
                        {
                            display.success("    Setup1 completed in '" + targetDir + "'.");
                            deferred.resolve();
                        }
                    });
                }
            });
        }
    });

    return deferred.promise;
}

/**
 * Checks if a config.json file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var configFileExists = function ()
{
    display.header('Creating Images');

    var deferred = Q.defer();
    if( settings.LOAD_CONFIGS_FROM_FILES == true )
    {
        console.log("\n  Loading configs: ");

        fs.exists(settings.CONFIG_FILE, function (exists) {
            if (exists) {
                display.success(settings.CONFIG_FILE + ' exists');
                deferred.resolve();
            } else {
                display.error(settings.CONFIG_FILE + ' does not exist in "'+process.cwd()+'".');
                deferred.reject();
            }
        });
    }
    else
    {
        deferred.resolve();
    }

    return deferred.promise;
};

/**
 * Checks if a config-local.json file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var configLocalFileExists = function ()
{
    var deferred = Q.defer();
    if( settings.LOAD_CONFIGS_FROM_FILES == true )
    {
        fs.exists(settings.CONFIG_LOCAL_FILE, function (exists) {
            if (exists) {
                display.success(settings.CONFIG_LOCAL_FILE + ' exists');
                deferred.resolve();
            } else {
                display.info(settings.CONFIG_LOCAL_FILE + ' does not exist in "'+process.cwd()+'".');
                deferred.resolve();
            }
        });
    }
    else
    {
        deferred.resolve();
    }

    return deferred.promise;
};

/**
 * Read the config file.
 *
 * @return {Promise} resolves to an object{} - the content of config.json
 */
var readConfig = function ()
{
    var deferred = Q.defer();
    if( settings.LOAD_CONFIGS_FROM_FILES == true )
    {
        data = fs.readFile(settings.CONFIG_FILE, function (err, data) {
            if (err) {
                deferred.reject(err);
            }
            var config = JSON.parse(data);
            if(config === false || config == null)
            {
                deferred.reject("Parsing "+settings.CONFIG_FILE+" failed.");
            }
            else
            {
                display.success("Parsing "+settings.CONFIG_FILE+" succeeded.");
                deferred.resolve(config);
            }
        });
    }
    else
    {
        deferred.resolve(settings.CONFIG_DATA);
    }

    return deferred.promise;
};

/**
 * Read the config-local file.
 *
 * @param  {Object} config
 * @return {Promise} resolves to an object{} - the content of config-local.json
 */
var readConfigLocal = function (config)
{
    var deferred = Q.defer();
    if( settings.LOAD_CONFIGS_FROM_FILES == true )
    {
        fs.exists(settings.CONFIG_LOCAL_FILE, function (exists) {
            if (exists) {
                var data = fs.readFile(settings.CONFIG_LOCAL_FILE, function (err, data) {
                    if (err) {
                        deferred.reject(err);
                    }
                    var configLocal = JSON.parse(data);
                    if(configLocal === false || configLocal == null)
                    {
                        deferred.reject("Parsing "+settings.CONFIG_LOCAL_FILE+" failed.");
                    }
                    else
                    {
                        display.success("Parsing "+settings.CONFIG_LOCAL_FILE+" succeeded.");

                        // merge config and set basePath
                        var finalConfig = _.extend( {}, config, configLocal );

                        deferred.resolve( finalConfig );
                    }
                });
            }
            else
            {
                deferred.resolve( config );
            }
        });
    }
    else
    {
        deferred.resolve(settings.CONFIG_DATA);
    }

    return deferred.promise;
};

/**
 * Prepares the config for use (resolves basePath if not yet set, resolves aliases in aliases)
 * @param config
 * @returns {promise|*|exports.exports.currentlyUnhandled.promise|Q.promise}
 */
var prepareConfigs = function (config)
{
    var deferred = Q.defer();

    // set base path (if not set in config or local-config)
    if( config.basePath == null )
    {
        config.basePath = path.normalize(process.cwd() + path.sep + path.dirname(settings.CONFIG_FILE) + path.sep);
    }
    // ensure that base path ends with a slash
    if( config.basePath != "" &&
        config.basePath.charAt(config.basePath.length-1) != "/" &&
        config.basePath.charAt(config.basePath.length-1) != "\\" )
    {
        config.basePath = config.basePath + path.sep;
    }

    // log new working dir if available
    console.log("  Base dir for paths in config is:\n   - " + config.basePath);

    // get tags from config
    if( !_.isArray(settings.TAGS) || settings.TAGS.length == 0 )
    {
        if( config.tags != null && config.tags.length > 0 )
        {
            config.tags = config.tags.split(",");
        }
        if(_.isArray(config.tags) && config.tags.length > 0 )
        {
            settings.TAGS = config.tags;
        }
        else
        {
            settings.TAGS = ['all'];
        }
    }
    console.log("  Tags: " + settings.TAGS.join(","));

    // remove comments from images
    config.images = _(config.images).filter( function(image){ return _.isObject(image); } );

    // merge setting aliases with config aliases
    config.aliases = _.extend( config.aliases, settings.ALIASES );

    // remove comments from alaises
    config.aliases = _(config.aliases).filter( function(alias){ return _.isObject(alias); } );

    // convert all alias values into array
    config.aliases = _(config.aliases)
        // convert strings in value to array
        .forEach(function(alias, index, aliases){
            aliases[index].value = _.isArray(alias.value) ? alias.value : [alias.value];
        });

    // resolve aliases in aliases
    _(config.aliases)
        .forEach(function (alias, index, aliases) {
            var resolvedValues = [];
            alias.value.forEach(function (aliasValue) {
                resolvedValues = resolvedValues.concat( resolveAliases( aliasValue, _.without(aliases,alias) ) );
            });
            alias.value = resolvedValues;
        });

    deferred.resolve(config);

    return deferred.promise;
};

/**
 * Runs through all the images and converts their (possible) glob path into real paths.
 *
 * @param  {Object} config
 * @return {Promise}
 */
var resolveImagePaths = function (config)
{
    console.log("\n  Resolving image paths...")
    var deferred = Q.defer();
    var sequence = Q();
    var all = [];

    // use glob to expand paths (also filter those with not matching tags while we are at it)
    var images = [];
    _(config.images)
        .forEach(function (image, index, imagesList) {
            if( image.tags == null )
            {
                imagesList[index].tags = "all"; // default tag images to "all"
            }
        })
        .filter( function(image){ return _.isObject(image); } )
        .filter( function(image){ return _(image.tags.split(",")).intersection(settings.TAGS).length > 0 ? image : false; } )
        .forEach(function (image) {
            all.push( resolveAliasedImagePaths( image, config ).then( function(value){
                images = images.concat( value );
                return Q.defer().resolve(value);
            } ) )
        });


    Q.allSettled(all).then(function () {
        deferred.resolve( {"images" : images, "config" : config} );
    });

    return deferred.promise;
};

/**
 * Convert an images' path with aliases into real image paths.
 *
 * @param  {Object} image
 * @param  {Object} config
 * @return {Promise}
 */
var resolveAliasedImagePaths = function (image, config)
{
    var deferred = Q.defer();
    var images = [];

    // resolve all aliases (glob notation is not resolved here)
    var resolvedImageSourcePaths = resolveAliases( image.sourcePath, config.aliases );
    var resolvedImageTargetPaths = resolveAliases( image.targetPath, config.aliases );

    // create unique source and target path pairs (combine every resolvedImageSourcePath with every resolvedImageTargetPath)
    var imagePaths = [];
    _(resolvedImageSourcePaths).forEach(function(sourcePath){
        _(resolvedImageTargetPaths).forEach(function(targetPath){
            if( !path.isAbsolute(sourcePath) )
            {
                sourcePath = config.basePath + sourcePath;
            }
            if( !path.isAbsolute(targetPath) )
            {
                targetPath = config.basePath + targetPath;
            }
            imagePaths.push(
                {
                    "sourcePath" : path.normalize(sourcePath),
                    "targetPath" : path.normalize(targetPath)
                }
            );
        });
    });

    // run paths through glob
    var allPromises = [];
    if( imagePaths.length > 0 )
    {
        // resolve glob paths
        _(imagePaths).forEach( function(imagePathPair){
            var tmpImage = _.extend({},image,imagePathPair); // merge in sourcePath and targetPath
            allPromises.push( resolveImagePath( tmpImage, config).then( function(value){
                // add found images to images array
                images = images.concat(value);
            }) );
        });

        Q.allSettled(allPromises).then(function (){

            // ToDo: Remove duplicates (paths with equal filename in the scope of one alias should be considered duplicate
            //       and only the last one should be taken int account.
            //       It´s an optimization to remove unnecessary create images.

            // return images list result
            deferred.resolve( images );
        });
    }
    else
    {
        // image without aliases in sourcePath or targetPath
        deferred.resolve( [image] );
    }

    return deferred.promise;
};

/**
 * Takes a text like "<root>/images/<dir>/<language>/test.jpg" and aliases like:
 *  [
 *   { "name" : "<root>",     "value" : "myHome" },
 *   { "name" : "<dir>",      "value" : ["mum","dad"] },
 *   { "name" : "<language>", "value" : ["en","de"] }
 *  ]
 *  and returns all possible combinations of aliases applied to the text in
 *  the order of occurrence in the text from left to right (depth first).
 *
 *  The result for the example above would be:
 *  [
 *   "myHome/images/mum/en/test.jpg",
 *   "myHome/images/mum/de/test.jpg",
 *   "myHome/images/dad/en/test.jpg",
 *   "myHome/images/dad/de/test.jpg"
 *  ]
 *
 * @param text
 * @param aliases
 * @returns {Array}
 */
var resolveAliases = function(text, aliases)
{
    var results = [];

    // Get all aliases which are in the text ordered by their occurrence (first order)
    // and their order in aliases (second order).
    var sortedAliases = _.chain(aliases)
        // convert strings in value to array
        .forEach(function(alias, index, aliases){
            aliases[index].value = _.isArray(alias.value) ? alias.value : [alias.value];
        })
        // remove unused aliases
        .filter( function (alias) {
            return text.indexOf( alias.name ) != -1;
        })
        // sort by occurrence
        .sortBy(function (alias) {
            return text.indexOf( alias.name );
        });
    sortedAliases = sortedAliases.value();

    // recursively resolve aliases
    var recursiveAliases = function( text, aliases, aliasIndex, aliasPosition, results )
    {
        text = text.split(aliases[aliasIndex].name).join(aliases[aliasIndex].value[aliasPosition]);

        if( aliasIndex == aliases.length-1 )
        {
            results.push( text );
        }

        if( aliasIndex+1 < aliases.length )
        {
            for(var i=0; i<aliases[aliasIndex+1].value.length; ++i)
            {
                recursiveAliases(text, aliases, aliasIndex+1, i, results);
            }
        }
    }

    if( sortedAliases.length > 0 )
    {
        for(var i=0; i<sortedAliases[0].value.length; ++i)
        {
            recursiveAliases( text, sortedAliases, 0, i, results );
        }
    }
    else
    {
        // no aliases found
        results.push(text);
    }

    return results;
}

/**
 * Convert an images' glob (https://github.com/isaacs/node-glob) into real paths.
 *
 * @param  {Object} image
 * @param  {Object} config
 * @return {Promise}
 */
var resolveImagePath = function (image, config)
{
    var deferred = Q.defer();
    var images = [];

    // glob options (all glob paths have to use forward slashes)
    var options = {
        "cwd"  : config.basePath.split("\\").join("/")
        ,"root" : config.basePath.split("\\").join("/")
        ,"nocase" : true    // ATTENTION: it fails to resolve on ABSOLUTE windows paths (C:/..) - see bug: https://github.com/isaacs/node-glob/issues/123
        ,"realpath" : true  // needed to make paths absolute again (remove this once bug#123 is fixed)
    }

    // ToDo: fix path resolving problem due to bug123 if the basePath drive letter is different to the absolute sourcePath drive letter on windows

    // use glob to expand paths (each path results in a copy of the image)
    var sourcePath = image.sourcePath.split("\\").join("/"); // all glob paths have to use forward slashes
    // We remove the absolute portion of the path to evade bug#123 (https://github.com/isaacs/node-glob/issues/123) - remove this once bug#123 is fixed
    sourcePath = sourcePath.split(options.cwd).join("");
    glob(sourcePath, options, function (error, files)
    {
        if( files != null )
        {
            _(files).forEach(function(file){
                // copy the existing image
                var newImage = _.extend( {}, image );
                // set glob-resolved source path
                newImage.sourcePath = file;
                // resolve *.ext in target paths
                var tmpTargetPath = image.targetPath;
                var starExtension = tmpTargetPath.match(/(\*\.[a-zA-z0-9]+$)/g);
                if( starExtension != null && starExtension.length == 1 )
                {
                    starExtension = starExtension[0];
                    tmpTargetPath = path.parse(tmpTargetPath).dir + path.sep + path.parse(file).name + starExtension.replace("\*","");
                }
                newImage.targetPath = tmpTargetPath;
                // add new image
                images.push( newImage );
            })

            deferred.resolve( images );
        }
        else
        {
            display.error( error );
            deferred.reject(error);
        }
    });

    return deferred.promise;
};

/**
 * Runs through all the images and resizes them.
 *
 * @param  {Object} with keys "images" and "config"
 * @return {Promise}
 */
var generateImages = function (imagesAndConfig)
{
    console.log("\n  Resizing images: ");

    var images = imagesAndConfig.images;
    var config = imagesAndConfig.config;

    var deferred = Q.defer();
    var sequence = Q();
    var all = [];

    if( images.length > 0 )
    {
        _(images).forEach(function (image){
            sequence = sequence.then(function () {
                return generateImage(image, config);
            });
            all.push(sequence);
        });

        Q.allSettled(all).then(function () {
            deferred.resolve();
        });
    }
    else
    {
        console.log("  \n    No images matching the tags '"+settings.TAGS.join(",")+"' found.");
        deferred.resolve();
    }

    return deferred.promise;
};

/**
 * Resizes and creates a new icon in the platform's folder.
 *
 * @param  {Object} image entry from config
 * @param  {Object} the whole config (used to extract aliases)
 * @return {Promise}
 */
var generateImage = function (image, config)
{
    // size
    var _wh = image.resolution.split("x");
    var width = _wh[0];
    var height = _wh[1];

    return makeDir(image.targetPath)
        .then( function(){ return fileExists(image.sourcePath); } )
        .then( function(){ return resizeImage(image, config); } )
        .then( function(){
            if( image.optimize == null || ( image.optimize != "false" && image.optimize != false ) )
            {
                return optimizeImage(image.targetPath, config, 50);
            }
            else
            {
                return true;
            }
        })
        .catch(function (error) {
            display.error(error);
            // warn the user (hint: you should make sure the parent sequence uses Q.allSettled())
            display.warning('Source image "' + image.sourcePath + '" does not exist.');
        });
};

/**
 * Resizes and image with GraphicMagick.
 * Depends on the "gm" node module.
 *
 * @param  {string} filePath
 * @param  {object} config
 * @return {Promise}
 */
var resizeImage = function (image, config)
{
    var deferred = Q.defer();

    // size
    var _wh = image.resolution.split("x");
    var width = _wh[0].replace(/([^0-9])/g,"");
    var height = _wh[1].replace(/([^0-9])/g,"");
    var sourcePath = image.sourcePath;
    var targetPath = image.targetPath;

    // Create empty image file (ImageMagic/GraphicsMagick sometimes writes broken png data if the file does not
    // yet exist - I honestly don´t know why).
    fs.closeSync(fs.openSync(targetPath, 'w'));

    // change working dir and remember it
    var workingDir = process.cwd();
    process.chdir(config.basePath);

    // error/finally function
    var fin = function()
    {
        // reset working dir and return
        process.chdir(workingDir);
        deferred.resolve();
    }

    // create image
    var newImage = imageMagick(sourcePath);
    newImage.size(function (err, size)
    {
        if (err)
        {
            display.error("Unknown source image size. " + err);
            fin();
        }
        else
        {
            // command "convert" and source file
            var convert = 'convert "' + sourcePath + '"';

            // add user pre parameters (these are not documented)
            if( image.preImageMagicParameters != null )
            {
                convert += ' ' + image.preImageMagicParameters;
            }
            else if( config.preImageMagicParameters != null )
            {
                convert += ' ' + config.preImageMagicParameters;
            }

            // resize proportionally (default: false)
            var proportional = typeof config.proportional == "undefined" ? false : config.proportional;
            if( typeof image.proportional != "undefined" )
            {
                proportional = image.proportional;
            }
            if( proportional == false && image.resolution.indexOf("!") == -1  )
            {
                convert += ' -resize "' + image.resolution + '!" '; // "!" tells image magic to ignore proportions
            }
            else
            {
                convert += ' -resize "' + image.resolution + '" ';
            }

            // quality (range 0.0-1.0, default is 0.75)
            var quality = Math.round((config.quality || 0.75) * 100);
            if( typeof image.quality != "undefined" )
            {
                quality = Math.round(image.quality * 100);
            }
            convert += ' -quality ' + quality;

            // round corner mask (contact me if you know how to do this in GraphicsMagick)
            var roundCorners = config.roundCorners || null;
            if( typeof image.roundCorners != "undefined" )
            {
                roundCorners = image.roundCorners;
            }
            if( roundCorners !== null && roundCorners !== false && roundCorners > 0.001 )
            {
                if( path.extname(targetPath) == ".jpg" || path.extname(targetPath) == ".jpeg" )
                {
                    display.warning("JPEG format does not support transparency, thus round corners are not possible.")
                }
                else
                {
                    // radios is percentage of smaller side (with or height)
                    var radius = Math.min(width, height) * 0.5 * roundCorners;
                    convert += ' ( +clone  -alpha extract';
                    convert += '   -draw "fill black polygon 0,0 0,'+radius+' '+radius+',0 fill white circle '+radius+','+radius+' '+radius+',0"';
                    convert += '   ( +clone -flip ) -compose Multiply -composite';
                    convert += '   ( +clone -flop ) -compose Multiply -composite';
                    convert += ' ) -alpha off -compose CopyOpacity -composite -filter cubic -define filter:b=0 -define filter:c=2.2 -define filter:blur=1.05 ';
                }
            }

            // add user parameters
            if( image.imageMagicParameters != null )
            {
                convert += ' ' + image.imageMagicParameters;
            }
            else if( config.imageMagicParameters != null )
            {
                convert += ' ' + config.imageMagicParameters;
            }

            // output file
            convert += ' "' + targetPath + '"';

            // log
            console.log( convert );

            exec(convert, function(err) {
                if (err)
                {
                    display.error(err);
                    deferred.resolve();
                }
                else
                {
                    // reset working dir
                    process.chdir(workingDir);

                    display.success(targetPath + ' ('+image.resolution+') created');
                    deferred.resolve();
                }
            });
        }
    });

    return deferred.promise;
}

/**
 * Optimizes a png file with optipng and a jpeg file with jpegtran.
 * Depends on optipng-bin (https://github.com/imagemin/optipng-bin)
 * and jpegtran-bin (https://github.com/imagemin/jpegtran-bin).
 *
 * @param  {string} filePath
 * @param  {object} config
 * @return {Promise}
 */
var optimizeImage = function (filePath, config, delayInMs)
{
    var deferred = Q.defer();

    delayInMs = delayInMs || 50;

    // added a delay to give the OS time to clean up the write lock on the image
    setTimeout( function(){
        fs.exists(filePath, function (exists)
        {
            switch( path.extname(filePath).toLowerCase() )
            {
                case ".png":
                    if( config.optimize && config.optimize.optipng != null && config.optimize.optipng !== false )
                    {
                        var parameters = [];
                        if( config.optimize.optipng.length > 0 )
                        {
                            parameters = config.optimize.optipng.split(" ");
                        }
                        parameters = parameters.concat(['-out', filePath, filePath]);
                        execFile(optipng, parameters, function (err) {
                            if( err != null )
                            {
                                display.error('optipng ' + parameters.join(" "));
                                display.error(err);
                            }
                            else
                            {
                                console.log('    Image optimized with: "optipng ' + config.optimize.optipng + ' -out ..."');
                            }
                            deferred.resolve();
                        });
                    }
                    break;
                case ".jpg":
                case ".jpeg":
                    if( config.optimize && config.optimize.jpgtran != null && config.optimize.jpgtran !== false )
                    {
                        var parameters = [];
                        if( config.optimize.jpgtran.length > 0 )
                        {
                            parameters = config.optimize.jpgtran.split(" ");
                        }
                        parameters = parameters.concat(['-outfile', filePath, filePath]);
                        execFile(jpegtran, parameters, function (err) {
                            if( err != null )
                            {
                                display.error('jpegtran ' + parameters.join(" "));
                                display.error(err);
                            }
                            else
                            {
                                console.log('    Image optimized with: "jpegtran ' + config.optimize.jpgtran + ' -outfile ..."');
                            }
                            deferred.resolve();
                        });
                    }
                    break;
                default:
                    deferred.resolve();
            }
        });
    }, delayInMs );

    return deferred.promise;
};

/**
 * Checks if a file exists.
 *
 * @param  {string} filePath
 * @return {Promise}
 */
var fileExists = function (filePath)
{
    var deferred = Q.defer();

    fs.exists(filePath, function (exists)
    {
        if (exists) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    });
    return deferred.promise;
};

/**
 * Removes the filename from path and creates the directories if they don´t exist.
 * Depends on mkdirp (https://github.com/substack/node-mkdirp).
 *
 * @param  {Object} filePath
 * @return {Promise}
 */
var makeDir = function (filePath)
{
    var deferred = Q.defer();

    // get base path of target file
    filePath = path.dirname(filePath);

    mkdirp(filePath, function (error, made)
    {
        if( error == null ){
            if( made != null )
            {
                console.log("    Created new directory '"+made+"'.");
            }
            deferred.resolve();
        } else {
            display.error("    Could not create target directory '"+filePath+"'.");
            deferred.reject(error.message);
        }
    });

    return deferred.promise;
};

var run = function()
{
    return readParameters(process.argv, settings)
        .then(configFileExists)
        .then(configLocalFileExists)
        .then(readConfig)
        .then(readConfigLocal)
        .then(prepareConfigs)
        .then(resolveImagePaths)
        .then(generateImages)
        .catch(function (err) {
            if (err) {
                console.log(err);
            }
        }).then(function () {
            console.log('');
        });
};

module.exports = {
    run: run,
    configure: configure,
    configureWithData: configureWithData
};
