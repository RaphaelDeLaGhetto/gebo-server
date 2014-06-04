/**
 * Adapted from http://afshinm.name/mongodb-singleton-connection-in-nodejs
 * 2014-5-28
 */
var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    utils = require('gebo-utils'),
    nconf = require('nconf');

nconf.file({ file: 'gebo.json' });

// The MongoDB connection
var connectionInstance;

module.exports = function(testing, callback) {

    if (typeof testing === 'function') {
      callback = testing;
      testing = false;
    }

    // If we already have a connection, don't connect to the database again
    if (connectionInstance) {
        callback(connectionInstance);
        return;
    }

    var dbName = utils.getMongoDbName(nconf.get('email'));
    if (testing) {
      dbName = utils.getMongoDbName(nconf.get('testEmail'));
    }

    var db = new Db(dbName, new Server('localhost', Connection.DEFAULT_PORT, { auto_reconnect: true }), { safe: true });
    db.open(function(error, databaseConnection) {
        if (error) {
          throw new Error(error);
        }
        connectionInstance = databaseConnection;
        callback(databaseConnection);
    });
  };
