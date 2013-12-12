
var nconf = require('nconf'),
    utils = require('../lib/utils');

nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testDb'));

/**
 * add
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
