var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    geboSchema = require('../../schemata/gebo');
    agentSchema = require('../../schemata/agent');

var COL_NAME = 'appCollection',
    ADMIN_TOKEN = '1234',
    USER_TOKEN = '5678',
    ACCESS_TOKEN = '9012';

// Agent configs
var CALLBACK_ADDRESS = 'http://theirhost.com/oauth2callback.html';

var oauth2 = require('../../routes/oauth2');

var geboDb = new geboSchema(nconf.get('testDb')),
    agentDb = new agentSchema('yanfen@hg.com');

var HAI_PROFILE = { type: 'token',
                    clientID: 'app@awesome.com',
                    redirectURI: CALLBACK_ADDRESS, 
                    scope: [ 'read', 'write' ],
                    state: undefined,
                    clientName: 'Some awesome app' };

/**
 * verifyHai
 */
exports.verifyHai = {

    setUp: function(callback) {
        try {
            /** 
             * Set up aregistrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            /**
             * Make a hai for the new registrant
             */
            var hai = new agentDb.haiModel({
                    name: 'Some awesome app',
                    email: 'app@awesome.com',
                    redirect: CALLBACK_ADDRESS,
                    _id: new mongo.ObjectID('3456789ABCDE')
                });

            /**
             * Create permissions for the HAI
             */
            var permission = new agentDb.permissionModel({
                    email: 'app@awesome.com',
                    read: true,
                    write: true,
                    execute: false,
                    _id: new mongo.ObjectID('456789ABCDEF')
                });
            hai.permissions.push(permission);

            /**
             * Create an access token for the friend
             */
            var token = new geboDb.haiTokenModel({
                    registrantId: new mongo.ObjectID('123456789ABC'),
                    haiId: new mongo.ObjectID('3456789ABCDE'),
                    string: USER_TOKEN,
                });

            // There has got to be a better way to do this...
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                token.save(function(err) {
                     if (err) {
                      console.log(err);
                    }
                    hai.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        callback();
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
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Return false if the HAI has never been authorized before': function(test) {
        test.expect(1);
        oauth2.verifyHai('yanfen@hg.com', { type: 'token',
                                            clientID: 'unknownapp@mystery.com',
                                            redirectURI: 'http://rainbow.com/oauth2callback.html',
                                            scope: [ 'execute', 'write' ],
                                            state: undefined,
                                            clientName: 'Some app from over the rainbow'
                                          }).
            then(function(delta) {
                test.equal(delta, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return true if the given profile matches the saved profile': function(test) {
        test.expect(1);
        oauth2.verifyHai('yanfen@hg.com', HAI_PROFILE).
            then(function(delta) {
                console.log(delta);
                test.equal(delta, true);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return an Object of deltas if the give profile differs from the saved profile': function(test) {
        test.expect(3);
        oauth2.verifyHai('yanfen@hg.com', { type: 'token',
                                            clientID: 'app@awesome.com',
                                            redirectURI: 'http://rainbow.com/oauth2callback.html',
                                            scope: [ 'write', 'execute' ],
                                            state: undefined,
                                            clientName: 'Some app from over the rainbow'
                                          }).
            then(function(delta) {
                test.equal(delta.clientName, 'Some awesome app');
                test.equal(delta.redirectURI, CALLBACK_ADDRESS);
                test.equal(delta.scope.join(), ['read', 'write'].join());
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Should not barf if the agent email provided is not registered': function(test) {
        test.expect(1);
        oauth2.verifyHai('dan@hg.com', HAI_PROFILE).
            then(function(delta) {
                test.ok(false, 'This agent should not be registered');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'That agent is not registered');
                test.done();
              });
    },

};
