var documentProvider = require('../../config/documentProvider'),
    config = require('../../config/config'),
    DatabaseCleaner = require('database-cleaner'),
    databaseCleaner = new DatabaseCleaner('mongodb'),
    mongo = require('mongodb'),
    q = require('q');


var cname = 'unitTest';
module.testConnection = {

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
//        databaseCleaner.clean(this.db, function() {
//            console.log(this.db);
//            console.log('Done');
//            // I don't think this call is necessary. The cleaner
//            // appears to delete the this.db object
//            //this.db.close();
//    	    callback();
//        });
        this.db.close();
        callback();
    },
    

    'Connect to Mongo' : function (test) {
        test.expect(2);
        this.collection.insert({ foo: 'bar' }, function(err,docs) {
            if (err) {
              test.ok(false, err);
            }
            test.ok(true, 'Inserted doc with no err.');
            this.collection.count(function(err, count) {
                test.equal(1, count, 'There is only one doc in the collection');
                test.done();
            });
        });
    },
};


/**
 * Open the given databse
 */

exports.openDb = {
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
 
    'Open non-existent database': function (test) {
        test.expect(4);
//        var deferred = q.defer();

        // Get a promise
        documentProvider.openDb('non_existent_db').then(function(client) {

        // Execute the promise
//        deferred.promise.then(function(db) {

            client.collectionNames(function(err, names) {
                    
                test.ifError(err);
                
                // It's a new DB, there are no collections yet
                test.deepEqual(names, []);

                // Create a new collection and make sure it takes data
                client.createCollection('new_collection', function(err, collection) {
                    collection.insert({ foo: 'bar' }, function(data) {

                        client.collectionNames(function(err2, names2) {
                            
                            test.ifError(err2);

                            // The new collection exists
                            test.deepEqual(names2,
                                    [ 
                                      { name: 'non_existent_db.new_collection',
                                              options: { create: 'new_collection' } },
                                      { name: 'non_existent_db.system.indexes' } ]);

                            // Lose the database for next time
                            client.dropDatabase(function(err) { 
                                test.done();
                            });
                       });
                    });
                });
             });
       });
    },

    'Open existing database': function (test) {
        test.expect(5);

        var deferred = q.defer();

        // Get a promise
        documentProvider.openDb('existing_database').then(function(client) {

        // Execute the promise
//        deferred.promise.then(function(db) {
            client.collectionNames(function(err, names) {
                    
                test.ifError(err);
                
                // It's a new DB, there are no collections yet
                test.deepEqual(names, 
                        [ 
                          { name: 'existing_database.unitTest' },
                          { name: 'existing_database.system.indexes' } ]
                        );

                var collection = client.collection('unitTest');
                var cursor = collection.find({ name: 'dan'});
                cursor.toArray(function(err, docs) {

                    test.ifError(err);

                    test.equal(docs[0].name, 'dan');
                    test.equal(docs[0].occupation, 'Batman');

                    test.done();
                });

            });
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
            this.db = new mongo.Db('dan_at_email_dot_com', server, config.mongo.clientOptions);
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
 
   'Do not save to a non-existent database': function (test) {
        test.expect(1);
        
        documentProvider.save({name: 'yanfen', email: 'yanfen@email.com'},
                        'some_collection', { data: 'junk' }).then(function(data) {
                                    // Shouldn't get here
                                    test.isError(data); 
                                    test.done();
                                },
                                function(err) {
                                    test.ok(err);
                                    test.done(); 
                                });
   }, 

   'Save to existing database': function (test) {
        test.expect(1);

        console.log('saving');
        documentProvider.save({ name: 'dan', email: 'dan@email.com' },
                        'some_collection', { data: 'junk' }).then(function(data) {
                                    console.log(data);
                                    test.ok(data);
                                    test.done();
                                },
                                function(err) {
                                    console.log(err);
                                    test.isError(err);
                                    test.done(); 
                                });
   }, 


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
 
   'Return a rejected promise if the database does not exist': function (test) {
        test.expect(1);

        documentProvider.dbExists('non_existent_database').then(function() {
                            // Shouldn't get here
                            test.isError(err);
                            test.done();
                        },
                        function(err) {
                            test.ok(err, 'An error should be thrown');
                            test.done();
                        });
   }, 

   'Return a resolved promise if the database does exist': function (test) {
        test.expect(1);

        documentProvider.dbExists('existing_database').then(function() {
                            test.ok(true, 'Verified the database exists');
                            test.done();
                        });
   }, 
};

/**
 * Retrieve document from the database
 */
exports.retrieve = {

   'Retrieve from non-existent database': function (test) {
        test.expect(1);

        test.done();
   }, 

   'Retrieve from existing database': function (test) {
        test.expect(1);

        test.done();
   }, 


};

/**
 * Copy a document to a new profile 
 */
exports.copy = {

   'Copy to a non-existent database': function (test) {
        test.expect(1);

        test.done();
   }, 

   'Copy to existing database': function (test) {
        test.expect(1);

        test.done();
   }, 

};

/**
 * Delete a document from the profile 
 */
exports.destroy = {

   'Do not delete from a non-existent database': function (test) {
        test.expect(1);

        test.done();
   }, 

   'Do not delete non-existent document': function (test) {
        test.expect(1);

        test.done();
   }, 


   'Delete from an existing database': function (test) {
        test.expect(1);

        test.done();
   }, 

};


