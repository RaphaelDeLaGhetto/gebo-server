/**
 * This ensures that a connection is made to the
 * test databases
 */
var mongooseConnection = require('gebo-mongoose-connection').get(true),
    basic = require('gebo-basic-action'),
    nativeMongoConnection = basic.nativeMongoConnection.get(true, function(){});

var extend = require('extend'),
    request = require('supertest'),
    utils = require('gebo-utils');

var events = require('events'),
    event = new events.EventEmitter();

var nconf = require('nconf');
nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testEmail'));


/**
 * Ensure the HTTP codes are as expected
 */
var _goodMessage = {
        sender: 'someguy@example.com',
        performative: 'request',    
        action: 'ls',
        content: { 
            resource: 'files',
            fields: ['_id', 'name', 'lastModified'],
        },
        access_token: 'LetMeIn',
    };

var _gebo, geboDb, agentDb;

exports.httpCodes = { 

    setUp: function(callback) {
        _gebo = require('..')(true);

        // The gebo, by default, redirects all requests to
        // HTTPS. This removes the redirecting function from
        // the middleware stack, which the tests don't like.
        var index = utils.getIndexOfObject(_gebo.server._router.stack, 'name', 'requireHttps');
        if (index > -1) {
          _gebo.server._router.stack.splice(index, 1);
        }

        // Make a friendo
        agentDb = new _gebo.schemata.agent();
        var friendo = new agentDb.friendoModel({
                name: 'Some guy',
                email: 'someguy@example.com',
                gebo: 'https://somegebo.com',
            });

        friendo.permissions.push({ resource: 'files',
                                   read: true, 
                                   write: false, 
                                   execute: false, 
                                 });

        friendo.permissions.push({ resource: 'registerAgent',
                                   read: false,
                                   write: false,
                                   execute: true,
                                 });

        // Set up permissions and a token for a friendo
        geboDb = new _gebo.schemata.gebo();
        var token = new geboDb.tokenModel({
            friendoId: friendo._id,
            string: 'LetMeIn',
          });

        friendo.save(function(err) {
            if (err) {
              console.log(err);
            }
            token.save(function(err) {
                if (err) {
                  console.log(err);
                }
                callback();
              });
          });
    },

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
    },

    'Respond with 200 when a well-formed request has been received': function(test) {
        request(_gebo.server).
            post('/perform').
            send(_goodMessage).
            expect(200, test.done);
    },

    'Respond with 401 when given an invalid token': function(test) {
        var badMessage = {};
        extend(true, badMessage, _goodMessage);
        badMessage.access_token = 'InvalidToken';

        request(_gebo.server).
            post('/perform').
            send(badMessage).
            expect(401, test.done);
    },

    'Respond with 400 when given invalid content type header': function(test) {
        var badMessage = {};
        extend(true, badMessage, _goodMessage);
        badMessage.content = 'Content should be an object, not a string';

        request(_gebo.server).
            post('/perform').
            send(badMessage).
            expect(400, test.done);
    },

    'Respond with 401 when an unknown sender presents a token': function(test) {
        var badMessage = {};
        extend(true, badMessage, _goodMessage);
        badMessage.sender = 'somefakeguy@example.com';

        request(_gebo.server).
            post('/perform').
            send(badMessage).
            expect(401, test.done);
    },

    'Respond with 500 if performing the action results in an error': function(test) {
        var badMessage = {};
        extend(true, badMessage, _goodMessage);
        badMessage.action = 'registerAgent';
        badMessage.content = { newAgent: { email: 'someguy@example.com' } };

        // This creates an error because the message content doesn't contain
        // required friendoModel properties
        request(_gebo.server).
            post('/perform').
            send(badMessage).
            expect(500, test.done);
    },

    'Respond with 501 if given an unknown performative': function(test) {
        var badMessage = {};
        extend(true, badMessage, _goodMessage);
        badMessage.performative = 'FakePerformative';

        request(_gebo.server).
            post('/perform').
            send(badMessage).
            expect(501, test.done);
    },

    'Respond with 501 if given an unknown action': function(test) {
        var badMessage = {};
        extend(true, badMessage, _goodMessage);
        badMessage.action = 'hemTrousers';

        request(_gebo.server).
            post('/perform').
            send(badMessage).
            expect(501, test.done);
    },

};

/**
 * Test modes
 *
 * 2014-12-27
 * I dare say this may be an anti pattern. Test mode is established at the
 * start of tests when the database connections are made. Test mode on the
 * gebo-server may be pointless.
 */
//exports.testModes = {
//
//    setUp: function(callback) {
//        //delete require.cache[require.resolve('../lib/native-mongo-connection')];
//        delete require.cache[require.resolve('gebo-basic-action')];
//        delete require.cache[require.resolve('gebo-mongoose-connection')];
//        delete require.cache[require.resolve('..')];
//        //console.log(require.cache[require.resolve('gebo-basic-action')]);
//        console.log(require.resolve('gebo-basic-action'));
//        console.log(require.resolve('gebo-mongoose-connection'));
//        callback();
//    },
//
//    tearDown: function(callback) {
//        //delete require.cache[require.resolve('../lib/native-mongo-connection')];
//        delete require.cache[require.resolve('gebo-basic-action')];
//        delete require.cache[require.resolve('mongodb')];
//        delete require.cache[require.resolve('gebo-mongoose-connection')];
//        delete require.cache[require.resolve('..')];
//        callback();
//    },
//
//    'Should go into test mode when the parameter is set to true': function(test) {
//        test.expect(2);
//        var gebo = require('..')(true);
// 
//        console.log('HERE');
//        gebo.nativeMongoConnection.once('native-connect', function() {
//            gebo.nativeMongoConnection.get(function(nativeConn) {
//                test.equal(nativeConn.databaseName, TEST_DB);
//
//                // Test gebo-mongoose-connection
//                test.equal(gebo.mongoose.connection.name, TEST_DB); 
//                gebo.mongoose.connection.db.close();
//                test.done();
//              });
//          });
//    },
//
//    'Should go into production mode when the parameter is not set': function(test) {
//        test.expect(2);
//        var gebo = require('..')();
//        gebo.nativeMongoConnection.once('native-connect', function() {
//            gebo.nativeMongoConnection.get(function(nativeConn) {
//                test.equal(nativeConn.databaseName, utils.getMongoDbName(nconf.get('email'))); 
//
//                // Test gebo-mongoose-connection
//                test.equal(gebo.mongoose.connection.name, utils.getMongoDbName(nconf.get('email'))); 
//                gebo.mongoose.connection.db.close();
//                test.done();
//              });
//          });
//    },
//
//    'Should go into production mode when the parameter is set to false': function(test) {
//        test.expect(2);
//        var gebo = require('..')(false);
//        gebo.nativeMongoConnection.once('native-connect', function() {
//            gebo.nativeMongoConnection.get(function(nativeConn) {
//                test.equal(nativeConn.databaseName, utils.getMongoDbName(nconf.get('email'))); 
//
//                // Test gebo-mongoose-connection
//                test.equal(gebo.mongoose.connection.name, utils.getMongoDbName(nconf.get('email'))); 
//                gebo.mongoose.connection.db.close();
//                test.done();
//              });
//          });
//    },
//
//};

/**
 * Add an action
 */
exports.actionAdd = {

    'Should be able to add an action': function(test) {
        test.expect(3);
        var gebo = require('..')();
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
        var gebo = require('..')();
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

        var gebo = require('..')();
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
        var gebo = require('..')();
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
        var gebo = require('..')();

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
        //test.equal(_gebo.actions.mocks.someAction(), 'Hi, guy!');
        _gebo.actions.mocks.someAction().
            then(function(results) {
                test.equal(results, 'Hi, guy!');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Don\'t barf if no schema is included in the action module': function(test) {
        test.expect(3);
        _gebo.enable('mocks', require('./mocks/no-schema'));
        test.equal(_gebo.schemata.mocks, undefined);
        test.equal(typeof _gebo.actions.mocks.someAction, 'function');
        //test.equal(_gebo.actions.mocks.someAction(), 'Hi, guy!');
        _gebo.actions.mocks.someAction().
            then(function(results) {
                test.equal(results, 'Hi, guy!');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
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
