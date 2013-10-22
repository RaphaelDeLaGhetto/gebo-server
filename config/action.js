'use strict';

var config = require('./config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    utils = require('../lib/utils'),
    q = require('q'),
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
     * @param string
     *
     * @return bool
     */
    var _dbExists = function(dbName) {
            var deferred = q.defer();
            var server = new mongo.Server(
                            config.mongo.host,
                            config.mongo.port,
                            config.mongo.serverOptions);
            var db = new mongo.Db(dbName, server, config.mongo.clientOptions);

            db.open(function (err, client) {
                    if (err) {
                      console.log('ERROR! What is happening here?');
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
                                  new Error('Database: ' + dbName + ' does not exist'));
                          db.dropDatabase(function(err) {
                            if (err) {
                              deferred.reject(new Error('Database: ' +
                                              dbName + ' was not dropped'));
                            }
                          });
                        }
                        else {
                          deferred.resolve(client);
                        }
                      });
                  });

            return deferred.promise;
          };
    exports.dbExists = _dbExists;

    /**
     * Get the app's collection
     *
     * @param string
     *
     * @return promise
     */
    var _getCollection = function(dbName, colName) {
        var deferred = q.defer();
        _dbExists(dbName).
            then(function(client) {
                var collectionName = utils.getMongoCollectionName(colName);
                var collection = new mongo.Collection(client, collectionName);
                deferred.resolve(collection);
              }).
            catch(function(err) {
                deferred.reject(err);
              });
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

        _getCollection(verified.dbName, verified.collectionName).
            then(function(collection) {

                    // Make data._id a string (because it might
                    // otherwise be interpreted as an int or hex)
                    if (params.data._id) {
                      params.data._id = new mongo.ObjectID(params.data._id + '');
                    }

                    collection.save(params.data, { safe: true },
                            function(err, ack) {
                                    if (err) {
                                      deferred.reject(err);
                                    }
                                    else {
                                      deferred.resolve(ack);
                                    }
                                  });
                  }).
                catch(function(err) {
                    deferred.reject(err);
                  }).
                done();
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

        _getCollection(verified.dbName, verified.collectionName).
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

        _getCollection(verified.dbName, verified.collectionName).
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
 
        return deferred.promise;
      };
    exports.rm = _rm;

    /**
     * Remove a collection from the user's profile
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    var _rmdir = function(verified) {
        var deferred = q.defer();

        _getCollection(verified.dbName, verified.collectionName).
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
          _getCollection(params.dbName, params.collectionName).
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
    var _getUsers = function(params) {
        var deferred = q.defer();
        if (params.admin) {
          var db = new geboSchema(dbName);
          var query = db.registrantModel.find({}, { password: false });
          query.exec().
            then(function(registrants) {
                    deferred.resolve(registrants);
                  });
        }
        else {
          deferred.reject('You don\'t have permission to view registered users');
        }

        return deferred.promise;
      };
    exports.getUsers = _getUsers;

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
    var _createDatabase = function(dbName, profile) {
        var deferred = q.defer();

        _dbExists(dbName).
                then(function() {
                    deferred.reject();
                  }).
                catch(function() {
                        var server = new mongo.Server(config.mongo.host,
                                         config.mongo.port,
                                         config.mongo.serverOptions);
                        var db = new mongo.Db(
				dbName, server, config.mongo.clientOptions);

                        db.open(function (err, client) {
                            if (err) {
                              deferred.reject(err);
                            }
                            else {
                              var collection = new mongo.Collection(client, 'profile');
                              collection.save(profile.toObject(), { safe: true },
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

        return deferred.promise;
      };
    exports.createDatabase = _createDatabase;

    /**
     * Drop a database
     * 
     * @param string
     *
     * @return promise
     */
    var _dropDatabase = function(dbName) {
        var deferred = q.defer();
        _dbExists(dbName).
                then(function() {
                    var server = new mongo.Server(config.mongo.host,
                                     config.mongo.port,
                                     config.mongo.serverOptions);
                    var db = new mongo.Db(dbName, server, config.mongo.clientOptions);

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
          console.log(params);
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
