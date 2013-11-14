'use strict';

var config = require('../config/config'),
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
                    utils.saveFilesToAgentDirectory(params.files, verified).
                      then(function() {
                            if (params.data) {
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
                            }
                            else {
                              deferred.resolve();
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
     * @param Object
     *
     * @return promise
     */
    var _ls = function(verified, params) {
        var deferred = q.defer();
        if (verified.admin || verified.read) { 
          _getCollection(verified).
              then(function(collection) {
                      var fields = ['name', '_id'];
                      if (params && params.fields) {
                        fields = params.fields;
                      }
                      collection.find({}, fields).
                          sort(fields[0]).
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
                                  db.connection.db.close();
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
                  db.connection.db.close();
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

    /**
     * shakeHands
     */
    exports.shakeHands = function(verified, params) {
        var deferred = q.defer();
        deferred.resolve();
        return deferred.promise; 
      };

    return exports;
  };

;
