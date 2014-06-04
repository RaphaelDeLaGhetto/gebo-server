
var nconf = require('nconf'),
    utils = require('gebo-utils');

nconf.file({ file: 'gebo.json' });

/**
 * Test modes
 */
exports.testModes = {

    tearDown: function(callback) {
        delete require.cache[require.resolve('../../schemata/agent')];
        delete require.cache[require.resolve('../../lib/mongoose-connection')];
        callback();
    },

    'Should go into test mode when parameter is set to true': function(test) {
        var agentSchema = require('../../schemata/agent');
        var agentDb = new agentSchema(true);
        test.equal(agentDb.connection.name, utils.getMongoDbName(nconf.get('testEmail'))); 
        test.done();
    },

    'Should go into production mode when parameter is set to false': function(test) {
        var agentSchema = require('../../schemata/agent');
        var agentDb = new agentSchema(false);
        test.equal(agentDb.connection.name, utils.getMongoDbName(nconf.get('email'))); 
        test.done();
    },

    'Should go into production mode when parameter is not set': function(test) {
        var agentSchema = require('../../schemata/agent');
        var agentDb = new agentSchema();
        test.equal(agentDb.connection.name, utils.getMongoDbName(nconf.get('email'))); 
        test.done();
    },
};

