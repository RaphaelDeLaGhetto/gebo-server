var utils = require('../lib/utils');

//var geboMongoose = require('gebo-mongoose-connection');
//var mongoose = geboMongoose.get(true);
//geboMongoose.once('mongoose-connect', function() {
//    mongoose.connection.db.close();
//  });

var events = require('events'),
    event = new events.EventEmitter();

var nconf = require('nconf');
nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testEmail'));

/**
 * Test modes
 */
exports.testModes = {

    setUp: function(callback) {
        delete require.cache[require.resolve('../lib/native-mongo-connection')];
        delete require.cache[require.resolve('gebo-mongoose-connection')];
        delete require.cache[require.resolve('../index')];
        callback();
    },

    tearDown: function(callback) {
        delete require.cache[require.resolve('../lib/native-mongo-connection')];
        delete require.cache[require.resolve('gebo-mongoose-connection')];
        delete require.cache[require.resolve('../index')];
        callback();
    },

    'Should go into test mode when the parameter is set to true': function(test) {
        test.expect(2);
        var gebo = require('../index')(true);
 
        gebo.nativeMongoConnection.once('native-connect', function() {
            gebo.nativeMongoConnection.get(function(nativeConn) {
                test.equal(nativeConn.databaseName, TEST_DB);

                // Test gebo-mongoose-connection
                test.equal(gebo.mongoose.connection.name, TEST_DB); 
                gebo.mongoose.connection.db.close();
                test.done();
              });
          });
    },

    'Should go into production mode when the parameter is not set': function(test) {
        test.expect(2);
        var gebo = require('../index')();
        gebo.nativeMongoConnection.once('native-connect', function() {
            gebo.nativeMongoConnection.get(function(nativeConn) {
                test.equal(nativeConn.databaseName, utils.getMongoDbName(nconf.get('email'))); 

                // Test gebo-mongoose-connection
                test.equal(gebo.mongoose.connection.name, utils.getMongoDbName(nconf.get('email'))); 
                gebo.mongoose.connection.db.close();
                test.done();
              });
          });
    },

    'Should go into production mode when the parameter is set to false': function(test) {
        test.expect(2);
        var gebo = require('../index')(false);
        gebo.nativeMongoConnection.once('native-connect', function() {
            gebo.nativeMongoConnection.get(function(nativeConn) {
                test.equal(nativeConn.databaseName, utils.getMongoDbName(nconf.get('email'))); 

                // Test gebo-mongoose-connection
                test.equal(gebo.mongoose.connection.name, utils.getMongoDbName(nconf.get('email'))); 
                gebo.mongoose.connection.db.close();
                test.done();
              });
          });
    },

};

/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../lib/native-mongo-connection').get(true, function(){});

/**
 * Add an action
 */
exports.actionAdd = {

    'Should be able to add an action': function(test) {
        test.expect(3);
        var gebo = require('../index')(true);
        test.equal(gebo.actions.testAction, undefined);

        // Create a new action
        function testAction() {
                return 'testAction, yeah yeah!';
              };

        gebo.actions.add(testAction);

        test.equal(typeof gebo.actions.testAction, 'function');
        test.equal(gebo.actions.testAction(), 'testAction, yeah yeah!');

        test.done();
    },
};

/**
 * Add a schema
 */
exports.schemaAdd = {

    'Should be able to add a schema': function(test) {
        test.expect(3);
        var gebo = require('../index')(true);
        test.equal(gebo.schemata.test, undefined);

        var testSchema = require('./schemata/mocks/test1');
        gebo.schemata.add('test', testSchema);

        test.equal(typeof gebo.schemata.test, 'function');
        var db = new gebo.schemata.test();
        test.equal(typeof db, 'object');
    
        test.done();
    },

    'Should be able to add a schemata object': function(test) {
        test.expect(6);

        var gebo = require('../index')(true);
        test.equal(gebo.schemata.test1, undefined);
        test.equal(gebo.schemata.test2, undefined);

        var testSchemata = require('./schemata/mocks');
        gebo.schemata.add(testSchemata);

        test.equal(typeof gebo.schemata.test1, 'function');
        var db = new gebo.schemata.test1();
        test.equal(typeof db, 'object');

        test.equal(typeof gebo.schemata.test2, 'function');
        db = new gebo.schemata.test2()
        test.equal(typeof db, 'object');

        test.done();
    },
};

/**
 * utils
 */
exports.utils = {
    'Return a mongo-friendly database name': function(test) {
        test.expect(1);
        var gebo = require('../index')(true);
        var dbName = gebo.utils.getMongoDbName('dan@example.com');
        test.equal(dbName, 'dan_at_example_dot_com');
        test.done();
    },
};

/**
 * schemata
 */
exports.schemata = {
    'Return schemata objects with which to instantiate mongoose models': function(test) {
        test.expect(5);
        var gebo = require('../index')(true);

        var dbName = new gebo.schemata.agent();
        var friendo = new dbName.friendoModel({
                name: 'Some guy',
                email: 'some@guy.com',
                gebo: 'https://somegebo.com',
            });

        test.equal(friendo.name, 'Some guy');
        test.equal(friendo.email, 'some@guy.com');
        test.equal(friendo.gebo, 'https://somegebo.com');

        dbName = new gebo.schemata.gebo();
        var registrant = new dbName.registrantModel({
                name: 'Some guy',
                email: 'some@guy.com',
            });

        test.equal(registrant.name, 'Some guy');
        test.equal(registrant.email, 'some@guy.com');

        test.done();
    },
};

/**
 * enable
 */
var _gebo;
exports.enable = {

    setUp: function(callback) {
        delete require.cache[require.resolve('../index')];
        delete require.cache[require.resolve('./mocks/full-action-module')];
        delete require.cache[require.resolve('./mocks/no-actions')];
        delete require.cache[require.resolve('./mocks/no-schema')];
        delete require.cache[require.resolve('./mocks/schema')];
        delete require.cache[require.resolve('./mocks/actions')];
        _gebo = require('..')(true);
        callback();
    },

    tearDown: function(callback) {
        // Why on earth do I have to do this? The cache deletions
        // have no impact on which schemata and actions are
        // included within the gebo. I delete these modules
        // before each test, look in the gebo after each require,
        // and there they be.
        _gebo.schemata.remove('mocks');
        _gebo.actions.remove('mocks');
        callback();
    },

    'Add schema and actions from action module': function(test) {
        test.expect(4);
        _gebo.enable('mocks', require('./mocks/full-action-module'));

        test.equal(typeof _gebo.schemata.mocks, 'function');
        var db = new _gebo.schemata.mocks();
        test.equal(typeof db.someModel, 'function');
        test.equal(typeof _gebo.actions.mocks.someAction, 'function');
        test.equal(_gebo.actions.mocks.someAction(), 'Hi, guy!');
        test.done();
    },

    'Don\'t barf if no schema is included in the action module': function(test) {
        test.expect(3);
        _gebo.enable('mocks', require('./mocks/no-schema'));
        test.equal(_gebo.schemata.mocks, undefined);
        test.equal(typeof _gebo.actions.mocks.someAction, 'function');
        test.equal(_gebo.actions.mocks.someAction(), 'Hi, guy!');
        test.done();
    },

    'Don\'t barf if no actions are included in the action module': function(test) {
        test.expect(3);
        _gebo.enable('mocks', require('./mocks/no-actions'));

        test.equal(typeof _gebo.schemata.mocks, 'function');
        var db = new _gebo.schemata.mocks();
        test.equal(typeof db.someModel, 'function');
        test.equal(_gebo.actions.mocks, undefined);
        test.done();
    },
};
