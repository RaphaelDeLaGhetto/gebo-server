
var nconf = require('nconf'),
    utils = require('../lib/utils');

nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testDb'));

/**
 * Add an action
 */
exports.actionAdd = {

    'Should be able to add an action': function(test) {
        test.expect(3);
        var gebo = require('../index')();
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
        var gebo = require('../index')();
        test.equal(gebo.schemata.test, undefined);

        var testSchema = require('./schemata/mocks/test1');
        gebo.schemata.add('test', testSchema);

        test.equal(typeof gebo.schemata.test, 'function');
        var db = new gebo.schemata.test(TEST_DB);
        test.equal(typeof db, 'object');
        db.connection.db.close();
    
        test.done();
    },

    'Should be able to add a schemata object': function(test) {
        test.expect(6);

        var gebo = require('../index')();
        test.equal(gebo.schemata.test1, undefined);
        test.equal(gebo.schemata.test2, undefined);

        var testSchemata = require('./schemata/mocks');
        gebo.schemata.add(testSchemata);

        test.equal(typeof gebo.schemata.test1, 'function');
        var db = new gebo.schemata.test1(TEST_DB);
        test.equal(typeof db, 'object');
        db.connection.db.close();

        test.equal(typeof gebo.schemata.test2, 'function');
        db = new gebo.schemata.test2(TEST_DB)
        test.equal(typeof db, 'object');
        db.connection.db.close();

        test.done();
    },
};

/**
 * utils
 */
exports.utils = {
    'Return a mongo-friendly database name': function(test) {
        test.expect(1);
        var gebo = require('../index')();
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
        var gebo = require('../index')();

        var dbName = new gebo.schemata.agent('dan@example.com');
        var friend = new dbName.friendModel({
                name: 'Some guy',
                email: 'some@guy.com',
                gebo: 'https://somegebo.com',
            });
        dbName.connection.db.close();

        test.equal(friend.name, 'Some guy');
        test.equal(friend.email, 'some@guy.com');
        test.equal(friend.gebo, 'https://somegebo.com');

        dbName = new gebo.schemata.gebo('dan@example.com');
        var registrant = new dbName.registrantModel({
                name: 'Some guy',
                email: 'some@guy.com',
            });
        dbName.connection.db.close();

        test.equal(registrant.name, 'Some guy');
        test.equal(registrant.email, 'some@guy.com');

        test.done();
    },
};


