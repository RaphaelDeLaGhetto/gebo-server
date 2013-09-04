var config = require('./config'),
    mongo = require('mongodb'),
    utils = require('../lib/utils');
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
    	} catch(e) {
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
    save: function(user, collection, data) {
        var deferred = q.defer();
        var dbName = utils.getMongoDbName(user.email);
        this.dbExists(dbName).then(function() {

            console.log('db must exist');
            this.openDb(dbName).then(function(client) {
                    console.log('openDb');
                    var collectionName = utils.getMongoCollectionname(collection);
        	        var collection = new mongo.Collection(client, collectionName);
                    collection.insert(data, function(err, data) {
                                if (err) {
                                  deferred.reject(err);
                                }
                                else {
                                  deferred.resolve(data);
                                }
                            });
                },
                function(err) {
                    deferred.reject(err);
                });
        },
        function(err) {
            console.log('dbExists failed');
            deferred.reject(err);
        });

        console.log('return deferred.promise');
        return deferred.promise;
    },
        
};
