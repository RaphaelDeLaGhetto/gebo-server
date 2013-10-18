var config = require('../../config/config'),
    nconf = require('nconf'),
    mongo = require('mongodb'),
    dbSchema = require('../../config/dbschema');

var COL_NAME = 'appCollection',
    ADMIN_TOKEN = '1234',
    USER_TOKEN = '5678';

var TEST_DB = nconf.argv().env().file({ file: 'local.json' }).get('testDb');
//var dbSchema = require('../../config/dbschema')(nconf.get('testDb'));
var performative = require('../../routes/performative')(TEST_DB);

/**
 * verify
 */
exports.verify = {

    setUp: function(callback) {
    	try{
            this.db = new dbSchema(TEST_DB);
            /**
             * Setup the app database
             */
            // Registered agents
            var agent = new this.db.agentModel(
                            { name: 'dan', email: 'dan@hg.com',
                              password: 'password123', admin: true,  
                              _id: new mongo.ObjectID('0123456789AB') });
            agent.save();
            agent = new this.db.agentModel(
                            { name: 'yanfen', email: 'yanfen@hg.com',
                              password: 'password123', admin: false,  
                              _id: new mongo.ObjectID('123456789ABC') });
            agent.save();
            
            // Registered client app
            var client = new this.db.clientModel(
                            { name: 'todoApp',
                              clientId: 'todoApp123', 
                              secret: 'todo-secret',
                              _id: new mongo.ObjectID('23456789ABCD') });
            client.save();

            // Authorization tokens
            var token = new this.db.tokenModel(
                        { agentId: new mongo.ObjectID('0123456789AB'),
                          clientId: new mongo.ObjectID('23456789ABCD'),  
                          token: ADMIN_TOKEN });
            token.save();
            
            token = new this.db.tokenModel(
                        { agentId: new mongo.ObjectID('123456789ABC'),
                          clientId: new mongo.ObjectID('23456789ABCD'),  
                          token: USER_TOKEN });
            token.save();

            var collection;

            // Create a database for the admin
            var server = new mongo.Server(config.mongo.host,
                                          config.mongo.port,
                                          config.mongo.serverOptions);

            this.adminDb = mongo.Db('adminDb',
                           server, config.mongo.clientOptions);
            this.adminDb.open(function (err, client) {
                if (err) {
                  throw err;
                }
                // Insert an admin and regular agent
                collection = new mongo.Collection(client, COL_NAME);
                collection.insert({ data: 'Important to the app' });
            });

            // Create a database for the admin
            this.agentDb = this.adminDb.db('agentDb');
            this.agentDb.open(function (err, client) {
                if (err) {
                  throw err;
                }
                // Insert an admin and regular agent
                collection = new mongo.Collection(client, COL_NAME);
                collection.insert({ data: 'Also important to the app' }, function() {
                        callback();
                    });
            });

    	} catch(e) {
            console.dir(e);
            callback();
    	}
    },

    tearDown: function(callback) {
        this.adminDb.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
        });

        this.agentDb.dropDatabase(function(err) { 
            if (err) {
              console.log(err);
            }
        });

        this.db.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
        });
    },

   'Allow agent access to his database': function(test) {
        test.expect(3);
        performative.verify(USER_TOKEN, 'yanfen@hg.com').
            then(function(verified) {
                test.equal(verified.dbName, 'yanfen_at_hg_dot_com');
                test.equal(verified.collectionName, 'todoApp');
                test.equal(verified.admin, false);
                test.done();
              }).
            catch(function(err) {
                console.log('ERRORRRRRRRRRRRR: ' + err);
                test.ok(false, err);
                test.done();
              });
   }, 

   'Do not allow agent access to another agent\'s database': function(test) {
        test.expect(1);
        performative.verify(USER_TOKEN, 'dan@hg.com').
           then(function(verified) {
                test.ok(false, 'Should not get here');
                test.done();
             }).
           catch(function(err) {
                test.equal(err, 'You are not permitted to access that resource');
                test.done();
             });
   },

   'Allow admin access to his database': function(test) {
        test.expect(3);
        performative.verify(ADMIN_TOKEN, 'dan@hg.com').
            then(function(verified) {
                test.equal(verified.dbName, 'dan_at_hg_dot_com');
                test.equal(verified.collectionName, 'todoApp');
                test.equal(verified.admin, true);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
   },

   'Allow admin access to another agent\'s database': function(test) {
        test.expect(3);
        performative.verify(ADMIN_TOKEN, 'yanfen@hg.com').
            then(function(verified) {
                test.equal(verified.dbName, 'yanfen_at_hg_dot_com');
                test.equal(verified.collectionName, 'todoApp');
                test.equal(verified.admin, true);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
   },

};
