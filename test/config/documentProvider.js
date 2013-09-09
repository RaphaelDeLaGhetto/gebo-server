var documentProvider = require('../../config/documentProvider'),
    config = require('../../config/config'),
    utils = require('../../lib/utils'),
    DatabaseCleaner = require('database-cleaner'),
    databaseCleaner = new DatabaseCleaner('mongodb'),
    mongo = require('mongodb'),
    q = require('q');


var cname = 'unitTest';
exports.testConnection = {

    setUp: function (callback) {
    	try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db(config.mongo.db, server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	this.collection = new mongo.Collection(client, cname);
    	    	this.collection.remove({}, function(err) {
    		    callback();
    		});
             });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        this.db.close();
        callback();
    },
    

    'Connect to Mongo': function (test) {
        test.expect(2);
        collection.insert({ foo: 'bar' }, function(err,docs) {
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
 * Get the app's collection
 */
exports.getCollection = {

   setUp: function (callback) {
    	try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db('dan_at_email_dot_com',
                            server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	this.collection = new mongo.Collection(client, cname);
                this.collection.insert({
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
        this.db.dropDatabase(function(err) { 
            callback();
        });
    },

    'Return a mongo collection object': function (test) {
        test.expect(2);
        documentProvider.getCollection(
                        utils.getMongoDbName('dan@email.com'),
                        utils.getMongoCollectionName(cname)).
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

};

/**
 * Save to the database
 */
exports.save = {

    setUp: function (callback) {
    	try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db('dan_at_email_dot_com',
                            server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	this.collection = new mongo.Collection(client, cname);
                this.collection.insert({
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
        this.db.dropDatabase(function(err) { 
            callback();
        });
    },
 
   'Do not save to a non-existent database': function (test) {
        test.expect(1);
        
        documentProvider.save(
                        utils.getMongoDbName('yanfen@email.com'),
                        'some_collection',
                        { data: 'junk' }).
                then(
                    function(docs) {
                        console.log(docs);       
                        test.ok(false, 'This database shouldn\'t exist. Delete manually');
                        test.done();
                    }).
                catch(
                    function(err) {
                        test.ok(err);
                        test.done();
                    }).done();
   }, 

   'Save to existing database': function (test) {
        test.expect(2);

        documentProvider.save(
                        utils.getMongoDbName('dan@email.com'),
                        'some_collection',
                        { data: 'junk' }).
                then(
                    function(docs) {
                        test.ok(docs);
                        test.equal(docs.data, 'junk');
                        test.done();
                    }).
                catch(
                    function(err) {
                        console.log('Error???? ' + err);       
                        test.ifError(err);
                        test.done();
                    });
   }, 

   'Update existing document': function(test) {
        test.expect(9);

        // Retrieve the existing document
        documentProvider.cp(
                        utils.getMongoDbName('dan@email.com'),
                        cname, '0123456789AB').
            then(
                function(docs) {
                    test.ok(docs, 'Docs successfully copied');
                    test.equal(docs.length, 1);
                    test.equal(docs[0].name, 'dan');
                    test.equal(docs[0].occupation, 'Batman');
                    docs[0].occupation = 'AI Practitioner';

                    return documentProvider.save(
                        utils.getMongoDbName('dan@email.com'),
                        cname, docs[0]);
                }).
            then(
                function(ack) {
                    test.ok(ack, 'Doc successfully saved');
                  // test.done();
                    return documentProvider.cp(
                            utils.getMongoDbName('dan@email.com'),
                            cname, '0123456789AB');
                }).
            then(
                function(docs) {
                    test.ok(docs, 'Retrieved the saved doc again');
                    test.equal(docs.length, 1);
                    test.equal(docs[0].name, 'dan');
                    test.equal(docs[0].occupation, 'AI Practitioner');
                    test.done();
                }).
            catch(
                function(err) {
                    console.log(err);
                    test.ifError(err);        
                    test.done();
                });
    }
};

/**
 * Retrieve document from the database
 */
exports.dbExists = {

    setUp: function (callback) {
    	try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db('existing_database', server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	this.collection = new mongo.Collection(client, cname);
                this.collection.insert({ name: 'dan', occupation: 'Batman' }, function() {
                    callback();
                });
            });
    	} catch(e) {
            console.dir(e);
    	}
    },
    
    tearDown: function (callback) {
        // Lose the database for next time
        this.db.dropDatabase(function(err) { 
            callback();
        });
    },
 
   'Return an error if the database does not exist': function (test) {
        test.expect(1);

        documentProvider.dbExists('non_existent_database').
                        then(
                            function() {
                                // Shouldn't get here
                                console.log('Shouldn\'t get here!!!');
                                test.ok(false, 'Shouldn\'t get here!!!');
                                test.done();
                            }).
                        catch(
                            function(err) {
                                test.ok(err, 'An error should be thrown');
                                test.done();
                            });
   }, 

   'Return a promise if the database does exist': function (test) {
        test.expect(1);

        documentProvider.dbExists('existing_database').
                then(
                    function() {
                        test.ok(true, 'Verified the database exists');
                        test.done();
                    }).
                catch(
                    function(err) {
                        // Shouldn't get here
                        test.ok(false, 'Shouldn\'t get here!!!');
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
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db('existing_database', server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	this.collection = new mongo.Collection(client, cname);
                this.collection.insert({
                        _id: new mongo.ObjectID('0123456789AB'),
                        name: 'dan',
                        occupation: 'Batman'
                    },
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
        this.db.dropDatabase(function(err) { 
            callback();
        });
    },
 
   'Do not copy from non-existent database': function (test) {
        test.expect(1);
        documentProvider.cp(
                        utils.getMongoDbName('no_one@not-here.com'),
                        cname, '0123456789AB').
            then(
                function() {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                }).
            catch(
                function(err) {
                    test.ok(err, 'An error should be thrown');
                    test.done();
                });
   }, 

   'Copy from existing database': function (test) {
        test.expect(3);
        documentProvider.cp(
                        utils.getMongoDbName('existing_database'),
                        cname, '0123456789AB').
             then(
                function(docs) {
                    test.ok(docs, 'Document copied');
                    test.equal(docs[0].name, 'dan');
                    test.equal(docs[0].occupation, 'Batman');
                    test.done();
                }).
            catch(
                function(err) {
                   // Shouldn't get here
                    console.log('Shouldn\'t get here!!!');
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
 
   }, 


};

/**
 * Copy a document to a new profile 
 */
//exports.copy = {
//
//   'Copy to a non-existent database': function (test) {
//        test.expect(1);
//
//        test.done();
//   }, 
//
//   'Copy to existing database': function (test) {
//        test.expect(1);
//
//        test.done();
//   }, 
//
//};

/**
 * Delete a document from the profile 
 */
exports.rm = {

    setUp: function (callback) {
    	try{
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db('existing_database', server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	this.collection = new mongo.Collection(client, cname);
                this.collection.insert([
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
        this.db.dropDatabase(function(err) { 
            callback();
        });
    },

   'Do not delete from a non-existent database': function (test) {
        test.expect(1);

        // Retrieve the existing document
        documentProvider.rm(
                        utils.getMongoDbName('does_not_exist'),
                        cname, '0123456789AB').
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

   'Do not delete from a non-existent collection': function (test) {
        test.expect(1);

        // Retrieve the existing document
        documentProvider.rm(
                        utils.getMongoDbName('existing_database'),
                        'NoSuchCollection', '0123456789AB').
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

        documentProvider.rm(
                        utils.getMongoDbName('existing_database'),
                        cname, 'NoSuchDocABC').
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


   'Delete from an existing database': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        documentProvider.rm(
                        utils.getMongoDbName('existing_database'),
                        cname, '123456789ABC').
            then(
                function() {
                    test.ok(true, 'The doc has been deleted, I think');
                    collection.count(function(err, count) {
                        test.equal(count, 1);
                        test.done();
                    });
                }).
            catch(
                function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
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
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db('existing_database', server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
        	    this.collection = new mongo.Collection(client, cname);
                this.collection.insert([
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
        this.db.dropDatabase(function(err) { 
            callback();
        });
    },

   'Do not delete from a non-existent database': function (test) {
        test.expect(1);

        // Retrieve the existing document
        documentProvider.rmdir(
                        utils.getMongoDbName('does_not_exist'), 
                        cname).
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

   'Do not delete a non-existent collection': function (test) {
        test.expect(1);

        // Retrieve the existing document
        documentProvider.rmdir(
                        utils.getMongoDbName('existing_database'), 
                        'NoSuchCollection').
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

   'Delete collection from an existing database': function (test) {
        test.expect(3);

        collection.count(function(err, count) {
            test.equal(count, 2);
        });

        documentProvider.rmdir(
                        utils.getMongoDbName('existing_database'), 
                        cname).
            then(
                function() {
                    test.ok(true, 'The doc has been deleted, I think');
                    collection.count(function(err, count) {
                        test.equal(count, 0);
                        test.done();
                    });
                }).
            catch(
                function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
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
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.db = new mongo.Db('existing_database', server, config.mongo.clientOptions);
            this.db.open(function (err, client) {
                if (err) {
                  throw err;
                }
                this.collection = new mongo.Collection(client, cname);
                this.collection.insert([
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
        this.db.dropDatabase(function(err) { 
            callback();
        });
    },

    'Return a list of documents contained in the collection': function(test) {
        test.expect(3);
        documentProvider.ls('existing_database', cname).
            then(function(list) {
                test.equal(list.length, 2);
                test.equal(list[0].name, 'dan');
                test.equal(list[1].name, 'yanfen');
                test.done();
            }).
            catch(
                function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
    },

    'Return an empty list from an empty collection': function(test) {
        test.expect(1);
        documentProvider.ls('existing_database', 'no_such_collection').
            then(function(list) {
                test.equal(list.length, 0);
                test.done();
            }).
            catch(
                function(err) {
                    // Shouldn't get here
                    test.ok(false, 'Shouldn\'t get here!!!');
                    test.done();
                 });
    },
};

