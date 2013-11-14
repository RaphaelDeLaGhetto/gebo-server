var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    utils = require('../../lib/utils'),
    geboSchema = require('../../schemata/gebo'),
    agentSchema = require('../../schemata/agent');

var COL_NAME = 'appCollection',
//    ADMIN_TOKEN = '1234',
//    USER_TOKEN = '5678',
//    ACCESS_TOKEN = '9012',
    HAI = 'A human-agent interface',
    IP = '127.0.0.1';


// Agent configs
var BASE_ADDRESS = 'http://theirhost.com';

var performativeRoute = require('../../routes/performative');
var performative = new performativeRoute(nconf.get('testDb'));

var SIGNING_PAIR;
utils.getPrivateKeyAndCertificate().
    then(function(pair) {
        SIGNING_PAIR = pair
      });

var geboDb = new geboSchema(nconf.get('testDb'));

/**
 * verify
 */
exports.verify = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var adminRegistrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: 'dan@hg.com',
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a friend for the registrant
             */
            var adminAgentDb = new agentSchema('dan@hg.com');
            var adminFriend = new adminAgentDb.friendModel({
                    name: 'john',
                    email: 'john@painter.com',
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            /**
             * Create access permissions for imaginary collection
             */
            adminFriend.hisPermissions.push({ email: 'app@painter.com' });

            /** 
             * Set up another registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            /**
             * Make a friend for the new registrant
             */
            var regularAgentDb = new agentSchema('yanfen@hg.com');
            var friend = new regularAgentDb.friendModel({
                    name: 'richard',
                    email: 'richard@construction.com',
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('3456789ABCDE')
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someotherapp@example.com' });
            friend.hisPermissions.push({ email: 'app@construction.com' });

            // There has got to be a better way to do this...
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                friend.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    regularAgentDb.connection.db.close();
                    adminRegistrant.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        adminFriend.save(function(err) {
                            if (err) {
                              console.log(err);
                            }
                            adminAgentDb.connection.db.close();
                            callback();
                          });
                      });
                  });
              });
        }
        catch(err) {
            console.log(err);
            callback();
        }
    },

    tearDown: function(callback) {

        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        var regularAgentDb = new agentSchema('yanfen@hg.com');
        regularAgentDb.connection.on('open', function(err) {
            regularAgentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                regularAgentDb.connection.db.close();

                var adminAgentDb = new agentSchema('dan@hg.com');
                adminAgentDb.connection.on('open', function(err) {
                    adminAgentDb.connection.db.dropDatabase(function(err) {
                        if (err) {
                          console.log(err)
                        }
                        adminAgentDb.connection.db.close();
                        callback();
                      });
                  });
              });
          });
    },

    'Return permissions object for a friend requesting a resource from a regular agent': function(test) {
        test.expect(6);
        performative.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                            { dbName: 'yanfen@hg.com', collectionName: 'app@construction.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@construction.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                console.log('err');
                console.log(err);
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a friend requesting a resource from an admin agent': function(test) {
        test.expect(6);
        performative.verify({ name: 'john', email: 'john@painter.com', admin: false },
                            { dbName: 'dan@hg.com', collectionName: 'app@painter.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('dan@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@painter.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },
    
    'Return permissions object for an admin agent requesting to a friend\'s resource': function(test) {
        test.expect(6);
        performative.verify({ name: 'richard', email: 'richard@construction.com', admin: true },
                            { dbName: 'yanfen@hg.com', collectionName: 'someotherapp@example.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('someotherapp@example.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a regular agent requesting access to his own resource with dbName param set': function(test) {
        test.expect(6);
        performative.verify({ name: 'yanfen', email: 'yanfen@hg.com', admin: false },
                            { dbName: 'yanfen@hg.com', collectionName: 'someotherapp@example.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('someotherapp@example.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, false); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a regular agent requesting access to his own resource without dbName param set': function(test) {
        test.expect(6);
        performative.verify({ name: 'yanfen', email: 'yanfen@hg.com', admin: false },
                            { collectionName: 'someotherapp@example.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('someotherapp@example.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, false); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an admin agent requesting access to his own resource with dbName param set': function(test) {
        test.expect(6);
        performative.verify({ name: 'dan', email: 'dan@hg.com', admin: true },
                            { dbName: 'dan@hg.com', collectionName: 'app@painter.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('dan@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@painter.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an admin agent requesting access to his own resource with dbName param set': function(test) {
        test.expect(6);
        performative.verify({ name: 'dan', email: 'dan@hg.com', admin: true },
                            { collectionName: 'app@painter.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('dan@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@painter.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an admin agent requesting access to non-friend resources': function(test) {
        test.expect(6);
        performative.verify({ name: 'dan', email: 'dan@hg.com', admin: true },
                            { dbName: 'yanfen@hg.com', collectionName: 'app@construction.com' }).
            then(function(verified) {
                test.equal(verified.dbName, utils.getMongoDbName('yanfen@hg.com')); 
                test.equal(verified.collectionName, utils.getMongoCollectionName('app@construction.com')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },


    'Do not barf if a non-friend (non-admin) requests a resource': function(test) {
        test.expect(1);
        performative.verify({ name: 'dan', email: 'dan@hg.com', admin: false },
                            { dbName: 'yanfen@hg.com', collectionName: 'app@construction.com' }).
            then(function(verified) {
                test.ok(false, 'Permission should not have been granted');
                test.done();      
              }).
            catch(function(err) {
                test.equal(err, 'I don\'t know you');       
                test.done();      
              });
    },

    'Do not barf if access has not been granted to the requested resource': function(test) {
        test.expect(1);
        performative.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                            { dbName: 'yanfen@hg.com', collectionName: 'someother@inaccessibleapp.com' }).
            then(function(verified) {
                test.ok(false, 'Permission should not have been granted');
                test.done();      
              }).
            catch(function(err) {
                test.equal(err, 'You don\'t have access to that resource'); 
                test.done();      
              });
    },
};


/**
 * createSocialCommitment
 */
exports.createSocialCommitment = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            // There has got to be a better way to do this...
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                callback();
              });
        }
        catch(err) {
            console.log(err);
            callback();
        }
    },

    tearDown: function(callback) {

        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        var agentDb = new agentSchema('yanfen@hg.com');
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                agentDb.connection.db.close();
                callback();
              });
          });
    },

    'Add a social commitment to the agent\'s database': function(test) {
        test.expect(10);

        var friend = {
                name: 'richard',
                email: 'richard@construction.com',
                uri: BASE_ADDRESS,
                hisCertificate: SIGNING_PAIR.certificate,
              };

        var agent = {
                email: 'richard@construction.com',
              };

        var params = {
                newFriend: friend,
                dbName: 'yanfen@hg.com',
              };

        performative.createSocialCommitment(agent, 'request', 'friend', params).
            then(function(socialCommitment) {
                test.equal(socialCommitment.type, 'request');
                test.equal(socialCommitment.action, 'friend');
                test.equal(socialCommitment.data.newFriend.name, 'richard');
                test.equal(socialCommitment.data.newFriend.email, 'richard@construction.com');
                test.equal(socialCommitment.data.newFriend.uri, BASE_ADDRESS);
                test.equal(socialCommitment.data.newFriend.hisCertificate, SIGNING_PAIR.certificate);
                test.equal(socialCommitment.debtor, 'yanfen@hg.com');
                test.equal(socialCommitment.creditor, 'richard@construction.com');
                test.equal(typeof socialCommitment.created, 'object');
                test.equal(socialCommitment.fulfilled, null);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

};

/**
 * fulfilSocialCommitment
 */
exports.fulfilSocialCommitment = {

    setUp: function(callback) {
        try {
            var friend = {
                    name: 'richard',
                    email: 'richard@construction.com',
                    uri: BASE_ADDRESS,
                    hisCertificate: SIGNING_PAIR.certificate,
                  };
    
            var agent = {
                    email: 'richard@construction.com',
                  };
    
            var params = {
                    newFriend: friend,
                    dbName: 'yanfen@hg.com',
                  };

            /**
             * Setup a registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            // There has got to be a better way to do this...
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                performative.createSocialCommitment(agent, 'request', 'friend', params).
                    then(function(socialCommitment) {
                        callback();
                      }).
                    catch(function(err) {
                        console.log(err);
                        callback();      
                      });
              });
        }
        catch(err) {
            console.log(err);
            callback();
        }
    },

    tearDown: function(callback) {

        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        var agentDb = new agentSchema('yanfen@hg.com');
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                agentDb.connection.db.close();
                callback();
              });
          });
    },

    'Set the fulfillment date on the socialCommitment document': function(test) {
        test.expect(10);
        var agentDb = new agentSchema('yanfen@hg.com');
        agentDb.socialCommitmentModel.findOne({ creditor: 'richard@construction.com' }, function(err, sc) {
            agentDb.connection.db.close();
            if (err) {
              console.log(err);
              test.ok(false, err);
            }
            performative.fulfilSocialCommitment('yanfen@hg.com', sc._id).
                then(function(socialCommitment) {
                    test.equal(socialCommitment.type, 'request');
                    test.equal(socialCommitment.action, 'friend');
                    test.equal(socialCommitment.data.newFriend.name, 'richard');
                    test.equal(socialCommitment.data.newFriend.email, 'richard@construction.com');
                    test.equal(socialCommitment.data.newFriend.uri, BASE_ADDRESS);
                    test.equal(socialCommitment.data.newFriend.hisCertificate, SIGNING_PAIR.certificate);
                    test.equal(socialCommitment.debtor, 'yanfen@hg.com');
                    test.equal(socialCommitment.creditor, 'richard@construction.com');
                    test.equal(typeof socialCommitment.created, 'object');
                    test.equal(typeof socialCommitment.fulfilled, 'object');
                    test.done();
                  }).
                catch(function(err) {
                    console.log(err);
                    test.ok(false, err);
                    test.done();
                  });
          });
    },
};



