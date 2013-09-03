var config = require('./config'),
    mongo = require('mongodb'),
    utils = require('../lib/utils');
    q = require('q');

module.exports =  {
    openDb: function (dbName, deferred) {
    	try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db(dbName, server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
    		  deferred.reject(err);
                }
    		deferred.resolve(client);
             });
    	} catch(e) {
            console.dir(e);
    	}
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
    dbExists: function(dbName, deferred) {
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
                  deferred.resolve(true);
                }

                db.close();
            });
        });
 
    },

    /**
     * Save JSON to user's profile
     *
     * @param Object { name: string, email: string,
     *
     */
    save: function(user, collection, data) {
        var deferred = q.defer();
        this.openDb(utils.getMongoDbName(user.email), deferred);
        return deferred.promise;
    },
};
