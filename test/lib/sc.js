var mongo = require('mongodb'),
    geboSchema = require('../../schemata/gebo'),
    nconf = require('nconf'),
    utils = require('../../lib/utils'),
    sc = require('../../lib/sc'),
    agentSchema = require('../../schemata/agent');

var BASE_ADDRESS = 'http://theirhost.com';

nconf.file({ file: 'gebo.json' });

var SIGNING_PAIR;
utils.getPrivateKeyAndCertificate().
    then(function(pair) {
        SIGNING_PAIR = pair
      });

/**
 * form
 */
exports.form = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var geboDb = new geboSchema();
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            /**
             * Make a social commitment
             */
            var newFriend = {
                    name: 'Dan',
                    email: 'dan@example.com',
                    uri: 'https://theirhost.com',
                    hisCertificate: 'some certificate',
                };
 
            var agentDb = new agentSchema(); 
            var sc = new agentDb.socialCommitmentModel({
                    performative: 'request',
                    action: 'friend',
                    message: { newFriend: newFriend },
                    creditor: 'dan@example.com',
                    debtor: 'yanfen@example.com',
                    _id: new mongo.ObjectID('123456789ABC')
                  });

            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                sc.save(function(err) {
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
        var geboDb = new geboSchema();
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            var agentDb = new agentSchema();
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
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

        var message = {
                newFriend: friend,
                receiver: 'yanfen@example.com',
                action: 'friend',
              };

        sc.form(agent, 'request', message).
            then(function(socialCommitment) {
                test.equal(socialCommitment.performative, 'request');
                test.equal(socialCommitment.action, 'friend');
                test.equal(socialCommitment.message.newFriend.name, 'richard');
                test.equal(socialCommitment.message.newFriend.email, 'richard@construction.com');
                test.equal(socialCommitment.message.newFriend.uri, BASE_ADDRESS);
                test.equal(socialCommitment.message.newFriend.hisCertificate, SIGNING_PAIR.certificate);
                test.equal(socialCommitment.debtor, 'yanfen@example.com');
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

    'Return an existing social commitment if provided an ID': function(test) {
        test.expect(10);

        var friend = {
                name: 'Dan',
                email: 'dan@example.com',
                uri: 'https://theirhost.com',
                hisCertificate: 'some certificate',
            };
 
        var message = {
                receiver: 'yanfen@example.com',
                action: 'friend',
                newFriend: friend,
                socialCommitmentId: new mongo.ObjectID('123456789ABC')
              };

        var agent = {
                email: 'dan@example.com',
              };

        sc.form(agent, 'request', message).
            then(function(socialCommitment) {
                test.equal(socialCommitment.performative, 'request');
                test.equal(socialCommitment.action, 'friend');
                test.equal(socialCommitment.message.newFriend.name, 'Dan');
                test.equal(socialCommitment.message.newFriend.email, 'dan@example.com');
                test.equal(socialCommitment.message.newFriend.uri, 'https://theirhost.com');
                test.equal(socialCommitment.message.newFriend.hisCertificate, 'some certificate');
                test.equal(socialCommitment.debtor, 'yanfen@example.com');
                test.equal(socialCommitment.creditor, 'dan@example.com');
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
 * fulfil
 */
exports.fulfil = {

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
    
            var message = {
                    newFriend: friend,
                    receiver: 'yanfen@example.com',
                    action: 'friend',
                  };

            /**
             * Setup a registrant
             */
            var geboDb = new geboSchema();
            var registrant = new geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@example.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            // There has got to be a better way to do this...
            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                sc.form(agent, 'request', message).
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
        var geboDb = new geboSchema();
        geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            var agentDb = new agentSchema();
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err)
                }
                callback();
              });
          });
    },

    'Set the fulfillment date on the socialCommitment document': function(test) {
        test.expect(10);
        var agentDb = new agentSchema();
        agentDb.socialCommitmentModel.findOne({ creditor: 'richard@construction.com' },
            function(err, socialCommitment) {
                if (err) {
                  console.log(err);
                  test.ok(false, err);
                }
                sc.fulfil('yanfen@example.com', socialCommitment._id).
                    then(function(socialCommitment) {
                        test.equal(socialCommitment.performative, 'request');
                        test.equal(socialCommitment.action, 'friend');
                        test.equal(socialCommitment.message.newFriend.name, 'richard');
                        test.equal(socialCommitment.message.newFriend.email, 'richard@construction.com');
                        test.equal(socialCommitment.message.newFriend.uri, BASE_ADDRESS);
                        test.equal(socialCommitment.message.newFriend.hisCertificate, SIGNING_PAIR.certificate);
                        test.equal(socialCommitment.debtor, 'yanfen@example.com');
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



