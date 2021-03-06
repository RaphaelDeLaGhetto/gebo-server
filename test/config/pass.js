/**
 * This ensures that a connection is made to the
 * test databases
 */
var mongoose = require('gebo-mongoose-connection').get(true),
    basic = require('gebo-basic-action'),
    nativeMongoConnection = basic.nativeMongoConnection.get(true, function(){});

var nconf = require('nconf'),
    utils = require('gebo-utils'),
    mongo = require('mongodb');

var COL_NAME = 'appCollection',
    ADMIN_FRIEND_TOKEN = '1234',
    FRIEND_TOKEN = '5678',
    ADMIN_TOKEN = '9012',
    REGULAR_TOKEN = '3456',
    EXPIRED_TOKEN = '7890',
    NON_REGISTERED_TOKEN = 'ABCD',
    HAI_EMAIL = 'human-agent@interface.org',
    IP = '127.0.0.1';


var FRIEND_GEBO_URI = 'http://theirhost.com';

nconf.file({ file: 'gebo.json' });
var basic = require('gebo-basic-action'),
    geboDb = basic.schemata.gebo(),
    agentDb = basic.schemata.agent(),
    pass = require('../../config/pass')();

/**
 * localStrategy
 */
exports.localStrategy = {

    setUp: function(callback) {
    	try{
            var agent = new geboDb.registrantModel(
                            { name: 'dan', email: 'dan@example.com',
                              password: 'password123', admin: true,  
                              _id: new mongo.ObjectID('0123456789AB') });

            agent.save(function(err){
                if (err) {
                  console.log(err);
                }
                callback();       
              });
    	}
        catch(e) {
            console.log(e);
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

    'Return an agent object when provided correct email and password': function(test) {
        test.expect(3);
        pass.localStrategy('dan@example.com', 'password123', function(err, agent) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(agent.name, 'dan');
              test.equal(agent.email, 'dan@example.com');
              test.equal(agent.admin, true);
            }
            test.done();
          });
    },

    'Return false agent if an invalid email is provided': function(test) {
        test.expect(2);
        pass.localStrategy('wrongemail@example.com', 'password123', function(err, agent, message) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(agent, false);
              test.equal(message.message, 'Invalid email or password');
            }
            test.done();
          });
    },

    'Return false agent if a valid email and invalid password are provided': function(test) {
        test.expect(2);
        pass.localStrategy('dan@example.com', 'wrongpassword123', function(err, agent, message) {
            if (err) {
              test.ok(false, err);
            } 
            else {
              test.equal(agent, false);
              test.equal(message.message, 'Invalid email or password');
            }
            test.done();
          });
    },
};

/**
 * bearerStrategy
 */
exports.bearerStrategy = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant and make him a friendo. If 
             * registrant isn't also a friendo, then he won't
             * be able to do anything
             */
            var adminRegistrant = new geboDb.registrantModel({
                    name: 'dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });

            var adminFriendo = new agentDb.friendoModel({
                    name: 'dan',
                    email: 'dan@example.com',
                    gebo: 'https://example.com',
                    registrantId:  adminRegistrant._id,
                    _id: new mongo.ObjectID('123456789ABC')
                });
         
            /**
             * Create an access token for the friendo
             */
            var adminToken = new geboDb.tokenModel({
                    friendoId: adminFriendo._id,
                    ip: IP,
                    string: ADMIN_TOKEN,
                });

            /** 
             * Set up another registrant and make him 
             * a friendo
             */
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            var registrantFriendo = new agentDb.friendoModel({
                    name: 'yanfen',
                    email: 'yanfen@example.com',
                    gebo: 'https://example.com',
                    registrantId: registrant._id,
                    _id: new mongo.ObjectID('23456789ABCD')
                });
 
            /**
             * Create an access token for regular user 
             */
            var regularToken = new geboDb.tokenModel({
                    friendoId: registrantFriendo._id,
                    ip: IP,
                    string: REGULAR_TOKEN,
                });

            /**
             * Create an expired token
             */
            var expiredToken = new geboDb.tokenModel({
                    friendoId: new mongo.ObjectID('456789ABCDEF'),
                    ip: IP,
                    string: EXPIRED_TOKEN,
                    expires: Date.now() - 60*60*1000,
                });

            /**
             * Create a non-registered friendo
             */
            var nonRegisteredFriendo = new agentDb.friendoModel({
                    name: 'john',
                    email: 'john@example.com',
                    gebo: 'https://example.com',
                    _id: new mongo.ObjectID('3456789ABCDE')
                });
 
            /**
             * Create an access token for the non-registered friendo 
             */
            var nonRegisteredToken = new geboDb.tokenModel({
                    friendoId: nonRegisteredFriendo._id,
                    ip: IP,
                    string: NON_REGISTERED_TOKEN,
                });


            expiredToken.save(function(err) {
                if (err) {
                  console.log(err);
                }
                regularToken.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    registrant.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        registrantFriendo.save(function(err) {
                            if (err) {
                              console.log(err);
                            }
                            adminToken.save(function(err) {
                                if (err) {
                                  console.log(err);
                                }
                                adminRegistrant.save(function(err) {
                                    if (err) {
                                      console.log(err);
                                    }
                                    adminFriendo.save(function(err) {
                                        if (err) {
                                          console.log(err);
                                        }
                                        nonRegisteredFriendo.save(function(err) {
                                            if (err) {
                                              console.log(err);
                                            }
                                            nonRegisteredToken.save(function(err) {
                                               if (err) {
                                                 console.log(err);
                                               }
                                               callback();
                                             });
                                          });
                                      });
                                  });
                              });
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
            callback();
          });
    },

    'Return registrant object for an admin with a valid token': function(test) {
        test.expect(4);
        pass.bearerStrategy(ADMIN_TOKEN, function(err, registrant) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(registrant.name, 'dan');
              test.equal(registrant.email, 'dan@example.com');
              test.equal(registrant.admin, true);
              test.equal(registrant.password, undefined);
            }
            test.done();
          });
    },

    'Return registrant object for a regular agent with a valid token': function(test) {
        test.expect(4);
        pass.bearerStrategy(REGULAR_TOKEN, function(err, registrant) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(registrant.name, 'yanfen');
              test.equal(registrant.email, 'yanfen@example.com');
              test.equal(registrant.admin, false);
              test.equal(registrant.password, undefined);
            }
            test.done();
          });
    },

    'Return a friendo object for a non-registered friendo with a valid token': function(test) {
        test.expect(4);
        pass.bearerStrategy(NON_REGISTERED_TOKEN, function(err, friendo) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(friendo.name, 'john');
              test.equal(friendo.email, 'john@example.com');
              test.equal(friendo.admin, undefined);
              test.equal(friendo.password, undefined);
            }
            test.done();
          });
    },

    'Do not barf if the token provided does not exist': function(test) {
        test.expect(1);
        pass.bearerStrategy('n0sucht0ken', function(err, verified) {
            if (err) {
              test.equal(err, {
                                 'error': {
                                     'code': 401,
                                     'message': 'The token provided is invalid'
                              }
                });
            }
            else {
              test.equal(verified, false);
            }
            test.done();
        });
    },

    'Return error if the token provided is expired': function(test) {
        test.expect(1);
        pass.bearerStrategy(EXPIRED_TOKEN, function(err, friendo) {
            if (err) {
              test.equal(err, {
                                 'error': {
                                     'code': 401,
                                     'message': 'The token provided is invalid'
                              }
                });
            } 
            else {
              test.equal(friendo, false);
            }
            test.done();
          });
    },
};

/**
 * clientJwtBearerStrategy
 */
exports.clientJwtBearerStrategy = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'Dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Setup a friendo
             */
            var friendo = new agentDb.friendoModel({
                    name: 'Yanfen',
                    email: 'yanfen@agent.com',
                    gebo: 'https://agent.com',
                    _id: new mongo.ObjectID('123456789ABC')
                });

            friendo.save(function(err) {
                if (err) {
                  console.log(err);
                }
                registrant.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
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
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
    },


    'Return registrant object for foreign agent with a valid citizen email': function(test) {
        test.expect(2);
        pass.clientJwtBearerStrategy('dan@example.com', function(err, citizen) {
            if (err) {
              test.ok(false, err);
            }
            else {
              test.equal(citizen.name, 'Dan');
              test.equal(citizen.email, 'dan@example.com');
            }
            test.done();
          });
    },

//    'Return registrant object for a regular agent with a valid token': function(test) {
//        test.expect(4);
//        pass.bearerStrategy(REGULAR_TOKEN, function(err, registrant) {
//            if (err) {
//              test.ok(false, err);
//            }
//            else {
//              test.equal(registrant.name, 'yanfen');
//              test.equal(registrant.email, 'yanfen@example.com');
//              test.equal(registrant.admin, false);
//              test.equal(registrant.password, undefined);
//            }
//            test.done();
//          });
//    },
//
//
//    'Return permissions object for a friendo requesting a resource from a regular agent': function(test) {
//        test.expect(7);
//
//        pass.bearerStrategy(FRIEND_TOKEN, function(err, verified) {
//            if (err) {
//              test.ok(false, err);
//            }
//            else {
//              test.equal(verified.agentName, 'yanfen'); 
//              test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
//              test.equal(verified.resource, utils.getMongoCollectionName('human-agent@interface.org')); 
//              test.equal(verified.read, true); 
//              test.equal(verified.write, false); 
//              test.equal(verified.execute, false); 
//              test.equal(verified.admin, false); 
//            }
//            test.done();
//        });
//    },
//
//    'Return permissions object for a friendo requesting a resource from an admin agent': function(test) {
//        test.expect(7);
//        pass.bearerStrategy(ADMIN_FRIEND_TOKEN, function(err, verified) {
//            if (err) {
//              console.log('err');
//              console.log(err);
//              test.ok(false, err);
//            }
//            else {
//              test.equal(verified.agentName, 'dan'); 
//              test.equal(verified.dbName, utils.getMongoDbName('dan@example.com')); 
//              test.equal(verified.resource, utils.getMongoCollectionName('human-agent@interface.org')); 
//              test.equal(verified.read, true); 
//              test.equal(verified.write, false); 
//              test.equal(verified.execute, false); 
//              test.equal(verified.admin, true); 
//            }
//            test.done();
//        });
//    },
//    
//    'Return permissions object for an admin agent requesting access to his own resource': function(test) {
//        test.expect(7);
//        pass.bearerStrategy(ADMIN_TOKEN, function(err, verified) {
//            if (err) {
//              test.ok(false, err);
//            }
//            else {
//              test.equal(verified.agentName, 'dan'); 
//              test.equal(verified.dbName, utils.getMongoDbName('dan@example.com')); 
//              test.equal(verified.resource, utils.getMongoCollectionName(HAI_EMAIL)); 
//              test.equal(verified.read, true); 
//              test.equal(verified.write, true); 
//              test.equal(verified.execute, true); 
//              test.equal(verified.admin, true); 
//            }
//            test.done();
//        });
//    },
//
//    'Return permissions object for a regular agent requesting access to his own resource': function(test) {
//        test.expect(7);
//        pass.bearerStrategy(REGULAR_TOKEN, function(err, verified) {
//            if (err) {
//              test.ok(false, err);
//            }
//            else {
//              test.equal(verified.agentName, 'yanfen'); 
//              test.equal(verified.dbName, utils.getMongoDbName('yanfen@example.com')); 
//              test.equal(verified.resource, utils.getMongoCollectionName(HAI_EMAIL)); 
//              test.equal(verified.read, true); 
//              test.equal(verified.write, true); 
//              test.equal(verified.execute, true); 
//              test.equal(verified.admin, false); 
//            }
//            test.done();
//        });
//    },

//    'Do not barf if the token provided does not exist': function(test) {
//        test.expect(1);
//        pass.bearerStrategy('n0sucht0ken', function(err, verified) {
//            if (err) {
//              test.equal(err, 'The token provided is invalid');       
//            }
//            else {
//              test.ok(false, 'Permission should not have been granted');
//            }
//            test.done();
//        });
//    },
//
//    'Return error if the token provided is expired': function(test) {
//        test.expect(1);
//        pass.bearerStrategy(EXPIRED_TOKEN, function(err, friendo) {
//            if (err) {
//              test.equal(err, 'The token provided is invalid');       
//            } 
//            else {
//              test.ok(false, 'Permission should not have been granted');
//            }
//            test.done();
//          });
//    },
};


