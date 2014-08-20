/**
 * Singleton stuff adapted from http://afshinm.name/mongodb-singleton-connection-in-nodejs
 * 2014-5-28
 *
 * EventEmitter stuff adapted from qubyte at 
 * http://stackoverflow.com/questions/14058990/inheriting-node-js-eventemitter-fails
 * 2014-6-6
 */
var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    util = require('util'),
    utils = require('gebo-utils'),
    EventEmitter = require('events').EventEmitter;

// Configuration
var nconf = require('nconf');
nconf.file({ file: 'gebo.json' });
var logLevel = nconf.get('logLevel');

// Logging
var winston = require('winston'),
    logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

// The MongoDB connection
var connectionInstance;

// This module emits the native-connect event when
// successfully connected to mongo with the 
// native driver
exports = module.exports = new EventEmitter();

exports.get = function(testing, callback) {

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
          if (logLevel !== 'off') logger.error('Native Mongo connection', error);
          throw new Error(error);
        }
        connectionInstance = databaseConnection;
        if (logLevel !== 'off') logger.info('Successfully established native Mongo connection to:', 'mongodb://localhost/' + dbName);
        exports.emit('native-connect');
        callback(databaseConnection);
    });
  };

