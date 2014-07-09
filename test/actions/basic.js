/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../../lib/native-mongo-connection').get(true, function(){}),
    mongooseConnection = require('gebo-mongoose-connection'),
    mongoose = mongooseConnection.get(true);

var utils = require('../../lib/utils'),
    mongo = require('mongodb'),
    nconf = require('nconf'),
    rimraf = require('rimraf'),
    fs = require('fs'),
    q = require('q');

var cname = 'unitTest';

var verifiedAdmin = {
        resource: cname,
	    admin: true,
    };

var verifiedUser = {
        resource: cname,
	    admin: false,
    	read: true,
    };

// Get the test database name
nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testEmail'));

var agentDb = require('../../schemata/agent')(true),
    geboDb = require('../../schemata/gebo')(),
    action = require('../../actions/basic')();

/**
 * testConnection
 */
var db, collection;
exports.testConnection = {

    setUp: function (callback) {
    	try{
            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  console.log(err);
                }
        	collection = new mongo.Collection(client, cname);
    	    	collection.remove({}, function(err) {
    		    callback();
    		  });
              });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        db.close();
        callback();
    },
    

    'Connect to Mongo': function (test) {
        test.expect(2);
        collection.insert({ foo: 'bar' }, function(err, docs) {
            if (err) {
              test.ok(false, err);
            }
            test.ok(true, 'Inserted doc with no err.');
            collection.count(function(err, count) {
                test.equal(1, count, 'There is only one doc in the collection');
                test.done();
            });
        });
    },
};

/**
 * Get the gebo collection specified
 */
exports.getCollection = {

   setUp: function (callback) {

    	try{
            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	collection = new mongo.Collection(client, cname);
                collection.insert({
                        _id: new mongo.ObjectID('0123456789AB'), 
                        name: 'dan',
                        occupation: 'Batman'
                    }, function() {
                        callback();
                    });
            });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        db.dropDatabase(function(err) { 
            db.close();
            callback();
        });
    },

    'Return a the requested collection object as admin': function (test) {
        test.expect(2);
        action.getCollection({ resource: cname,
                               admin: true }).
                then(function(collection) {
                    test.ok(true);    
                    collection.save({ greeting: 'Hello' },
                            { upsert: true, safe: true },
                            function(err, ack) {
                                if (err) {
                                  test.ok(false, err);
                                  test.done();
                                }
                                test.ok(true, ack);
                                test.done();
                            });
                  }).
                catch(function(err) {
                    test.ok(false, err);
                    test.done();
                  });
    }, 

    'Return the requested collection object with execute permission': function (test) {
        test.expect(2);
        action.getCollection({ resource: cname,
                               admin: false,
                               execute: true }).
                then(function(collection) {
                    test.ok(true);    
                    collection.save({ greeting: 'Hello' },
                            { upsert: true, safe: true },
                            function(err, ack) {
                                if (err) {
                                  test.ok(false, err);
                                  test.done();
                                }
                                test.ok(true, ack);
                                test.done();
                            });
                }).
                catch(function(err) {
                    test.ok(false, err);
                    test.done();
                });
    },

    'Do not return the requested collection without permission': function (test) {
        test.expect(1);
        action.getCollection({ resource: cname,
                               admin: false,
                               read: false,
                               write: false,
                               execute: false }).
                then(function(collection) {
                    test.ok(false, 'I should not be able to create a collection here');    
                    test.done();
                  }).
                catch(function(err) {
                    test.equal(err, 'You are not permitted to request or propose that action');
                    test.done();
                  });
    },
};

/**
 * save
 *
 * The save function does one of three things:
 * 1) It saves data to the DB (see exports.saveToDb)
 * 2) It saves a file to the file system (see exports.saveToFs)
 * 3) It saves data to the DB with an associated file on the file system (see below)
 */
exports.save = {
    setUp: function (callback) {
    	try{
            /**
             * Write a file to /tmp
             */
            fs.writeFileSync('/tmp/gebo-server-save-test-1.txt', 'Word to your mom');

            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  console.log(err);
                }
        	collection = new mongo.Collection(client, 'someCollection');
    	    	collection.remove({}, function(err) {
    		    callback();
    		  });
              });
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        rimraf.sync('docs/someCollection');

        // Lose the database for next time
        db.dropDatabase(function(err) { 
            db.close();
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err);
                }
                callback();
              });
        });
    },

   'Save file to file system and JSON with fileId to database with permission': function (test) {
        test.expect(10);

        action.save({ resource: 'someCollection',
		      write: true },
                    { content: { data: { junk: 'I like to move it move it' } },
                      file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      }
                  }).
                then(function(docs) {
                        test.ok(docs);
                        // If it's already saved, it doesn't return
                        // the mongo ID
                        test.equal(docs.junk, 'I like to move it move it');
                        test.ok(docs.fileId);
                        test.ok(docs._id);

                        // Make sure the file model is saved
                        agentDb.fileModel.findById(docs.fileId,
                            function(err, file) {
                                if (err) {
                                  test.ok(false, err);
                                }
                                else {
                                  test.equal(file.name, 'gebo-server-save-test-1.txt'); 
                                  test.equal(file.resource, 'someCollection'); 
                                  test.equal(file.type, 'text/plain'); 
                                  test.equal(file.size, 21); 
                                  test.equal(file.lastModified === null, false); 
                                }

                                // Make sure the file is in the right directory
                                var files = fs.readdirSync('docs/someCollection');
                                test.equal(files.indexOf('gebo-server-save-test-1.txt'), 0);
 
                                test.done();
                              });
                    }).
                catch(function(err) {
                        console.log('Error???? ' + err);       
                        test.ifError(err);
                        test.done();
                    });
   }, 


 
};

/**
 * Save to the database
 */
exports.saveToDb = {

    setUp: function (callback) {
    	try{
            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	collection = new mongo.Collection(client, cname);
                collection.insert({
                        _id: new mongo.ObjectID('0123456789AB'), 
                        name: 'dan',
                        occupation: 'Batman'
                    }, function() {
                        callback();
                    });
            });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        db.dropDatabase(function(err) { 
            db.close();
            callback();
        });
    },
 
   'Save JSON to existing database as admin': function (test) {
        test.expect(3);

        action.save({ resource: cname,
		      admin: true },
                    { content: { data: { junk: 'I like to move it move it' } } }).
                then(function(docs) {
                        test.ok(docs);
                        // If it's already saved, it doesn't return
                        // the mongo ID
                        test.equal(docs.junk, 'I like to move it move it');
                        test.ok(docs._id);
                        test.done();
                    }).
                catch(function(err) {
                        console.log('Error???? ' + err);       
                        test.ifError(err);
                        test.done();
                    });
   }, 

   'Update existing JSON document as admin': function(test) {
        test.expect(8);

        // Retrieve the existing document
        action.cp({ resource: cname,
		            admin: true },
                  { content: { id: '0123456789AB' } }).
            then(function(docs) {
                    test.ok(docs, 'Docs successfully copied');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'Batman');
                    docs.occupation = 'AI Practitioner';
                    return action.save(
                            { resource: cname,
		                      admin: true },
                            { content: { data: docs } });
                }).
            then(function(ack) {
                    test.ok(ack, 'Doc successfully saved');
                    test.equal(ack, '1');
                    return action.cp(
                            { resource: cname,
		                      admin: true },
                            { content: { id: '0123456789AB' } });
                }).
            then(function(docs) {
                    test.ok(docs, 'Retrieved the saved doc again');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'AI Practitioner');
                    test.done();
                }).
            catch(function(err) {
                    console.log(err);
                    test.ifError(err);
                    test.done();
                });
    },

   'Save JSON to existing database with write permission': function (test) {
        test.expect(3);

        action.save({ resource: cname,
                      admin: false,
                      write: true },
                    { content: { data: { junk: 'I like to move it move it' } } }).
                then(function(docs) {
                        test.ok(docs);
                        // If it's already saved, it doesn't return
                        // the mongo ID
                        test.equal(docs.junk, 'I like to move it move it');
                        test.ok(docs._id);
                        test.done();
                    }).
                catch(function(err) {
                        test.ok(false, err);
                        test.done();
                    });
   }, 

   'Update existing JSON document with write permission': function(test) {
        test.expect(8);

        // Retrieve the existing document
        action.cp({ resource: cname,
                    admin: false,
                    read: true,
                    write: true },
                  { content: { id: '0123456789AB' } }).
            then(function(docs) {
                    test.ok(docs, 'Docs successfully copied');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'Batman');
                    docs.occupation = 'AI Practitioner';
                    return action.save(
                            { resource: cname,
                              admin: false,
                              read: true,
                              write: true },
                            { content: { data: docs } });
                }).
            then(function(ack) {
                    test.ok(ack, 'Doc successfully saved');
		    test.equal(ack, '1');
                    return action.cp(
                            { resource: cname,
                              admin: false,
                              read: true,
                              write: true },
                            { content: { id: '0123456789AB' } });
                }).
            then(function(docs) {
                    test.ok(docs, 'Retrieved the saved doc again');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'AI Practitioner');
                    test.done();
                }).
            catch(function(err) {
                    console.log(err);
                    test.ifError(err);
                    test.done();
                });
    },

   'Do not save without permission': function (test) {
        test.expect(1);
        
        action.save({ resource: cname,
                      admin: false,
                      write: false },
                    { content: { data: 'junk' } }).
                then(function(docs) {
                        test.ok(false, 'I shouldn\'t be able to save');
                        test.done();
                  }).
                catch(function(err) {
                        test.equal(err, 'You are not permitted to request or propose that action');
                        test.done();
                  });
   }, 

};

/**
 * Save to file system
 *
 * These tests are for the same function as above. They are set apart 
 * so as to simplify setUp and tearDown operations
 */
exports.saveToFs = {

    setUp: function (callback) {
    	try{
            /**
             * Write a file to /tmp
             */
            fs.writeFileSync('/tmp/gebo-server-save-test-1.txt', 'Word to your mom');
            fs.writeFileSync('/tmp/gebo-server-save-test-2.txt', 'How you doin\'?');
            
            /**
             * Setup a registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });

            /**
             * Make a friendo for the gebo
             */
            var friendo = new agentDb.friendoModel({
                    name: 'john',
                    email: 'john@painter.com',
                    gebo: 'http://theirhost.com',
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            /**
             * Set permissions for this friendo
             */
            friendo.permissions.push({ resource: 'canWriteToCollection', write: true });
            friendo.permissions.push({ resource: 'cannotWriteToCollection' });

            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                friendo.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    callback();
                });
            });
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        rimraf.sync('docs/' + utils.getMongoCollectionName('canwrite@app.com'));

        geboDb.connection.db.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err);
                }
                callback();
              });
          });
    },

    'Create agent and app directories on the file system if they do not exist': function(test) {
        test.expect(2);

        var dir = 'docs/' + utils.getMongoCollectionName('canwrite@app.com');

        // Make sure the directory isn't there
        try {
            fs.readdirSync('docs/' + utils.getMongoCollectionName('canwrite@app.com'));
        }
        catch (err) {
            test.ok(err);
        }

        action.save({ resource: utils.getMongoCollectionName('canwrite@app.com'),
                      write: true },
                    { file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      },
                    }).
            then(function() {
                var files = fs.readdirSync(dir);
                test.equal(files.indexOf('gebo-server-save-test-1.txt'), 0);
                test.done();
              }).
            catch(function(err) {
                console.log('what is causing this error?');
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Write a file object to the agent\'s file collection in the DB': function(test) {
        test.expect(5);
        action.save({ resource: utils.getMongoCollectionName('canwrite@app.com'),
                      write: true },
                    { file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      },
                    }).
            then(function() {
                agentDb.fileModel.findOne({ name: 'gebo-server-save-test-1.txt',
                                       resource: utils.getMongoCollectionName('canwrite@app.com') },
                    function(err, file) {
                        if (err) {
                          test.ok(false, err);
                        }
                        else {
                          test.equal(file.name, 'gebo-server-save-test-1.txt'); 
                          test.equal(file.resource, utils.getMongoCollectionName('canwrite@app.com')); 
                          test.equal(file.type, 'text/plain'); 
                          test.equal(file.size, 21); 
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
   
    'Do not allow an agent to save to the file system without permission': function(test) {
        action.save({ resource: utils.getMongoCollectionName('canwrite@app.com'),
                      write: false },
                    { file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      },
                    }).
            then(function() {
                test.ok(false, 'Should not be allowed to save without permission');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You are not permitted to request or propose that action');
                test.done();
              });
    },
    
    'Should not overwrite files with the same name': function(test) {
        test.expect(4);

        var dir = 'docs/' + utils.getMongoCollectionName('canwrite@app.com');

        action.save({ resource: utils.getMongoCollectionName('canwrite@app.com'),
                      write: true },
                    { file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      },
                    }).
            then(function() {
                var files = fs.readdirSync(dir);
                test.equal(files.indexOf('gebo-server-save-test-1.txt'), 0);

                fs.writeFileSync('/tmp/gebo-server-save-test-1.txt', 'Word to your mom');
                action.save({ resource: utils.getMongoCollectionName('canwrite@app.com'),
                              write: true },
                            { file: {
                                    path: '/tmp/gebo-server-save-test-1.txt',
                                    name: 'gebo-server-save-test-1.txt',
                                    type: 'text/plain',
                                    size: 21,
                              },
                            }).
                    then(function() {
                        var files = fs.readdirSync(dir);
                        test.equal(files.length, 2);
                        test.equal(files.indexOf('gebo-server-save-test-1(1).txt'), 0);
                        test.equal(files.indexOf('gebo-server-save-test-1.txt'), 1);
                        test.done();
                    });
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    /**
     * This may be defunct
     * 2014-7-8
     */
//    'Write multiple files to disk': function(test) {
//        test.expect(2);
//
//        var dir = 'docs/' + utils.getMongoCollectionName('canwrite@app.com');
//
//        action.save({ resource: utils.getMongoCollectionName('canwrite@app.com'),
//                      write: true },
//                    { files: {
//                        test1: {
//                            path: '/tmp/gebo-server-save-test-1.txt',
//                            name: 'gebo-server-save-test-1.txt',
//                            type: 'text/plain',
//                            size: 21,
//                        },
//                        test2: {
//                            path: '/tmp/gebo-server-save-test-2.txt',
//                            name: 'gebo-server-save-test-2.txt',
//                            type: 'text/plain',
//                            size: 14,
//                        },
//                      },
//                    }).
//            then(function() {
//                var files = fs.readdirSync(dir);
//                test.equal(files.indexOf('gebo-server-save-test-1.txt'), 0);
//                test.equal(files.indexOf('gebo-server-save-test-2.txt'), 1);
//                test.done();
//              }).
//            catch(function(err) {
//                test.ok(false, err);
//                test.done();
//              });
//    },

    'Write a file and data to the database': function(test) {
        test.expect(2);

        var dir = 'docs/' + utils.getMongoCollectionName('canwrite@app.com');

        action.save({ resource: utils.getMongoCollectionName('canwrite@app.com'),
                      write: true },
                    { file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      },
                      content: {
                          data: {
                            test: 'Some test data'
                          },
                      }
                    }).
            then(function(doc) {
                var files = fs.readdirSync(dir);
                test.equal(files.indexOf('gebo-server-save-test-1.txt'), 0);

                // Make sure the data was written to the collection
                test.equal(doc.test, 'Some test data');
                test.done();
              }).
            catch(function(err) {
                console.log('what is causing this error?');
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },
    
};

/**
 * Copy document from the database
 */
exports.cp = {

    setUp: function (callback) {
    	try{
            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	collection = new mongo.Collection(client, cname);
                collection.insert([
                        {
                            _id: new mongo.ObjectID('0123456789AB'),
                            name: 'dan',
                            occupation: 'Batman'
                        },
                        {
                            _id: new mongo.ObjectID('123456789ABCDEF012345678'),
                            name: 'yanfen',
                            occupation: 'Being cool'
                        },
                        {
                            _id: 'Not an ObjectId',
                            name: 'john',
                            occupation: 'Pastor in Training'
                        },
                    ],
                    function() {
                        callback();
                    });
            });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        db.dropDatabase(function(err) { 
            db.close();
            callback();
        });
    },
 
    /**
     * I'm saving this for future reference. gebo can only
     * access on database at the moment. This will almost
     * certainly change, at which point this test will 
     * become relevant again
     *
     * 2015-5-29
     */
//   'Do not copy from non-existent database': function (test) {
//        test.expect(1);
//        action.cp({ dbName: 'no_one_at_not_here_dot_com',
//		    resource: cname,
//		    admin: true },
//		  { content: { id: '303132333435363738394143' } }).
//             then(function(doc) {
//                    // Shouldn't get here
//                    console.log('doc', doc);
//                    test.ok(false, 'Shouldn\'t get here!!!');
//                    test.done();
//                }).
//            catch(function(err) {
//                    test.ok(err, 'An error should be thrown');
//                    test.done();
//                });
//   }, 

   'Copy from existing database as admin': function (test) {
        test.expect(3);
        action.cp({ resource: cname,
                    admin: true },
                  { content: { id: '0123456789AB' } }).
             then(function(docs) {
                    test.ok(docs, 'Document copied');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'Batman');
                    test.done();
                }).
            catch(function(err) {
		    // Shouldn't get here
                    test.ok(false, err); 
                    test.done();
                 });
   }, 

   'Copy from existing database with read permission': function (test) {
        test.expect(3);
        action.cp({ resource: cname,
                    admin: false,
                    read: true },
                  { content: { id: '0123456789AB' } }).
             then(function(docs) {
                    test.ok(docs, 'Document copied');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'Batman');
                    test.done();
                }).
            catch(function(err) {
		    // Shouldn't get here
                    test.ok(false, err); 
                    test.done();
                 });
   },

   'Do not copy from existing database without permission': function (test) {
        test.expect(1);
        action.cp({ resource: cname,
                    admin: false,
                    read: false },
                  { content: { id: '0123456789AB' } }).
            then(function(docs) {
                    test.ok(false, 'I should not be able to copy from the database');
                    test.done();
                }).
            catch(function(err) {
                   test.equal(err, 'You are not permitted to request or propose that action');
                   test.done();
                 });
   },

   'Should handle 24 char hex keys (the other tests use 12 chars)': function(test) {
        test.expect(2);
        action.cp({ resource: cname,
                    read: true },
                  { content: { id: '123456789ABCDEF012345678' } }).
             then(function(docs) {
                    test.equal(docs.name, 'yanfen');
                    test.equal(docs.occupation, 'Being cool');
                    test.done();
                }).
            catch(function(err) {
                   test.ok(false, err);
                   test.done();
                 });
   },

   'Should handle non-mongo ObjectId as a key': function(test) {
        test.expect(2);
        action.cp({ resource: cname,
                    read: true },
                  { content: { id: 'Not an ObjectId' } }).
             then(function(docs) {
                    test.equal(docs.name, 'john');
                    test.equal(docs.occupation, 'Pastor in Training');
                    test.done();
                }).
            catch(function(err) {
                   test.ok(false, err);
                   test.done();
                 });
   },

   'Don\'t barf if the document ID is omitted': function(test) {
        test.expect(1);
        action.cp({ 
		    resource: cname,
                    read: true },
                  { }).
             then(function(docs) {
                    test.ok(false);
                    test.done();
                }).
            catch(function(err) {
                   test.equal(err, 'You need to specify the ID of the document you want to copy');
                   test.done();
                 });
   },

};

/**
 * Delete a document from the profile 
 */
exports.rm = {

    setUp: function (callback) {
    	try{

            /**
             * Put a file in /tmp
             */
            fs.writeFileSync('/tmp/gebo-server-save-test-1.txt', 'Word to your mom');

            var server = new mongo.Server('localhost', 27017, {});
            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	collection = new mongo.Collection(client, cname);
                collection.insert([
                        {
                            _id: new mongo.ObjectID('0123456789AB'),
                            name: 'dan',
                            occupation: 'Batman'
                        },
                        {
                            _id: new mongo.ObjectID('123456789ABC'),
                            name: 'yanfen',
                            occupation: 'Being cool'
                        }
                    ],
                    function() {
                        callback();
                    });
            });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        rimraf.sync('docs/someCollection');

        // Lose the database for next time
        db.dropDatabase(function(err) { 
            db.close();
            if (err) {
              console.log(err);
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err);
                }
                callback();
              });
        });
    },

    /**
     * Another irrelevant test that may become relevant
     * once again
     */
//   'Do not delete from a non-existent database': function (test) {
//        test.expect(1);
//
//        // Retrieve the existing document
//        action.rm({ dbName: 'no_one_at_not_here_dot_com',
//		    resource: cname,
//		    admin: true },
//                  { content: { id: '0123456789AB' } }).
//             then(function() {
//                    // Shouldn't get here
//                    test.ok(false, 'Shouldn\'t get here!!!');
//                    test.done();
//                }).
//            catch(
//                function(err) {
//                    test.ok(err, 'This should throw an error');        
//                    test.done();
//                });
//   }, 

   'Do not delete from a non-existent collection': function (test) {
        test.expect(1);

        // Retrieve the existing document
        action.rm({ resource: 'NoSuchCollection',
                    admin: true },
                  { content: { id: '0123456789AB' } }).
            then(
                function() {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                }).
            catch(
                function(err) {
                    test.ok(err, 'This should throw an error');        
                    test.done();
                });
   }, 

   'Do not delete non-existent document': function (test) {
        test.expect(1);

        action.rm({ resource: cname,
                    admin: true },
                  { content: { id: 'NoSuchDocABC' } }).
            then(
                function() {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                }).
            catch(
                function(err) {
                    test.ok(err, 'This should throw an error');        
                    test.done();
                });
   }, 

   'Delete from an existing database as admin': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        action.rm({ resource: cname,
                    admin: true },
                  { content: { id: '123456789ABC' } }).
            then(function() {
                    test.ok(true, 'The doc has been deleted, I think');
                    collection.count(function(err, count) {
                        test.equal(count, 1);
                        test.done();
                    });
                }).
            catch(function(err) {
                    // Shouldn't get here
                    test.ok(false, err);
                    test.done();
                 });
   }, 

   'Delete from an existing database with write permission': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        action.rm({ resource: cname,
                    admin: false,
                    write: true },
                  { content: { id: '123456789ABC' } }).
            then(function() {
                    test.ok(true, 'The doc has been deleted, I think');
                    collection.count(function(err, count) {
                        test.equal(count, 1);
                        test.done();
                    });
                }).
            catch(function(err) {
                    // Shouldn't get here
                    test.ok(false, err);
                    test.done();
                 });
   },

   'Do not delete from an existing database without permission': function (test) {
        test.expect(2);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        action.rm({ resource: cname,
                    admin: false,
                    write: false },
                  { content: { id: '123456789ABC' } }).
            then(function() {
                    test.ok(false, 'I should not be able to delete from this database');
                    test.done();
                }).
            catch(function(err) {
                    test.equal(err, 'You are not permitted to request or propose that action');
                    test.done();
                 });
   },

   'Delete a database object with an attached file': function(test) {

        // Save a file with an object
        action.save({ resource: 'someCollection',
		      write: true },
                    { content: { data: { junk: 'I like to move it move it' } },
                      file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      }
                  }).
                then(function(docs) {
                        test.ok(docs);

                        // Make sure the file is saved to the proper directory
                        var files = fs.readdirSync('docs/someCollection');
                        test.equal(files.indexOf('gebo-server-save-test-1.txt'), 0);


                        // Remove
                        action.rm({ resource: 'someCollection',
                                    admin: false,
                                    write: true },
                                  { content: { id: docs._id } }).
                            then(function() {
                                    test.ok(true, 'The doc has been deleted, I think');

                                    // Make sure the database file document is gone
                                    agentDb.fileModel.findById(docs.fileId, function(err, file) {
                                        if (err) {
                                          test.ok(false);
                                        }
                                        test.equal(file, null); 

                                        // Make sure the file is removed from the file system
                                        var files = fs.readdirSync('docs/someCollection');
                                        test.equal(files.indexOf('gebo-server-save-test-1.txt'), -1);

                                        test.done();
                                      });
                                }).
                            catch(function(err) {
                                    test.ok(false, err);
                                    test.done();
                                 });
                    }).
                catch(function(err) {
                        console.log('Error???? ' + err);       
                        test.ifError(err);
                        test.done();
                    });
   },

   /**
    * This test is incomplete. I can't remember to which directory a file
    * gets saved. I think it's 'docs/save'.
    */
   'Delete a file and its meta object': function(test) {
        // Save a file with an object
        action.save({ resource: 'files',
		      write: true },
                    { content: { data: { junk: 'I like to move it move it' } },
                      file: {
                            path: '/tmp/gebo-server-save-test-1.txt',
                            name: 'gebo-server-save-test-1.txt',
                            type: 'text/plain',
                            size: 21,
                      }
                  }).
                then(function(docs) {
                        test.ok(docs);

                        // Make sure the file is saved to the proper directory
                        var files = fs.readdirSync('docs/files');
                        test.equal(files.indexOf('gebo-server-save-test-1.txt'), 0);


                        // Remove
                        action.rm({ resource: 'files',
                                    admin: false,
                                    write: true },
                                  { content: { id: docs._id } }).
                            then(function() {
                                    test.ok(true, 'The doc has been deleted, I think');

                                    // Make sure the database file document is gone
                                    agentDb.fileModel.findById(docs.fileId, function(err, file) {
                                        if (err) {
                                          test.ok(false);
                                        }
                                        test.equal(file, null); 

                                        // Make sure the file is removed from the file system
                                        var files = fs.readdirSync('docs/files');
                                        test.equal(files.indexOf('gebo-server-save-test-1.txt'), -1);

                                        test.done();
                                      });
                                }).
                            catch(function(err) {
                                    test.ok(false, err);
                                    test.done();
                                 });
                    }).
                catch(function(err) {
                        console.log('Error???? ' + err);       
                        test.ifError(err);
                        test.done();
                    });
   },
};

/**
 * Delete a collection from the profile 
 */
exports.rmdir = {
     setUp: function (callback) {
    	try{
            var server = new mongo.Server('localhost', 27017, {});
            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	collection = new mongo.Collection(client, cname);
                collection.insert([
                        {
                            _id: new mongo.ObjectID('0123456789AB'),
                            name: 'dan',
                            occupation: 'Batman'
                        },
                        {
                            _id: new mongo.ObjectID('123456789ABC'),
                            name: 'yanfen',
                            occupation: 'Being cool'
                        }
                    ],
                    function() {
                        callback();
                    });
            });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        db.dropDatabase(function(err) { 
            db.close();
            if (err) {
              console.log(err);
            }
            callback();
        });
    },

    /**
     * May become relevant again
     */
//   'Do not delete from a non-existent database': function (test) {
//        test.expect(1);
//
//        action.rmdir({ dbName: 'no_one_at_not_here_dot_com',
//  		       resource: cname,
//		       admin: true,
//                       execute: true }).
//            then(function() {
//                    // Shouldn't get here
//                    test.ok(false, 'Shouldn\'t get here!!!');
//                    test.done();
//                }).
//            catch(function(err) {
//                    test.ok(err, 'This should throw an error');        
//                    test.done();
//                });
//   }, 

   'Do not delete a non-existent collection': function (test) {
        test.expect(1);

        action.rmdir({ resource: 'NoSuchCollection',
                       admin: true,
                       execute: true }).
            then(function() {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                }).
            catch(function(err) {
                    test.ok(err, 'This should throw an error');        
                    test.done();
                });
   }, 

   'Delete collection from an existing database as admin': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        action.rmdir({ resource: cname,
                       admin: true,
                       execute: true }).
            then(function() {
                    test.ok(true, 'The doc has been deleted, I think');
                    collection.count(function(err, count) {
                        test.equal(count, 0);
                        test.done();
                    });
                }).
            catch(function(err) {
                    // Shouldn't get here
                    test.ok(false, err);
                    test.done();
                 });
   }, 

   'Delete collection from an existing database with execute permission': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        action.rmdir({ resource: cname,
                       admin: false,
                       execute: true }).
            then(function() {
                    test.ok(true, 'The doc has been deleted, I think');
                    collection.count(function(err, count) {
                        test.equal(count, 0);
                        test.done();
                    });
                }).
            catch(function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
   },

   'Do not delete collection without permission': function (test) {
        test.expect(2);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        action.rmdir({ resource: cname,
                       admin: false,
                       execute: false }).
            then(function() {
                    test.ok(false, 'I should not be able to rmdir');
                    test.done();
                }).
            catch(function(err) {
                    // Shouldn't get here
                    test.equal(err, 'You are not permitted to request or propose that action');
                    test.done();
                 });
   },
};

/**
 * ls
 */
exports.ls = {

     setUp: function (callback) {
    	try{
            var server = new mongo.Server('localhost', 27017, {});
            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  throw err;
                }

                collection = new mongo.Collection(client, cname);
                collection.insert([
                        {
                            _id: new mongo.ObjectID('0123456789AB'),
                            name: 'dan',
                            occupation: 'Batman',
                            foreignKeyId: new mongo.ObjectID('34567890abcdef0123456789'),
                        },
                        {
                            _id: new mongo.ObjectID('123456789ABC'),
                            name: 'yanfen',
                            occupation: 'Being cool',
                            foreignKeyId: new mongo.ObjectID('234567890abcdef012345678'),
                        },
                        {
                            _id: new mongo.ObjectID('23456789ABCD'),
                            name: 'john',
                            occupation: 'Seminarian',
                            foreignKeyId: new mongo.ObjectID('1234567890abcdef01234567'),
                        },
                        {
                            _id: new mongo.ObjectID('3456789ABCDE'),
                            name: 'richard',
                            occupation: 'Construction boss',
                            foreignKeyId: new mongo.ObjectID('01234567890abcdef0123456'),
                        }
                    ],
                    function() {
                        callback();
                    });
            });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        db.dropDatabase(function(err) { 
            db.close();
            callback();
        });
    },

    'Return a list of document names contained in the collection if permitted': function(test) {
        test.expect(5);
        action.ls({ resource: cname, read: true }).
            then(function(list) {
                test.equal(list.length, 4);
                test.equal(list[0].name, 'dan');
                test.equal(list[1].name, 'yanfen');
                test.equal(list[2].name, 'john');
                test.equal(list[3].name, 'richard');
                test.done();
            }).
            catch(
                function(err) {
                    console.log(err);
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
    },

    'Return a list of documents containing the fields specified': function(test) {
        test.expect(9);
        action.ls({ resource: cname, read: true },
                  { content: { fields: ['occupation'] } }).
            then(function(list) {
                test.equal(list.length, 4);
                test.equal(list[0].name, undefined);
                test.equal(list[0].occupation, 'Batman');
                test.equal(list[1].name, undefined);
                test.equal(list[1].occupation, 'Being cool');
                test.equal(list[2].name, undefined);
                test.equal(list[2].occupation, 'Seminarian');
                test.equal(list[3].name, undefined);
                test.equal(list[3].occupation, 'Construction boss');
 
                test.done();
            }).
            catch(
                function(err) {
                    console.log(err);
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
    },

    'Return an empty list from an empty collection if permitted': function(test) {
        test.expect(1);
        action.ls({ resource: 'no_such_collection', read: true }).
            then(function(list) {
                test.equal(list.length, 0);
                test.done();
            }).
            catch(
                function(err) {
                    console.log(err);
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
    },

    'Reject an ls request if the agent is not permitted': function(test) {
        test.expect(1);
        action.ls({ resource: cname, read: false }).
            then(function(list) {
                // Shouldn't get here
                test.ok(false, 'Shouldn\'t get here!!!');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You are not allowed access to that resource');
                test.done();
              });
    },

    'Return an ls request respecting the given criteria': function(test) {
        test.expect(2);
        action.ls({ resource: cname, read: true },
                  { content: { criteria: { name: 'yanfen' } } }).
            then(function(list) {
                test.equal(list.length, 1);
                test.equal(list[0].name, 'yanfen');
                test.done();
            }).
            catch(
                function(err) {
                    console.log(err);
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
    },

    'Return an ls request respecting the given options': function(test) {
        test.expect(7);
        action.ls({ resource: cname, read: true },
                  { content: { options: { skip: 1, limit: 5, sort: '-name' }, fields: ['name', 'occupation'] } }).
            then(function(list) {
                test.equal(list.length, 3);
                test.equal(list[0].name, 'yanfen');
                test.equal(list[0].occupation, 'Being cool');
                test.equal(list[1].name, 'john');
                test.equal(list[1].occupation, 'Seminarian');
                test.equal(list[2].name, 'richard');
                test.equal(list[2].occupation, 'Construction boss');
                test.done();
            }).
            catch(function(err) {
                    console.log(err);
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
    },

    'Convert 24 character hex strings in search criteria into ObjectIds': function(test) {
        action.ls({ resource: cname, read: true },
                  { content: { criteria: { foreignKeyId: '01234567890abcdef0123456' } } }).
            then(function(list) {
                test.equal(list.length, 1);
                test.equal(list[0].name, 'richard');
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Shouldn\'t get here!!!');
                test.done();
              });
    },

    'Do not convert a 24 character non-hex string in search criteria into ObjectIds': function(test) {
        action.ls({ resource: cname, read: true },
                  { content: { criteria: { foreignKeyId: '0123456789abcdefg012345' } } }).
            then(function(list) {
                test.equal(list.length, 0);
                test.done();
            }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Shouldn\'t get here!!!');
                test.done();
              });
    },
};

/**
 * Don't delete these just yet. The ability to create and drop
 * a database may be reimplemented soon
 *
 * 2014-5-29
 */
/**
 * createDatabase
 */
//var TEST_AGENT;
//exports.createDatabase = {
//
//    setUp: function(callback) {
//    	try{
//            var server = new mongo.Server(config.mongo.host,
//                                          config.mongo.port,
//                                          config.mongo.serverOptions);
//            db = new mongo.Db(TEST_DB, server, config.mongo.clientOptions);
//            db.open(function (err, client) {
//                if (err) {
//                  throw err;
//                }
//                collection = new mongo.Collection(client, cname);
//                collection.insert([
//                        {
//                            _id: new mongo.ObjectID('0123456789AB'),
//                            name: 'dan',
//                            occupation: 'Batman'
//                        },
//                        {
//                            _id: new mongo.ObjectID('123456789ABC'),
//                            name: 'yanfen',
//                            occupation: 'Being cool'
//                        }
//                    ],
//                    function() {
//                        TEST_AGENT = new geboDb.registrantModel({
//                                name: 'Joey Joe Joe Jr. Shabadoo',
//                                email: 'jjjj@shabadoo.com',
//                                password: 'abc123',
//                                admin: 'true'
//                              });
//                        TEST_AGENT.save(function(err) {
//                            geboDb.connection.db.close();
//                            callback();
//                          });
//                    });
//            });
//    	} catch(e) {
//            console.log(e);
//            callback();
//    	}
//    },
//
//    tearDown: function (callback) {
//        var email = TEST_AGENT.email;
//
//        // Drop the existing database defined in setup
//        db.dropDatabase(function(err) {
//            db.close();
//
//            // Lose the database for next time
//            var server = new mongo.Server(config.mongo.host,
//                                          config.mongo.port,
//                                          config.mongo.serverOptions);
//            var testDb = new mongo.Db(utils.getMongoDbName(email),
//                            server, config.mongo.clientOptions);
//
//            testDb.open(function(err, client) {
//                    if (err) {
//                      console.log('Could not open database: ' + err);
//                    } 
//
//                    testDb.dropDatabase(function(err) { 
//                        if (err) {
//                          console.log('Could not drop database: ' + err);
//                        }
//
//                        geboDb.connection.on('open', function(err) {
//                            geboDb.connection.db.dropDatabase(function(err) {
//                                if (err) {
//                                  console.log(err)
//                                }
//                                testDb.close();
//                                callback();
//                              });
//                          });
//                    });
//               });
//          });
//    },
//
//    'Add a new database with a profile collection as admin': function(test) {
//        test.expect(5);
//
//        // Make sure the DB doesn't exist already
//        var dbName = utils.getMongoDbName(TEST_AGENT.email);
//        action.dbExists({ admin: true, dbName: dbName }).
//                then(function(client) {
//                    test.ok(false, 'This database shouldn\'t exist. Delete manually???');
//                    test.done();
//                  }).
//                catch(function(err) {
//                    test.ok(true, 'This database does not exist, which is good');
//
//                    action.createDatabase({ admin: true, dbName: dbName }, { content: { profile: TEST_AGENT } }).
//                            then(function() {
//                                test.ok(true, 'Looks like ' + dbName + ' was created');
//                                action.getCollection({ admin: true, dbName: dbName, resource: 'profile' }).
//                                        then(function(collection) {
//                                            collection.findOne({ email: 'jjjj@shabadoo.com' },
//                                                    function(err, doc) {
//                                                        if (err) {
//                                                          test.ok(false, err);
//                                                          test.done();
//                                                        }
//                                                        else {
//                                                          test.equal(doc.name,
//                                                                  'Joey Joe Joe Jr. Shabadoo');
//                                                          test.equal(doc.email, 'jjjj@shabadoo.com');
//                                                          test.ok(doc.admin);
//                                                          test.done();
//                                                        }
//                                                      }); 
//                                          }).
//                                        catch(function(err) {
//                                            test.ok(false, err);
//                                            test.done();
//                                          });
//                              }).
//                            catch(function(err) {
//                                test.ok(false, err);
//                                test.done();
//                              });
//
//                  });
//    },
//
//    'Add a new database with a profile collection with execute permission': function(test) {
//        test.expect(5);
//
//        // Make sure the DB doesn't exist already
//        var dbName = utils.getMongoDbName(TEST_AGENT.email);
//        action.dbExists({ admin: false, dbName: dbName }).
//                then(function(client) {
//                    test.ok(false, 'This database shouldn\'t exist. Delete manually???');
//                    test.done();
//                  }).
//                catch(function(err) {
//                    test.ok(true, 'This database does not exist, which is good');
//                  });
//
//        action.createDatabase({ admin: false, execute: true, dbName: dbName }, { content: { profile: TEST_AGENT } }).
//                then(function() {
//                    test.ok(true, 'Looks like ' + dbName + ' was created');
//                    action.getCollection({ admin: false, execute: true, dbName: dbName, resource: 'profile' }).
//                            then(function(collection) {
//                                collection.findOne({ email: 'jjjj@shabadoo.com' },
//                                        function(err, doc) {
//                                            if (err) {
//                                              test.ok(false, err);
//                                              test.done();
//                                            }
//                                            else {
//                                              test.equal(doc.name,
//                                                      'Joey Joe Joe Jr. Shabadoo');
//                                              test.equal(doc.email, 'jjjj@shabadoo.com');
//                                              test.ok(doc.admin);
//                                              test.done();
//                                            }
//                                          }); 
//                              }).
//                            catch(function(err) {
//                                test.ok(false, err);
//                                test.done();
//                              });
//                  }).
//                catch(function(err) {
//                    test.ok(false, err);
//                    test.done();
//                  });
//    },
//    
//    'Do not add a new database without proper permission': function(test) {
//        test.expect(2);
//
//        // Make sure the DB doesn't exist already
//        var dbName = utils.getMongoDbName(TEST_AGENT.email);
//        action.dbExists({ admin: true, dbName: dbName }).
//                then(function(client) {
//                    test.ok(false, 'This database shouldn\'t exist. Delete manually???');
//                    test.done();
//                  }).
//                catch(function(err) {
//                    test.ok(true, 'This database does not exist, which is good');
//                    action.createDatabase({ admin: false, execute: false, dbName: dbName }, { content: { profile: TEST_AGENT } }).
//                            then(function() {
//                                test.ok(false, 'Should not be able to add a new datase');
//                                test.done();
//                              }).
//                            catch(function(err) {
//                                test.equal(err, 'You are not permitted to request or propose that action');
//                                test.done();
//                              });
//                  });
//    },
//
//    'Should not overwrite an existing database': function(test) {
//        test.expect(8);
//
//        // Make sure the DB exists
//        var dbName = utils.getMongoDbName(TEST_DB);
//        action.dbExists({ admin: true, dbName: dbName }).
//                then(function(client) {
//                    test.ok(true);
//                  }).
//                catch(function(err) {
//                    test.ok(false, err);
//                    test.done();
//                  });
//
//        action.createDatabase({ admin: true, execute: true, dbName: dbName }, { content: { profile: TEST_AGENT } }).
//                then(function() {
//                    test.ok(false, dbName + ' should not have been created');
//                    test.done();
//                  }).
//                catch(function(err) {
//                    test.ok(true);
//                    action.getCollection({ admin: true, execute: true, dbName: dbName, resource: cname }).
//                        then(function(collection) {
//                            test.ok(true, 'Collection retrieved');
//                            collection.find().toArray(function(err, docs) {
//                                if (err) {
//                                  test.ok(false, err);
//                                  test.done();
//                                }
//                                else {
//                                    test.equal(docs.length, 2);
//                                    test.equal(docs[0].name, 'dan');
//                                    test.equal(docs[0].occupation, 'Batman');
//                                    test.equal(docs[1].name, 'yanfen');
//                                    test.equal(docs[1].occupation, 'Being cool');
//                                    test.done();
//                                }
//                              });
//                          }).
//                        catch(function(err) {
//                            test.ok(false, err);
//                            test.done();
//                          });
//                  });
//    },
//};
//
//
///**
// * dropDatabase
// */
//exports.dropDatabase = {
//
//    setUp: function(callback) {
//    	try {
//            var server = new mongo.Server(config.mongo.host,
//                                          config.mongo.port,
//                                          config.mongo.serverOptions);
//            db = new mongo.Db('existing_db', server, config.mongo.clientOptions);
//            db.open(function (err, client) {
//                if (err) {
//                  throw err;
//                }
//                collection = new mongo.Collection(client, cname);
//                collection.insert([
//                        {
//                            _id: new mongo.ObjectID('0123456789AB'),
//                            name: 'dan',
//                            occupation: 'Batman'
//                        },
//                        {
//                            _id: new mongo.ObjectID('123456789ABC'),
//                            name: 'yanfen',
//                            occupation: 'Being cool'
//                        }
//                    ],
//                    function() {
//                        callback();
//                    });
//            });
//    	} catch(e) {
//            console.dir(e);
//    	}
//    },
//
//    tearDown: function (callback) {
//        // Lose the database for next time
//        db.dropDatabase(function(err) {
//            db.close();
//            callback();
//        });
//    },
//
//    'Should delete the database specified if admin': function(test) {
//        test.expect(3);
//
//        // Make sure the DB exists
//        var dbName = utils.getMongoDbName('existing_db');
//        action.dbExists({ admin: true, dbName: dbName }).
//                then(function(client) {
//                    test.ok(true);
//                  }).
//                catch(function(err) {
//                    test.ok(false, err);
//                    test.done();
//                  });
//
//        action.dropDatabase({ admin: true, dbName: dbName }).
//                then(function() {
//                    test.ok(true);
//
//                    action.dbExists({ admin: true, dbName: dbName }).
//                        then(function(client) {
//                            test.ok(false, dbName + ' should not exist');
//                            test.done();
//                          }).
//                        catch(function(err) {
//                            test.ok(true, err);
//                            test.done();
//                          });
//                  }).
//                catch(function(err) {
//                    test.ok(false, err);
//                    test.done();
//                  });
//    },
//
//    'Should delete the database specified with execute permissions': function(test) {
//        test.expect(3);
//
//        // Make sure the DB exists
//        var dbName = utils.getMongoDbName('existing_db');
//        action.dbExists({ admin: true, dbName: dbName }).
//                then(function(client) {
//                    test.ok(true);
//                  }).
//                catch(function(err) {
//                    test.ok(false, err);
//                    test.done();
//                  });
//
//        action.dropDatabase({ admin: false, execute: true, dbName: dbName }).
//                then(function() {
//                    test.ok(true);
//
//                    action.dbExists({ admin: true, dbName: dbName }).
//                        then(function(client) {
//                            test.ok(false, dbName + ' should not exist');
//                            test.done();
//                          }).
//                        catch(function(err) {
//                            test.ok(true, err);
//                            test.done();
//                          });
//                  }).
//                catch(function(err) {
//                    test.ok(false, err);
//                    test.done();
//                  });
//    },
//
//    'Should not barf if the database does not exist': function(test) {
//        test.expect(2);
//
//        // Make sure the database doesn't exist
//        var dbName = utils.getMongoDbName('no_such_database');
//        action.dbExists({ admin: true, dbName: dbName }).
//                then(function(client) {
//                    test.ok(false, dbName + ' should not exist. Why is it in the db?');
//                    test.done();
//                  }).
//                catch(function(err) {
//                    test.ok(true);
//                 });
//
//        action.dropDatabase({ admin: true, dbName: dbName }).
//                then(function() {
//                    test.ok(false, dbName + ' should not exist');
//                    test.done();
//                  }).
//                catch(function(err) {
//                    test.ok(true);
//                    test.done();
//                 });
//    },
//
//    'Do not delete the database specified without permission': function(test) {
//       test.expect(1);
//
//       var dbName = utils.getMongoDbName('existing_db');
//       action.dropDatabase({ admin: false, execute: false, dbName: dbName }).
//               then(function() {
//                   test.ok(false, 'Should not be able to drop database');
//                   test.done();
//                 }).
//               catch(function(err) {
//                   test.equal(err, 'You are not permitted to request or propose that action');
//                   test.done();
//                 });
//    },
//
//};

/**
 * registerAgent
 */
exports.registerAgent = {

    setUp: function(callback) {
    	try{
            var agent = new geboDb.registrantModel(
                            { name: 'dan', email: 'dan@example.com',
                              password: 'password123', admin: true,  
                              _id: new mongo.ObjectID('0123456789AB') });
            agent.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    callback();
                  });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    }, 

    'Add a new agent to the database if admin': function(test) {
        test.expect(4);
        geboDb.registrantModel.find({}, function(err, agents) {
                if (err) {
                  test.ok(false, err);
                  test.done();
                }
                test.equal(agents.length, 1); 

                var newAgent = {
                        name: 'yanfen',
                        email: 'yanfen@example.com',
                        password: 'password456',
                        admin: false,
                        _id: new mongo.ObjectID('123456789ABC')
                    };
                action.registerAgent({ admin: true }, { content: { newAgent: newAgent } }).
                    then(function(agent) {  
                        test.equal(agent.name, 'yanfen');
                        test.equal(agent.email, 'yanfen@example.com');
                        test.equal(agent.admin, false);
                        test.done();
                      });
          });
    },

    'Add a new agent to the database with execute permissions': function(test) {
        test.expect(4);
        geboDb.registrantModel.find({}, function(err, agents) {
                if (err) {
                  test.ok(false, err);
                  test.done();
                }
                test.equal(agents.length, 1); 

                var newAgent = {
                        name: 'yanfen',
                        email: 'yanfen@example.com',
                        password: 'password456',
                        admin: false,
                        _id: new mongo.ObjectID('123456789ABC')
                    };
                action.registerAgent({ admin: false, execute: true }, { content: { newAgent: newAgent } }).
                    then(function(agent) {  
                        test.equal(agent.name, 'yanfen');
                        test.equal(agent.email, 'yanfen@example.com');
                        test.equal(agent.admin, false);
                        test.done();
                      });
          });
    },

    'Do not add a new agent to the database without proper permissions': function(test) {
        test.expect(2);
        geboDb.registrantModel.find({}, function(err, agents) {
                if (err) {
                  test.ok(false, err);
                  test.done();
                }
                test.equal(agents.length, 1); 

                var newAgent = {
                        name: 'yanfen',
                        email: 'yanfen@example.com',
                        password: 'password456',
                        admin: false,
                        _id: new mongo.ObjectID('123456789ABC')
                    };
                action.registerAgent({ admin: false, execute: false }, { content: { newAgent: newAgent } }).
                    then(function(agent) {  
                        test.ok(false, 'I should not be able to add a new agent');
                        test.done();
                      }).
                    catch(function(err) {
                        test.equal(err, 'You are not permitted to request or propose that action');
                        test.done();
                      });
          });
    },

    'Do not overwrite an existing agent': function(test) {
        test.expect(1);
        var existingAgent = {
                name: 'dan',
                email: 'dan@example.com',
                password: 'password123',
                admin: true
            };
        action.registerAgent({ admin: false, execute: true }, { content: { newAgent: existingAgent } }).
           then(function(agent) {
                test.ok(false, 'Must not overwrite an existing agent');
                test.done();
             }).
           catch(function(err) {
               test.equal(err, 'That email address has already been registered');
               test.done();
             });
    },
};

/**
 * deregisterAgent
 */
exports.deregisterAgent = {

    setUp: function(callback) {
    	try{
            var agent = new geboDb.registrantModel(
                            { name: 'dan', email: 'dan@example.com',
                              password: 'password123', admin: true,  
                              _id: new mongo.ObjectID('0123456789AB') });
            agent.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    callback();
                  });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    }, 

    'Remove an agent from the database if an admin': function(test) {
        test.expect(2);

        action.deregisterAgent({ admin: true }, { content: { email: 'dan@example.com' } }).
            then(function(ack) {
                    test.equal(ack, 1);
                    geboDb.registrantModel.find({}, function(err, agents) {
                        if (err) {
                          test.ok(false, err);
                          test.done();
                        }
                        test.equal(agents.length, 0); 
                        test.done();
                      });
                  });
    },

    'Remove an agent from the database with execute permission': function(test) {
        test.expect(2);

        action.deregisterAgent({ admin: false, execute: true }, { content: { email: 'dan@example.com' } }).
            then(function(ack) {
                    test.equal(ack, 1);
                    geboDb.registrantModel.find({}, function(err, agents) {
                        if (err) {
                          test.ok(false, err);
                          test.done();
                        }
                        test.equal(agents.length, 0); 
                        test.done();
                      });
                  });
    },

    'Do not remove an agent without execute permission or admin status': function(test) {
        test.expect(1);

        action.deregisterAgent({ admin: false, execute: false }, { content: { email: 'dan@example.com' } }).
            then(function(ack) {
                    test.ok(false, 'I should not be allowed to deregister an agent'); 
                    test.done();
              }).
            catch(function(err) {
                    test.equal(err, 'You are not permitted to request or propose that action');
                    test.done();
              });
    },


    'Should not barf if agent does not exist': function(test) {
        test.expect(1);
        action.deregisterAgent({ admin: true }, { content: { email: 'nosuchagent@example.com' } }).
            then(function(ack) {
                    geboDb.registrantModel.find({}, function(err, agents) {
                        if (err) {
                          test.ok(false, err);
                          test.done();
                        }
                        test.equal(agents.length, 1); 
                        test.done();
                      });
                  });
    },
};

/**
 * friendo 
 */
exports.friendo = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a friendo for the registrant
             */
            var friendo = new agentDb.friendoModel({
                    name: 'john',
                    email: 'john@painter.com',
                    gebo: 'http://theirhost.com',
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            registrant.save(function(err) {
                    friendo.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        callback();
                      });
                  });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
     }, 

    'Add a new friendo to the database if permitted': function(test) {
        test.expect(4);
        var newFriend = {
                name: 'yanfen',
                email: 'yanfen@example.com',
                gebo: 'http://theirhost.com',
                myPrivateKey: 'some key',
            };
        action.friendo({ write: true }, { content: newFriend }).
            then(function(friendo) {  
                test.equal(friendo.name, 'yanfen');
                test.equal(friendo.email, 'yanfen@example.com');
                test.equal(friendo.gebo, 'http://theirhost.com');
 
                agentDb.friendoModel.find({}, function(err, friendos) {
                        if (err) {
                          test.ok(false, err);
                          test.done();
                        }
                        test.equal(friendos.length, 2); 
                        test.done();
                  });
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Do not add a new friendo to the database if not permitted': function(test) {
        test.expect(2);
        var newFriend = {
                name: 'yanfen',
                email: 'yanfen@example.com',
                gebo: 'http://theirhost.com',
            };
        action.friendo({ write: false }, { content: newFriend }).
            then(function(friendo) {  
                test.ok(false, 'Should not be allowed to add a new friendo');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You are not permitted to request or propose that action');
                agentDb.friendoModel.find({}, function(err, friendos) {
                        if (err) {
                          test.ok(false, err);
                          test.done();
                        }
                        test.equal(friendos.length, 1); 
                        test.done();
                  });
              });
    },

    'Update an existing friendo': function(test) {
        test.expect(3);
        var existingFriend = {
                    name: 'john',
                    email: 'john@painter.com',
                    gebo: 'http://someotherhost.com',
                };

        action.friendo({ write: true }, { content: existingFriend }).
                then(function(friendo) {
                    test.equal(friendo.name, 'john');
                    test.equal(friendo.email, 'john@painter.com');
                    test.equal(friendo.gebo, 'http://someotherhost.com');
                    test.done();
                  }).
                catch(function(err) {
                    test.ok(false, err);
                    test.done();
                  });
    },
};

/**
 * defriendo 
 */
exports.defriendo = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a friendo for the registrant
             */
            var friendo = new agentDb.friendoModel({
                    name: 'john',
                    email: 'john@painter.com',
                    gebo: 'http://theirhost.com',
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            registrant.save(function(err) {
                    friendo.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        callback();
                      });
                  });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
     }, 

    'Remove a friendo from the database if permitted': function(test) {
        test.expect(2);
        action.defriendo({ write: true }, { content: { email: 'john@painter.com' } }).
            then(function(ack) {  
                test.equal(ack, 1);

                agentDb.friendoModel.find({}, function(err, friendos) {
                        if (err) {
                          test.ok(false, err);
                          test.done();
                        }
                        test.equal(friendos.length, 0); 
                        test.done();
                  });

              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Do not remove a friendo from the database if not permitted': function(test) {
        test.expect(2);
        action.defriendo({ write: false }, { content: { email: 'john@painter.com' } }).
            then(function(friendo) {  
                test.ok(false, 'Should not be allowed to delete a friendo');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You are not permitted to request or propose that action');
                agentDb.friendoModel.find({}, function(err, friendos) {
                        if (err) {
                          test.ok(false, err);
                          test.done();
                        }
                        test.equal(friendos.length, 1); 
                        test.done();
                  });
              });
    },

    'Don\'t barf if the email provided matches no friendo': function(test) {
        test.expect(1);
        action.defriendo({ write: true }, { content: { email: 'yanfen@example.com' } }).
                then(function(ack) {
                    test.equal(ack, 0);
                    test.done();
                  }).
                catch(function(err) {
                    test.ok(false, err);
                    test.done();
                  });
    },
};

/**
 * grantAccess
 */
exports.grantAccess = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a friendo for the registrant
             */
            var friendo = new agentDb.friendoModel({
                    name: 'john',
                    email: 'john@painter.com',
                    gebo: 'http://theirhost.com',
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            friendo.permissions.push({ resource: 'someCoolCollection' });

            registrant.save(function(err) {
                friendo.save(function(err) {
                    if (err) {
                        console.log(err);
                      }
                      callback();
                    });
                  });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
    }, 

    'Grant a friendo access to a resource he didn\'t have access to before': function(test) {
        test.expect(6);
        action.grantAccess({ write: true, resource: 'friendos' },
                        { action: 'grantAccess',
                          recipient: 'dan@example.com',
                          content: {
                              friendo: 'john@painter.com',
                              permission: {
                                      resource: 'someNewCollection',
                                      read: 'true',
                                      write: 'true',
                                      execute: 'false'},
                            },
                        }).
            then(function(friendo) {
                var index = utils.getIndexOfObject(friendo.permissions, 'resource', 'someNewCollection');
                test.equal(index, 1);
                test.equal(friendo.permissions.length, 2);
                test.equal(friendo.permissions[index].resource, 'someNewCollection');
                test.equal(friendo.permissions[index].read, true);
                test.equal(friendo.permissions[index].write, true);
                test.equal(friendo.permissions[index].execute, false);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Change a friendo\'s access level to a resource': function(test) {
        test.expect(6);
        action.grantAccess({ write: true, resource: 'friendos' },
                        { action: 'grantAccess',
                          recipient: 'dan@example.com',
                          content: {
                              friendo: 'john@painter.com',
                              permission: {
                                      resource: 'someCoolCollection',
                                      read: 'false',
                                      write: 'false',
                                      execute: 'true'},
                            }
                        }).
            then(function(friendo) {
                var index = utils.getIndexOfObject(friendo.permissions, 'resource', 'someCoolCollection');
                test.equal(index, 0);
                test.equal(friendo.permissions.length, 1);
                test.equal(friendo.permissions[index].resource, 'someCoolCollection');
                test.equal(friendo.permissions[index].read, false);
                test.equal(friendo.permissions[index].write, false);
                test.equal(friendo.permissions[index].execute, true);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Don\'t allow access without write or admin permission': function(test) {
        test.expect(1);
        action.grantAccess({ read: true, resource: 'friendos' },
                        { action: 'grantAccess',
                          recipient: 'dan@example.com',
                          content: {
                              friendo: 'john@painter.com',
                              permission: {
                                      resource: 'someCoolCollection',
                                      read: 'false',
                                      write: 'false',
                                      execute: 'true'},
                            },
                        }).
            then(function(friendo) {
                test.ok(false, 'Shouldn\'t get here');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You are not permitted to request or propose that action');
                test.done();
              });
    },

};

/**
 * certificate 
 */
exports.certificate = {

    setUp: function(callback) {
        try {
            var registrant = new geboDb.registrantModel({
                    name: 'Dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                callback();
              });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
    }, 

    'Return a public certificate and add a key to the collection': function(test) {
        test.expect(5);
        action.certificate({ write: true, resource: 'keys' },
                           { content: { email: 'yanfen@example.com', gebo: 'https://foreigngebo.com' } }).
            then(function(certificate) {
                test.equal(certificate.search('-----BEGIN CERTIFICATE-----'), 0);
                test.equal(certificate.search('-----END CERTIFICATE-----'), 365);

                // Make sure the certificate was saved to the database
                agentDb.keyModel.findOne({ email: 'yanfen@example.com' }, function(err, key) {
                    if (err) {
                      console.log(err);
                      test.ok(false, err);
                    }
                    test.equal(key.private.search('-----BEGIN RSA PRIVATE KEY-----'), 0);
                    test.equal(key.email, 'yanfen@example.com');
                    test.equal(key.public, certificate);
                    test.done();
                  });
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Add an agent to the friendo collection': function(test) {
        test.expect(5);
        action.certificate({ write: true, resource: 'keys' },
                           { content: { email: 'yanfen@example.com', gebo: 'https://foreigngebo.com' } }).
            then(function(certificate) {
                test.equal(certificate.search('-----BEGIN CERTIFICATE-----'), 0);
                test.equal(certificate.search('-----END CERTIFICATE-----'), 365);

                // Make sure the certificate was saved to the database
                agentDb.friendoModel.findOne({ email: 'yanfen@example.com' }, function(err, friendo) {
                    if (err) {
                      console.log(err);
                      test.ok(false, err);
                    }
                    test.equal(friendo.name, 'Innominate');
                    test.equal(friendo.email, 'yanfen@example.com');
                    test.equal(friendo.gebo, 'https://foreigngebo.com');
                    test.done();
                  });
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },
    
    'Overwrite an existing agent and key': function(test) {
        agentDb.friendoModel.find(function(err, friendos) {
            if (err) {
              console.log(err);
            }

            test.equal(friendos.length, 0);
            agentDb.keyModel.find(function(err, keys) {
                if (err) {
                  console.log(err);
                }

                test.equal(keys.length, 0);
                action.certificate({ write: true, resource: 'keys' },
                                   { content: { email: 'yanfen@example.com', gebo: 'https://foreigngebo.com' } }).
                    then(function(certificate) {
                        test.equal(certificate.search('-----BEGIN CERTIFICATE-----'), 0);
                        test.equal(certificate.search('-----END CERTIFICATE-----'), 365);

                        agentDb.friendoModel.find(function(err, friendos) {
                            if (err) {
                              console.log(err);
                            }

                            test.equal(friendos.length, 1);
                            agentDb.keyModel.find(function(err, keys) {
                                if (err) {
                                  console.log(err);
                                }

                                test.equal(keys.length, 1);
                                action.certificate({ write: true, resource: 'keys' },
                                                   { content: { email: 'yanfen@example.com', gebo: 'https://foreigngebo.com' } }).
                                    then(function(certificate) {
                                        test.equal(certificate.search('-----BEGIN CERTIFICATE-----'), 0);
                                        test.equal(certificate.search('-----END CERTIFICATE-----'), 365);
                                        agentDb.friendoModel.find(function(err, friendos) {
                                            if (err) {
                                              console.log(err);
                                            }
                    
                                            test.equal(friendos.length, 1);
                                            agentDb.keyModel.find(function(err, keys) {
                                                if (err) {
                                                  console.log(err);
                                                }
                    
                                                test.equal(keys.length, 1);
                                                test.done();
                                            });
                                          });
                                      }).
                                    catch(function(err) {
                                        console.log(err);
                                        test.ok(false, err);
                                        test.done();
                                      });
                              });
                          });
                      }).
                    catch(function(err) {
                        console.log(err);
                        test.ok(false, err);
                        test.done();
                      });
              });
          });
    },

    'Don\'t allow access without write or admin permission': function(test) {
        test.expect(1);
        action.certificate({ read: true, resource: 'keys' },
                           { content: { email: 'yanfen@example.com', gebo: 'https://foreigngebo.com' } }).
            then(function(certificate) {
                test.ok(false, 'Shouldn\'t get here');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You are not permitted to request or propose that action');
                test.done();
              });
    },
};


/**
 * transformId
 */
exports.transformId = {

    'It should convert a 12 char hex string to an ObjectId': function(test) {
        test.expect(2);
        var id = action.transformId('0123456789AB');
        test.ok(id instanceof mongo.ObjectID);
        test.equal(id, '303132333435363738394142');
        test.done();
    },

    'It should convert a 24 char hex string to an ObjectId': function(test) {
        test.expect(2);
        var id = action.transformId('0123456789abcdefABCDEF01');
        test.ok(id instanceof mongo.ObjectID);
        test.equal(id, '0123456789abcdefabcdef01');
        test.done();
    },

    'It should leave a non-hex string alone': function(test) {
        test.expect(2);
        var id = action.transformId('This is a non-hex string');
        test.ok(typeof id, 'string');
        test.equal(id, 'This is a non-hex string');
        test.done();
    },
};

/**
 * lsCollections
 */
exports.lsCollections = {

    setUp: function(callback) {
        action.save({ resource: cname,
                      admin: true },  
                    { content: { data: { some: 'data'} } }).
            then(function(ack) {
                callback();
              }).
            catch(function(err) {
                console.log(err);
              });
    },

    tearDown: function(callback) {
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    'Return a list of relevant collections stored in the gebo database an authorized user': function(test) {
        test.expect(2);
        action.lsCollections({ read: true },
                             { sender: 'dan@example.com' }).
            then(function(collections) {
                test.equal(collections.length, 1);
                test.equal(collections[0], cname);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return a list of relevant collections stored in the gebo database to an admin': function(test) {
        test.expect(2);
        action.lsCollections({ admin: true },
                             { sender: 'admin@example.com' }).
            then(function(collections) {
                test.equal(collections.length, 1);
                test.equal(collections[0], cname);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return a list of all collections stored in the gebo database to an authorized user': function(test) {
        test.expect(3);
        action.lsCollections({ read: true },
                             { sender: 'john@painter.com', content: { flag: 'all' } }).
            then(function(collections) {
                test.equal(collections.length, 2);
                test.ok(collections.indexOf(cname) > -1);
                test.ok(collections.indexOf('system.indexes') > -1);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, 'Shouldn\'t get here');
                test.done();
              });
    },

    'Do not return a list of relevant collections stored in the gebo database to an unauthorized user': function(test) {
        test.expect(1);
        action.lsCollections({}, { sender: 'richard@construction.com' }).
            then(function(collections) {
                test.ok(false, 'Shouldn\'t get here');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You are not permitted to request or propose that action');      
                test.done();
              });
    },

    'Don\'t barf if the content field is set without the flag property': function(test) {
        test.expect(2);
        action.lsCollections({ read: true },
                             { sender: 'john@painter.com', content: { resource: 'thisShouldNotHappenAnyway' } }).
            then(function(collections) {
                test.equal(collections.length, 1);
                test.equal(collections[0], cname);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },
};
