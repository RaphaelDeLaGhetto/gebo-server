
var nconf = require('nconf'),
    utils = require('gebo-utils');

nconf.file({ file: 'gebo.json' });

/**
 * Test the singleton pattern
 */
exports.instantiate = {

    'Should return a connection instance': function(test) {
        test.expect(1);
        var dbConnection = require('../../lib/geboDb');

        dbConnection(true, function(conn) {
            test.equal(conn.name, utils.getMongoDbName(nconf.get('testEmail')));
            test.done();
          });
    },

    'Should behave as a singleton': function(test) {
        test.expect(2);
        var dbConnection = require('../../lib/geboDb');
        
        dbConnection(true, function(conn) {
            test.equal(conn.name, utils.getMongoDbName(nconf.get('testEmail')));
            var anotherDbConnection = require('../../lib/geboDb');

            anotherDbConnection(true, function(conn2) {
                test.equal(conn, conn2);
                test.done();
              });
          });
    },
}

