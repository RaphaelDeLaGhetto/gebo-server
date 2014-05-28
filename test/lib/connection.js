
var Connection = require('mongodb').Connection,
    nconf = require('nconf'),
    utils = require('gebo-utils');

nconf.file({ file: 'gebo.json' });

/**
 * Test the singleton pattern
 */
exports.instantiate = {

    'Should return a connection instance': function(test) {
        test.expect(1);
        var dbConnection = require('../../lib/connection');
        
        dbConnection(function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('testEmail')));
            test.done();
          }, true);
    },

    'Should behave as a singleton': function(test) {
        test.expect(2);
        var dbConnection = require('../../lib/connection');
        
        dbConnection(function(conn) {
            test.equal(conn.databaseName, utils.getMongoDbName(nconf.get('testEmail')));
            var anotherDbConnection = require('../../lib/connection');

            anotherDbConnection(function(conn2) {
                test.equal(conn, conn2);
                test.done();
              }, true);
          }, true);
    },
}

