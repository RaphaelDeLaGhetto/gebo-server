/**
 * This ensures that a connection is made to the
 * test databases
 */
var mongooseConnection = require('gebo-mongoose-connection').get(true);
    basic = require('gebo-basic-action'),
    nativeMongoConnection = basic.nativeMongoConnection.get(true, function(conn){});

var utils = require('gebo-utils');

var nconf = require('nconf');
nconf.file({ file: 'gebo.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testEmail'));

var _gebo = require('..')(true),
    geboDb = new _gebo.schemata.gebo(),
    agentDb = new _gebo.schemata.agent();

/**
 * The following are redundant tests to ensure that the critical 
 * basic agent actions, as defined by the gebo-basic-action module,
 * actually work. 
 */
var fs = require('fs-extra'),
    mongo = require('mongodb'),
    GridStore = mongo.GridStore;
var db, collection;

var cname = 'unitTest';

/**
 * Get the gebo collection specified
 */
exports.getCollection = {

   setUp: function (callback) {
    	try {
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

    'Return the requested collection object as admin': function (test) {
        test.expect(2);
        _gebo.actions.getCollection({ resource: cname,
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
        _gebo.actions.getCollection({ resource: cname,
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
        _gebo.actions.getCollection({ resource: cname,
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
 * 2014-8-13
 * Adapted from http://mongodb.github.io/node-mongodb-native/api-generated/gridstore.html
 */
exports.save = {

    setUp: function (callback) {
    	try{
            /**
             * Write a file to /tmp
             */
            fs.createReadStream('./test/files/pdf.pdf').pipe(fs.createWriteStream('/tmp/pdf0.pdf'));

            var server = new mongo.Server('localhost', 27017, {});

            db = new mongo.Db(TEST_DB, server, { safe: true });
            db.open(function (err, client) {
                if (err) {
                  console.log(err);
                }
        	    collection = new mongo.Collection(client, 'someCollection');

                collection.insert({
                        _id: new mongo.ObjectID('0123456789AB'), 
                        name: 'dan',
                        occupation: 'Batman'
                    }, function() {
                        callback();
                    });
              });
    	}
        catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
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

   'Save file to file collection and JSON with fileId to collection with permission': function (test) {
        test.expect(8);

        _gebo.actions.save({ resource: 'someCollection',
                             write: true },
                           { content: { data: { junk: 'I like to move it move it' } },
                             file: {
                                   path: '/tmp/pdf0.pdf',
                                   name: 'pdf0.pdf',
                                   type: 'application/pdf',
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
                        var fileSize = fs.statSync('/tmp/pdf0.pdf').size;
                        var data = fs.readFileSync('/tmp/pdf0.pdf');

                        GridStore.read(db, docs.fileId, function(err, fileData) {
                            if (err) {
                              console.log(err);
                              test.ok(false, err);
                              test.done();
                            }
                            test.equal(data.toString('base64'), fileData.toString('base64')); 
                            test.equal(data.length, fileData.length); 

                            // Make sure the associated collection is stored in the file's metadata
                            db.collection('fs.files').
                                find({ _id: docs.fileId }).
                                toArray(function(err, files) {
                                    test.equal(files[0].metadata.collection, 'someCollection');
                                    test.equal(files[0].contentType, 'application/pdf');
                                    test.done();
                                  });
                          });
                    }).
                catch(function(err) {
                        console.log('Error???? ' + err);       
                        test.ifError(err);
                        test.done();
                    });
   }, 

   'Save file with no associated collection': function (test) {
        test.expect(5);

        _gebo.actions.save({ resource: 'fs',
                             write: true },
                           { file: {
                                   path: '/tmp/pdf0.pdf',
                                   name: 'pdf0.pdf',
                                   type: 'application/pdf',
                                   size: 21,
                             }
                  }).
                then(function(fileId) {
                        // A saved file (with no collection) returns the fileId
                        test.ok(fileId);

                        // Make sure the file model is saved
                        var fileSize = fs.statSync('/tmp/pdf0.pdf').size;
                        var data = fs.readFileSync('/tmp/pdf0.pdf');

                        GridStore.read(db, fileId, function(err, fileData) {
                            if (err) {
                              console.log(err);
                              test.ok(false, err);
                            }
                            test.equal(data.toString('base64'), fileData.toString('base64')); 
                            test.equal(data.length, fileData.length); 

                            // Make sure the associated collection (fs in this case) is stored in the file's metadata
                            db.collection('fs.files').
                                find({ _id: fileId }).
                                toArray(function(err, files) {
                                    test.equal(files[0].metadata.collection, 'fs');
                                    test.equal(files[0].contentType, 'application/pdf');
                                    test.done();
                                  });
                          });
                    }).
                catch(function(err) {
                        console.log('Error???? ' + err);       
                        test.ifError(err);
                        test.done();
                    });
   }, 

   'Save JSON with no file to existing database as admin': function (test) {
        test.expect(3);

        _gebo.actions.save({ resource: cname,
                             admin: true },
                           { content: { data: { junk: 'I like to move it move it' } } }).
                then(function(docs) {
                        test.ok(docs);
                        // If it's already saved, it doesn't return
                        // the mongo ID
                        test.equal(docs.junk, 'I like to move it move it'); test.ok(docs._id);
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
        _gebo.actions.cp({ resource: 'someCollection',
                           admin: true },
                         { content: { id: '0123456789AB' } }).
            then(function(docs) {
                    test.ok(docs, 'Docs successfully copied');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'Batman');
                    docs.occupation = 'AI Practitioner';
                    return _gebo.actions.save(
                            { resource: 'someCollection',
		              admin: true },
                            { content: { data: docs } });
                }).
            then(function(ack) {
                    test.ok(ack, 'Doc successfully saved');
                    test.equal(ack, '1');
                    return _gebo.actions.cp(
                            { resource: 'someCollection',
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

        _gebo.actions.save({ resource: 'someCollection',
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
        _gebo.actions.cp({ resource: 'someCollection',
                           admin: false,
                           read: true,
                           write: true },
                         { content: { id: '0123456789AB' } }).
            then(function(docs) {
                    test.ok(docs, 'Docs successfully copied');
                    test.equal(docs.name, 'dan');
                    test.equal(docs.occupation, 'Batman');
                    docs.occupation = 'AI Practitioner';
                    return _gebo.actions.save(
                            { resource: 'someCollection',
                              admin: false,
                              read: true,
                              write: true },
                            { content: { data: docs } });
                }).
            then(function(ack) {
                    test.ok(ack, 'Doc successfully saved');
                    test.equal(ack, '1');
                    return _gebo.actions.cp(
                            { resource: 'someCollection',
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
        
        _gebo.actions.save({ resource: 'someCollection',
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
 * Copy a file or a document from the database
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
 
   'Copy from existing database as admin': function (test) {
        test.expect(3);
        _gebo.actions.cp({ resource: cname,
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
        _gebo.actions.cp({ resource: cname,
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
        _gebo.actions.cp({ resource: cname,
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
        _gebo.actions.cp({ resource: cname,
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
        _gebo.actions.cp({ resource: cname,
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
        _gebo.actions.cp({ 
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

   'Return a file stored in the database': function(test) {
        test.expect(8);

        // Save a file to the DB
        fs.writeFileSync('/tmp/gebo-server-save-test-1.txt', 'Word to your mom');
        var savedFile = fs.readFileSync('/tmp/gebo-server-save-test-1.txt');
        _gebo.actions.save({ resource: cname,
                             write: true },
                           { content: { data: {
                                               _id: new mongo.ObjectID('0123456789AB'),
                                               name: 'dan',
                                               occupation: 'Vigilante crime fighter'
                                           },
                                      },
                             file: {
                                   path: '/tmp/gebo-server-save-test-1.txt',
                                   name: 'gebo-server-save-test-1.txt',
                                   type: 'text/plain',
                                   size: 16,
                             }
                  }).
                then(function(ack) {
                        test.ok(ack);

                        // Since the save call updated an existing record, a copy
                        // of the document was not returned. Copy the file just
                        // saved to get the fileId
                        _gebo.actions.cp({ resource: cname,
                                           admin: false,
                                           read: true },
                                         { content: { id: '0123456789AB' } }).
                             then(function(doc) {
                                    test.ok(doc, 'File copied');

                                    // Copy the saved file back from the DB
                                    test.ok(doc.fileId instanceof mongo.ObjectID);
                                    _gebo.actions.cp({ resource: 'fs',
                                                       admin: false,
                                                       read: true },
                                                     { content: { id: doc.fileId } }).
                                         then(function(file) {
                                                test.equal(file.filename, 'gebo-server-save-test-1.txt');
                                                test.equal(file.contentType, 'text/plain');
                                                test.equal(file.length, 16);
                                                test.equal(file.metadata.collection, cname);

                                                // Make sure I get the file contents back
                                                var fileContents = '';
                                                var stream = file.stream(true);
                                                stream.on('data', function(chunk) {
                                                    fileContents += chunk;
                                                  });
                                                stream.on('end', function() {
                                                    test.equal(fileContents, savedFile);
                                                    test.done();
                                                  });
                                            }).
                                        catch(function(err) {
                                                // Shouldn't get here
                                                test.ok(false, err); 
                                                test.done();
                                             });
                              }).
                            catch(function(err) {
                                    // Shouldn't get here
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
        fs.removeSync('docs/someCollection');
        fs.removeSync('docs/save');
        fs.removeSync('docs/unitTest');


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

   'Do not delete from a non-existent collection': function (test) {
        test.expect(1);

        _gebo.actions.rm({ resource: 'NoSuchCollection',
                           admin: true },
                         { content: { id: '0123456789AB' } }).
            then(
                function(results) {
                    test.equal(results.error, 'Collection: NoSuchCollection does not exist');        
                    test.done();
                }).
            catch(
                function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                });
   }, 

   'Do not delete non-existent document': function (test) {
        test.expect(1);

        _gebo.actions.rm({ resource: cname,
                           admin: true },
                         { content: { id: 'NoSuchDocABC' } }).
            then(
                function(results) {
                    test.equal(results.error, 'Could not delete document: NoSuchDocABC');        
                    test.done();
                }).
            catch(
                function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                });
   }, 

   'Delete from an existing database as admin': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        _gebo.actions.rm({ resource: cname,
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

        _gebo.actions.rm({ resource: cname,
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

        _gebo.actions.rm({ resource: cname,
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
        test.expect(3);

        // Save a file with an object
        _gebo.actions.save({ resource: 'someCollection',
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

                        // Remove
                        _gebo.actions.rm({ resource: 'someCollection',
                                           admin: false,
                                           write: true },
                                         { content: { id: docs._id } }).
                            then(function() {
                                    test.ok(true, 'The doc has been deleted, I think');

                                    // Make sure the associated collection is stored in the file's metadata
                                    db.collection('fs.files').
                                        findOne({ _id: docs.fileId }, function(err, file) {
                                            test.equal(file, null);
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

   'Do not delete a non-existent collection': function (test) {
        test.expect(1);

        _gebo.actions.rmdir({ resource: 'NoSuchCollection',
                              admin: true,
                              execute: true }).
            then(function(results) {
                    test.equal(results.error, 'Collection: NoSuchCollection does not exist');        
                    test.done();
                }).
            catch(function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                });
   }, 

   'Delete collection from an existing database as admin': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        _gebo.actions.rmdir({ resource: cname,
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

        _gebo.actions.rmdir({ resource: cname,
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

        _gebo.actions.rmdir({ resource: cname,
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
        _gebo.actions.ls({ resource: cname, read: true }).
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
        _gebo.actions.ls({ resource: cname, read: true },
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
        _gebo.actions.ls({ resource: 'no_such_collection', read: true }).
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
        _gebo.actions.ls({ resource: cname, read: false }).
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
        _gebo.actions.ls({ resource: cname, read: true },
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
        _gebo.actions.ls({ resource: cname, read: true },
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
        _gebo.actions.ls({ resource: cname, read: true },
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
        _gebo.actions.ls({ resource: cname, read: true },
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
                _gebo.actions.registerAgent({ admin: true }, { content: { newAgent: newAgent } }).
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
                _gebo.actions.registerAgent({ admin: false, execute: true }, { content: { newAgent: newAgent } }).
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
                _gebo.actions.registerAgent({ admin: false, execute: false }, { content: { newAgent: newAgent } }).
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
        _gebo.actions.registerAgent({ admin: false, execute: true }, { content: { newAgent: existingAgent } }).
           then(function(agent) {
                test.equal(agent.error, 'That email address has already been registered');
                test.done();
             }).
           catch(function(err) {
               test.ok(false, 'An error message should have been returned above');
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

        _gebo.actions.deregisterAgent({ admin: true }, { content: { email: 'dan@example.com' } }).
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

        _gebo.actions.deregisterAgent({ admin: false, execute: true }, { content: { email: 'dan@example.com' } }).
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

        _gebo.actions.deregisterAgent({ admin: false, execute: false }, { content: { email: 'dan@example.com' } }).
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
        _gebo.actions.deregisterAgent({ admin: true }, { content: { email: 'nosuchagent@example.com' } }).
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
        _gebo.actions.friendo({ write: true }, { content: newFriend }).
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
        _gebo.actions.friendo({ write: false }, { content: newFriend }).
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

        _gebo.actions.friendo({ write: true }, { content: existingFriend }).
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
        _gebo.actions.defriendo({ write: true }, { content: { email: 'john@painter.com' } }).
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
        _gebo.actions.defriendo({ write: false }, { content: { email: 'john@painter.com' } }).
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
        _gebo.actions.defriendo({ write: true }, { content: { email: 'yanfen@example.com' } }).
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
        _gebo.actions.grantAccess({ write: true, resource: 'friendos' },
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
        _gebo.actions.grantAccess({ write: true, resource: 'friendos' },
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
        _gebo.actions.grantAccess({ read: true, resource: 'friendos' },
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
        _gebo.actions.certificate({ write: true, resource: 'keys' },
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
        _gebo.actions.certificate({ write: true, resource: 'keys' },
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
                _gebo.actions.certificate({ write: true, resource: 'keys' },
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
                                _gebo.actions.certificate({ write: true, resource: 'keys' },
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
        _gebo.actions.certificate({ read: true, resource: 'keys' },
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
        var id = _gebo.actions.transformId('0123456789AB');
        test.ok(id instanceof mongo.ObjectID);
        test.equal(id, '303132333435363738394142');
        test.done();
    },

    'It should convert a 24 char hex string to an ObjectId': function(test) {
        test.expect(2);
        var id = _gebo.actions.transformId('0123456789abcdefABCDEF01');
        test.ok(id instanceof mongo.ObjectID);
        test.equal(id, '0123456789abcdefabcdef01');
        test.done();
    },

    'It should leave a non-hex string alone': function(test) {
        test.expect(2);
        var id = _gebo.actions.transformId('This is a non-hex string');
        test.ok(typeof id, 'string');
        test.equal(id, 'This is a non-hex string');
        test.done();
    },

    'It should leave an ObjectId alone': function(test) {
        test.expect(2);
        var id = _gebo.actions.transformId(new mongo.ObjectID('0123456789abcdefABCDEF01'));
        test.ok(id instanceof mongo.ObjectID);
        test.equal(id, '0123456789abcdefabcdef01');
        test.done();
    },
};

/**
 * lsCollections
 */
exports.lsCollections = {

    setUp: function(callback) {
        _gebo.actions.save({ resource: cname,
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
        _gebo.actions.lsCollections({ read: true },
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
        _gebo.actions.lsCollections({ admin: true },
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
        _gebo.actions.lsCollections({ read: true },
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
        _gebo.actions.lsCollections({}, { sender: 'richard@construction.com' }).
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
        _gebo.actions.lsCollections({ read: true },
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
