/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../../lib/native-mongo-connection').get(true, function(){}),
    mongoose = require('gebo-mongoose-connection').get(true);

var nock = require('nock'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    http = require('http'),
    utils = require('gebo-utils'),
    base64url = require('base64url'),
    crypto = require('crypto'),
    fs = require('fs'),
    geboDb = require('../../schemata/gebo')(),
    agentDb = require('../../schemata/agent')();

// Foreign agent configurations
var CLIENT_ID = 'abc123',
    BASE_ADDRESS = 'theirhost.com',
    AUTHORIZATION_ENDPOINT = '/authorize',
    ACCESS_TOKEN = '1234';

// Agent configs
var TEST_AGENT_EMAIL = 'test@testes.com';

var JWT_RESPONSE = {
        access_token: ACCESS_TOKEN, 
        token_type: 'Bearer',
        expires_in: 3600
    };

// Start up the test database
nconf.file({ file: 'gebo.json' });
var Token = require('../../config/token');


/**
 * Load a friendo's token verification parameters
 * from the database
 */
exports.getFriend = {
    setUp: function (callback) {
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
             * Make a friendo for the registrant
             */
            var friendo = new agentDb.friendoModel({
                    name: 'John',
                    email: 'john@painter.com',
                    gebo: BASE_ADDRESS,
                });

            /**
             * Create access permissions for imaginary collection
             */
            friendo.permissions.push({ resource: 'someAppCollection' });

            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                friendo.save(function(err) {
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

    'Don\'t barf if the requested friendo doesn\'t exist': function(test) {
        test.expect(1);

        var token = new Token('dan@example.com');
        token.getFriend('nosuchguy@friendo.com').
            then(function(friendo) {
                test.ok(false, 'Shouldn\'t get here');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'nosuchguy@friendo.com is not your friendo');
                test.done();
              });
    },

    'Return an existing friendo object': function(test) {
        test.expect(3);

        var token = new Token('dan@example.com');
        token.getFriend('john@painter.com').
            then(function(friendo) {
                test.equal(friendo.name, 'John');
                test.equal(friendo.email, 'john@painter.com');
                test.equal(friendo.gebo, BASE_ADDRESS);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },
}

/**
 * getKey
 */
exports.getKey = {
    setUp: function (callback) {
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
             * Make a key 
             */
            var key = new agentDb.keyModel({
                    public: 'some public certificate',
                    private: 'some private key',
                    email: 'john@painter.com',
                });

            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                key.save(function(err) {
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

    'Don\'t barf if the requested key doesn\'t exist': function(test) {
        test.expect(1);

        var token = new Token('dan@example.com');
        token.getKey('nosuchguy@friendo.com').
            then(function(friendo) {
                test.ok(false, 'Shouldn\'t get here');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You have not created a key for nosuchguy@friendo.com');
                test.done();
              });
    },

    'Return an existing private key': function(test) {
        test.expect(1);

        var token = new Token('dan@example.com');
        token.getKey('john@painter.com').
            then(function(privateKey) {
                test.equal(privateKey, 'some private key');
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);      
                test.done();
              });
    },
}

/**
 * getCertificate
 */
exports.getCertificate = {
    setUp: function (callback) {
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
             * Make a key 
             */
            var key = new agentDb.keyModel({
                    public: 'some public certificate',
                    private: 'some private key',
                    email: 'john@painter.com',
                });

            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                key.save(function(err) {
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

    'Don\'t barf if the requested key doesn\'t exist': function(test) {
        test.expect(1);

        var token = new Token('dan@example.com');
        token.getCertificate('nosuchguy@friendo.com').
            then(function(friendo) {
                test.ok(false, 'Shouldn\'t get here');
                test.done();
              }).
            catch(function(err) {
                test.equal(err, 'You have not created a certificate for nosuchguy@friendo.com');
                test.done();
              });
    },

    'Return an existing certificate': function(test) {
        test.expect(1);

        var token = new Token('dan@example.com');
        token.getCertificate('john@painter.com').
            then(function(privateKey) {
                test.equal(privateKey, 'some public certificate');
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
             * Set up the gebo registrant
             */
            var registrant = new geboDb.registrantModel({
                    name: 'Dan',
                    email: 'dan@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });

            /**
             * Make a friendo for the gebo registrant
             */
            var friendo = new agentDb.friendoModel({
                    name: 'John',
                    email: 'john@painter.com',
                    gebo: BASE_ADDRESS,
                });
            
            var otherFriend = new agentDb.friendoModel({
                    name: 'Richard',
                    email: 'richard@construction.com',
                    gebo: BASE_ADDRESS + ':3443',
                });

            /**
             * Make a key 
             */
            utils.getPrivateKeyAndCertificate().
                then(function(pair) {
                    var friendoKey = new agentDb.keyModel({
                            public: pair.certificate,
                            private: pair.privateKey,
                            email: 'john@painter.com',
                        });

                    var otherFriendKey = new agentDb.keyModel({
                            public: pair.certificate,
                            private: pair.privateKey,
                            email: 'richard@construction.com',
                        });

          
                    registrant.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                        friendoKey.save(function(err) {
                            if (err) {
                              console.log(err);
                            }
                            otherFriend.save(function(err) {
                                if (err) {
                                  console.log(err);
                                }
                                friendo.save(function(err) {
                                    if (err) {
                                      console.log(err);
                                    }
                                    otherFriendKey.save(function(err) {
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
        }
        catch(err) {
            console.log(err);
            callback();
        }
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

    'Get a token from the server agent': function(test) {
        test.expect(3);
        var scope = nock('https://' + BASE_ADDRESS).
                post(AUTHORIZATION_ENDPOINT).
                reply(200, JWT_RESPONSE);  

        var token = new Token('dan@example.com');
        token.get('john@painter.com').
                then(function(t) {
                    scope.done();
                    test.equal(t.access_token, JWT_RESPONSE.access_token);
                    test.equal(t.token_type, JWT_RESPONSE.token_type);
                    test.equal(t.expires_in, JWT_RESPONSE.expires_in);
                    test.done();
                  }).
                catch(function(err) {
                    console.log(err);
                    test.ok(false, err);
                    test.done();
                  });
    },

    'Get a token from the server agent with port specified': function(test) {
        test.expect(3);
        var scope = nock('https://' + BASE_ADDRESS + ':3443').
                post(AUTHORIZATION_ENDPOINT).
                reply(200, JWT_RESPONSE);  

        var token = new Token('dan@example.com');
        token.get('richard@construction.com').
                then(function(t) {
                    scope.done();
                    test.equal(t.access_token, JWT_RESPONSE.access_token);
                    test.equal(t.token_type, JWT_RESPONSE.token_type);
                    test.equal(t.expires_in, JWT_RESPONSE.expires_in);
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
 * makeJwt
 */
var _pair;
exports.makeJwt = {
    setUp: function (callback) {
        try {

            /**
             * Make a key 
             */
            utils.getPrivateKeyAndCertificate().
                then(function(pair) {
                    _pair = pair;
                    var key = new agentDb.keyModel({
                            public: _pair.certificate,
                            private: _pair.privateKey,
                            email: 'john@painter.com',
                        });

                    key.save(function(err) {
                        if (err) {
                          console.log(err);
                        }

                        var friendo = new agentDb.friendoModel({
                                        name: 'Dan',
                                        email: 'dan@example.com',
                                        certificate: _pair.certificate,
                                    });

                        friendo.save(function(err) {
                            if (err) {
                              console.log(err);
                            }
                            callback();
                          });
                      });
                  }).
                catch(function(err) {
                    console.log(err);
                    callback();
                  });
        }
        catch(err) {
            console.log(err);
            callback();
        }

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

    'Return an encoded claim set': function(test) {
        test.expect(1);
        var header = { alg: 'RS256', typ: 'JWT' };
        var claim = { iss: '761326798069-r5mljlln1rd4lrbhg75efgigp36m78j5@developer.gserviceaccount.com',
                      scope: 'https://www.googleapis.com/auth/devstorage.readonly',
                      aud: 'https://accounts.google.com/o/oauth2/token',
                      exp: 1328554385,
                      iat: 1328550785 };

        var headerEncoded = base64url(JSON.stringify(header)),
            claimEncoded = base64url(JSON.stringify(claim));

        var sign = crypto.createSign('sha256WithRSAEncryption');
        sign.update(headerEncoded + '.' + claimEncoded);
        var signature = sign.sign(_pair.privateKey);
        var signatureEncoded = base64url(signature);

        var token = new Token('dan@example.com');
        token.makeJwt(claim, 'john@painter.com').
            then(function(jwt) {
                test.equal(jwt, headerEncoded + '.' + claimEncoded + '.' + signatureEncoded);
                test.done();
              }).
            catch(function(err) {
                console.log(err);
                test.ok(false, err);
                test.done();
              });
    },

    'Return a verifiable claim set': function(test) {
        test.expect(1);
        var header = { alg: 'RS256', typ: 'JWT' };
        var claim = { iss: '761326798069-r5mljlln1rd4lrbhg75efgigp36m78j5@developer.gserviceaccount.com',
                      scope: 'https://www.googleapis.com/auth/devstorage.readonly',
                      aud: 'https://accounts.google.com/o/oauth2/token',
                      exp: 1328554385,
                      iat: 1328550785 };

        var token = new Token('dan@example.com');
        token.makeJwt(claim, 'john@painter.com').
            then(function(jwt) {
                agentDb.friendoModel.findOne({ email: 'dan@example.com' }, function(err, friendo) {
                        var verifier = crypto.createVerify('sha256WithRSAEncryption');
                        var data = jwt.split('.');
                        var signature = data.pop();
                        data = data.join('.');
                        verifier.update(data);
    
                        test.ok(verifier.verify(friendo.certificate, signature, 'base64'));
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
