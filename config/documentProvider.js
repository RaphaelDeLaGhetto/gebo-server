'use strict';

var config = require('./config'),
    mongo = require('mongodb'),
    utils = require('../lib/utils'),
    q = require('q');

module.exports =  {

    /**
     * Open the database and return a promise resolved
     * with a client
     */
    openDb: function (dbName) {
        var deferred = q.defer();
        try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db(dbName, server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  deferred.reject(err);
                }
                else {
                  deferred.resolve(client);
                }
              });
          }
        catch(e) {
            console.log(e);
            deferred.reject(e);
          }

        return deferred.promise;
      },
 
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
            client.collectionNames(function(err, names) {
                if (err) {
                  throw(err);
                }

                if (names.length === 0) {
                  deferred.reject(new Error('Database: ' + dbName + ' does not exist'));
                  db.dropDatabase(function(err) {
                    if (err) {
                      deferred.reject(new Error('Database: ' + dbName + ' was not dropped'));
                    }
                    console.log(dbName + ' dropped');
                  });
                }
                else {
                  deferred.resolve();
                }

                db.close();
              });
          });

        return deferred.promise;
      },

    /**
     * Save JSON to user's profile
     *
     * @param Object { name: string, email: string,
     * @param string
     * @param Object - arbitrary
     *
     * @return promise
     */
    save: function(user, cname, data) {
        var deferred = q.defer();
        var dbName = utils.getMongoDbName(user.email);

        this.dbExists(dbName).then(
            this.openDb(dbName).
                then(
                    function(client) {
                        var collectionName = utils.getMongoCollectionName(cname);
                        var collection = new mongo.Collection(client, collectionName);
                        collection.save(data, { upsert: true, safe: true },
                                function(err, ack) {
                                    deferred.resolve(ack);
                                  });
                      })).
                 catch(
                    function(err) {
                        deferred.reject(err);
                      }).
                 done();
        return deferred.promise;
      },
        
    /**
     * Retrieve JSON from a user's profile
     *
     * @param Object - user profile object
     * @param string - collection name
     * @param string - mongoId
     */
    retrieve: function(user, cname, mongoId) {
        var deferred = q.defer();
        var dbName = utils.getMongoDbName(user.email);

        this.dbExists(dbName).then(
            this.openDb(dbName).
                then(
                    function(client) {
                        var collectionName = utils.getMongoCollectionName(cname);
                        var collection = new mongo.Collection(client, collectionName);
                        collection.find({'_id': new mongo.ObjectID(mongoId) }).toArray(
                                function(err, docs) {
                                    deferred.resolve(docs);
                                  });
                      })).
                 catch(
                    function(err) {
                        deferred.reject(err);
                      }).
                 done();
 
        return deferred.promise;
      },

    /**
     * Delete a doc from a user's profile
     *
     * @param Object - user profile object
     * @param string - collection name
     * @param string - mongoId
     */
    destroy: function(user, cname, mongoId) {
        var deferred = q.defer();
        var dbName = utils.getMongoDbName(user.email);

        this.dbExists(dbName).
            then(this.openDb(dbName).
                then(
                    function(client) {
                        var collectionName = utils.getMongoCollectionName(cname);
                        var collection = new mongo.Collection(client, collectionName);

                        // Does this collection exist?
                        collection.count(function(err, count) {
                            if (count === 0) {
                              deferred.reject(
                                new Error('Collection: ' +
                                        collectionName + ' does not exist'));
                            }
                            else {
                              collection.remove({ _id: new mongo.ObjectID(mongoId) },
                                    function(err, ack) {
                                        if (err || ack === 0) {
                                          deferred.reject(new Error('Could not delete document: ' + mongoId));
                                        }
                                        else {
                                          deferred.resolve();
                                        }
                                      });
                            }
                          });
                      })).
            catch(
                function(err) {
                    deferred.reject(err);
                  }).
            done();
 
        return deferred.promise;
      },

    /**
     * Delete a collection from a user's profile
     *
     * @param Object - user profile object
     * @param string - collection name
     */
    destroyCollection: function(user, cname) {
        var deferred = q.defer();
        var dbName = utils.getMongoDbName(user.email);

        this.dbExists(dbName).
            then(this.openDb(dbName).
                then(
                    function(client) {
                        var collectionName = utils.getMongoCollectionName(cname);
                        var collection = new mongo.Collection(client, collectionName);

                        // Does this collection exist?
                        collection.count(function(err, count) {
                            if (count === 0) {
                              deferred.reject(
                                new Error('Collection: ' +
                                        collectionName + ' does not exist'));
                            }
                            else {
                              collection.drop(
                                    function(err, ack) {
                                        if (err || ack === 0) {
                                          deferred.reject(new Error('Could not delete collection: ' +
                                                          collectionName));
                                        }
                                        else {
                                          deferred.resolve();
                                        }
                                      });
                            }
                          });
                      })).
            catch(
                function(err) {
                    deferred.reject(err);
                  }).
            done();
        return deferred.promise;
      },
 
  };
