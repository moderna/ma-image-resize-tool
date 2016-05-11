var fs     = require('fs');
var gm     = require('gm');
var imageMagick = gm.subClass({imageMagick: true});
var colors = require('colors');
var _      = require('underscore');
var Q      = require('q');

/**
 * @var {Object} settings - default values of configuration (will be used if no commandline parameters are given)
 */
var settings = {};
settings.LOAD_CONFIGS_FROM_FILES = true;
settings.CONFIG_DATA = null; // used only if LOAD_CONFIGS_FROM_FILES is false
settings.CONFIG_FILE = 'config.json';
settings.CONFIG_LOCAL_FILE = 'config-local.json';
settings.TAGS = ['all'];

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
 */
var configure = function( configPath, configLocalPath, tags )
{
    settings.CONFIG_FILE = (typeof configPath != "undefined" && configPath != null ) ? configPath : settings.CONFIG_LOCAL_FILE;
    settings.CONFIG_LOCAL_FILE = (typeof configLocalPath != "undefined" && configLocalPath != null ) ? configLocalPath : settings.CONFIG_LOCAL_FILE;
    settings.TAGS = (typeof tags != "undefined" && tags != null ) ? tags.split(",") : settings.CONFIG_LOCAL_FILE;
    settings.LOAD_CONFIGS_FROM_FILES = true;
}

/**
 * Sets the configuration data directly.
 *
 * @param {Object} configPath
 * @param {Object} configLocalPath
 * @param {string} tags
 */
var configureWithData = function( configData, configLocalData, tags )
{
    settings.CONFIG_DATA = _.extend( {}, configData, configLocalData || {} );
    settings.TAGS = (typeof tags != "undefined" && tags != null ) ? tags.split(",") : settings.CONFIG_LOCAL_FILE;
    settings.LOAD_CONFIGS_FROM_FILES = false;

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
    argv.forEach(function (val, index, array)
    {
        if( index > 1 && index%2 != 0) // index 3,5,7, ...
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

            // --tags
            if( argv[index-1] == "--tags" || argv[index-1] == "-tags" || argv[index-1] == "tags" )
            {
                settings.TAGS = argv[index].split(",");
            }
        }
    });

    // log used settings
    console.log("  Settings: ");
    Object.keys(settings).forEach(function(key) {
        console.log( "   - " + key + ": " + settings[key] );
    });

    var deferred = Q.defer();
    deferred.resolve(settings);

    return deferred.promise;
};

/**
 * Checks if a config.json file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var configFileExists = function ()
{
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
                display.error(settings.CONFIG_LOCAL_FILE + ' does not exist in "'+process.cwd()+'".');
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
        data = fs.readFile(settings.CONFIG_LOCAL_FILE, function (err, data) {
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
                deferred.resolve( _.extend( {}, config, configLocal ) );
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
 * Runs through all the images and resizes them.
 *
 * @param  {Object} config
 * @return {Promise}
 */
var generateImages = function (config)
{
    console.log("\n  Resizing images: ")
    var deferred = Q.defer();
    var sequence = Q();
    var all = [];
    var imagesCounter = 0;
    _(config.images).filter(function(image){ return _(image.tags.split(",")).intersection(settings.TAGS).length > 0 ? image : false; } ).forEach(function (image) {
        sequence = sequence.then(function () {
            imagesCounter++;
            return generateImage(image, config);
        });
        all.push(sequence);
    });
    Q.all(all).then(function () {
        if( imagesCounter == 0 )
        {
            console.log("  \n    No images matching the tags '"+settings.TAGS.join(",")+"' found.");
        }
        deferred.resolve();
    });
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
    var deferred = Q.defer();

    // size
    var _wh = image.resolution.split("x");
    var width = _wh[0];
    var height = _wh[1];

    var basePath = config.basePath == null ? "" : config.basePath;
    // ensure ending slash
    basePath = basePath != "" && basePath.charAt(basePath.length-1) != "/" && basePath.charAt(basePath.length-1) != "\\" ? basePath + "/" : basePath;

    // source path
    var sourcePath = image.sourcePath;
    // replace aliases
    _(config.aliases).forEach(function (alias) {
        sourcePath = basePath + sourcePath.replace(new RegExp(alias.name, 'g'), alias.path);
    });

    // target path
    var targetPath = image.targetPath;
    // replace aliases
    _(config.aliases).forEach(function (alias) {
        targetPath = basePath + targetPath.replace(new RegExp(alias.name, 'g'), alias.path);
    });

    fileExists(sourcePath)
        .then( function(){
            var newImage = imageMagick(sourcePath);
            // apply quality
            if( image.quality !== null )
            {
                newImage.quality( image.quality );
            }
            // apply options
            if( typeof image.options != "undefined" && image.options !== null )
            {
                Object.keys(image.options).forEach(function(key) {
                    try
                    {
                        console.log( "    -option '" + key + "': '" + (image.options[key]||[]).join(",") + "'" );
                        if( typeof newImage[key] != "undefined" )
                        {
                            newImage[key].apply(newImage, image.options[key] || []);
                        }
                    }
                    catch( e )
                    {
                        display.warning("Option '" + key + "': " + e.message);
                    }
                });
            }
            if( image.proportional != null && (image.proportional == "true" || image.proportional === true) )
            {
                newImage.resize(width, height);
            }
            else
            {
                newImage.resizeExact(width, height);
            }
            newImage.write(targetPath, function(err) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve();
                    display.success(targetPath + ' ('+image.resolution+') created');
                }
            });
        })
        .catch(function (error) {
            // warn the user but don´t abort execution
            display.warning('Source image "' + sourcePath + '" does not exist.');
            deferred.resolve();
        })
        .done();

    return deferred.promise;
};


/**
 * Checks if a file exists.
 *
 * @param  {Object} filePath
 * @return {Promise}
 */
var fileExists = function (filePath) {
    var deferred = Q.defer();

    fs.exists(filePath, function (exists) {
        if (exists) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    });
    return deferred.promise;
};

var run = function()
{

    display.header('Creating Images');

    return readParameters(process.argv, settings)
        .then(configFileExists)
        .then(configLocalFileExists)
        .then(readConfig)
        .then(readConfigLocal)
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
