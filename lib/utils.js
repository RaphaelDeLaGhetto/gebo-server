
'use strict';

var nconf = require('nconf'),
    q = require('q'),
    fs = require('fs'),
    mv = require('mv'),
    https = require('https'),
    pki = require('node-forge').pki,
    agentSchema = require('../schemata/agent');

nconf.file({ file: 'gebo.json' });

/**
 * Mongo naming restriction constants
 */
exports.constants = {
    at: '_at_',
    backslash: '_backslash_',
    colon: '_colon_',
    dollarSign: '_dollarsign_',
    dot: '_dot_',
    doubleQuotes: '_doublequotes_',
    greaterThan: '_greaterthan_',
    lessThan: '_lessthan_',
    noCollection: 'No collection',
    pipe: '_pipe_',
    questionMark: '_questionmark_',
    slash: '_slash_',
    space: '_space_',
    star: '_star_',
  };

/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

exports.uid = function (len) {
    var buf = [],
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        charlen = chars.length;

    for (var i = 0; i < len; ++i) {
      buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
  };

/**
 * Make the gebo user's email address suitable for naming
 * a database... and more!
 * 
 * Mongo does not allow these characters: /\. "*<>:|? 
 * (http://docs.mongodb.org/manual/reference/limits/)
 *
 * This function sanitizes @s as well, though it is not
 * required by Mongo.
 *
 * @param string
 *
 * @return string
 */
function _getMongoDbName(str) {
    if (!/[/\. "*<>:|?@]/.test(str)) {
      return str;
    }
    
    str = str.replace(/\//g, exports.constants.slash);
    str = str.replace(/\\/g, exports.constants.backslash);
    str = str.replace(/\./g, exports.constants.dot);
    str = str.replace(/ /g, exports.constants.space);
    str = str.replace(/"/g, exports.constants.doubleQuotes);
    str = str.replace(/\*/g, exports.constants.star);
    str = str.replace(/</g, exports.constants.lessThan);
    str = str.replace(/>/g, exports.constants.greaterThan);
    str = str.replace(/:/g, exports.constants.colon);
    str = str.replace(/\|/g, exports.constants.pipe);
    str = str.replace(/\?/g, exports.constants.questionMark);
    str = str.replace(/@/g, exports.constants.at);

    return str;
  };
exports.getMongoDbName = _getMongoDbName;

/**
 * Sanitize a mongo collection name. Find restrictions
 * on collections names here:
 *
 * http://docs.mongodb.org/manual/reference/limits/
 *
 * @param string
 *
 * @return string
 */
exports.getMongoCollectionName = function(str) {
    if (str === undefined ||
        str === null || str.length === 0) {
      return exports.constants.noCollection;
    }

    str = str.replace(/\$/g, exports.constants.dollarSign);

    if (/^system\.|^[^A-Za-z_]/.test(str)) {
      str = '_' + str;
    }
    
    return str;
  };

/**
 * Sanitize a mongo field name. Find restrictions
 * on collections names here:
 *
 * http://docs.mongodb.org/manual/reference/limits/
 *
 * @param string
 *
 * @return string
 */
exports.getMongoFieldName = function(str) {
    if (str === undefined ||
        str === null || str.length === 0) {
      return exports.constants.noCollection;
    }
    
    str = str.replace(/\$/g, exports.constants.dollarSign);
    str = str.replace(/\./g, exports.constants.dot);
    return str;
  };

/**
 * Given an flat object, return an URL-friendly query string.  Note
 * that for a given object, the return value may be.
 *  
 * @example
 * <pre>
 *    // returns 'color=red&size=large'
 *    _objectToQueryString({color: 'red', size: 'large'})
 * </pre>
 *
 * @param {Object} A flat object containing keys for a query string.
 * 
 * @returns {string} An URL-friendly query string.
 */
exports.objectToQueryString = function(obj) {
    var str = [];
    for (var key in obj) {
      str.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
    }    
    return str.join('&');
  };

/**
 * Take an email address and turn it into a mongo-friendly
 * database name
 *
 * @param string
 *
 * @return string
 */
exports.ensureDbName = function(email) {
//    if (!email) {
//      email = nconf.get('email');
//    }
    return _getMongoDbName(email);
  };


/**
 * Recursively save a batch of files
 *
 * @param Object - req.files
 * @param Object - verified user object 
 * @param array - keys in the req.files object
 * @param index - the current index in the array
 * @param array - file objects
 *
 * @return promise
 */
function _saveFilesToAgentDirectory(files, verified, keys, index, fileObjects) {
   var deferred = q.defer();

    if (!files) {
      deferred.resolve();
      return deferred.promise;
    }

    if (keys === undefined) {
      keys = Object.keys(files);
    }

    if (index === undefined) {
      index = keys.length;
    }

    if (fileObjects === undefined) {
      fileObjects = [];
    }

    var dir = nconf.get('docs') + '/' + verified.dbName + '/' + verified.collectionName;

    if (index > 0) {
      _saveFilesToAgentDirectory(files, verified, keys, --index, fileObjects).
        then(function() {
                _getSafeFileName(files[keys[index]].name, dir).
                    then(function(filename) {

                        // Make file document for DB
                        var db = new agentSchema(verified.dbName);
                        var file = new db.fileModel({
                                name: filename,
                                collectionName: verified.collectionName,
                                type: files[keys[index]].type,
                                size: files[keys[index]].size,
                            }); 
                        
                        file.save(function(err, file) {
                            fileObjects.push(file)
                            db.connection.db.close();
                            if (err) {
                             deferred.reject(err);
                            }
                            else {
                              mv(files[keys[index]].path, dir + '/' + filename, { mkdirp: true },
                                  function(err) {
                                      if (err) {
                                        deferred.reject(err);
                                      }
                                      else {
                                        deferred.resolve(fileObjects);
                                      }
                                    });
                            }
                          });
                      }).
                    catch(function(err) {
                        deferred.reject(err);
                      });
          });
    }
    else {
      deferred.resolve(fileObjects);
    }

    return deferred.promise;
  };
exports.saveFilesToAgentDirectory = _saveFilesToAgentDirectory; 

/**
 * Append a copy number to a filename if a 
 * file by that same name already exists
 *
 * @param string
 * @param string
 *
 * @return promise
 */
function _getSafeFileName(filename, directory) {
    var deferred = q.defer();

    fs.readdir(directory, function(err, files) {

        if(err) {
          // This means the directory doesn't exist
          if (err.errno === 34 && err.code === 'ENOENT') {
            deferred.resolve(filename);
          }
          else {
            deferred.reject(err);
          }
        }
        else {
          var index = files.indexOf(filename);
          if (index > -1) { 

            // Get filename and extension (if it has one)
            var name, extension;
            var splitString = filename.split('.');

            // Has extension
            if (splitString.length > 1) {
              extension = splitString.pop(); 
              name = splitString.join('.');

              // Wait! Is this a hidden file?
              if (!name) {
                name = '.' + extension;
                extension = '';
              }
            }
            // No extension
            else {
              name = filename;
              extension = '';
            }

            // Get the copy number appended to the name and increment, if any
            var matches = name.match(/\((\d+)\)$/);
            if (matches) {
              var copyNumber = Number(matches[1]) + 1;
              name = name.replace(/\((\d+)\)$/, '(' + copyNumber + ')'); 
            }
            else {
              name += '(1)';
            }

            // Assemble new filename
            if (extension) {
              filename = name + '.' + extension;
            }
            else {
              filename = name;
            }
			deferred.resolve(_getSafeFileName(filename, directory));
          }
		  else {
          	deferred.resolve(filename);
		  }
        }       
      });

    return deferred.promise;
  };
exports.getSafeFileName = _getSafeFileName;

/**
 * Get the index of the first object containing the matching
 * key-value pair
 *
 * @param Array of Objects
 * @param string
 * @param string, number
 *
 * @return int
 */
exports.getIndexOfObject = function(array, key, value) {
    for (var i = 0; i < array.length; i++) {
      if (array[i][key] === value) {
        return i;
      }
    }
    return -1; 
  };

/**
 * Generate a private key and self-signed certificate
 * in PEM format
 *
 * @return Object
 */
exports.getPrivateKeyAndCertificate = function() {
    var deferred = q.defer();
    pki.rsa.generateKeyPair(512, function(err, keys) {
        if (err) {
          deferred.reject(err);
        }
        else {
          var cert = pki.createCertificate();
          cert.publicKey = keys.publicKey;
          cert.sign(keys.privateKey);
          cert.validity.notAfter = new Date() + 3600*24*365*10;       

          deferred.resolve({
                  privateKey: pki.privateKeyToPem(keys.privateKey),
                  certificate: pki.certificateToPem(cert)
              });
        }

      });
    return deferred.promise;

  };


/**
 * Get the domain and HTTPS port set in local.json
 *
 * @return string
 */
exports.getDefaultDomain = function() {
    var host = nconf.get('domain');
    if (nconf.get('httpsPort')) {
      host += ':' + nconf.get('httpsPort');
    }
    return host;
  };
