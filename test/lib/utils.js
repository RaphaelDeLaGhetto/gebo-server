
var utils = require('../../lib/utils'),
    config = require('../../config/config');

/**
 * getMongoDbName
 */
exports.getMongoDbName = {

    'Remove periods and @s': function(test) {
        test.expect(1);
        var email = 'dan@email.com';
        var dbName = utils.getMongoDbName(email);
        test.equal(dbName, 'dan_at_email_dot_com', 'The email was properly sanitized')
        test.done();
    },

    'Remove forbidden characters': function(test) {
        test.expect(1);
        var str = '/\\. "*<>:|?';  
        var dbName = utils.getMongoDbName(str);
        test.equal(dbName, '_slash__backslash__dot_' +
                           '_space__doublequotes__star__lessthan_' +
                           '_greaterthan__colon__pipe__questionmark_',
                           'The forbidden string was properly sanitized')
        test.done();
    },

    'Don\'t alter names that have been cleaned already': function(test) {
        test.expect(2);
        var str = '/\\. "*<>:|?';  

        // Clean the data
        var dbName = utils.getMongoDbName(str);
        test.equal(dbName, '_slash__backslash__dot_' +
                           '_space__doublequotes__star__lessthan_' +
                           '_greaterthan__colon__pipe__questionmark_',
                           'The forbidden string was properly sanitized')
 
        // Clean it again
        var dbName = utils.getMongoDbName(dbName);
        test.equal(dbName, '_slash__backslash__dot_' +
                           '_space__doublequotes__star__lessthan_' +
                           '_greaterthan__colon__pipe__questionmark_',
                           'The forbidden string was properly sanitized')
        test.done();
    },
};

/**
 * getMongoCollectionName
 */
exports.getMongoCollectionName = {

    'Remove $s': function(test) {
        test.expect(1);
        var str = '$$ bill, y\'all!$!';
        var collectionName = utils.getMongoCollectionName(str);
        test.equal(collectionName, '_dollarsign__dollarsign_ bill, y\'all!_dollarsign_!');
        test.done();
    },

    'Handle an empty string': function(test) {
        test.expect(1);
        var str = '';
        var collectionName = utils.getMongoCollectionName(str);
        test.equal(collectionName, 'No collection');
        test.done();
    },

    'Prepend a _ to names starting with digits': function(test) {
        test.expect(1);
        var str = '12 ways to do something';
        var collectionName = utils.getMongoCollectionName(str);
        test.equal(collectionName, '_12 ways to do something');
        test.done();
    },

    'Handle a null character': function(test) {
        test.expect(1);
        var str = null;
        var collectionName = utils.getMongoCollectionName(str);
        test.equal(collectionName, 'No collection');
        test.done();
    },

    'Prepend a _ to the \'system.\' prefix': function(test) {
        test.expect(1);
        var str = 'system.meltdown';
        var collectionName = utils.getMongoCollectionName(str);
        test.equal(collectionName, '_system.meltdown');
        test.done();
    },

    'Prepend a _ to a non-alpha prefix': function(test) {
        test.expect(1);
        var str = '? hello'
        var collectionName = utils.getMongoCollectionName(str);
        test.equal(collectionName, '_? hello');
        test.done();
    },
};

/**
 * getMongoFieldName
 */
exports.getMongoFieldName = {

    'Remove $s': function(test) {
        test.expect(1);
        var str = '$$ bill, y\'all!$!';
        var fieldName = utils.getMongoFieldName(str);
        test.equal(fieldName, '_dollarsign__dollarsign_ bill, y\'all!_dollarsign_!');
        test.done();
    },

    'Handle a null character': function(test) {
        test.expect(1);
        var str = null;
        var fieldName = utils.getMongoFieldName(str);
        test.equal(fieldName, utils.constants.noCollection);
        test.done();
    },

    'Remove periods': function(test) {
        test.expect(1);
        var str = 'will.i.am'; 
        var fieldName = utils.getMongoFieldName(str);
        test.equal(fieldName, 'will_dot_i_dot_am');
        test.done();
    },
};


/**
 * objectToQueryString
 */
exports.objectToQueryString = {
    'Take an object and spit out a query string': function(test) {
        test.expect(1);
        var obj = {
                response_type: 'token',
                client_id: 'abc123',
                redirect_uri: 'http://myhost.com',
                scope: ['*'],
            };
        test.equal(utils.objectToQueryString(obj),
                'response_type=token&client_id=abc123' +
                '&redirect_uri=' +
                encodeURIComponent('http://myhost.com') + '&scope=' + ['*']);
        test.done();
    }, 
};

/**
 * ensureDbName
 */
exports.ensureDbName = {
//    This was causing tests to overwrite/drop the dev database
//
//    'Return the default gebo name if no email specified': function(test) {
//        test.expect(2);
//        var dbName = utils.ensureDbName();
//        test.equal(dbName, 'gebo-server_at_example_dot_com');
//        dbName = utils.ensureDbName(null);
//        test.equal(dbName, 'gebo-server_at_example_dot_com');
//        test.done();
//    },

    'Return a mongo-friendly database name': function(test) {
        test.expect(2);
        var dbName = utils.ensureDbName('dan@hg.com');
        test.equal(dbName, 'dan_at_hg_dot_com');
        var dbName = utils.ensureDbName('dan_at_hg_dot_com');
        test.equal(dbName, 'dan_at_hg_dot_com');
        test.done();
    },

};
