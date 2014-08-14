'use strict';

var mongo = require('mongodb'),
    utils = require('../lib/utils'),
    q = require('q'),
    fs = require('fs'),
    mv = require('mv'),
    mkdirp = require('mkdirp'),
    nconf = require('nconf');

module.exports = function() {

    var agentDb = require('../schemata/agent')(),
        geboDb = require('../schemata/gebo')(),
//        mongooseConnection = require('gebo-mongoose-connection').get(testing),
        nativeConnection = require('../lib/native-mongo-connection');

    /**
     * Get the collection specified in the verified object parameter
     *
     * @param Object
     *
     * @return promise
     */
    var _getCollection = function(verified) {
        var deferred = q.defer();
        if (verified.admin || verified.read || verified.write || verified.execute) { 
          nativeConnection.get(function(conn) {
                conn.collection(verified.resource, function(err, collection) {
                    if (err) {
                      deferred.resolve({ error: err });
                    }
                    else {
                      deferred.resolve(collection);
                    }
                  });
            });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise;
      };
    exports.getCollection = _getCollection;
    
    /**
     * Save JSON to user's profile
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    var _save = function(verified, message) {
        var deferred = q.defer();

        if (verified.admin || verified.write) { 
          _getCollection(verified).
              then(function(collection) {
                    //utils.saveFile(message.file, verified).
                    utils.saveFileToDb(message.file, collection.db).
                       then(function(file) {
                            if (message.content && message.content.data) {
                              if (message.content.data._id) {
                                message.content.data._id = new mongo.ObjectID(message.content.data._id + '');
                              }

                              // If there's a file attached to this message,
                              // link it to do the data being saved
                              if (file) {
                                message.content.data.fileId = file.fileId;
                              }
      
                              collection.save(message.content.data, { safe: true },
                                      function(err, ack) {
                                          if (err) {
                                            deferred.resolve({ error: err });
                                          }
                                          else {
                                            deferred.resolve(ack);
                                          }
                                        });
                            }
                            else {
                              deferred.resolve();
                            }
                          }).
                        catch(function(err) {
                            deferred.resolve({ error: err });
                          });
                    }).
                  catch(function(err) {
                      deferred.resolve({ error: err });
                    });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise;
      };
    exports.save = _save;

    /**
     * Copy JSON from a user's profile
     *
     * @param Object
     * @param Object
     */
    var _cp = function(verified, message) {
        var deferred = q.defer();

        if (verified.admin || verified.read) { 
          _getCollection(verified).
              then(function(collection) {
                    // Make sure an ID was specified 
                    if (message.content && message.content.id) {
                      var id = _transformId(message.content.id);

                      collection.findOne({ '_id': id }, function(err, doc) {
                          if (err) {
                            deferred.resolve({ error: err });
                          }
                          else {
                            deferred.resolve(doc);
                          }                           
                        });
                    }
                    else {
                      deferred.reject('You need to specify the ID of the document you want to copy');
                    }
                }).
              catch(function(err) {
                    deferred.resolve({ error: err });
                });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise;
      };
    exports.cp = _cp;

    /**
     * Remove a doc from a user's profile
     *
     * @param Object
     * @param Object
     */
    var _rm = function(verified, message) {
        var deferred = q.defer();


        if (verified.admin || verified.write) { 
          _getCollection(verified).
              then(function(collection) {
                      // Does this collection exist?
                      collection.count(function(err, count) {
                          if (count === 0) {
                            deferred.resolve({ error: 'Collection: ' + verified.resource + ' does not exist' });
                          }
                          else {
                            var id = message.content.id;
                            if (typeof id === 'string') {
                              id = new mongo.ObjectID(message.content.id);
                            }

                            // Ugh, this has to be done so that any files attached
                            // to the document will be removed too
                            collection.findOne({ '_id': id }, function(err, doc) {
                                if (err) {
                                  deferred.resolve({ error: err });
                                }
                                else {
                                  collection.remove({ _id: id },
                                      function(err, ack) {
                                          if (err || ack === 0) {
                                            deferred.resolve({ error: 'Could not delete document: ' + message.content.id });
                                          }
                                          else {
                                            // Check for an attached file.
                                            // Remove it from the file system
                                            // and database
                                            if (doc.fileId) {
                                              agentDb.fileModel.findById(doc.fileId, function(err, file) {
                                                    if (err) {
                                                      deferred.resolve({ error: err });
                                                    }
                                                    file.remove(function(err) {
                                                        if (err) {
                                                          deferred.resolve({ error: err });
                                                        }
                                                        fs.unlink(nconf.get('docs') +
                                                                '/' + verified.resource +
                                                                '/' + file.name, function(err) {
                                                              if (err) {
                                                                deferred.resolve({ error: err });
                                                              }
                                                              else {
                                                                deferred.resolve();
                                                              }
                                                          });
                                                      });
                                                });
                                            }
                                            else {
                                              deferred.resolve();
                                            }
                                          }
                                    });
                                }
                              });

                          }
                        });
                    }).
                  catch(function(err) {
                        deferred.resolve({ error: err });
                    });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
 
        return deferred.promise;
      };
    exports.rm = _rm;

    /**
     * Remove a collection from the user's profile
     *
     * @param Object
     *
     * @return promise
     */
    var _rmdir = function(verified) {
        var deferred = q.defer();

        if (verified.admin || verified.execute) { 
          _getCollection(verified).
              then(function(collection) {
                      // Does this collection exist?
                      collection.count(function(err, count) {
                          if (count === 0) {
                            deferred.resolve({ error: 'Collection: ' + verified.resource + ' does not exist' });
                          }
                          else {
                            collection.drop(
                                function(err, ack) {
                                    if (err || ack === 0) {
                                      deferred.resolve({ error: 'Could not delete collection: ' + verified.resource });
                                    }
                                    else {
                                      deferred.resolve();
                                    }
                                  });
                          }
                        });
                    }).
              catch(function(err) {
                    deferred.resolve({ error: err });
                });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise;
      };
    exports.rmdir = _rmdir;

    /**
     * Return a list of documents contained in the app's collection
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    var _ls = function(verified, message) {
        var deferred = q.defer();
        if (verified.admin || verified.read) { 
          _getCollection(verified).
              then(function(collection) { 

                    /**
                     * Get search parameters
                     */
                    var criteria = {};
                    if (message && message.content.criteria) {
                      criteria = message.content.criteria;
                      Object.keys(criteria).forEach(function(key) {
                          criteria[key] = _transformId(criteria[key]);
                      });
                    }

                    var fields = ['name', '_id'];
                    if (message && message.content.fields) {
                      fields = message.content.fields;
                    }

                    var cursor = collection.find(criteria, fields);

                    // Were any options set?
                    if (message && message.content.options) {

                      if (message.content.options.sort) {
                        cursor = cursor.sort(message.content.options.sort);
                      }
 
                      if(message.content.options.skip) {
                        cursor = cursor.skip(message.content.options.skip);
                      }

                      if(message.content.options.limit) {
                        cursor = cursor.limit(message.content.options.limit);
                      }
                    }

                    cursor.toArray(
                        function(err, docs) {
                            if (err) {
                              deferred.resolve({ error: err });
                            }
                            else {
                              deferred.resolve(docs);
                            }
                          });
                }).
              catch(function(err) {
                    deferred.resolve({ error: err });
                });
        }
        else {
          deferred.reject('You are not allowed access to that resource');
        }
        return deferred.promise;
      };
    exports.ls = _ls;
    
    /**
     * Return a list of collections in this gebo's database
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    function _lsCollections(verified, message) {
        var deferred = q.defer();
        if (verified.admin || verified.read) {
          nativeConnection.get(function(client) {
            client.collectionNames(function(err, names) {
                if (err) {
                  deferred.resolve({ error: err });
                }
                else {
                  var cleanNames = [];
                  names.forEach(function(item) {
                      item = item.name.replace(
                                agentDb.connection.name + '.', ''); 
                      if (message.content &&
                          message.content.flag &&
                          message.content.flag.toLowerCase() === 'all') {
                        cleanNames.push(item);
                      }
                      else if(item !== 'system.indexes' &&
                              item !== 'conversations' &&
                              item !== 'registrants' &&
                              item !== 'files' &&
                              item !== 'tokens' &&
                              item !== 'socialcommitments' &&
                              item !== 'permissions' &&
                              item !== 'keys' &&
                              item !== 'friendos'){
                        cleanNames.push(item);
                      }
                    });
                  deferred.resolve(cleanNames);
                }
              });
            });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise;
      };
    exports.lsCollections = _lsCollections;

    /** 
     * createDatabase and dropDatabase have been mothballed (along
     * with their respective tests). This functionality may be
     * reimplemented in the future.
     *
     * 2014-5-29
     */
    /**
     * Create a new database
     *
     * @param string
     * @param Object - The user's public profile
     *
     * @return promise
     */
//    var _createDatabase = function(verified, message) {
//        var deferred = q.defer();
//
//        if (verified.admin || verified.execute) {
//          _dbExists(verified).
//                  then(function() {
//                      deferred.reject();
//                      _db.close();
//                    }).
//                  catch(function() {
//                          var server = new mongo.Server(config.mongo.host,
//                                           config.mongo.port,
//                                           config.mongo.serverOptions);
//                          var db = new mongo.Db(
//  				verified.dbName, server, config.mongo.clientOptions);
//  
//                          db.open(function (err, client) {
//                              if (err) {
//                                deferred.reject(err);
//                              }
//                              else {
//                                var collection = new mongo.Collection(client, 'profile');
//                                collection.save(message.content.profile.toObject(), { safe: true },
//                                        function(err, ack) {
//                                            db.close();
//                                            if (err) {
//                                              deferred.reject(err);
//                                            }
//                                            else {
//                                              deferred.resolve(ack);
//                                            }
//                                          });
//                              }
//                            });
//                        });
//        }
//        else {
//          deferred.reject('You are not permitted to request or propose that action');
//        }
//
//        return deferred.promise;
//      };
//    exports.createDatabase = _createDatabase;
//
//    /**
//     * Drop a database
//     * 
//     * @param Object
//     *
//     * @return promise
//     */
//    var _dropDatabase = function(verified) {
//        var deferred = q.defer();
//
//        if (verified.admin || verified.execute) {
//        _dbExists(verified).
//                then(function() {
//                    var server = new mongo.Server(config.mongo.host,
//                                     config.mongo.port,
//                                     config.mongo.serverOptions);
//                    var db = new mongo.Db(verified.dbName, server, config.mongo.clientOptions);
//
//                    db.open(function (err) {
//                        if (err) {
//                          _db.close();
//                          db.close();
//                          deferred.reject(err);
//                        }
//                        else {
//                          db.dropDatabase(function(err) {
//                              _db.close();
//                              db.close();
//                              if (err) {
//                                deferred.reject(new Error('Database: ' +
//                                                dbName + ' was not dropped'));
//                              }
//                              else {
//                                deferred.resolve();
//                              }
//                            });
//                        }
//                      });
//                  }).
//                catch(function(err) {
//                    _db.close();
//                    deferred.reject(err);
//                  });
//        }
//        else {
//          deferred.reject('You are not permitted to request or propose that action');
//        }
//        return deferred.promise;
//      };
//    exports.dropDatabase = _dropDatabase;

    /**
     * This adds a new agent for this gebo to represent
     *
     * @param Object
     * @param Object
     */
    var _registerAgent = function(verified, message) {
        var deferred = q.defer();

        if (verified.admin || verified.execute) {

          geboDb.registrantModel.findOne({ email: message.content.newAgent.email }, function(err, registrant) {
              if (registrant) {
                deferred.resolve({ error: 'That email address has already been registered' });
              }
              else {
                var agent = new geboDb.registrantModel(message.content.newAgent);
                agent.save(function(err, agent) {
                    if (err) {
                      deferred.resolve({ error: err });
                    }
                    else {
                      deferred.resolve(agent);
                    }
                  });
              }
            });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise; 
      };
    exports.registerAgent = _registerAgent;

    /**
     * Remove an agent from the gebo agent's database
     *
     * @param Object
     * @param Object
     */
    var _deregisterAgent = function(verified, message) {
        var deferred = q.defer();

        if (verified.admin || verified.execute) {
          geboDb.registrantModel.remove({ email: message.content.email }, function(err, ack) {
                  if (err) {
                    deferred.resolve({ error: err });
                  }
                  else {
                    deferred.resolve(ack);
                  }
                });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise; 
      };
    exports.deregisterAgent = _deregisterAgent;

    /**
     * This adds a new friendo to the registrant's
     * database
     *
     * @param Object
     * @param Object
     */
    var _friendo = function(verified, message) {
        var deferred = q.defer();

        if (verified.admin || verified.write) {
          agentDb.friendoModel.findOneAndUpdate(
                          { email: message.content.email }, message.content, { upsert: true },
                          function(err, friendo) {
                                  if (err) {
                                    deferred.resolve({ error: { code: 500, message: err} });
                                  }
                                  else {
                                    deferred.resolve(friendo);
                                  }
                            });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise; 
      };
    exports.friendo = _friendo;

    /**
     * Remove a friendo from this registrant's database
     *
     * @param Object
     * @param Object
     */
    var _defriendo = function(verified, message) {
        var deferred = q.defer();

        if (verified.write) {
          agentDb.friendoModel.remove({ email: message.content.email }, function(err, ack) {
                  if (err) {
                    deferred.resolve({ error: err });
                  }
                  else {
                    deferred.resolve(ack);
                  }
                });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise; 
      };
    exports.defriendo = _defriendo;

    /**
     * Change the access level to the requested
     * resource
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    exports.grantAccess = function(verified, message) {
        var deferred = q.defer();
        if (verified.admin || verified.write) {
          agentDb.friendoModel.findOne({ email: message.content.friendo }, function(err, friendo) {
                  if (err) {
                    deferred.resolve({ error: err });
                  }
                  else {
                    var index = utils.getIndexOfObject(friendo.permissions, 'resource', message.content.permission.resource);
                    if (index > -1) {
                      friendo.permissions.splice(index, 1);
                    }

                    friendo.permissions.push({
                            resource: message.content.permission.resource,
                            read: message.content.permission.read,
                            write: message.content.permission.write,
                            execute: message.content.permission.execute,
                        });

                    friendo.save(function(err, savedFriend) {
                            if (err) {
                              deferred.resolve({ error: err });
                            }
                            else {
                              deferred.resolve(savedFriend);
                            }
                      });
                  }
            });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
 
        return deferred.promise;
      };

    /**
     * certificate
     */
    exports.certificate = function(verified, message) {
        var deferred = q.defer();
        if (verified.admin || verified.write) {
          utils.getPrivateKeyAndCertificate().
            then(function(pair) {
                var data = {
                        public: pair.certificate,
                        private: pair.privateKey,
                        email: message.content.email
                    };

                agentDb.keyModel.findOneAndUpdate({ email: message.content.email }, data, { upsert: true },
                    function(err, key) {
                        if (err) {
                          deferred.resolve({ error: err });
                        }
                        else {
                          _friendo(verified, message).
                                then(function(friendo) {
                                    deferred.resolve(key.public);
                                  }).
                                catch(function(err) {
                                    deferred.resolve({ error: err });
                                  });
                        }
                      });
              }).
            catch(function(err) {
                deferred.resolve({ error: err });
              });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise; 
      };

    /**
     * Mongo IDs can be just about anything, but if they're
     * 12 or 24 char hex strings, they need to be converted
     * to ObjectIds. If not, they can be left alone.
     */
    function _transformId(id) {
        if (/^[0-9a-fA-F]{12,24}$/.test(id)) {
          return new mongo.ObjectID(id)
        }
        return id;
      };
    exports.transformId = _transformId;
    
    return exports;
  };

