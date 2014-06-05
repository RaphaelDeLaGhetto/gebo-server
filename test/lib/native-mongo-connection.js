
var Connection = require('mongodb').Connection,
    nconf = require('nconf'),
    utils = require('gebo-utils');

nconf.file({ file: 'gebo.json' });

/**
 * Test the singleton pattern
 */
exports.instantiate = {

    setUp: function(callback) {
        delete require.cache[require.resolve('../../lib/native-mongo-connection')];
        callback();
    },

    tearDown: function(callback) {
        delete require.cache[require.resolve('../../lib/native-mongo-connection')];
        callback();
    },

    'Should return a connection instance': function(test) {
        test.expect(1);
        var dbConnection = require('../../lib/native-mongo-connection');
        
        dbConnection(true, function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('testEmail')));
            test.done();
          }, true);
    },

    'Should behave as a singleton': function(test) {
        test.expect(2);
        var dbConnection = require('../../lib/native-mongo-connection');
        
        dbConnection(true, function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('testEmail')));
            var anotherDbConnection = require('../../lib/native-mongo-connection');

            anotherDbConnection(function(conn2) {
                test.equal(conn, conn2);
                test.done();
              }, true);
          }, true);
    },

    'Should distinguish between testing and production mode': function(test) {

        var dbConnection = require('../../lib/native-mongo-connection');

        // Note: the first boolean parameter has been omitted,
        // which should put it into production mode
        dbConnection(function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('email')));
            test.done();
          });
    },
}

