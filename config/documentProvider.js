'use strict';

var config = require('./config'),
    mongo = require('mongodb'),
    utils = require('../lib/utils'),
    q = require('q');

module.exports =  {

    /**
     * Determine if the database exists. To do this,
     * a database is opened and the number of 
     * collections is counted. If the number is zero,
     * this is a new database that did not previously
     * exist.
     *
     * @param string
     *
     * @return bool
     */
    dbExists: function(dbName) {
        var deferred = q.defer();
        var server = new mongo.Server(config.mongo.host,
                                      config.mongo.port,
                                      config.mongo.serverOptions);
        var db = new mongo.Db(dbName, server, config.mongo.clientOptions);

        db.open(function (err, client) {
            if (err) {
              throw(err);
            }
            client.collectionNames(function(err, names) {
                if (err) {
                  throw(err);
                }

                if (names.length === 0) {
                  deferred.reject(new Error('Database: ' + dbName + ' does not exist'));
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
      },

    /**
     * Get the app's collection
     *
     * @param string
     *
     * @return promise
     */
    getCollection: function(dbName, colName) {
        var deferred = q.defer();
        this.dbExists(dbName).
            then(function(client) {
                var collectionName = utils.getMongoCollectionName(colName);
                var collection = new mongo.Collection(client, collectionName);
                deferred.resolve(collection);
              }).
            catch(function(err) {
                deferred.reject(err);       
              });
        return deferred.promise;
      },
    
    /**
     * Save JSON to user's profile
     *
     * @param string
     * @param string
     * @param Object - arbitrary
     *
     * @return promise
     */
    save: function(dbName, colName, data) {
        var deferred = q.defer();
        this.getCollection(dbName, colName).
            then(function(collection) {

                    // Make data._id a string (because it might
                    // otherwise be interpreted as an int or hex)
                    if (data._id) {
                      data._id = new mongo.ObjectID(data._id+'');
                    }

                    collection.save(data, { upsert: true, safe: true },
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
      },
        
    /**
     * Copy JSON from a user's profile
     *
     * @param Object - user profile object
     * @param string - collection name
     * @param string - mongoId
     */
    cp: function(dbName, colName, mongoId) {
        var deferred = q.defer();

        this.getCollection(dbName, colName).
            then(function(collection) {
                    collection.find({'_id': new mongo.ObjectID(mongoId) }).toArray(
                    function(err, docs) {
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
                   }).
                 done();
 
        return deferred.promise;
      },

    /**
     * Remove a doc from a user's profile
     *
     * @param string - user profile object
     * @param string - collection name
     * @param string - mongoId
     */
    rm: function(dbName, colName, mongoId) {
        var deferred = q.defer();

        this.getCollection(dbName, colName).
            then(function(collection) {
                    // Does this collection exist?
                    collection.count(function(err, count) {
                        if (count === 0) {
                          deferred.reject(
                                  new Error('Collection: ' +
                                          colName + ' does not exist'));
                        }
                        else {
                          collection.remove({ _id: new mongo.ObjectID(mongoId) },
                          function(err, ack) {
                              if (err || ack === 0) {
                                deferred.reject(
                                        new Error('Could not delete document: ' + mongoId));
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
      },

    /**
     * Remove a collection from the user's profile
     *
     * @param string
     * @param string
     *
     * @return promise
     */
    rmdir: function(dbName, colName) {
        var deferred = q.defer();

        this.getCollection(dbName, colName).
            then(function(collection) {
                    // Does this collection exist?
                    collection.count(function(err, count) {
                        if (count === 0) {
                          deferred.reject(
                            new Error('Collection: ' +
                                    colName + ' does not exist'));
                        }
                        else {
                          collection.drop(
                              function(err, ack) {
                                  if (err || ack === 0) {
                                    deferred.reject(
                                            new Error('Could not delete collection: ' +
                                                    colName));
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
      },
 
    /**
     * Return a list of documents contained in the app's collection
     *
     * @param string
     * @param string
     *
     * @return promise
     */
    ls: function(dbName, colName) {
        var deferred = q.defer();
        this.getCollection(dbName, colName).
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
        return deferred.promise;
      },  
    
    /**
     * Create a new database
     *
     * @param string
     * @param Object - The user's public profile
     *
     * @return promise
     */
    createDatabase: function(dbName, profile) {
        var deferred = q.defer();

        this.dbExists(dbName).
                then(function() {
                    deferred.reject();
                  }).
                catch(function(err) {
                        var server = new mongo.Server(config.mongo.host,
                                         config.mongo.port,
                                         config.mongo.serverOptions);
                        var db = new mongo.Db(dbName, server, config.mongo.clientOptions);

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
      },

    /**
     * Drop a database
     * 
     * @param string
     *
     * @return promise
     */
    dropDatabase: function(dbName) {
        var deferred = q.defer();
        this.dbExists(dbName).
                then(function() {
                    var server = new mongo.Server(config.mongo.host,
                                     config.mongo.port,
                                     config.mongo.serverOptions);
                    var db = new mongo.Db(dbName, server, config.mongo.clientOptions);

                    db.open(function (err, client) {
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
      },

  };
