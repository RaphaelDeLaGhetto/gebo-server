
var nconf = require('nconf'),
    utils = require('gebo-utils');

nconf.file({ file: 'gebo.json' });

/**
 * Test the singleton pattern
 */
exports.instantiate = {

    tearDown: function(callback) {
        delete require.cache[require.resolve('../../lib/mongoose-connection')];
        callback();
    },

    'Should return a connection instance': function(test) {
        test.expect(1);
        var dbConnection = require('../../lib/mongoose-connection');

        dbConnection(true, function(conn) {
            test.equal(conn.name, utils.getMongoDbName(nconf.get('testEmail')));
            test.done();
          });
    },

    'Should behave as a singleton': function(test) {
        test.expect(2);
        var dbConnection = require('../../lib/mongoose-connection');
        
        dbConnection(true, function(conn) {
            test.equal(conn.name, utils.getMongoDbName(nconf.get('testEmail')));
            var anotherDbConnection = require('../../lib/mongoose-connection');

            anotherDbConnection(true, function(conn2) {
                test.equal(conn, conn2);
                test.done();
              });
          });
    },

    'Should distinguish between testing and production mode': function(test) {

        var dbConnection = require('../../lib/mongoose-connection');

        // Note: the first boolean parameter has been omitted,
        // which should put it into production mode
        dbConnection(function(conn) {
            test.equal(conn.name, utils.getMongoDbName(nconf.get('email')));
            test.done();
          });
    },
};

