/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../../lib/native-mongo-connection').get(true, function(){}),
    mongoose = require('gebo-mongoose-connection').get(true);

var nconf = require('nconf'),
    mongo = require('mongodb'),
    utils = require('../../lib/utils'),
    geboDb = require('../../schemata/gebo')();
    agentDb = require('../../schemata/agent')();

var COL_NAME = 'appCollection',
    ADMIN_TOKEN = '1234',
    USER_TOKEN = '5678',
    ACCESS_TOKEN = '9012';

// Agent configs
var CALLBACK_ADDRESS = 'http://theirhost.com/oauth2callback.html';

nconf.file({ file: 'gebo.json' });

var oauth2 = require('../../routes/oauth2')(),
    Token = require('../../config/token');

var HAI_PROFILE = { type: 'token',
                    clientID: 'app@awesome.com',
                    redirectURI: CALLBACK_ADDRESS, 
                    scope: [ 'read', 'write' ],
                    state: undefined,
                    clientName: 'Some awesome app' };

/**
 * jwtBearerExchange
 */
exports.jwtBearerExchange = {

    setUp: function(callback) {
            var registrant = new geboDb.registrantModel({
                    name: 'Dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });

            utils.getPrivateKeyAndCertificate().
                then(function(pair) {

                    var friendo = new agentDb.friendoModel({
                            name: 'Yanfen',
                            email: 'yanfen@agent.com',
                            gebo: 'https://agent.com',
                            certificate: pair.certificate,
                            _id: new mongo.ObjectID('123456789ABC')
                        });
                    friendo.permissions.push({ resource: 'someCollection' });

                    registrant.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        friendo.save(function(err) {
                            if (err) {
                              console.log(err);
                            }

                            var key = new agentDb.keyModel({
                                    public: pair.certificate,
                                    private: pair.privateKey,
                                    email: 'dan@example.com',
                                });

                            key.save(function(err) {
                                if (err) {
                                  console.log(err);
                                }
                                callback();
                              });
                          });
                      });
                  }).
                catch(function(err) {
                    console.log(err);
                    callback();
                  });
    },

    tearDown: function (callback) {
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

    'Return a token': function(test) {
        test.expect(3);

        var claim = { iss: 'dan@example.com',
                      scope: 'r someCollection',
                      aud: 'https://accounts.google.com/o/oauth2/token',
                      exp: 1328554385,
                      iat: 1328550785,
                      prn: 'yanfen@agent.com' };

        var token = new Token('yanfen@agent.com');
        token.makeJwt(claim, 'dan@example.com').
            then(function(jwt) {
        
                var data = jwt.split('.');
                var signature = data.pop();
                data = data.join('.');

                oauth2.jwtBearerExchange({ name: 'Dan',
                                           email: 'dan@example.com',
                                           admin: false,
                                        }, data, signature,
                                    function(err, tokenString) {
                                        if (err) {
                                          console.log(err);
                                          test.ok(false, err);
                                        }
                                        else {
                                          test.equal(tokenString.length, 256);

                                          geboDb.tokenModel.findOne({ string: tokenString }, function(err, token) {
                                                //test.equal(token.registrantId, new mongo.ObjectID('0123456789AB').toString());
                                                test.equal(token.friendoId, new mongo.ObjectID('123456789ABC').toString());
//                                                test.equal(token.resource, 'someCollection');
                                                test.equal(token.string, tokenString);
                                                test.done();
                                            });
                                        }
                                    });
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Do not return token when provided ill-formed scope': function(test) {
        test.expect(1);

        var claim = { iss: 'dan@example.com',
                      scope: 'this could be empty or mangled...',
                      aud: 'https://accounts.google.com/o/oauth2/token',
                      exp: 1328554385,
                      iat: 1328550785,
                      prn: 'yanfen@agent.com' };

        var token = new Token('yanfen@agent.com');
        token.makeJwt(claim, 'dan@example.com').
            then(function(jwt) {
                var data = jwt.split('.');
                var signature = data.pop();
                data = data.join('.');

                oauth2.jwtBearerExchange({ name: 'Dan',
                                           email: 'dan@example.com',
                                           admin: false,
                                        }, data, signature,
                                    function(err, token) {
                                        if (err) {
                                          test.equal(err, 'You did not correctly specify the scope of your request');
                                        }
                                        else {
                                          test.ok(false, 'Shouldn\'t get here');
                                        }
                                        test.done();
                                    });
             }).
            catch(function(err) {
                test.ok(false, 'makeJwt failed for some reason');
                test.done(); 
              });
    },

    /**
     * 2014-6-11 Mothballed
     */
//    'Do not return a token when an agent\'s scope doesn\'t match his assigned permissions': function(test) {
//        test.expect(1);
//
//        var claim = { iss: 'dan@example.com',
//                      scope: 'rw someCollection',
//                      aud: 'https://accounts.google.com/o/oauth2/token',
//                      exp: 1328554385,
//                      iat: 1328550785,
//                      prn: 'yanfen@agent.com' };
//
//        var token = new Token('yanfen@agent.com');
//        token.makeJwt(claim, 'dan@example.com').
//            then(function(jwt) {
//        
//                var data = jwt.split('.');
//                var signature = data.pop();
//                data = data.join('.');
//
//                oauth2.jwtBearerExchange({ name: 'Dan',
//                                           email: 'dan@example.com',
//                                           admin: false,
//                                        }, data, signature,
//                                    function(err, token) {
//                                        if (err) {
//                                          test.equal(err, 'yanfen@agent.com breached friendoship');
//                                        }
//                                        else {
//                                          test.ok(false, 'Shouldn\'t get here');
//                                        }
//                                        test.done();
//                                    });
//              }).
//            catch(function(err) {
//                console.log(err);
//                test.ok(false, err);
//                test.done();
//              });
//    },
};

/**
 * processScope
 */
exports.processScope = {

    'Return null if ill-formatted': function(test) {
        test.expect(3);
        var scope = oauth2.processScope('someCollection');
        test.equal(scope, null);

        scope = oauth2.processScope();
        test.equal(scope, null);

        scope = oauth2.processScope('r');
        test.equal(scope, null);

        test.done();
    },

    'Return object with correct resource, owner, and permissions': function(test) {
        test.expect(8);
        var scope = oauth2.processScope('rwx someCollection');
        test.equal(scope.resource, 'someCollection');
        test.equal(scope.read, true);
        test.equal(scope.write, true);
        test.equal(scope.execute, true);

        var scope = oauth2.processScope('x someCollection');
        test.equal(scope.resource, 'someCollection');
        test.equal(scope.read, false);
        test.equal(scope.write, false);
        test.equal(scope.execute, true);

        test.done();
    },
};

/**
 * 2014-6-11 Mothballed. See notes in module
 *
/**
 * verifyFriendship
 */
//exports.verifyFriendship = {
//
//   setUp: function(callback) {
//           var registrant = new geboDb.registrantModel({
//                    name: 'Dan',
//                    email: 'dan@example.com',
//                    password: 'password123',
//                    admin: false,
//                    _id: new mongo.ObjectID('0123456789AB')
//                });
//
//            var friendo = new agentDb.friendoModel({
//                    name: 'Yanfen',
//                    email: 'yanfen@example.com',
//                    _id: new mongo.ObjectID('123456789ABC')
//                });
//            friendo.permissions.push({ resource: 'someCollection' });
//
//            registrant.save(function(err) {
//                if (err) {
//                  console.log(err);
//                }
//                friendo.save(function(err) {
//                    if (err) {
//                      console.log(err);
//                    }
//                    callback();
//                  });
//              });
//    },
//
//    tearDown: function(callback) {
//        geboDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            agentDb.connection.db.dropDatabase(function(err) {
//                if (err) {
//                  console.log(err)
//                 }
//                 callback();
//              });
//          });
//    },
//
//    'Return the friendo model when an agent is a friendo with correct scope': function(test) {
//        test.expect(1);
//        var scope = oauth2.processScope('r someCollection');
//        oauth2.verifyFriendship(scope, 'dan@example.com', 'yanfen@example.com').
//            then(function(friendo) {
//                test.equal(friendo.name, 'Yanfen');
//                test.done();
//              }).
//            catch(function(err) {
//                test.ok(false, err);      
//                test.done();
//              });
//    },
//    
//    'Return false when an agent is a friendo with incorrect scope': function(test) {
//        test.expect(1);
//        var scope = oauth2.processScope('rwx someCollection');
//        oauth2.verifyFriendship(scope, 'dan@example.com', 'yanfen@example.com').
//            then(function(weAreFriends) {
//                test.equal(weAreFriends, false);
//                test.done();
//              }).
//            catch(function(err) {
//                test.ok(false, err);      
//                test.done();
//              });
//    },
//
//    'Return false when an agent is not a friendo': function(test) {
//        test.expect(1);
//        var scope = oauth2.processScope('rw someCollection');
//        oauth2.verifyFriendship(scope, 'dan@example.com', 'foreign@agent.com').
//            then(function(weAreFriends) {
//                test.equal(weAreFriends, false);
//                test.done();
//              }).
//            catch(function(err) {
//                test.ok(false, err);      
//                test.done();
//              });
//    },
//};


exports.verify = { 


};
