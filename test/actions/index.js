var nconf = require('nconf'),
    utils = require('../../lib/utils');

nconf.argv().env().file({ file: 'local.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testDb'));

exports.onLoad = {

    'Load and initialize every file in the actions folder': function(test) {
        test.expect(13);
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
        test.done();
    },
};
