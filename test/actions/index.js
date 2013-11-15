var nconf = require('nconf'),
    mongo = require('mongodb'),
    utils = require('../../lib/utils');

nconf.argv().env().file({ file: 'local.json' });
var TEST_DB = utils.getMongoDbName(nconf.get('testDb'));

var gebo = require('../../schemata/gebo')(TEST_DB),
    agentSchema = require('../../schemata/agent');

var action = require('../../actions')(TEST_DB);

exports.onLoad = {

    'Load and initialize every file in the actions folder': function(test) {
        test.expect(13);
        // Note: actions, not action, as above
        var actions = require('../../actions')(TEST_DB);
        test.equal(typeof actions.dbExists, 'function');
        test.equal(typeof actions.getCollection, 'function');
        test.equal(typeof actions.save, 'function');
        test.equal(typeof actions.cp, 'function');
        test.equal(typeof actions.rm, 'function');
        test.equal(typeof actions.rmdir, 'function');
        test.equal(typeof actions.ls, 'function');
        test.equal(typeof actions.createDatabase, 'function');
        test.equal(typeof actions.dropDatabase, 'function');
        test.equal(typeof actions.registerAgent, 'function');
        test.equal(typeof actions.deregisterAgent, 'function');
        test.equal(typeof actions.friend, 'function');
        test.equal(typeof actions.defriend, 'function');
        test.done();
    },
};

/**
 * agree
 */
exports.agree = {
   setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var registrant = new gebo.registrantModel({
                    name: 'dan',
                    email: 'dan@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a social commitment
             */
            var newFriend = {
                    name: 'Yanfen',
                    email: 'yanfen@hg.com',
                    uri: 'https://theirhost.com',
                    hisCertificate: 'some certificate',
                };
 
            var agentDb = new agentSchema('dan@hg.com'); 
            var sc = new agentDb.socialCommitmentModel({
                    type: 'request',
                    action: 'friend',
                    data: { newFriend: newFriend },
                    creditor: 'yanfen@hg.com',
                    debtor: 'dan@hg.com',
                  });

            registrant.save(function(err) {
                sc.save(function(err) {
                    if (err) {
                        console.log(err);
                      }
                      agentDb.connection.db.close();
                      callback();
                    });
                  });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
       
        gebo.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        var agentDb = new agentSchema('dan@hg.com'); 
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err);
                }
                agentDb.connection.db.close();
                callback();
              });
          });
     }, 

    'Perform the action and fulfil the social commitment': function(test) {
        test.expect(7);

        // Get the social commitment
        var agentDb = new agentSchema('dan@hg.com'); 
        agentDb.socialCommitmentModel.find({}, function(err, scs) {
            test.equal(scs.length, 1);
            action.agree({ dbName: 'dan@hg.com', read: true, write: true, execute: true }, scs[0]).
                then(function(data) {
                    agentDb.connection.db.close();
                    console.log('data');
                    console.log(data);
                    test.equal(data.name, 'Yanfen');
                    test.equal(data.email, 'yanfen@hg.com');
                    test.equal(data.uri, 'https://theirhost.com');
                    test.equal(data.hisCertificate, 'some certificate');
                    agentDb = new agentSchema('dan@hg.com'); 
                    agentDb.socialCommitmentModel.find({}, function(err, scs) {
                        agentDb.connection.db.close();
                        if (err) {
                          console.log(err);
                          test.ok(false, err);
                        }
                        console.log('scs');
                        console.log(scs);
                        test.equal(scs.length, 1);
                        test.equal(typeof scs[0].fulfilled, 'object');
                        test.done();
                      });
                  }).
                catch(function(err) {
                    console.log(err);
                    test.ok(false, err);
                    test.done();
                  });
          });
    },
};

/**
 * refuse
 */
exports.refuse = {
   setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            var registrant = new gebo.registrantModel({
                    name: 'dan',
                    email: 'dan@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a social commitment
             */
            var newFriend = {
                    name: 'Yanfen',
                    email: 'yanfen@hg.com',
                    uri: 'https://theirhost.com',
                    hisCertificate: 'some certificate',
                };
 
            var agentDb = new agentSchema('dan@hg.com'); 
            var sc = new agentDb.socialCommitmentModel({
                    type: 'request',
                    action: 'friend',
                    data: { newFriend: newFriend },
                    creditor: 'yanfen@hg.com',
                    debtor: 'dan@hg.com',
                  });

            registrant.save(function(err) {
                sc.save(function(err) {
                    if (err) {
                        console.log(err);
                      }
                      agentDb.connection.db.close();
                      callback();
                    });
                  });
     	}
        catch(e) {
            console.dir(e);
            callback();
    	}
    }, 

    tearDown: function(callback) {
       
        gebo.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        var agentDb = new agentSchema('dan@hg.com'); 
        agentDb.connection.on('open', function(err) {
            agentDb.connection.db.dropDatabase(function(err) {
                if (err) {
                  console.log(err);
                }
                agentDb.connection.db.close();
                callback();
              });
          });
     }, 

    'Fulfil the social commitment but do not perform the action': function(test) {
//        test.expect(7);

        // Get the social commitment
//        var agentDb = new agentSchema('dan@hg.com'); 
//        agentDb.socialCommitmentModel.find({}, function(err, scs) {
//            test.equal(scs.length, 1);
//            action.agree({ dbName: 'dan@hg.com', read: true, write: true, execute: true }, scs[0]).
//                then(function(data) {
//                    agentDb.connection.db.close();
//                    console.log('data');
//                    console.log(data);
//                    test.equal(data.name, 'Yanfen');
//                    test.equal(data.email, 'yanfen@hg.com');
//                    test.equal(data.uri, 'https://theirhost.com');
//                    test.equal(data.hisCertificate, 'some certificate');
//                    var agentDb = new agentSchema('dan@hg.com'); 
//                    agentDb.socialCommitmentModel.find({}, function(err, scs) {
//                        if (err) {
//                          console.log(err);
//                          test.ok(false, err);
//                        }
//                        console.log('scs');
//                        console.log(scs);
//                        agentDb.connection.db.close();
//                        test.equal(scs.length, 1);
//                        test.equal(typeof scs[0].fulfilled, 'object');
                        test.done();
//                      });
//                  }).
//                catch(function(err) {
//                    console.log(err);
//                    test.ok(false, err);
//                    test.done();
//                  });
//          });
    },
};


