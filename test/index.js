
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

        var testSchema = require('./schemata/mocks/test');
        gebo.actions.add('test', testSchema);

        test.equal(typeof gebo.actions.test, 'function');
        test.equal(typeof new gebo.actions.test(TEST_DB), 'object');

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

        var dbName = new gebo.agentSchema('dan@example.com');
        var friend = new dbName.friendModel({
                name: 'Some guy',
                email: 'some@guy.com',
                gebo: 'https://somegebo.com',
            });

        test.equal(friend.name, 'Some guy');
        test.equal(friend.email, 'some@guy.com');
        test.equal(friend.gebo, 'https://somegebo.com');

        dbName = new gebo.geboSchema('dan@example.com');
        var registrant = new dbName.registrantModel({
                name: 'Some guy',
                email: 'some@guy.com',
            });
        test.equal(friend.name, 'Some guy');
        test.equal(friend.email, 'some@guy.com');

        test.done();
    },
};


