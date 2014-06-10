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
                test.equal(gebo.mongooseConnection.connection.name, TEST_DB); 
                gebo.mongooseConnection.connection.db.close();
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
                test.equal(gebo.mongooseConnection.connection.name, utils.getMongoDbName(nconf.get('email'))); 
                gebo.mongooseConnection.connection.db.close();
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
                test.equal(gebo.mongooseConnection.connection.name, utils.getMongoDbName(nconf.get('email'))); 
                gebo.mongooseConnection.connection.db.close();
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
    //mongooseConnection = require('../lib/mongoose-connection').get(true, function(){});
//    mongoose = require('gebo-mongoose-connection').get(true);


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
        var db = new gebo.schemata.test(TEST_DB);
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
        var db = new gebo.schemata.test1(TEST_DB);
        test.equal(typeof db, 'object');

        test.equal(typeof gebo.schemata.test2, 'function');
        db = new gebo.schemata.test2(TEST_DB)
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
        var friend = new dbName.friendModel({
                name: 'Some guy',
                email: 'some@guy.com',
                gebo: 'https://somegebo.com',
            });

        test.equal(friend.name, 'Some guy');
        test.equal(friend.email, 'some@guy.com');
        test.equal(friend.gebo, 'https://somegebo.com');

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


