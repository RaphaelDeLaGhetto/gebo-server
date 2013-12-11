
var nconf = require('nconf'),
    utils = require('../lib/utils');

nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testDb'));

/**
 * add
 */
exports.actionAdd = {

    'Should be able to add an action': function(test) {
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
