var nock = require('nock'),
    config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    http = require('http'),
    utils = require('../../lib/utils'),
    geboSchema = require('../../schemata/gebo'),
    agentSchema = require('../../schemata/agent');

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
        name: 'registrant',
        email: 'registrant@hg.com',
        scope: ['*'],
    };

var JWT_RESPONSE = {
        access_token: ACCESS_TOKEN, 
        token_type: 'Bearer',
        expires_in: 3600
    };

// Start up the test database
nconf.argv().env().file({ file: 'local.json' });
var token = require('../../config/token')(TEST_AGENT_EMAIL);

/**
 * getParams
 */
exports.getParams = {

    setUp: function (callback) {
        try {
            /**
             * Setup an registrant
             */
            this.geboDb = new geboSchema(nconf.get('testDb'));
            var registrant = new this.geboDb.registrantModel({
                    name: 'dan',
                    email: TEST_AGENT_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
            
            /**
             * Make a friend for the registrant
             */
            this.agentDb = new agentSchema(TEST_AGENT_EMAIL);
            var friend = new this.agentDb.friendModel({
                    name: 'john',
                    email: 'john@painter.com',
                    myToken: ACCESS_TOKEN,
                    uri: BASE_ADDRESS,
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someapp@example.com' });

            registrant.save(function(err) {
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
          });

        this.agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    }, 

    'Return null if the friend profile has not been loaded': function(test) {
        test.expect(1);
        var params = token.getParams();
        test.equals(params, null);
        test.done();
    },

    'Return OAuth2 handshake parameters': function(test) {
        test.expect(3);
        token.loadFriend('john@painter.com').then(function(friend) {
                var params = token.getParams();
                test.equals(params.response_type, 'token');
                test.equals(params.client_id, utils.getMongoDbName(TEST_AGENT_EMAIL));
                test.equals(params.redirect_uri, 'http://localhost:3000/callback');
                test.done();
        });
    },

}


/**
 * Load a friend's token verification parameters
 * from the database
 */
exports.loadFriend = {
    setUp: function (callback) {
        try {
            /**
             * Setup an registrant
             */
            this.geboDb = new geboSchema(nconf.get('testDb'));
            var registrant = new this.geboDb.registrantModel({
                    name: 'dan',
                    email: TEST_AGENT_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
            
            /**
             * Make a friend for the registrant
             */
            this.agentDb = new agentSchema(TEST_AGENT_EMAIL);
            var friend = new this.agentDb.friendModel({
                    name: 'John',
                    email: 'john@painter.com',
                    myToken: ACCESS_TOKEN,
                    uri: BASE_ADDRESS,
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someapp@example.com' });

            registrant.save(function(err) {
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
          });

        this.agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    }, 

    'Don\'t barf if the requested friend doesn\'t exist': function(test) {
        test.expect(1);
        token.loadFriend('nosuchguy@friend.com').
            then(function(friend) {
                test.equal(friend, null);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return an existing friend object': function(test) {
        test.expect(7);

        token.loadFriend('john@painter.com').
            then(function(friend) {
                test.equal(friend.name, 'John');
                test.equal(friend.email, 'john@painter.com');
                test.equal(friend.myToken, ACCESS_TOKEN);
                test.equal(friend.uri, BASE_ADDRESS);
                test.equal(friend.request, REQUEST_ENDPOINT);
                test.equal(friend.propose, PROPOSE_ENDPOINT);
                test.equal(friend.inform, INFORM_ENDPOINT);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);      
                test.done();
              });
    },
}

/**
 * get
 */
exports.get = {

    setUp: function (callback) {
        try {
            /**
             * Setup an registrant
             */
            this.geboDb = new geboSchema(nconf.get('testDb'));
            var registrant = new this.geboDb.registrantModel({
                    name: 'dan',
                    email: TEST_AGENT_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
            
            /**
             * Make a friend for the registrant
             */
            this.agentDb = new agentSchema(TEST_AGENT_EMAIL);
            var friend = new this.agentDb.friendModel({
                    name: 'John',
                    email: 'john@painter.com',
                    myToken: ACCESS_TOKEN,
                    uri: BASE_ADDRESS,
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someapp@example.com' });

            registrant.save(function(err) {
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
          });

        this.agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Don\'t barf if this friend does not exist': function(test) {
        test.expect(1);
        token.get('nosuchguy@friend.com').
            then(function(token) {
                test.equal(token, null); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();                   
              });
    },

    'Get the access token associated with this agent': function(test) {
        test.expect(1);
        token.get('john@painter.com').
            then(function(token) {
                test.equal(token, ACCESS_TOKEN); 
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false);
                test.done();
              });
    },
};

/**
 * set
 */
exports.set = {
    setUp: function (callback) {
        try {
            /**
             * Setup an registrant
             */
            this.geboDb = new geboSchema(nconf.get('testDb'));
            var registrant = new this.geboDb.registrantModel({
                    name: 'dan',
                    email: TEST_AGENT_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
            
            /**
             * Make a friend for the registrant
             */
            this.agentDb = new agentSchema(TEST_AGENT_EMAIL);
            var friend = new this.agentDb.friendModel({
                    name: 'John',
                    email: 'john@painter.com',
                    myToken: ACCESS_TOKEN,
                    uri: BASE_ADDRESS,
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someapp@example.com' });

            registrant.save(function(err) {
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
          });

        this.agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Don\'t barf if the specified friend does not exist': function(test) {
        test.expect(1);
        token.set('nosuchguy@friend.com').
            then(function(ack){
                test.done();
               }).
            catch(function(err) {
                test.ok(true);     
                test.done();
              });
    },

    'Overwrite the access token value of a previously stored friend': function(test) {
        test.expect(2);
        token.get('john@painter.com').
            then(function(tkn) {
                test.equal(tkn, ACCESS_TOKEN);
                return token.set('john@painter.com', ACCESS_TOKEN + '5678');
              }).
            then(function(ack) {
                return token.get('john@painter.com');
              }).
            then(function(tkn) {
                test.equal(tkn, ACCESS_TOKEN + '5678');
                test.done(); 
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false);
                test.done();
              });
    },
};

/**
 * verify
 */
//exports.verify = {
//    setUp: function (callback) {
//        try {
//            /**
//             * Setup an registrant
//             */
//            this.geboDb = new geboSchema(nconf.get('testDb'));
//            var registrant = new this.geboDb.registrantModel({
//                    name: 'dan',
//                    email: TEST_AGENT_EMAIL,
//                    password: 'password123',
//                    admin: true,
//                    _id: new mongo.ObjectID('0123456789AB')
//                });
//            
//            /**
//             * Make a friend for the registrant
//             */
//            this.agentDb = new agentSchema(TEST_AGENT_EMAIL);
//            var friend = new this.agentDb.friendModel({
//                    name: 'John',
//                    email: 'john@painter.com',
//                    myToken: ACCESS_TOKEN,
//                    uri: BASE_ADDRESS,
//                });
//
//            /**
//             * Create access permissions for imaginary collection
//             */
//            friend.hisPermissions.push({ email: 'someapp@example.com' });
//
//            registrant.save(function(err) {
//                if (err) {
//                  console.log(err);
//                }
//                friend.save(function(err) {
//                    if (err) {
//                      console.log(err);
//                    }
//                    callback();
//                  });
//              });
//        }
//        catch(err) {
//            console.log(err);
//            callback();
//        }
//    },
//
//    tearDown: function (callback) {
//        this.geboDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//          });
//
//        this.agentDb.connection.db.dropDatabase(function(err) {
//            if (err) {
//              console.log(err)
//            }
//            callback();
//          });
//    },
//
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

/**
 * getTokenWithJwt
 */
exports.getTokenWithJwt = {
    setUp: function (callback) {
        try {
            /**
             * Setup an registrant
             */
            this.geboDb = new geboSchema(nconf.get('testDb'));
            var registrant = new this.geboDb.registrantModel({
                    name: 'dan',
                    email: TEST_AGENT_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
            
            /**
             * Make a friend for the registrant
             */
            this.agentDb = new agentSchema(TEST_AGENT_EMAIL);
            var friend = new this.agentDb.friendModel({
                    name: 'John',
                    email: 'john@painter.com',
                    myToken: ACCESS_TOKEN,
                    uri: BASE_ADDRESS,
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someapp@example.com' });

            registrant.save(function(err) {
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
          });

        this.agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },


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
};
