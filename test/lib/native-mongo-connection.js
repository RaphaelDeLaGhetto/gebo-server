
var Connection = require('mongodb').Connection,
    events = require('events'),
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
        var nativeConn = require('../../lib/native-mongo-connection');
        
        nativeConn.get(true, function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('testEmail')));
            test.done();
          }, true);
    },

    'Should behave as a singleton': function(test) {
        test.expect(2);
        var nativeConn = require('../../lib/native-mongo-connection');
        
        nativeConn.get(true, function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('testEmail')));
            var anotherDbConnection = require('../../lib/native-mongo-connection');

            anotherDbConnection.get(function(conn2) {
                test.equal(conn, conn2);
                test.done();
              }, true);
          }, true);
    },

    'Should distinguish between testing and production mode': function(test) {

        var nativeConn = require('../../lib/native-mongo-connection');

        // Note: the first boolean parameter has been omitted,
        // which should put it into production mode
        nativeConn.get(function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('email')));
            test.done();
          });
    },

    'Should emit an event on connect': function(test) {
        test.expect(2);
        var nativeConn = require('../../lib/native-mongo-connection');
        test.ok(nativeConn instanceof events.EventEmitter);
        nativeConn.get(function(conn) {});
        nativeConn.on('native-connect', function() {
            test.ok(true);
            test.done();
        });
    },
}

