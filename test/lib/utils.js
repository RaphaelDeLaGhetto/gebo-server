/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../../lib/native-mongo-connection').get(true, function(){}),
    mongoose = require('gebo-mongoose-connection').get(true);

var utils = require('../../lib/utils'),
    fs = require('fs'),
    mongo = require('mongodb'),
    nock = require('nock'),
    mkdirp = require('mkdirp'),
    nconf = require('nconf'),
    agentSchema = require('../../schemata/agent'),
    rimraf = require('rimraf');


nconf.file({ file: 'gebo.json' });

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
        var resource = utils.getMongoCollectionName(str);
        test.equal(resource, '_dollarsign__dollarsign_ bill, y\'all!_dollarsign_!');
        test.done();
    },

    'Handle an empty string': function(test) {
        test.expect(1);
        var str = '';
        var resource = utils.getMongoCollectionName(str);
        test.equal(resource, 'No collection');
        test.done();
    },

    'Prepend a _ to names starting with digits': function(test) {
        test.expect(1);
        var str = '12 ways to do something';
        var resource = utils.getMongoCollectionName(str);
        test.equal(resource, '_12 ways to do something');
        test.done();
    },

    'Handle a null character': function(test) {
        test.expect(1);
        var str = null;
        var resource = utils.getMongoCollectionName(str);
        test.equal(resource, 'No collection');
        test.done();
    },

    'Prepend a _ to the \'system.\' prefix': function(test) {
        test.expect(1);
        var str = 'system.meltdown';
        var resource = utils.getMongoCollectionName(str);
        test.equal(resource, '_system.meltdown');
        test.done();
    },

    'Prepend a _ to a non-alpha prefix': function(test) {
        test.expect(1);
        var str = '? hello'
        var resource = utils.getMongoCollectionName(str);
        test.equal(resource, '_? hello');
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
        var dbName = utils.ensureDbName('dan@example.com');
        test.equal(dbName, 'dan_at_example_dot_com');
        var dbName = utils.ensureDbName('dan_at_example_dot_com');
        test.equal(dbName, 'dan_at_example_dot_com');
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
        rimraf.sync('docs/' + utils.getMongoCollectionName('testapp@example.com'));

        var agentDb = new agentSchema(); 
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    'Move one file from /tmp to destination': function(test) {
        test.expect(2);
        var dir = 'docs/' + utils.getMongoCollectionName('testapp@example.com');

        // Make sure the directory isn't there
        try {
            fs.readdirSync('docs/' + utils.getMongoCollectionName('testapp@example.com'));
        }
        catch (err) {
            test.ok(err);
        }

        utils.saveFilesToAgentDirectory(
                        { test: {
                                path: '/tmp/gebo-server-utils-test-1.txt',
                                name: 'gebo-server-utils-test-1.txt',
                                type: 'text/plain',
                                size: 16,
                            },
                        },
                        { resource: utils.getMongoCollectionName('testapp@example.com')
                        }).
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

    'Return an array with a single file object when saving a single file': function(test) {
        test.expect(6);
        utils.saveFilesToAgentDirectory(
                        { test: {
                                path: '/tmp/gebo-server-utils-test-1.txt',
                                name: 'gebo-server-utils-test-1.txt',
                                type: 'text/plain',
                                size: 16,
                            },
                        },
                        { resource: utils.getMongoCollectionName('testapp@example.com')
                        }).
            then(function(files) {
                test.equal(files.length, 1);
                test.equal(files[0].name, 'gebo-server-utils-test-1.txt');
                test.equal(files[0].resource, utils.getMongoCollectionName('testapp@example.com'));
                test.equal(files[0].type, 'text/plain');
                test.equal(files[0].size, 16);
                test.ok(files[0].lastModified);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Move multiple files from /tmp to destination': function(test) {
        test.expect(5);
        var dir = 'docs/' + utils.getMongoCollectionName('testapp@example.com');

        // Make sure the directory isn't there
        try {
            fs.readdirSync('docs/' + utils.getMongoCollectionName('testapp@example.com'));
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
                        },
                        { resource: utils.getMongoCollectionName('testapp@example.com')
                        }).
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

    'Return an array of multiple file objects': function(test) {
        test.expect(21);

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
                        },
                        { resource: utils.getMongoCollectionName('testapp@example.com')
                        }).
            then(function(files) {
                test.equal(files.length, 4);
                test.equal(files[0].name, 'gebo-server-utils-test-1.txt');
                test.equal(files[0].resource, utils.getMongoCollectionName('testapp@example.com'));
                test.equal(files[0].type, 'text/plain');
                test.equal(files[0].size, 16);
                test.ok(files[0].lastModified);
                test.equal(files[1].name, 'gebo-server-utils-test-2.txt');
                test.equal(files[1].resource, utils.getMongoCollectionName('testapp@example.com'));
                test.equal(files[1].type, 'text/plain');
                test.equal(files[1].size, 37);
                test.ok(files[1].lastModified);
                test.equal(files[2].name, 'gebo-server-utils-test-3.txt');
                test.equal(files[2].resource, utils.getMongoCollectionName('testapp@example.com'));
                test.equal(files[2].type, 'text/plain');
                test.equal(files[2].size, 29);
                test.ok(files[2].lastModified);
                test.equal(files[3].name, 'gebo-server-utils-test-4.txt');
                test.equal(files[3].resource, utils.getMongoCollectionName('testapp@example.com'));
                test.equal(files[3].type, 'text/plain');
                test.equal(files[3].size, 11);
                test.ok(files[3].lastModified);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },
    'Don\'t barf if the files object is empty, null, or undefined': function(test) {
        test.expect(3);

        var dir = 'docs/' + utils.getMongoCollectionName('testapp@example.com');
        utils.saveFilesToAgentDirectory({}, dir).
            then(function() {
                test.ok(true);
                return utils.saveFilesToAgentDirectory(null, dir);
              }).
            then(function() {
                test.ok(true);
                return utils.saveFilesToAgentDirectory(undefined, dir);
               }).
            then(function() {
                test.ok(true);
                test.done(); 
               }).
             catch(function(err) {
                test.ok(false, err);
                test.done(); 
              });
    },

    'Write a file object to the agent\'s file collection in the DB': function(test) {
        test.expect(5);

        utils.saveFilesToAgentDirectory(
                        { test: {
                                path: '/tmp/gebo-server-utils-test-1.txt',
                                name: 'gebo-server-utils-test-1.txt',
                                type: 'text/plain',
                                size: 16,
                            },
                        },
                        { resource: utils.getMongoCollectionName('testapp@example.com')
                        }).
            then(function() {
                var db = new agentSchema();
                db.fileModel.findOne({ name: 'gebo-server-utils-test-1.txt',
                                       resource: utils.getMongoCollectionName('testapp@example.com') },
                    function(err, file) {
                        if (err || !file) {
                          test.ok(false, err);
                        }
                        else {
                          test.equal(file.name, 'gebo-server-utils-test-1.txt'); 
                          test.equal(file.resource, utils.getMongoCollectionName('testapp@example.com')); 
                          test.equal(file.type, 'text/plain'); 
                          test.equal(file.size, 16); 
                          test.equal(file.lastModified === null, false); 
                        }
                        test.done();
                      });
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Write multiple file objects to the agent\'s file collection in the DB': function(test) {
        test.expect(5);

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
                        },
                        { resource: utils.getMongoCollectionName('testapp@example.com')
                        }).
            then(function() {
                var db = new agentSchema();
                db.fileModel.find({},
                    function(err, files) {
                        if (err) {
                          test.ok(false, err);
                        }
                        else {
                          test.equal(files.length, 4);
                          test.equal(files[0].name, 'gebo-server-utils-test-1.txt'); 
                          test.equal(files[1].name, 'gebo-server-utils-test-2.txt'); 
                          test.equal(files[2].name, 'gebo-server-utils-test-3.txt'); 
                          test.equal(files[3].name, 'gebo-server-utils-test-4.txt'); 
                        }
                        test.done();
                      });
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
 *saveFile
 */
exports.saveFile = {

    setUp: function (callback) {
    	try{
            /**
             * Write some files to /tmp
             */
            fs.writeFileSync('/tmp/gebo-server-utils-test-1.txt', 'Word to your mom');
//            fs.writeFileSync('/tmp/gebo-server-utils-test-2.txt', 'It\'s Christmas time in Hollis, Queens');
//            fs.writeFileSync('/tmp/gebo-server-utils-test-3.txt', 'Yes I eat cow, I am not proud');
//            fs.writeFileSync('/tmp/gebo-server-utils-test-4.txt', 'Genesis 9:6');
            callback();
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        rimraf.sync('docs/someResource');

        var agentDb = new agentSchema(); 
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    'Move file from /tmp to destination': function(test) {
        test.expect(2);
        var dir = 'docs/someResource';

        // Make sure the directory isn't there
        try {
            fs.readdirSync('docs/someResource');
        }
        catch (err) {
            test.ok(err);
        }

        utils.saveFile({
                            path: '/tmp/gebo-server-utils-test-1.txt',
                            name: 'gebo-server-utils-test-1.txt',
                            type: 'text/plain',
                            size: 16,
                        },
                        { resource: 'someResource'
                        }).
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

    'Return a file object': function(test) {
        test.expect(5);
        utils.saveFile({
                            path: '/tmp/gebo-server-utils-test-1.txt',
                            name: 'gebo-server-utils-test-1.txt',
                            type: 'text/plain',
                            size: 16,
                        },
                        { resource: 'someResource'
                        }).
            then(function(file) {
                test.equal(file.name, 'gebo-server-utils-test-1.txt');
                test.equal(file.resource, 'someResource');
                test.equal(file.type, 'text/plain');
                test.equal(file.size, 16);
                test.ok(file.lastModified);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Don\'t barf if the files object is empty, null, or undefined': function(test) {
        test.expect(3);

        var dir = 'docs/someResource';
        utils.saveFile({}, dir).
            then(function() {
                test.ok(true);
                return utils.saveFile(null, dir);
              }).
            then(function() {
                test.ok(true);
                return utils.saveFile(undefined, dir);
               }).
            then(function() {
                test.ok(true);
                test.done(); 
               }).
             catch(function(err) {
                test.ok(false, err);
                test.done(); 
              });
    },

    'Write a file object to the agent\'s file collection in the DB': function(test) {
        test.expect(5);

        utils.saveFile({
                            path: '/tmp/gebo-server-utils-test-1.txt',
                            name: 'gebo-server-utils-test-1.txt',
                            type: 'text/plain',
                            size: 16,
                        },
                        { resource: 'someResource'
                        }).
            then(function() {
                var db = new agentSchema();
                db.fileModel.findOne({ name: 'gebo-server-utils-test-1.txt',
                                       resource: 'someResource' },
                    function(err, file) {
                        if (err || !file) {
                          test.ok(false, err);
                        }
                        else {
                          test.equal(file.name, 'gebo-server-utils-test-1.txt'); 
                          test.equal(file.resource, 'someResource'); 
                          test.equal(file.type, 'text/plain'); 
                          test.equal(file.size, 16); 
                          test.equal(file.lastModified === null, false); 
                        }
                        test.done();
                      });
              }).
            catch(function(err) {
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
            fs.writeFileSync('docs/safeFileNameTests/alreadySaved.txt', 'Genesis 9:6');
            fs.writeFileSync('docs/safeFileNameTests/alreadySaved(1).txt', 'Genesis 9:6');
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

    'Return the same file name given if the directory doesn\'t exist': function(test) {
        test.expect(1);
        utils.getSafeFileName('uniqueFilename.txt', 'docs/noSuchDirectory').
            then(function(filename) {
                test.equal(filename, 'uniqueFilename.txt');
                test.done();
              }).
            catch(function(err) {
                console.log('err');
                console.log(err);
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

	'Detect existing duplicates and increment copy number appropriately': function(test) {
        utils.getSafeFileName('alreadySaved.txt', 'docs/safeFileNameTests').
            then(function(filename) {
                test.equal(filename, 'alreadySaved(2).txt');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);    
                test.done();
              });
	},
}; 

/**
 * getIndexOfObject
 */
exports.getIndexOfObject = {
    setUp: function (callback) {
        this.array = [
                { key1: 'value1', key2: 'value2' },    
                { key1: 'value3', key2: 'value4' },    
                { key1: 'value5', key2: 'value6' },    
            ];
        callback();
    },
    
    'Return the index of the object matching the given key value pair': function(test) {
        test.expect(6);
        test.equal(utils.getIndexOfObject(this.array, 'key1', 'value1'), 0);
        test.equal(utils.getIndexOfObject(this.array, 'key2', 'value2'), 0);
        test.equal(utils.getIndexOfObject(this.array, 'key1', 'value3'), 1);
        test.equal(utils.getIndexOfObject(this.array, 'key2', 'value4'), 1);
        test.equal(utils.getIndexOfObject(this.array, 'key1', 'value5'), 2);
        test.equal(utils.getIndexOfObject(this.array, 'key2', 'value6'), 2);
        test.done();
    },

    'Return -1 if the objects have no such key': function(test) {
        test.expect(1);
        test.equal(utils.getIndexOfObject(this.array, 'noSuchKey', 'value1'), -1);
        test.done();
    },

    'Return -1 if the objects have no such value': function(test) {
        test.expect(1);
        test.equal(utils.getIndexOfObject(this.array, 'key1', 'noSuchValue'), -1);
        test.done();
    },

    'Return -1 if the objects have no such key-value pair': function(test) {
        test.expect(1);
        test.equal(utils.getIndexOfObject(this.array, 'noSuchKey', 'noSuchValue'), -1);
        test.done();
    },
};

/**
 * getPrivateKeyAndCertificate
 */
exports.getPrivateKeyAndCertificate = {
    'Return a new private key with self-signed certificate': function(test) {
        test.expect(3);
        utils.getPrivateKeyAndCertificate().
            then(function(pair) {
                test.equal(pair.privateKey.search('-----BEGIN RSA PRIVATE KEY-----'), 0);
                // Sometimes it's 475 and sometimes it's 471
                //test.equal(pair.privateKey.search('-----END RSA PRIVATE KEY-----'), 475);
                test.equal(pair.certificate.search('-----BEGIN CERTIFICATE-----'), 0);
                test.equal(pair.certificate.search('-----END CERTIFICATE-----'), 365);
                test.done();
              });
    },
};

/**
 * getDefaultDomain
 */
exports.getDefaultDomain = {
    'Return the host with https port': function(test) {
        test.expect(1);

        // Manually create the default host
        var manualDomain = nconf.get('domain') + ':' + nconf.get('httpsPort');
                
        var host = utils.getDefaultDomain();

        test.equal(host, manualDomain);
        test.done();
    },
};


/**
 * saveFileToDb
 */
var db, collection;
var TEST_DB = utils.getMongoDbName(nconf.get('testEmail'));
exports.saveFileToDb = {

    setUp: function (callback) {
    	try{
            /**
             * Write some files to /tmp
             */
            fs.writeFileSync('/tmp/gebo-server-utils-test-1.txt', 'Word to your mom');

            // Get a database connection
            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  console.log(err);
                }
        	collection = new mongo.Collection(client, 'someCollection');
//                collection.remove({}, function(err) {
    		    callback();
//    		  });
              });
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        db.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
            db.close();
            callback();
        });
    },

    'Remove file from /tmp': function(test) {
        test.expect(1);

        utils.saveFileToDb({
                                path: '/tmp/gebo-server-utils-test-1.txt',
                                name: 'gebo-server-utils-test-1.txt',
                                type: 'text/plain',
                                size: 16,
                            }, db).
            then(function() {
                var files = fs.readdirSync('/tmp');
                test.equal(files.indexOf('gebo-server-utils-test-1.txt'), -1);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });

    },

    'Return a file object': function(test) {
        test.expect(4);
        utils.saveFileToDb({
                            path: '/tmp/gebo-server-utils-test-1.txt',
                            name: 'gebo-server-utils-test-1.txt',
                            type: 'text/plain',
                            size: 16,
                        }, db).
            then(function(file) {
                test.equal(file.filename, 'gebo-server-utils-test-1.txt');
                test.equal(file.contentType, 'binary/octet-stream');
                test.equal(file.length, 16);
                test.ok(file.uploadDate);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Don\'t barf if the files object is empty, null, or undefined': function(test) {
        test.expect(3);

        var dir = 'docs/someResource';
        utils.saveFileToDb({}, dir).
            then(function() {
                test.ok(true);
                return utils.saveFileToDb(null, dir);
              }).
            then(function() {
                test.ok(true);
                return utils.saveFileToDb(undefined, dir);
              }).
            then(function() {
                test.ok(true);
                test.done(); 
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done(); 
              });
    },
};

