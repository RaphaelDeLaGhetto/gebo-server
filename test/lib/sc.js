/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../../lib/native-mongo-connection').get(true, function(){}),
    mongoose = require('gebo-mongoose-connection').get(true);

var mongo = require('mongodb'),
    nconf = require('nconf'),
    utils = require('../../lib/utils'),
    sc = require('../../lib/sc'),
    geboDb = require('../../schemata/gebo')(),
    agentDb = require('../../schemata/agent')();

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
                    gebo: 'https://theirhost.com',
//                    hisCertificate: 'some certificate',
                };
 
            var sc = new agentDb.socialCommitmentModel({
                    performative: 'request',
                    action: 'friendo',
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

    'Add a social commitment to the agent\'s database': function(test) {
        test.expect(9);

        var friendo = {
                name: 'richard',
                email: 'richard@construction.com',
                gebo: BASE_ADDRESS,
//                hisCertificate: SIGNING_PAIR.certificate,
              };

        var agent = {
                email: 'richard@construction.com',
              };

        var message = {
                newFriend: friendo,
                receiver: 'yanfen@example.com',
                action: 'friendo',
              };

        sc.form(agent, 'request', message).
            then(function(socialCommitment) {
                test.equal(socialCommitment.performative, 'request');
                test.equal(socialCommitment.action, 'friendo');
                test.equal(socialCommitment.message.newFriend.name, 'richard');
                test.equal(socialCommitment.message.newFriend.email, 'richard@construction.com');
                test.equal(socialCommitment.message.newFriend.gebo, BASE_ADDRESS);
//                test.equal(socialCommitment.message.newFriend.hisCertificate, SIGNING_PAIR.certificate);
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
        test.expect(9);

        var friendo = {
                name: 'Dan',
                email: 'dan@example.com',
                gebo: 'https://theirhost.com',
//                hisCertificate: 'some certificate',
            };
 
        var message = {
                receiver: 'yanfen@example.com',
                action: 'friendo',
                newFriend: friendo,
                socialCommitmentId: new mongo.ObjectID('123456789ABC')
              };

        var agent = {
                email: 'dan@example.com',
              };

        sc.form(agent, 'request', message).
            then(function(socialCommitment) {
                test.equal(socialCommitment.performative, 'request');
                test.equal(socialCommitment.action, 'friendo');
                test.equal(socialCommitment.message.newFriend.name, 'Dan');
                test.equal(socialCommitment.message.newFriend.email, 'dan@example.com');
                test.equal(socialCommitment.message.newFriend.gebo, 'https://theirhost.com');
//                test.equal(socialCommitment.message.newFriend.hisCertificate, 'some certificate');
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
            var friendo = {
                    name: 'richard',
                    email: 'richard@construction.com',
                    gebo: BASE_ADDRESS,
//                    hisCertificate: SIGNING_PAIR.certificate,
                  };
    
            var agent = {
                    email: 'richard@construction.com',
                  };
    
            var message = {
                    newFriend: friendo,
                    receiver: 'yanfen@example.com',
                    action: 'friendo',
                  };

            /**
             * Setup a registrant
             */
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

    'Set the fulfillment date on the socialCommitment document': function(test) {
        test.expect(9);
        agentDb.socialCommitmentModel.findOne({ creditor: 'richard@construction.com' },
            function(err, socialCommitment) {
                if (err) {
                  console.log(err);
                  test.ok(false, err);
                }
                sc.fulfil('yanfen@example.com', socialCommitment._id).
                    then(function(socialCommitment) {
                        test.equal(socialCommitment.performative, 'request');
                        test.equal(socialCommitment.action, 'friendo');
                        test.equal(socialCommitment.message.newFriend.name, 'richard');
                        test.equal(socialCommitment.message.newFriend.email, 'richard@construction.com');
                        test.equal(socialCommitment.message.newFriend.gebo, BASE_ADDRESS);
//                        test.equal(socialCommitment.message.newFriend.hisCertificate, SIGNING_PAIR.certificate);
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



