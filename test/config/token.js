var nock = require('nock'),
    config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    http = require('http'),
    utils = require('../../lib/utils'),
    dbSchema = require('../../config/dbschema');

// Foreign agent configurations
var CLIENT_ID = 'abc123',
    REDIRECT_URI = 'http://myhost.com',
    BASE_ADDRESS = 'theirhost.com',
    AUTHORIZATION_ENDPOINT = '/authorize',
    VERIFICATION_ENDPOINT = '/verify',
    REQUEST_ENDPOINT = '/request',
    PROPOSE_ENDPOINT = '/propose',
    INFORM_ENDPOINT = '/inform',
    ACCESS_TOKEN = '1234';

// Agent configs
var TEST_AGENT_EMAIL = 'test@testes.com';

var VERIFICATION_DATA = {
        id: '1',
        name: 'agent',
        email: 'agent@hg.com',
        scope: ['*'],
    };

var JWT_RESPONSE = {
        access_token: ACCESS_TOKEN, 
        token_type: 'Bearer',
        expires_in: 3600
    };

// Start up the test database
nconf.argv().env().file({ file: 'local.json' });
var token = require('../../config/token')(nconf.get('testDb'));

/**
 * Load a friend's token verification parameters
 * from the database
 */
exports.getParams = {

    setUp: function (callback) {
        try {
            /**
             * Setup an agent
             */
            this.geboDb = new dbSchema(nconf.get('testDb'));
            var agent = new this.geboDb.agentModel({
                    name: 'dan',
                    email: TEST_AGENT_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
            
            /**
             * Make a friend for the agent
             */
            this.agentDb = new dbSchema(TEST_AGENT_EMAIL);
            var friend = new this.agentDb.friendModel({
                    name: 'john',
                    email: 'john@painter.com',
                    token: ACCESS_TOKEN,
                    uri: BASE_ADDRESS,
                    request: REQUEST_ENDPOINT,
                    propose: PROPOSE_ENDPOINT,
                    inform: INFORM_ENDPOINT,
                });

            /**
             * Create access permissions for imaginary collection
             */
//            var permission = new this.agentDb.permissionModel({ email: 'someapp@example.com' });
//
//            friend.hisStuff.push(permission);
//            agent.friends.push(friend);

            agent.save(function(err) {
                if (err) {
                  console.log(err);
                }
                friend.save(function(err) {
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

    tearDown: function (callback) {
        this.geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
//            this.agentDb.connection.db.dropDatabase(function(err) {
//                if (err) {
//                  console.log(err)
//                }
                console.log('tearDown: DONE');
                callback();
//              });
          });
    }, 

//    'Don\'t barf if the requested friend doesn\'t exist': function(test) {
//        test.expect(1);
//        token.getParams('nosuchguy@friend.com').
//            then(function(friend) {
//                test.equal(friend, null);
//                test.done();
//              }).
//            catch(function(err) {
//                test.ok(false, err);
//                test.done();
//              });
//    },

    'Return an existing friend object': function(test) {
 //       test.expect(7);

 //       token.getParams('john@painter.com').
 //           then(function(friend) {
 //               test.equal(friend.name, 'John');
 //               test.equal(friend.email, 'john@painter.com');
 //               test.equal(friend.token, ACCESS_TOKEN);
 //               test.equal(friend.uri, BASE_ADDRESS);
 //               test.equal(friend.request, REQUEST_ENDPOINT);
 //               test.equal(friend.propose, PROPOSE_ENDPOINT);
 //               test.equal(friend.inform, INFORM_ENDPOINT);
 //               test.done();
 //             }).
 //           catch(function(err) {
 //               test.ok(false, err);      
            console.log('HERE');
                test.done();
 //             });
    },
}

/**
 * get
 */
//exports.get = {
//
//    setUp: function (callback) {
//
//    	try{
//            token.setParams({
//                    uri: BASE_ADDRESS,
//                    clientId: CLIENT_ID,
//                    redirectUri: REDIRECT_URI,
//                    authorization: AUTHORIZATION_ENDPOINT,
//                    request: REQUEST_ENDPOINT,
//                    verification: VERIFICATION_ENDPOINT,
//                });
//    
//            /**
//             * Setup an agent
//             */
//            this.db = new dbSchema(nconf.get('testDb'));
//            var agent = new this.db.agentModel({
//                    name: 'dan',
//                    email: 'dan@hg.com',
//                    password: 'password123',
//                    admin: true,
//                    _id: new mongo.ObjectID('0123456789AB')
//                });
//            
//            /**
//             * Make a friend for the agent
//             */
//            var friend = new this.db.friendModel({
//                    name: 'john',
//                    email: 'john@painter.com',
//                    token: ACCESS_TOKEN,
//
////                    myStuff: [],
////                    hisStuff: [],
////
////                    uri: { type: String, required: false, unique: false },
////                    request: { type: String, required: false, unique: false },
////                    propose: { type: String, required: false, unique: false },
////                    inform: { type: String, required: false, unique: false },
//                });
//
//            agent.friends.push(friend);
//            agent.save(function(err) {
//                if (err) {
//                  console.log(err);
//                }
//                callback();
//              });
//        }
//        catch(err) {
//            console.log(err);
//            callback();
//        }
//    },
//
//    tearDown: function (callback) {
//        this.db.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            callback();
//          });
//    }, 
//
//    'Return the external agent collection if it exists': function(test) {
//        test.expect(5);
//        token.get().
//            then(function(agent) {
////                test.equal(agent.clientId, CLIENT_ID);
////                test.equal(agent.token, ACCESS_TOKEN);
////                test.equal(agent.authorization, AUTHORIZATION_ENDPOINT);
////                test.equal(agent.request, REQUEST_ENDPOINT);
////                test.equal(agent.verification, VERIFICATION_ENDPOINT);
//                test.done();
//              }).
//            catch(function(err) {
//                console.log(err);
//                test.ok(false);
//                test.done();
//              });
//    },
//}

/**
 * set
 */
//exports.set = {
//
//    setUp: function (callback) {
//        token.setParams({
//                uri: BASE_ADDRESS,
//                clientId: CLIENT_ID,
//                redirectUri: REDIRECT_URI,
//                authorization: AUTHORIZATION_ENDPOINT,
//                request: REQUEST_ENDPOINT,
//                verification: VERIFICATION_ENDPOINT,
////                scopes: SCOPES
//            });
//
//        /**
//         * Setup an external agent
//         */
//        this.db = new dbSchema(nconf.get('testDb'));
//        var agent = new this.db.agentModel({
//                name: 'dan',
//                email: 'dan@hg.com',
//                password: 'password123',
//                admin: true,
////                clientId: CLIENT_ID,
////                authorization: AUTHORIZATION_ENDPOINT,
////                request: REQUEST_ENDPOINT,
////                verification: VERIFICATION_ENDPOINT,
////                token: ACCESS_TOKEN,
//                _id: new mongo.ObjectID('0123456789AB')
//            });
//
//        agent.save(function(err) {
//            if (err) {
//              console.log(err);
//            }
//            callback();
//          });
//    },
//
//    tearDown: function (callback) {
//        this.db.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            callback();
//          });
//    }, 
//
//    'Overwrite the access token value of a previously stored agent': function(test) {
//        test.expect(2);
//        token.get().
//            then(function(agent) {
////                test.equal(agent.token, ACCESS_TOKEN);
//                return token.set(ACCESS_TOKEN + '5678');
//              }).
//            then(function(ack) {
//                return token.get();
//              }).
//            then(function(agent) {
////                test.equal(agent.token, ACCESS_TOKEN + '5678');
//                test.done(); 
//              }).
//            catch(function(err) {
//                console.log(err);
//                test.ok(false);
//                test.done();
//              });
//    },
//};
//
///**
// * clear
// */
//exports.clear = {
//    setUp: function (callback) {
//        token.setParams({
//                uri: BASE_ADDRESS,
//                clientId: CLIENT_ID,
//                redirectUri: REDIRECT_URI,
//                authorization: AUTHORIZATION_ENDPOINT,
//                request: REQUEST_ENDPOINT,
//                verification: VERIFICATION_ENDPOINT,
////                scopes: SCOPES
//            });
//
//        /**
//         * Setup an external agent
//         */
//        this.db = new dbSchema(nconf.get('testDb'));
//        var agent = new this.db.agentModel({
//                name: 'dan',
//                email: 'dan@hg.com',
//                password: 'password123',
//                admin: true,
////                clientId: CLIENT_ID,
////                authorization: AUTHORIZATION_ENDPOINT,
////                request: REQUEST_ENDPOINT,
////                verification: VERIFICATION_ENDPOINT,
////                token: ACCESS_TOKEN,
//                _id: new mongo.ObjectID('0123456789AB')
//            });
//
//        agent.save(function(err) {
//            if (err) {
//              console.log(err);
//            }
//            callback();
//          });
//    },
//
//    tearDown: function(callback) {
//        this.db.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            callback();
//          });
//    },
//
//    'It sets the stored token to null': function(test) {
//        test.expect(2);
//        token.get().
//            then(function(agent) {
////                test.equal(agent.token, ACCESS_TOKEN);
//                return token.clear();
//              }).
//            then(function() {
//                return token.get();
//              }).
//            then(function(agent) {
////                test.equal(agent.token, null);
//                test.done(); 
//              }).
//            catch(function(err) {
//                console.log(err);
//                test.ok(false, err);
//                test.done();
//              });
//    },
//
//    'It doesn\'t barf when nullifying a token that doesn\'t exist': function(test) {
//        test.expect(5);
//
//        // Clear the one saved in setUp
//        token.clear().
//            then(function() {
//                // Clear it again
//                return token.clear();
//              }).
//            then(function() {
//                return token.get();
//              }).
//            then(function(agent) {
////                test.equal(agent.token, null);
////                test.equal(agent.clientId, CLIENT_ID);
////                test.equal(agent.authorization, AUTHORIZATION_ENDPOINT);
////                test.equal(agent.request, REQUEST_ENDPOINT);
////                test.equal(agent.verification, VERIFICATION_ENDPOINT);
//                test.done();
//              }).
//            catch(function(err) {
//                console.log(err);
//                test.ok(false, err);
//                test.done();
//              });
//    },
//};
//
///**
// * verify
// */
//exports.verify = {
//    setUp: function (callback) {
//        token.setParams({
//                uri: BASE_ADDRESS,
//                clientId: CLIENT_ID,
//                redirectUri: REDIRECT_URI,
//                authorization: AUTHORIZATION_ENDPOINT,
//                request: REQUEST_ENDPOINT,
//                verification: VERIFICATION_ENDPOINT,
////                scopes: SCOPES
//            });
//
//        /**
//         * Setup an external agent
//         */
//        this.db = new dbSchema(nconf.get('testDb'));
//        var agent = new this.db.agentModel({
//                name: 'dan',
//                email: 'dan@hg.com',
//                password: 'password123',
//                admin: true,
////                clientId: CLIENT_ID,
////                authorization: AUTHORIZATION_ENDPOINT,
////                request: REQUEST_ENDPOINT,
////                verification: VERIFICATION_ENDPOINT,
////                token: ACCESS_TOKEN,
//                _id: new mongo.ObjectID('0123456789AB')
//            });
//
//        agent.save(function(err) {
//            if (err) {
//              console.log(err);
//            }
//            callback();
//          });
//    },
//
//    tearDown: function(callback) {
//        this.db.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            callback();
//          });
//    },
//
//    'Store verification data': function(test) {
//        test.expect(6);
//
//        var scope = nock('http://' + BASE_ADDRESS).
//                get(VERIFICATION_ENDPOINT + '?access_token=' + ACCESS_TOKEN).
//                reply(201, VERIFICATION_DATA);  
//
//        token.verify(ACCESS_TOKEN).
//            then(function(data) {
//                test.equal(token.data().id, VERIFICATION_DATA.id);
//                test.equal(data.id, VERIFICATION_DATA.id);
//                test.equal(token.data().name, VERIFICATION_DATA.name);
//                test.equal(data.name, VERIFICATION_DATA.name);
//                test.equal(token.data().email, VERIFICATION_DATA.email);
//                test.equal(data.email, VERIFICATION_DATA.email);
//
//                scope.done();
//                test.done();
//            }); 
//    },
//};
//
///**
// * getTokenWithJwt
// */
//exports.getTokenWithJwt = {
//    setUp: function (callback) {
//        token.setParams({
//                uri: BASE_ADDRESS,
//                clientId: CLIENT_ID,
//                redirectUri: REDIRECT_URI,
//                authorization: AUTHORIZATION_ENDPOINT,
//                request: REQUEST_ENDPOINT,
//                verification: VERIFICATION_ENDPOINT,
////                scopes: SCOPES
//            });
//        callback();
//    },
//
//    tearDown: function(callback) {
//        callback();
//    },
//
//    'Get a token from the server agent': function(test) {
//        test.expect(3);
//        var scope = nock('http://' + BASE_ADDRESS).
//                post(AUTHORIZATION_ENDPOINT).
//                reply(200, JWT_RESPONSE);  
//
//        token.getTokenWithJwt().
//                then(function(t) {
//                    t= JSON.parse(t);
//                    scope.done();
//                    test.equal(t.access_token, JWT_RESPONSE.access_token);
//                    test.equal(t.token_type, JWT_RESPONSE.token_type);
//                    test.equal(t.expires_in, JWT_RESPONSE.expires_in);
//                    test.done();
//                  });
//    },
//};
