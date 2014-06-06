/**
 * Adapted from http://afshinm.name/mongodb-singleton-connection-in-nodejs
 * 2014-5-28
 */
var EventEmitter = require('events').EventEmitter,
    mongoose = require('mongoose'),
    utils = require('gebo-utils');
  
var nconf = require('nconf');
nconf.file({ file: 'gebo.json' });

var winston = require('winston'),
    logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

// The moongoose connection
var connectionInstance;

// This module emits the mongoose-connect event when
// successfully connected to mongo with the 
// mongoose driver
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

    /**
     * Database config
     */
    var uristring =
        process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://localhost/' + dbName;

    var mongoOptions = { db: { safe: true }};

    /**
     * Connect to mongo
     */
    var connection = mongoose.createConnection(uristring, mongoOptions);
    connection.on('open', function() {
        exports.emit('mongoose-connect');
        logger.info('Successfully established Mongoose connection to:', uristring);
      });

    connection.on('error', function(err) {
        logger.error('No Mongoose connection:', uristring, err);
      });

    connectionInstance = connection;
    callback(connection);
  };

