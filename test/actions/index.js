var nconf = require('nconf'),
    mongo = require('mongodb'),
    path = require('path'),
    fs = require('fs'),
    utils = require('../../lib/utils');

nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testDb'));

exports.onLoad = {

    'Load and initialize every file in the actions folder': function(test) {
        test.expect(15);
        // Note: actions, not action, as above
        var actions = require('../../actions')(TEST_DB);
        test.equal(typeof actions.dbExists, 'function');
        test.equal(typeof actions.getCollection, 'function');
        test.equal(typeof actions.save, 'function');
        test.equal(typeof actions.cp, 'function');
        test.equal(typeof actions.rm, 'function');
        test.equal(typeof actions.rmdir, 'function');
        test.equal(typeof actions.ls, 'function');
        test.equal(typeof actions.createDatabase, 'function');
        test.equal(typeof actions.dropDatabase, 'function');
        test.equal(typeof actions.registerAgent, 'function');
        test.equal(typeof actions.deregisterAgent, 'function');
        test.equal(typeof actions.friend, 'function');
        test.equal(typeof actions.defriend, 'function');
        test.equal(typeof actions.grantAccess, 'function');
        test.equal(typeof actions.certificate, 'function');
        test.done();
    },
};

exports.add = {

    tearDown: function(callback) {
        var files = fs.readdirSync(__dirname + '/../../actions');

        files.forEach(function(file) {
            if (require.cache[path.resolve(__dirname + '/../../actions/' + file)]) {
              delete require.cache[path.resolve(__dirname + '/../../actions/' + file)]
            }
        });
        callback();
    },

    'Add a single action function': function(test) {
        test.expect(3);

        var actions = require('../../actions')(TEST_DB);
        test.equal(actions.testAction, undefined);

        // Create a new action
        function testAction() {
                return 'testAction, yeah yeah!';
              };

        actions.add(testAction);

        test.equal(typeof actions.testAction, 'function');
        test.equal(actions.testAction(), 'testAction, yeah yeah!');

        test.done();
    },

    'Add a single action from function assigned to variable': function(test) {
        test.expect(3);

        var actions = require('../../actions')(TEST_DB);
        test.equal(actions.testAction, undefined);

        // Create a new action
        var testAction = function() {
                return 'testAction, yeah yeah!';
              };

        actions.add('testAction', testAction);

        test.equal(typeof actions.testAction, 'function');
        test.equal(actions.testAction(), 'testAction, yeah yeah!');

        test.done();
    },

    'Throw an error if function provided has no name': function(test) {
        test.expect(2);

        var actions = require('../../actions')(TEST_DB);
        test.equal(actions.testAction, undefined);

        // Create a new action
        var testAction = function() {
                return 'testAction, yeah yeah!';
              };

        try {
            actions.add(testAction);
            test.ok(false, 'This should throw an error');
        }
        catch(err) {
            test.equal(err.message, 'This action needs a name');
        }

        test.done();
    },

    'Add a module with actions': function(test) {
        test.expect(6);

        var actions = require('../../actions')(TEST_DB);
        test.equal(actions.testAction1, undefined);
        test.equal(actions.testAction2, undefined);

        var mod = require('./mocks/testActions')('some@email.com');
        actions.add(mod);

        test.equal(typeof actions.testAction1, 'function');
        test.equal(actions.testAction1(), 'testAction1, yeah yeah!');
        test.equal(typeof actions.testAction2, 'function');
        test.equal(actions.testAction2(), 'testAction2, yeah yeah!');

        test.done();
    },
};

exports.remove = {
    'Remove a single action': function(test) {
        test.expect(6);

        var actions = require('../../actions')(TEST_DB);
        test.equal(actions.testAction1, undefined);
        test.equal(actions.testAction2, undefined);

        var mod = require('./mocks/testActions')('some@email.com');
        actions.add(mod);

        test.equal(typeof actions.testAction1, 'function');
        test.equal(typeof actions.testAction2, 'function');

        actions.remove('testAction1');
        test.equal(actions.testAction1, undefined);
        test.equal(typeof actions.testAction2, 'function');

        test.done();
    },
};

