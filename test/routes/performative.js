var performative = require('../../routes/performative'),
    config = require('../../config/config'),
//    dbSchema = require('../../config/dbschema'),
//    nconf = require('nconf'),
    mongo = require('mongodb');
//    q = require('q');

var COL_NAME = 'appCollection',
    ADMIN_TOKEN = '1234',
    USER_TOKEN = '5678';

/**
 * verify
 */
exports.verify = {

    setUp: function(callback) {
    	try{
            var collection;

            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);
            this.appDb = mongo.Db('exampleDb',
                            server, config.mongo.clientOptions);
            this.appDb.open(function (err, client) {
                if (err) {
                  throw err;
                }

                // Insert an admin and regular user
        	collection = new mongo.Collection(client, 'users');
                collection.insert([
                        { username: 'dan', email: 'dan@hg.com',
                          password: 'password123', admin: true,  
                          _id: new mongo.ObjectID('0123456789AB') }, 
                        { username: 'yanfen', email: 'yanfen@hg.com',
                          password: 'password123', admin: false,  
                          _id: new mongo.ObjectID('123456789ABC') },
                    ]);

                // Insert client
        	collection = new mongo.Collection(client, 'clients');
                collection.insert(
                        { name: 'todoApp',
                          clientId: 'todoApp123', 
                          secret: 'todo-secret',
                          _id: new mongo.ObjectID('23456789ABCD') });

                // Insert tokens for admin and regular user
        	collection = new mongo.Collection(client, 'tokens');
                collection.insert([
                        { userId: new mongo.ObjectID('0123456789AB'),
                          clientId: new mongo.ObjectID('23456789ABCD'),  
                          token: ADMIN_TOKEN },
                        { userId: new mongo.ObjectID('123456789ABC'),
                          clientId: new mongo.ObjectID('23456789ABCD'),  
                          token: USER_TOKEN },
                    ]);
            });

            // Create a database for the admin
            this.adminDb = this.appDb.db('adminDb');
            this.adminDb.open(function (err, client) {
                if (err) {
                  throw err;
                }
                // Insert an admin and regular user
                collection = new mongo.Collection(client, COL_NAME);
                collection.insert({ data: 'Important to the app' });
            });

            // Create a database for the admin
            this.userDb = this.appDb.db('userDb');
            this.userDb.open(function (err, client) {
                if (err) {
                  throw err;
                }
                // Insert an admin and regular user
                collection = new mongo.Collection(client, COL_NAME);
                collection.insert({ data: 'Also important to the app' }, function() {
                        callback();
                    });
            });

    	} catch(e) {
            console.dir(e);
            callback();
    	}
    },

    tearDown: function(callback) {
        // Lose the database for next time
        this.appDb.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
        });

        this.adminDb.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
        });

        this.userDb.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
            callback();
        });
    },

   'Allow user access to his database': function(test) {
//        test.expect(3);
        performative.verify(USER_TOKEN, 'yanfen@hg.com').
            then(function(verified) {
//                test.equal(verified.dbName, 'yanfen_at_hg_dot_com');
//                test.equal(verified.collectionName, 'todoApp');
//                test.equal(verified.admin, false);
                test.done();
            }).
            catch(function(err) {
//                test.ok(false, err);
                test.done();
            });
   }, 

//   'Do not allow user access to another user\'s database': function(test) {
//        test.expect(1);
//        utils.verify(USER_TOKEN, 'dan@hg.com').
//           then(function(verified) {
//                test.ok(false, 'Should not get here');
//                test.done();
//           }).
//           catch(function(err) {
//                test.equal(err, 'You are not permitted to access that resource');
//                test.done();
//           });
//   },
//
//   'Allow admin access to his database': function(test) {
//        test.expect(3);
//        utils.verify(ADMIN_TOKEN, 'dan@hg.com').
//            then(function(verified) {
//                test.equal(verified.dbName, 'dan_at_hg_dot_com');
//                test.equal(verified.collectionName, 'todoApp');
//                test.equal(verified.admin, false);
//                test.done();
//            }).
//            catch(function(err) {
//                test.ok(false, err);
//                test.done();
//            });
//   },
//
//   'Allow admin access to another user\'s database': function(test) {
//        test.expect(3);
//        utils.verify(ADMIN_TOKEN, 'yanfen@hg.com').
//            then(function(verified) {
//                test.equal(verified.dbName, 'yanfen_at_hg_dot_com');
//                test.equal(verified.collectionName, 'todoApp');
//                test.equal(verified.admin, false);
//                test.done();
//            }).
//            catch(function(err) {
//                test.ok(false, err);
//                test.done();
//            });
//   },

};
