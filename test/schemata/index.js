var fs = require('fs'),
    nconf = require('nconf'),
    path = require('path'),
    Schema = require('mongoose').Schema,
    utils = require('../../lib/utils');


nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testDb'));

exports.onLoad = {

    'Load every file in the schemata folder': function(test) {
        test.expect(2);
        var schemata = require('../../schemata');
        test.equal(typeof schemata.gebo, 'function');
        test.equal(typeof schemata.agent, 'function');
        test.done();
    },
};

/**
 * add
 */
exports.add = {

    tearDown: function(callback) {
        var files = fs.readdirSync(__dirname + '/../../schemata');

        files.forEach(function(file) {
            if (require.cache[path.resolve(__dirname + '/../../schemata/' + file)]) {
              delete require.cache[path.resolve(__dirname + '/../../schemata/' + file)]
            }
        });
        callback();
    },

    'Add a gebo schema function': function(test) {
        test.expect(3);

        var schemata = require('../../schemata');
        test.equal(schemata.test, undefined);

        var testSchema = require('./mocks/test');
        schemata.add('test', testSchema);

        test.equal(typeof schemata.test, 'function');
        test.equal(typeof new schemata.test(TEST_DB), 'object');

        test.done();
    },

    'Throw an error if function provided has no name': function(test) {
        test.expect(2);

        var schemata = require('../../schemata');
        test.equal(schemata.test, undefined);

        var testSchema = require('./mocks/test');

        try {
            schemata.add(testSchema);
            test.ok(false, 'This should throw an error');
        }
        catch(err) {
            test.equal(err.message, 'This schema needs a name');
        }

        test.done();
    },
};

/**
 * remove
 */
exports.remove = {
    'Remove a single action': function(test) {
        test.expect(7);

        var schemata = require('../../schemata');
        test.equal(schemata.test, undefined);

        var testSchema = require('./mocks/test');
        schemata.add('test1', testSchema);
        schemata.add('test2', testSchema);

        test.equal(typeof schemata.test1, 'function');
        test.equal(typeof new schemata.test1(TEST_DB), 'object');
        test.equal(typeof schemata.test2, 'function');
        test.equal(typeof new schemata.test2(TEST_DB), 'object');

        schemata.remove('test1');
        test.equal(schemata.test1, undefined);
        test.equal(typeof schemata.test2, 'function');

        test.done();
    },
};

