var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    utils = require('../../lib/utils'),
    geboSchema = require('../../schemata/gebo');
    agentSchema = require('../../schemata/agent');

var COL_NAME = 'appCollection',
    ADMIN_TOKEN = '1234',
    USER_TOKEN = '5678',
    ACCESS_TOKEN = '9012';

// Agent configs
var CALLBACK_ADDRESS = 'http://theirhost.com/oauth2callback.html';

nconf.argv().env().file({ file: 'local.json' });
var geboDb = new geboSchema(nconf.get('testDb'));
    //agentDb = new agentSchema('yanfen@hg.com');

var oauth2 = require('../../routes/oauth2'),
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
                });

            utils.getPrivateKeyAndCertificate().
                then(function(pair) {

                    var agentDb = new agentSchema('dan@example.com');
                    var friend = new agentDb.friendModel({
                            name: 'Yanfen',
                            email: 'yanfen@agent.com',
                            gebo: 'https://agent.com',
                            certificate: pair.certificate,
                        });
                    friend.hisPermissions.push({ email: 'some@resource.com' });

                    registrant.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        friend.save(function(err) {
                            agentDb.connection.db.close();
                            if (err) {
                              console.log(err);
                            }

                            agentDb = new agentSchema('yanfen@agent.com');
                            var key = new agentDb.keyModel({
                                    public: pair.certificate,
                                    private: pair.privateKey,
                                    email: 'dan@example.com',
                                });

                            key.save(function(err) {
                                agentDb.connection.db.close();
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
            var agentDb = new agentSchema('dan@example.com');
            agentDb.connection.on('open', function(err) {
                agentDb.connection.db.dropDatabase(function(err) {
                    agentDb.connection.db.close();
                    if (err) {
                      console.log(err)
                    }
 
                    agentDb = new agentSchema('yanfen@agent.com');
                    agentDb.connection.on('open', function(err) {
                        agentDb.connection.db.close();
                        if (err) {
                          console.log(err)
                        }
                        callback();
                      });
                  });
              });
          });
    },

    'Return a token': function(test) {
        test.expect(1);

        var claim = { iss: 'dan@example.com',
                      //scope: 'r some@resource.com ' + nconf.get('testDb'),
                      scope: '*',
                      aud: 'https://accounts.google.com/o/oauth2/token',
                      exp: 1328554385,
                      iat: 1328550785,
                      prn: 'yanfen@agent.com' };

        var token = new Token('yanfen@agent.com');
        token.makeJwt(claim, 'dan@example.com').
            then(function(jwt) {
                var jwtSplit = jwt.split('.');
                var signature = jwtSplit.pop();
                var data = jwtSplit.join('.');
        //        data += '.' + signature;
        
                console.log('jwt');
                console.log(jwt);
                oauth2.jwtBearerExchange({ name: 'Dan',
                                           email: 'dan@example.com',
                                           admin: false,
                                        }, data, signature,
                                    function(err, token) {
                                        if (err) {
                                          console.log('err');
                                          console.log(err);
                                          test.ok(false, err);
                                        }
                                        else {
                                          // This should be tightened up
                                          test.equal(token.length, 256);
                                        }
                                        test.done();
                                    });
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

};

/**
 * processScope
 */
exports.processScope = {

    'Return null if ill-formatted': function(test) {
        test.expect(3);
        var scope = oauth2.processScope('some@resource.com some@owner.com');
        test.equal(scope, null);

        scope = oauth2.processScope();
        test.equal(scope, null);

        scope = oauth2.processScope('r some@resource.com');
        test.equal(scope, null);

        test.done();
    },

    'Return object with correct resource, owner, and permissions': function(test) {
        test.expect(10);
        var scope = oauth2.processScope('rwx some@resource.com some@owner.com');
        test.equal(scope.resource, 'some@resource.com');
        test.equal(scope.owner, 'some@owner.com');
        test.equal(scope.read, true);
        test.equal(scope.write, true);
        test.equal(scope.execute, true);

        var scope = oauth2.processScope('x some@resource.com some@owner.com');
        test.equal(scope.resource, 'some@resource.com');
        test.equal(scope.owner, 'some@owner.com');
        test.equal(scope.read, false);
        test.equal(scope.write, false);
        test.equal(scope.execute, true);

        test.done();
    },
};

/**
 * verifyFriendship
 */
exports.verifyFriendship = {

   setUp: function(callback) {
           var registrant = new geboDb.registrantModel({
                    name: 'Dan',
                    email: 'dan@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });

            var agentDb = new agentSchema('dan@hg.com');
            var friend = new agentDb.friendModel({
                    name: 'Yanfen',
                    email: 'yanfen@hg.com',
                    _id: new mongo.ObjectID('123456789ABC')
                });
            friend.hisPermissions.push({ email: 'some@resource.com' });

            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                friend.save(function(err) {
                    if (err) {
                      console.log(err);
                    }
                    agentDb.connection.db.close();
                    callback();
                  });
              });
    },

    tearDown: function(callback) {
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        var agentDb = new agentSchema('dan@hg.com');
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                 }
                 callback();
              });
          });
    },

    'Return the friend model when an agent is a friend with correct scope': function(test) {
        test.expect(1);
        var scope = oauth2.processScope('r some@resource.com dan@hg.com');
        oauth2.verifyFriendship(scope, 'yanfen@hg.com').
            then(function(friend) {
                test.equal(friend.name, 'Yanfen');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);      
                test.done();
              });
    },
    
    'Return false when an agent is a friend with incorrect scope': function(test) {
        test.expect(1);
        var scope = oauth2.processScope('rwx some@resource.com dan@hg.com');
        oauth2.verifyFriendship(scope, 'yanfen@hg.com').
            then(function(weAreFriends) {
                test.equal(weAreFriends, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);      
                test.done();
              });
    },

    'Return false when an agent is not a friend': function(test) {
        test.expect(1);
        var scope = oauth2.processScope('rw some@resource.com dan@hg.com');
        oauth2.verifyFriendship(scope, 'foreign@agent.com').
            then(function(weAreFriends) {
                test.equal(weAreFriends, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);      
                test.done();
              });
    },


};
