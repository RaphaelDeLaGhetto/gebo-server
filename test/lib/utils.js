
var utils = require('../../lib/utils'),
    config = require('../../config/config'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf');

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

/**
 *saveFilesToAgentDirectory
 */
exports.saveFilesToAgentDirectory = {

    setUp: function (callback) {
    	try{
            /**
             * Write some files to /tmp
             */
            fs.writeFileSync('/tmp/gebo-server-utils-test-1.txt', 'Word to your mom');
            fs.writeFileSync('/tmp/gebo-server-utils-test-2.txt', 'It\'s Christmas time in Hollis, Queens');
            fs.writeFileSync('/tmp/gebo-server-utils-test-3.txt', 'Yes I eat cow, I am not proud');
            fs.writeFileSync('/tmp/gebo-server-utils-test-4.txt', 'Genesis 9:6');
            callback();
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        rimraf.sync('docs/dan_at_hg_dot_com');
        callback();
    },

    'Move one file from /tmp to destination': function(test) {
        test.expect(2);
        var dir = 'docs/' + utils.getMongoDbName('dan@hg.com') + '/' + utils.getMongoCollectionName('test@hg.com');

        // Make sure the directory isn't there
        try {
            fs.readdirSync('docs/' + utils.getMongoDbName('dan@hg.com'));
        }
        catch (err) {
            test.ok(err);
        }

        utils.saveFilesToAgentDirectory(
                        {
                            test: {
                                path: '/tmp/gebo-server-utils-test-1.txt',
                                name: 'gebo-server-utils-test-1.txt',
                                type: 'text/plain',
                                size: 16,
                            },
                        }, 'docs/' + utils.getMongoDbName('dan@hg.com') + '/' + utils.getMongoCollectionName('test@hg.com')).
            then(function() {
                var files = fs.readdirSync(dir);
                test.equal(files.indexOf('gebo-server-utils-test-1.txt'), 0);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });

    },

    'Move multiple files from /tmp to destination': function(test) {
        test.expect(5);
        var dir = 'docs/' + utils.getMongoDbName('dan@hg.com') + '/' + utils.getMongoCollectionName('test@hg.com');

        // Make sure the directory isn't there
        try {
            fs.readdirSync('docs/' + utils.getMongoDbName('dan@hg.com'));
        }
        catch (err) {
            test.ok(err);
        }

        utils.saveFilesToAgentDirectory(
                        {
                            test1: {
                                path: '/tmp/gebo-server-utils-test-1.txt',
                                name: 'gebo-server-utils-test-1.txt',
                                type: 'text/plain',
                                size: 16,
                            },
                            test2: {
                                path: '/tmp/gebo-server-utils-test-2.txt',
                                name: 'gebo-server-utils-test-2.txt',
                                type: 'text/plain',
                                size: 37,
                            },
                            test3: {
                                path: '/tmp/gebo-server-utils-test-3.txt',
                                name: 'gebo-server-utils-test-3.txt',
                                type: 'text/plain',
                                size: 29,
                            },
                            test4: {
                                path: '/tmp/gebo-server-utils-test-4.txt',
                                name: 'gebo-server-utils-test-4.txt',
                                type: 'text/plain',
                                size: 11,
                            },
                        }, 'docs/' + utils.getMongoDbName('dan@hg.com') + '/' + utils.getMongoCollectionName('test@hg.com')).
            then(function() {
                var files = fs.readdirSync(dir);
                test.equal(files.indexOf('gebo-server-utils-test-1.txt'), 0);
                test.equal(files.indexOf('gebo-server-utils-test-2.txt'), 1);
                test.equal(files.indexOf('gebo-server-utils-test-3.txt'), 2);
                test.equal(files.indexOf('gebo-server-utils-test-4.txt'), 3);
                test.done();
              }).
            catch(function(err) {
                console.log('err');
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

};

/**
 * getSafeFileName
 */
exports.getSafeFileName = {

    setUp: function (callback) {
    	try{
            /**
             * Write some files to /tmp
             */
            mkdirp.sync('docs/safeFileNameTests');
            fs.writeFileSync('docs/safeFileNameTests/aTestFile.txt', 'Word to your mom');
            fs.writeFileSync('docs/safeFileNameTests/anotherTestFile(5).txt', 'I like to move it move it!');
            fs.writeFileSync('docs/safeFileNameTests/noExtension', 'Bass! How low can you go?');
            fs.writeFileSync('docs/safeFileNameTests/.invisible', 'I live for the applause');
            callback();
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        rimraf.sync('docs/safeFileNameTests');
        callback();
    },

    'Return the same file name given if there is no danger of an overwrite': function(test) {
        test.expect(1);
        utils.getSafeFileName('uniqueFilename.txt', 'docs/safeFileNameTests').
            then(function(filename) {
                test.equal(filename, 'uniqueFilename.txt');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);    
                test.done();
              });
    },
 
    'Append copy number to end of filename but before file extension': function(test) {
        test.expect(1);
        utils.getSafeFileName('aTestFile.txt', 'docs/safeFileNameTests').
            then(function(filename) {
                test.equal(filename, 'aTestFile(1).txt');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);    
                test.done();
              });
    },

    'Append copy number to end of filename without extension': function(test) {
        test.expect(1);
        utils.getSafeFileName('noExtension', 'docs/safeFileNameTests').
            then(function(filename) {
                test.equal(filename, 'noExtension(1)');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);    
                test.done();
              });
    },

    'Append copy number to end of hidden file': function(test) {
        test.expect(1);
        utils.getSafeFileName('.invisible', 'docs/safeFileNameTests').
            then(function(filename) {
                test.equal(filename, '.invisible(1)');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);    
                test.done();
              });
    },
      
    'Increment existing copy number': function(test) {
        test.expect(1);
        utils.getSafeFileName('anotherTestFile(5).txt', 'docs/safeFileNameTests').
            then(function(filename) {
                test.equal(filename, 'anotherTestFile(6).txt');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);    
                test.done();
              });
    },
 
}; 
