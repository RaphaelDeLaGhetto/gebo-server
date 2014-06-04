
var nconf = require('nconf'),
    utils = require('gebo-utils');

nconf.file({ file: 'gebo.json' });

/**
 * Test modes
 */
exports.testModes = {

    tearDown: function(callback) {
        delete require.cache[require.resolve('../../schemata/gebo')];
        delete require.cache[require.resolve('../../lib/geboDb')];
        callback();
    },

    'Should go into test mode when parameter is set to true': function(test) {

        var geboSchema = require('../../schemata/gebo');
        var geboDb = new geboSchema(true);
        test.equal(geboDb.connection.name, utils.getMongoDbName(nconf.get('testEmail'))); 
        test.done();
    },

    'Should go into production mode when parameter is set to false': function(test) {

        var geboSchema = require('../../schemata/gebo');
        var geboDb = new geboSchema(false);
        test.equal(geboDb.connection.name, utils.getMongoDbName(nconf.get('email'))); 
        test.done();
    },

    'Should go into production mode when parameter is not set': function(test) {

        var geboSchema = require('../../schemata/gebo');
        var geboDb = new geboSchema();
        test.equal(geboDb.connection.name, utils.getMongoDbName(nconf.get('email'))); 
        test.done();
    },
}

