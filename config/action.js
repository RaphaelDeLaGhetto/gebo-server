'use strict';

var config = require('./config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    utils = require('../lib/utils'),
    q = require('q'),
    fs = require('fs'),
    mv = require('mv'),
    mkdirp = require('mkdirp'),
    agentSchema = require('../schemata/agent'),
    geboSchema = require('../schemata/gebo');

module.exports = function(email) {

    // Turn the email into a mongo-friend database name
    var dbName = utils.ensureDbName(email);

    /**
     * Determine if the database exists. To do this,
     * a database is opened and the number of 
     * collections is counted. If the number is zero,
     * this is a new database that did not previously
     * exist.
     *
     * @param verified
     *
     * @return bool
     */
    var _dbExists = function(verified) {
        var deferred = q.defer();

        if (verified.admin || verified.read || verified.write || verified.execute) { 
          var server = new mongo.Server(
                          config.mongo.host,
                          config.mongo.port,
                          config.mongo.serverOptions);
          var db = new mongo.Db(verified.dbName, server, config.mongo.clientOptions);

          db.open(function (err, client) {
                  if (err) {
                    console.log('ERROR! What is happening here?');
                    console.log('Check ulimit -n??');
                    console.log(err);
                    throw(err);
                  }
                  client.collectionNames(function(err, names) {
                      if (err) {
                        console.log(err);
                        throw(err);
                      }
    
                      if (names.length === 0) {
                        deferred.reject(
                                new Error('Database: ' + verified.dbName + ' does not exist'));
                        db.dropDatabase(function(err) {
                          if (err) {
                            deferred.reject(new Error('Database: ' +
                                            verified.dbName + ' was not dropped'));
                          }
                        });
                      }
                      else {
                        deferred.resolve(client);
                      }
                    });
                });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
 
        return deferred.promise;
      };
    exports.dbExists = _dbExists;

    /**
     * Get the app's collection
     *
     * @param Object
     *
     * @return promise
     */
    var _getCollection = function(verified) {
        var deferred = q.defer();
        if (verified.admin || verified.read || verified.write || verified.execute) { 
          _dbExists(verified).
              then(function(client) {
                  var collection = new mongo.Collection(client, verified.collectionName);
                  deferred.resolve(collection);
                }).
              catch(function(err) {
                  deferred.reject(err);
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
    var _save = function(verified, params) {
        var deferred = q.defer();

        if (verified.admin || verified.write) { 
          _getCollection(verified).
              then(function(collection) { 
                      // For database objects
                      if (params.data) {
                        // Make data._id a string (because it might
                        // otherwise be interpreted as an int or hex)
                        if (params.data._id) {
                          params.data._id = new mongo.ObjectID(params.data._id + '');
                        }
    
                        collection.save(params.data, { safe: true },
                                function(err, ack) {
                                        if (err) {
                                          console.log('collection save reject');
                                          deferred.reject(err);
                                        }
                                        else {
                                          deferred.resolve(ack);
                                        }
                                      });
                      }

                      // For uploaded files 
                      if (params.files) {
                        console.log('params.files');
                        var dir = nconf.get('docs') + '/' + verified.dbName + '/' + verified.collectionName + '/';

//                        _saveFilesToAgentDirectory(params.files, dir, Object.keys(params.files), index).
//                                then(function() {
//                                        deferred.resolve();
//                                  }).
//                                catch(function(err) {
//                                        deferred.reject(err);
//                                  });
//                        var keys = Object.keys(params.files);
//                        for (var i = 0; i < keys.length; i++) {

//                          _saveToFilesAgentDirectory(params.files[keys[i]].path, dir + params.files[keys[i]].name);

                          // Move the file from /tmp to the agent's directory on the file system
//                          mv(params.files[keys[i]].path, dir + params.files[keys[i]].name, { mkdirp: true },
//                                          function(err) {
//                                                console.log('mv did not work');
//                                                console.log(err);
//                                                if (err) {
//                                                  console.log('rejected err');
//                                                  console.log(err);
//                                                  deferred.reject(err);
//                                                }  
//                                            });
//                        }
                        console.log('done loop');
                        deferred.resolve('hello');
                      }
                    }).
                  catch(function(err) {
                      console.log('big error');
                      deferred.reject(err);
                    }).
                  done();
        }
        else {
          console.log('You are not permitted to request or propose that action');
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
    var _cp = function(verified, params) {
        var deferred = q.defer();

        if (verified.admin || verified.read) { 
          _getCollection(verified).
              then(function(collection) {
                      collection.find({ '_id': new mongo.ObjectID(params.id) }).toArray(
                              function(err, docs) {
                                      if (err) {
                                        deferred.reject(err);
                                      }
                                      else {
                                        // Should I check for multiple matches?
                                        deferred.resolve(docs[0]);
                                      }
                                    });
                    }).
                  catch(function(err) {
                          deferred.reject(err);
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
    var _rm = function(verified, params) {
        var deferred = q.defer();

        if (verified.admin || verified.write) { 
          _getCollection(verified).
              then(function(collection) {
                      // Does this collection exist?
                      collection.count(function(err, count) {
                          if (count === 0) {
                            deferred.reject(
                                    new Error('Collection: ' +
                                            verified.collectionName + ' does not exist'));
                          }
                          else {
                            collection.remove({ _id: new mongo.ObjectID(params.id) },
                            function(err, ack) {
                                if (err || ack === 0) {
                                  deferred.reject(
                                          new Error('Could not delete document: ' +
                                                  params.id));
                                }
                                else {
                                  deferred.resolve();
                                }
                              });
                          }
                        });
                    }).
                  catch(function(err) {
                          deferred.reject(err);
                        }).
                  done();
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
                            deferred.reject(
                              new Error('Collection: ' +
                                      verified.collectionName + ' does not exist'));
                          }
                          else {
                            collection.drop(
                                function(err, ack) {
                                    if (err || ack === 0) {
                                      deferred.reject(
                                              new Error('Could not delete collection: ' +
                                                      verified.collectionName));
                                    }
                                    else {
                                      deferred.resolve();
                                    }
                                  });
                          }
                        });
                    }).
              catch(function(err) {
                      deferred.reject(err);
                    }).
              done();
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
     *
     * @return promise
     */
    var _ls = function(params) {
        var deferred = q.defer();
        if (params.admin || params.read) { 
          _getCollection(params).
              then(function(collection) {
                      collection.find({}, ['_id', 'name']).
                          sort('name').
                          toArray(function(err, docs) {
                              if (err) {
                                deferred.reject(err);
                              }
                              else {
                                deferred.resolve(docs);
                              }
                            });
                    }).
              catch(function(err) {
                      deferred.reject(err);
                    });
        }
        else {
          deferred.reject('You are not allowed access to that resource');
        }
        return deferred.promise;
      };
    exports.ls = _ls;
    
    /**
     * Return a list of registered users 
     *
     * @param Object
     *
     * @return promise
     */
    var _getRegistrants = function(verified) {
        var deferred = q.defer();
        if (verified.admin || verified.read) {
          var db = new geboSchema(dbName);
          var query = db.registrantModel.find({}, { password: false });
          query.exec().
            then(function(registrants) {
                    deferred.resolve(registrants);
                  });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }

        return deferred.promise;
      };
    exports.getRegistrants = _getRegistrants;

    /**
     * Return a list of a registered user's 
     * documents
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
//    var _getUserDocuments = function(verified, params) {
//        var deferred = q.defer();
//        if (verified.admin) {
//          var dbName = utils.getMongoDbName(params.email);
//          _ls({ dbName: dbName, collectionName: verified.collectionName }).
//		then(function(data) {
//                        deferred.resolve(data);
//                      }).
//                catch(function(err) {
//                        deferred.reject(err);
//                      });
//        }
//        else {
//          deferred.reject('You don\'t have permission to view user documents');
//        }
//
//        return deferred.promise;
//      };
//    exports.getUserDocuments = _getUserDocuments;

    /**
     * Create a new database
     *
     * @param string
     * @param Object - The user's public profile
     *
     * @return promise
     */
    var _createDatabase = function(verified, params) {
        var deferred = q.defer();

        if (verified.admin || verified.execute) {
          _dbExists(verified).
                  then(function() {
                      deferred.reject();
                    }).
                  catch(function() {
                          var server = new mongo.Server(config.mongo.host,
                                           config.mongo.port,
                                           config.mongo.serverOptions);
                          var db = new mongo.Db(
  				verified.dbName, server, config.mongo.clientOptions);
  
                          db.open(function (err, client) {
                              if (err) {
                                deferred.reject(err);
                              }
                              else {
                                var collection = new mongo.Collection(client, 'profile');
                                collection.save(params.profile.toObject(), { safe: true },
                                        function(err, ack) {
                                            if (err) {
                                              deferred.reject(err);
                                            }
                                            else {
                                              deferred.resolve(ack);
                                            }
                                            db.close();
                                          });
                              }
                            });
                        });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }

        return deferred.promise;
      };
    exports.createDatabase = _createDatabase;

    /**
     * Drop a database
     * 
     * @param Object
     *
     * @return promise
     */
    var _dropDatabase = function(verified) {
        var deferred = q.defer();

        if (verified.admin || verified.execute) {
        _dbExists(verified).
                then(function() {
                    var server = new mongo.Server(config.mongo.host,
                                     config.mongo.port,
                                     config.mongo.serverOptions);
                    var db = new mongo.Db(verified.dbName, server, config.mongo.clientOptions);

                    db.open(function (err) {
                        if (err) {
                          deferred.reject(err);
                        }
                        else {
                          db.dropDatabase(function(err) {
                              if (err) {
                                deferred.reject(new Error('Database: ' +
                                                dbName + ' was not dropped'));
                              }
                              else {
                                deferred.resolve();
                              }
                            });
                        }
                      });
                  }).
                catch(function(err) {
                    deferred.reject(err);
                  });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise;
      };
    exports.dropDatabase = _dropDatabase;

    /**
     * This adds a new agent for this gebo to represent
     *
     * @param Object
     * @param Object
     */
    var _registerAgent = function(verified, params) {
        var deferred = q.defer();

        if (verified.admin || verified.execute) {
          var db = new geboSchema(dbName);

          db.registrantModel.findOne({ email: params.newAgent.email }, function(err, registrant) {
              if (registrant) {
                deferred.reject('That email address has already been registered');
              }
              else {
                var agent = new db.registrantModel(params.newAgent);
                agent.save(function(err, agent) {
                    if (err) {
                      deferred.reject(err);
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
     * Remove an agent from this agent's database
     *
     * @param Object
     * @param Object
     */
    var _deregisterAgent = function(verified, params) {
        var deferred = q.defer();

        if (verified.admin || verified.execute) {
          var db = new geboSchema(dbName);
          db.registrantModel.remove({ email: params.email }, function(err, ack) {
                  if (err) {
                    deferred.reject(err);
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
     * This adds a new friend to the registrant's
     * database
     *
     * @param Object
     * @param Object
     */
    var _friend = function(verified, params) {
        var deferred = q.defer();

        if (verified.write) {
          var db = new agentSchema(verified.dbName);

          db.friendModel.findOneAndUpdate(
                          { email: params.newFriend.email }, params.newFriend, { upsert: true },
                          function(err, friend) {
                                  if (err) {
                                    deferred.reject(err);
                                  }
                                  else {
                                    deferred.resolve(friend);
                                  }
                            });
        }
        else {
          deferred.reject('You are not permitted to request or propose that action');
        }
        return deferred.promise; 
      };
    exports.friend = _friend;

    /**
     * Remove a friend from this registrant's database
     *
     * @param Object
     * @param Object
     */
    var _defriend = function(verified, params) {
        var deferred = q.defer();

        if (verified.write) {
          var db = new agentSchema(verified.dbName);
          db.friendModel.remove({ email: params.email }, function(err, ack) {
                  if (err) {
                    deferred.reject(err);
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
    exports.defriend = _defriend;

    return exports;
  };
