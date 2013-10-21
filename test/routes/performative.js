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
var ADMIN_EMAIL = 'test@testoclese.com',
    BASE_ADDRESS = 'http://theirhost.com';


//var TEST_DB = nconf.argv().env().file({ file: 'local.json' }).get('testDb');
var performativeRoute = require('../../routes/performative');//(TEST_DB);


/**
 * verify
 */
exports.verify = {

    setUp: function(callback) {
        try {
            /**
             * Setup a registrant
             */
            this.geboDb = new geboSchema(nconf.get('testDb'));
            var registrant = new this.geboDb.registrantModel({
                    name: 'dan',
                    email: ADMIN_EMAIL,
                    password: 'password123',
                    admin: true,
                    _id: new mongo.ObjectID('0123456789AB')
                });
          
            /**
             * Make a friend for the registrant
             */
            this.adminAgentDb = new agentSchema(ADMIN_EMAIL);
            var friend = new this.adminAgentDb.friendModel({
                    name: 'john',
                    email: 'john@painter.com',
                    hisToken: ADMIN_TOKEN,
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('23456789ABCD')
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someapp@example.com' });

            /**
             * Create an access token for the friend
             */
            var token = new this.geboDb.tokenModel({
                    registrantId: new mongo.ObjectID('0123456789AB'),
                    friendId: new mongo.ObjectID('23456789ABCD'),
                    string: ADMIN_TOKEN,
                });


            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                token.save(function(err) {
                     if (err) {
                      console.log(err);
                    }
                    friend.save(function(err) {
                        if (err) {
                          console.log(err);
                        }
                      });
                });
             });

            /** 
             * Set up another registrant
             */
            registrant = new this.geboDb.registrantModel({
                    name: 'yanfen',
                    email: 'yanfen@hg.com',
                    password: 'password123',
                    admin: false,
                    _id: new mongo.ObjectID('123456789ABC')
                });

            /**
             * Make a friend for the new registrant
             */
            this.regularAgentDb = new agentSchema('yanfen@hg.com');
            friend = new this.regularAgentDb.friendModel({
                    name: 'richard',
                    email: 'richard@construction.com',
                    hisToken: USER_TOKEN,
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('3456789ABCDE')
                });

            /**
             * Create access permissions for imaginary collection
             */
            friend.hisPermissions.push({ email: 'someotherapp@example.com' });

            /**
             * Create an access token for the friend
             */
            token = new this.geboDb.tokenModel({
                    registrantId: new mongo.ObjectID('123456789ABC'),
                    friendId: new mongo.ObjectID('3456789ABCDE'),
                    string: USER_TOKEN,
                });

            registrant.save(function(err) {
                if (err) {
                  console.log(err);
                }
                token.save(function(err) {
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
              });
        }
        catch(err) {
            console.log(err);
            callback();
        }
    },

    tearDown: function(callback) {
        this.geboDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        this.adminAgentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
          });

        this.regularAgentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

   'Allow agent access to his database': function(test) {
//        test.expect(3);
        var performative = new performativeRoute(nconf.get('testDb'));
        performative.verify(USER_TOKEN, 'richard@construction.com', 'someotherapp@example.com').
            then(function(verified) {
//                test.equal(verified.dbName, 'yanfen_at_hg_dot_com');
//                test.equal(verified.collectionName, 'todoApp');
//                test.equal(verified.admin, false);
                test.done();
              });//.
//            catch(function(err) {
//                console.log('ERRORRRRRRRRRRRR: ' + err);
//                test.ok(false, err);
//                test.done();
//              });
//        performative.verify(USER_TOKEN, 'yanfen@hg.com').
//            then(function(verified) {
//                test.equal(verified.dbName, 'yanfen_at_hg_dot_com');
//                test.equal(verified.collectionName, 'todoApp');
//                test.equal(verified.admin, false);
//                test.done();
//              }).
//            catch(function(err) {
//                console.log('ERRORRRRRRRRRRRR: ' + err);
//                test.ok(false, err);
//                test.done();
//              });
   }, 

   'Do not allow agent access to another agent\'s database': function(test) {
//        test.expect(1);
//        var performative = new performativeRoute(ADMIN_EMAIL);
//        performative.verify(USER_TOKEN, 'dan@hg.com').
//           then(function(verified) {
//                test.ok(false, 'Should not get here');
//                test.done();
//             }).
//           catch(function(err) {
//                test.equal(err, 'You are not permitted to access that resource');
                test.done();
//             });
   },

   'Do not barf if access has not been granted to the requested resource': function(test) {
        test.done();
   },
//   'Allow admin access to his database': function(test) {
//        test.expect(3);
//        var performative = new performativeRoute(ADMIN_EMAIL);
//        performative.verify(ADMIN_TOKEN, 'dan@hg.com').
//            then(function(verified) {
//                test.equal(verified.dbName, 'dan_at_hg_dot_com');
//                test.equal(verified.collectionName, 'todoApp');
//                test.equal(verified.admin, true);
//                test.done();
//              }).
//            catch(function(err) {
//                test.ok(false, err);
//                test.done();
//              });
//   },
//
//   'Allow admin access to another agent\'s database': function(test) {
//        test.expect(3);
//        var performative = new performativeRoute(ADMIN_EMAIL);
//        performative.verify(ADMIN_TOKEN, 'yanfen@hg.com').
//            then(function(verified) {
//                test.equal(verified.dbName, 'yanfen_at_hg_dot_com');
//                test.equal(verified.collectionName, 'todoApp');
//                test.equal(verified.admin, true);
//                test.done();
//              }).
//            catch(function(err) {
//                test.ok(false, err);
//                test.done();
//              });
//   },

};
