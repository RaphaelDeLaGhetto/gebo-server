'use strict';

var nconf = require('nconf'),
    q = require('q'),
    GridStore = require('mongodb').GridStore,
    ObjectID = require('mongodb').ObjectID;

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


/**
 * Save a file to the databse
 *
 * @return promise
 */
function _saveFileToDb(file, collection) {
    var deferred = q.defer();

    if (!file || Object.keys(file).length === 0) {
      deferred.resolve();
      return deferred.promise;
    }

    // Open a new file
    var gridStore = new GridStore(collection.db, new ObjectID(), file.name, 'w',
                                  { content_type: file.type,
                                    metadata: { collection: collection.collectionName } });

//    gridStore.open(function(err, gridStore) {
    gridStore.writeFile(file.path, function(err, doc) {
          if (err) {
            deferred.reject(err);
          }
          else {
            gridStore.close(function(err, result) {
                  if (err) {
                    deferred.reject(err);
                  }
                  else {
                    deferred.resolve(doc);
                  }
              });
          }
      });
//      });
    return deferred.promise;
  };
exports.saveFileToDb = _saveFileToDb; 

