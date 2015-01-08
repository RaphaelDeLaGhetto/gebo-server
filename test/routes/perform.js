/**
 * This ensures that a connection is made to the
 * test databases
 */
var mongoose = require('gebo-mongoose-connection').get(true),
    basic = require('gebo-basic-action'),
    nativeMongoConnection = basic.nativeMongoConnection.get(true, function(){});

var childProcess = require('child_process'),
    mongo = require('mongodb'),
    utils = require('gebo-utils'),
    events = require('events'),
    extend = require('extend'),
    fs = require('fs-extra'),
    httpMocks = require('node-mocks-http'),
    sinon = require('sinon'),
    tmp = require('tmp'),
    q = require('q');
    geboSchema = basic.schemata.gebo,
    agentSchema = basic.schemata.agent;

var nconf = require('nconf');
nconf.file({ file: 'gebo.json' });

var geboDb = new geboSchema(),
    agentDb = new agentSchema();


var COL_NAME = 'appCollection',
    HAI = 'A human-agent interface',
    IP = '127.0.0.1';

// Agent configs
var BASE_ADDRESS = 'http://theirhost.com';

var perform = require('../../routes/perform')(true);


var SIGNING_PAIR;
utils.getPrivateKeyAndCertificate().
    then(function(pair) {
        SIGNING_PAIR = pair
      });

/**
 * For testing the routes
 */
var CLIENT = 'yanfen@example.com',
    SERVER = nconf.get('testEmail');

var SEND_REQ = httpMocks.createRequest({
        method: 'POST',
        url: '/perform',
        body: { 
             sender: CLIENT,
             action: 'ls',
             content: {
                resource: 'friendos',
             },
        },
      });
SEND_REQ.user = { email: CLIENT, admin: false };
SEND_REQ.on = function(evt, handler) {
                    var handle = handler;
                };

/**
 * handler
 */
exports.handler = {

    setUp: function(callback) {
        // Put the test PDF in /tmp
        fs.createReadStream('./test/files/pdf.pdf').pipe(fs.createWriteStream('/tmp/pdf0.pdf'));
        fs.createReadStream('./test/files/pdf.pdf').pipe(fs.createWriteStream('/tmp/pdf1.pdf'));
        fs.createReadStream('./test/files/pdf.pdf').pipe(fs.createWriteStream('/tmp/pdf2.pdf'));
        fs.createReadStream('./test/files/pdf.pdf').pipe(fs.createWriteStream('/tmp/pdf3.pdf'));

        var friendo = new agentDb.friendoModel({
                            name: 'Yanfen',
                            email: CLIENT,
                            uri: BASE_ADDRESS,
                            _id: new mongo.ObjectID('23456789ABCD')
                        });
    
        friendo.permissions.push({ resource: 'friendos' });
        friendo.permissions.push({ resource: 'fs', write: true });
        friendo.permissions.push({ resource: 'downloadFileTest', execute: true });
        
        friendo.save(function(err) {
            if (err) {
              console.log(err);
            }
            callback();
          });
    },

    tearDown: function(callback) {
        agentDb.connection.db.dropDatabase(function(err) {
            if (err) {
              console.log(err)
            }
            callback();
          });
    },

    'Form a social commitment on receipt of a perform message': function(test) {
        test.expect(10);
        agentDb.socialCommitmentModel.find({}, function(err, scs) {
            test.equal(scs.length, 0);

            var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
            res.on('end', function() {
                //test.ok(res._isEndCalled());
                test.ok(true);
              });

            perform.handler(SEND_REQ, res, function(err) { 
                if (err) {
                  test.ok(false, err);
                }

                agentDb.socialCommitmentModel.find({}, function(err, scs) {
                    test.equal(scs.length, 1);
                    test.equal(scs[0].performative, 'perform');
                    test.equal(scs[0].action, 'ls');
                    test.equal(!!scs[0].message, true);
                    test.equal(scs[0].creditor, CLIENT);
                    test.equal(scs[0].debtor, SERVER);
                    test.equal(!!scs[0].created, true);
                    // The successful call will immediately
                    // fulfil this commitment
                    test.equal(!!scs[0].fulfilled, true);
                    test.done();
                  });
              });
          });
    },

    'Respond with 401 unauthorized when an unknown agent makes tries to perform an action': function(test) {
        test.expect(4);
        var req = {};
        extend(true, req, SEND_REQ);
        req.user.email = 'some@foreignagent.com';

        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
            test.done();
          });

        perform.handler(req, res, function(err) { 
            if (err) {
              test.equal(err, 'You are not allowed access to that resource');
            }
            test.equal(res.statusCode, 401);
            test.equal(res._getData(), 'You are not allowed access to that resource');
          });
    },

    /**
     * TODO
     * 2014-8-6 It seems that the only way this will happen is if there is an
     * error retrieving the friendo from the database. A missing email field will
     * currently be caught on attempting the formation of a social commitment.
     */
    'Respond with 401 unauthorized when an agent cannot be verified': function(test) {
//        test.expect(4);
//        perform.handler(SEND_REQ, RES, function(err) { 
//            if (err) {
//              test.equal(err, 'You could not be verified');
//            }
//            test.equal(_code, 400);
//            test.equal(_content.error.code, 400);
//            test.equal(_content.error.message, 'You could not be verified');
            test.done();
//          });
    },

    'Fulfil social commitment and return data when action is performed': function(test) {
        test.expect(14);

        // Make sure a friendo has actually been written to the DB
        agentDb.friendoModel.find({}, function(err, docs) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(docs.length, 1);

            var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
            res.on('end', function() {
                //test.ok(res._isEndCalled());
                test.ok(true);
              });

            perform.handler(SEND_REQ, res, function(err) { 
                if (err) {
                  test.ok(false, err);
                }
                // Return data
                console.log('HERE');
                test.equal(res.statusCode, 200);
                test.equal(res._getData().length, 1);
                test.equal(res._getData()[0].name, 'Yanfen');
                test.equal(!!res._getData()[0]._id, true);
                
                agentDb.socialCommitmentModel.find({}, function(err, scs) {
                    test.equal(scs.length, 1);
                    test.equal(scs[0].performative, 'perform');
                    test.equal(scs[0].action, 'ls');
                    test.equal(!!scs[0].message, true);
                    test.equal(scs[0].creditor, CLIENT);
                    test.equal(scs[0].debtor, nconf.get('testEmail'));
                    test.equal(!!scs[0].created, true);
                    test.equal(!!scs[0].fulfilled, true);
                    test.done();
                  });
              });
          });
    },
    
    // TODO
    'Return 409 if there\'s an error fulfilling a social commitment': function(test) {
        console.log('TODO');
        test.done();
    },

    'Return a 501 error if the agent does not know how to perform the requested action': function(test) {
        test.expect(4);

        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'bakeACake',
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                            var handle = handler;
                        };

        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        perform.handler(req, res, function(err) { 
            if (err) {
              test.equal(err, 'I don\'t know how to bakeACake');
            }
            else {
              test.ok(false, 'This should throw an error');
            }
            test.equal(res.statusCode, 501);
            test.equal(res._getData(), 'I don\'t know how to bakeACake');
 
            test.done();
        }); 
    },

    'Perform proposed or requested actions received in dot notation': function(test) {
        test.expect(3);

        // Add some actions from a module
        var actions = basic.actions,
            actionModule = require('../mocks/full-action-module');

        // This is how it's done in the index.enable function
        var keys = Object.keys(actionModule.actions);
        if (keys.length > 0) { 
          actions['mock'] = {};
          for (var i = 0; i < keys.length; i++) {
            actions['mock'][keys[i]] = actionModule.actions[keys[i]]; 
          }
        }

        // Request object
        var req = httpMocks.createRequest({
                body: { 
                     sender: CLIENT,
                     action: 'mock.someAction',
                  },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                        var handle = handler;
                   };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });


        perform.handler(req, res, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(res.statusCode, 200);
            test.equal(res._getData(), 'Hi, guy!');

            test.done();
          });
    },

    'Convert a numeric return value to a string (so it doesn\'t get set as a status code)': function(test) {
        test.expect(4);
        
        // Add some actions from a module
        //var actions = require('../../actions')(),
        var actions = basic.actions,
            actionModule = require('../mocks/full-action-module');

        // This is how it's done in the index.enable function
        var keys = Object.keys(actionModule.actions);
        if (keys.length > 0) { 
          actions['mock'] = {};
          for (var i = 0; i < keys.length; i++) {
            actions['mock'][keys[i]] = actionModule.actions[keys[i]]; 
          }
        }

        //var req = {
        // Request object
        var req = httpMocks.createRequest({
                body: { 
                     sender: CLIENT,
                     action: 'mock.theAnswerToLifeTheUniverseAndEverything',
                  },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                        var handle = handler;
                   };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });


        perform.handler(req, res, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(res.statusCode, 200);
            test.equal(res._getData(), '42');
            test.equal(typeof res._getData(), 'string');

            test.done();
          });
    },

    'Remove one file attached to the request from the /tmp directory': function(test) {
        test.expect(2);
        // Request object
        var req = httpMocks.createRequest({
                body: { 
                     sender: CLIENT,
                     action: 'save',
                     content: { resource: 'fs' },
                  },
                files: {
                    file: { 
                        name: 'pdf0.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf0.pdf',
                    },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                        var handle = handler;
                   };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        // Make sure all the test files are stored in /tmp
        try {
          fs.closeSync(fs.openSync(req.files.file.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        var count = fs.readdirSync('/tmp').length;

        perform.handler(req, res, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(count - 1, fs.readdirSync('/tmp').length);
            test.done();
        });
    },

    /**
     * Careful here... the save action will only take one file to save at a time. An
     * agent can potentially attach as many files as he wants, so this demonstrates that
     * they all get removed, not that save has successfully stored all the files
     * in the database.
     */
    'Remove all files attached to the request from the /tmp directory': function(test) {
        test.expect(6);

        // Request object
        var req = httpMocks.createRequest({
                 body: { 
                     sender: CLIENT,
                     action: 'save',
                     content: { resource: 'fs' },
                  },
                files: {
                    file0: { 
                        name: 'pdf0.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf0.pdf',
                    },
                    file1: { 
                        name: 'pdf1.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf1.pdf',
                    },
                    file2: { 
                        name: 'pdf2.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf2.pdf',
                    },
                    file3: { 
                        name: 'pdf3.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf3.pdf',
                    },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                        this.handle = handler;
                   };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        // Make sure all the test files are stored in /tmp
        try {
          fs.closeSync(fs.openSync(req.files.file0.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        try {
          fs.closeSync(fs.openSync(req.files.file1.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        try {
          fs.closeSync(fs.openSync(req.files.file2.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        try {
          fs.closeSync(fs.openSync(req.files.file3.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        var count = fs.readdirSync('/tmp').length;
        perform.handler(req, res, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(count - 4, fs.readdirSync('/tmp').length);

            try {
              fs.openSync(req.files.file0.path, 'r');
              test.ok(false, 'This file shouldn\'t exist');
            }
            catch (err) {
              test.ok(true, err);
            }

            try {
              fs.openSync(req.files.file1.path, 'r');
              test.ok(false, 'This file shouldn\'t exist');
            }
            catch (err) {
              test.ok(true, err);
            }

            try {
              fs.openSync(req.files.file2.path, 'r');
              test.ok(false, 'This file shouldn\'t exist');
            }
            catch (err) {
              test.ok(true, err);
            }

            try {
              fs.openSync(req.files.file3.path, 'r');
              test.ok(false, 'This file shouldn\'t exist');
            }
            catch (err) {
              test.ok(true, err);
            }
            test.done();
          });
    },

    'Send a file if the to-be-returned data object contains the filePath property': function(test) {
//        test.expect(3);
        console.log('THIS HAS GOT TO GO');
//
//        // Need to add a dummy action for this test
//        // Remove the old modules
//        delete require.cache[require.resolve('../../actions')];
//        delete require.cache[require.resolve('../../routes/perform')];
//
//        // Create a dummy test to return an object with a filePath property
//        var action = require('../../actions')();
//        action.add('downloadFileTest', function() {
//            var deferred = q.defer();
//            deferred.resolve({ filePath: '/tmp/pdf0.pdf' });
//            return deferred.promise;
//          });
//
//        var perform = require('../../routes/perform')(true);
//
////        var req = {
//        // Request object
//        var req = httpMocks.createRequest({
//             body: {
//                sender: CLIENT,
//                action: 'downloadFileTest',
//            },
// //           user: { email: CLIENT, admin: false },
////            on: function(evt, handler) {
////                    var handle = handler;
////                    return;
////                },
//          });
//        req.user = { email: CLIENT, admin: false };
//        req.on = function(evt, handler) {
//                        var handle = handler;
//                   };
//
//        // Response object
//        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
//        res.on('end', function() {
//            //test.ok(res._isEndCalled());
//            test.ok(true);
//          });
//        res.download = function(path, name, done){};
//
//
//        console.log('YO YOY OY');
//        perform.handler(req, res, function(err) {
//        console.log('WORD');
//            if (err) {
//              test.ok(false, err);
//            }
//            test.equal(res._getData(), '/tmp/pdf0.pdf');
////            test.equal(_filename, 'pdf0.pdf');
//
//            // These tests are hairy enough as it is. Set things
//            // back to the way they were
//            delete require.cache[require.resolve('../../actions')];
//            delete require.cache[require.resolve('../../routes/perform')];
//            require('../../actions')();
//            require('../../routes/perform')(true);
//
            test.done();
//          });
    },

    'Send a file if the to-be-returned data object contains the filePath property and a distinct file name': function(test) {
        console.log('THIS HAS GOT TO GO');
//        test.expect(2);
//
//        // Need to add a dummy action for this test
//        // Remove the old modules
//        delete require.cache[require.resolve('../../actions')];
//        delete require.cache[require.resolve('../../routes/perform')];
//
//        // Create a dummy test to return an object with a filePath property
//        var action = require('../../actions')();
//        action.add('downloadFileTest', function() {
//            var deferred = q.defer();
//            deferred.resolve({ filePath: '/tmp/pdf0.pdf', fileName: 'myfile.pdf' });
//            return deferred.promise;
//          });
//
//        var perform = require('../../routes/perform')(true);
//
//        var req = {
//            body: {
//                sender: CLIENT,
//                action: 'downloadFileTest',
//            },
//            user: { email: CLIENT, admin: false },
//            on: function(evt, handler) {
//                    var handle = handler;
//                    return;
//                },
//          };
//
//        perform.handler(req, RES, function(err) {
//            if (err) {
//              test.ok(false, err);
//            }
//            test.equal(RES.statusCode, '/tmp/pdf0.pdf');
//            test.equal(_filename, 'myfile.pdf');
//
//            // These tests are hairy enough as it is. Set things
//            // back to the way they were
//            delete require.cache[require.resolve('../../actions')];
//            delete require.cache[require.resolve('../../routes/perform')];
//            require('../../actions')();
//            require('../../routes/perform')(true);
//
            test.done();
//          });
    },

    'Remove the file from the file system if the to-be-returned data object contains the filePath property': function(test) {
        console.log('THIS HAS GOT TO GO');
//        test.expect(3);
//
//        // Need to add a dummy action for this test
//        // Remove the old modules
//        delete require.cache[require.resolve('../../actions')];
//        delete require.cache[require.resolve('../../routes/perform')];
//
//        // Create a dummy test to return an object with a filePath property
//        var action = require('../../actions')();
//        action.add('downloadFileTest', function() {
//            var deferred = q.defer();
//            deferred.resolve({ filePath: '/tmp/pdf0.pdf', fileName: 'myfile.pdf' });
//            return deferred.promise;
//          });
//
//        var perform = require('../../routes/perform')(true);
//
//        var req = {
//            body: {
//                sender: CLIENT,
//                action: 'downloadFileTest',
//            },
//            user: { email: CLIENT, admin: false },
//            on: function(evt, handler) {
//                    var handle = handler;
//                    return;
//                },
//          };
//
//        // Make sure the file is where it's supposed to be
//        try {
//          fs.closeSync(fs.openSync('/tmp/pdf0.pdf', 'r'));
//        }
//        catch (err) {
//          test.ok(false, err);
//        }
//
//        perform.handler(req, RES, function(err) {
//            if (err) {
//              test.ok(false, err);
//            }
//            test.equal(RES._getData(), '/tmp/pdf0.pdf');
//            test.equal(_filename, 'myfile.pdf');
//
//            // Make sure the file is no longer where it once was
//            try {
//              fs.closeSync(fs.openSync('/tmp/pdf0.pdf', 'r'));
//              test.ok(false, 'This file shouldn\'t exist');
//            }
//            catch (err) {
//              test.ok(true);
//            }
//
//            // These tests are hairy enough as it is. Set things
//            // back to the way they were
//            delete require.cache[require.resolve('../../actions')];
//            delete require.cache[require.resolve('../../routes/perform')];
//            require('../../actions')();
//            require('../../routes/perform')(true);
//
            test.done();
//          });
    },
  
     // https://github.com/jamescarr/nodejs-mongodb-streaming/blob/master/app.coffee
    'Stream to the response object when copying a file': function(test) {
        var res = httpMocks.createResponse();

        test.expect(6);
        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'save',
                     content: { resource: 'fs' },
                },
                files: {
                    file: { 
                        name: 'pdf0.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf0.pdf',
                    },
                },
              });
            req.user = { email: CLIENT, admin: false };
            req.on = function(evt, handler) {
                            var handle = handler;
                       };

        // Make sure all the test files are stored in /tmp
        try {
          fs.closeSync(fs.openSync(req.files.file.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        var count = fs.readdirSync('/tmp').length;

        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });

        perform.handler(req, res, function(err) {
            if (err) {
              test.ok(false, err);
            }
            
            // Copy the file back
            req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'cp',
                     content: {
                             resource: 'fs',
                             id: res._getData(),
                     },
                },
              });
            req.user = { email: CLIENT, admin: false };
            req.on = function(evt, handler) {
                            var handle = handler;
                       };           

            res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
            res.on('end', function() {
                test.equal(res.statusCode, 200);
                test.ok(res._isEndCalled());

                // Make sure the file's contents is correct
                var fileSize = fs.statSync('./test/files/pdf.pdf').size;
                var data = fs.readFileSync('./test/files/pdf.pdf');

                var returnedFile = res._getData();//.toString('base64');
                //test.equal(data.toString('base64'), returnedFile); 
                //test.equal(data, returnedFile); 
                //test.equal(data.length, returnedFile.length); 
                test.equal(fileSize, returnedFile.length); 
                test.done();
              });

            perform.handler(req, res, function(err) {
                if (err) {
                  test.ok(false, err);
                }
                test.equal(res.header('Content-Type'), 'application/pdf');
                test.equal(res.header('Content-Disposition'), 'attachment; filename="pdf0.pdf"');
            });
        });
    },


    /**
     * Kill processes when connection closes prematurely
     */
    'Should add a PID file name to the message\'s content field': function(test) {
        test.expect(3);
        //var actions = require('../../actions')();
        var actions = basic.actions;
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            test.ok(message.content.pidFile);
            deferred.resolve();
            return deferred.promise;
          });

        // This has to be required here, otherwise the actions
        // module isn't properly stubbed out
        var p = require('../../routes/perform')(true);

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });


        p.handler(SEND_REQ, res, function(err) {
           test.ok(actions.ls.called);
           actions.ls.restore();
           test.done();
         });
    },

    'Should call tmp.tmpName to write a file to the /tmp directory': function(test) {
        test.expect(2);
        sinon.stub(tmp, 'tmpName', function(done) {
            done(err, '/tmp/someRandom.pid');
          });

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        perform.handler(SEND_REQ, res, function(err) {
           test.ok(tmp.tmpName.called);
           tmp.tmpName.restore();
           test.done();
         });
    },

    'Should kill the process named in the PID file if it exists and the \'close\' event is emitted': function(test) {
        test.expect(3);

        // Request object
        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'ls',
                     content: {
                        resource: 'friendos',
                     },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                    this.handle = handler;
                  };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        var actions = basic.actions;
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            req.handle();
            deferred.resolve();
            return deferred.promise;
          });

        // fs.readFile needs to return something, even though no file
        // actually exists
        sinon.stub(fs, 'readFile', function(path, enc, done) {
            done(null, '12345'); 
          });

        // This will be overriden so that it can call the 'close' event
        var childProcess = require('child_process');
        sinon.stub(childProcess, 'exec', function(command, done) {
            done(null); 
          });

        // There's no file to remove
        sinon.stub(fs, 'remove', function(path, done) {
            actions.ls.restore();
            fs.readFile.restore();
            fs.remove.restore();
            childProcess.exec.restore();
            test.ok(true);
            test.done();
          });


        // This has to be required here, otherwise the actions
        // module isn't properly stubbed out
        var p = require('../../routes/perform')(true);
        p.handler(req, res, function(err) {
            if (err) {
              test.ok(true);
            }
            else {
              test.ok(false);
            }
         });
    },

    'Should set the options.returnNow message when the \'close\' event is emitted': function(test) {
        test.expect(4);

        // Request object
        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'ls',
                     content: {
                        resource: 'friendos',
                     },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                    this.handle = handler;
                  };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        var actions = basic.actions;
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            req.handle();
            deferred.resolve();
            return deferred.promise;
          });

        // fs.readFile needs to return something, even though no file
        // actually exists
        sinon.stub(fs, 'readFile', function(path, enc, done) {
            done(null, '12345'); 
          });

        // This will be overriden so that it can call the 'close' event
        var childProcess = require('child_process');
        sinon.stub(childProcess, 'exec', function(command, done) {
            done(null); 
          });

        // There's no file to remove
        sinon.stub(fs, 'remove', function(path, done) {
            actions.ls.restore();
            fs.readFile.restore();
            fs.remove.restore();
            childProcess.exec.restore();
            test.ok(true);
            test.done();
          });

        // This has to be required here, otherwise the actions
        // module isn't properly stubbed out
        var p = require('../../routes/perform')(true);
        p.handler(req, res, function(err) {
            test.equal(req.body.content.returnNow, 'Connection was closed by the client');
            if (err) {
              test.equal(err, 'Connection was closed by the client');
            }
            else {
              test.ok(false);
            }
         });
    },


    // This is mothballed, because this process termination stuff is changing moment
    // by moment, 2014-11-19
//    'Should do nothing if there is no PID file and the \'close\' event is emitted': function(test) {
//        test.expect(3);
//
//        var actions = require('../../actions')();
//        sinon.stub(actions, 'ls', function(verified, message) {
//            var deferred = q.defer();
//            SEND_REQ.handle();
//            // Do I really reject here?
//            // 2014-11-17
//            deferred.reject();
//            return deferred.promise;
//          });
//
////        sinon.spy(fs, 'readFile');
//        sinon.spy(fs, 'remove');
//
//        // This will be overriden so that it can call the 'close' event
//        var childProcess = require('child_process');
//        sinon.spy(childProcess, 'exec');
//
//        // This has to be required here, otherwise the actions
//        // module isn't properly stubbed out
//        var p = require('../../routes/perform')(true);
//        p.handler(SEND_REQ, RES, function(err) {
////            test.ok(fs.readFile.called);
//            test.ok(!fs.remove.called);
//            test.ok(!childProcess.exec.called);
//
//            if (err) {
//              test.ok(true);
//            }
//            else {
//              test.ok(false);
//            }
////            fs.readFile.restore();
//            fs.remove.restore();
//            childProcess.exec.restore();
//            actions.ls.restore();
//            test.done();
//         });
//    },

    'Should remove the PID file when \'close\' event is emitted': function(test) {
        test.expect(4);

        // Request object
        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'ls',
                     content: {
                        resource: 'friendos',
                     },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                    this.handle = handler;
                  };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        var actions = basic.actions;
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            req.handle();
            deferred.resolve();
            return deferred.promise;
          });

        // This will be overriden so that it can call the 'close' event
        var childProcess = require('child_process');
        sinon.stub(childProcess, 'exec', function(command, done) {
            done(null); 
          });

        // There's no file to remove
        sinon.stub(fs, 'remove', function(path, done) {
            test.ok(fs.remove.called);
            test.ok(childProcess.exec.called);
            actions.ls.restore();
            fs.remove.restore();
            childProcess.exec.restore();
            test.done();
          });

        // This has to be required here, otherwise the actions
        // module isn't properly stubbed out
        var p = require('../../routes/perform')(true);
        p.handler(req, res, function(err) {
            if (err) {
              test.ok(true);
            }
            else {
              test.ok(false);
            }
         });
    },

    /**
     * Timeout
     */
    'Kill the process identified in the PID file if it executes longer than allowed': function(test) {
        test.expect(4);

        sinon.spy(utils, 'setTimeLimit');
        sinon.spy(utils, 'stopTimer');

        var childProcess = require('child_process');
        sinon.stub(childProcess, 'exec', function(command, done) {
            done(null); 
          });

        // Request object
        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'ls',
                     content: {
                        resource: 'friendos',
                        timeLimit: 1,
                     },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                    this.handle = handler;
                  };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        var actions = basic.actions;
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            for (var i = 0; i < 3000000; i++) { /* I can't get sinon.useFakeTimers to work */ }
            deferred.resolve();
            return deferred.promise;
          });


        var p = require('../../routes/perform')(true);
        p.handler(req, res, function(err) {
            // This test, and the test below, reveal that any decisions made
            // concering the value set by utils.stopTimer may beat the call
            // on the actual timeout function
            //test.equal(err, req.body.content.returnNow);
            test.equal(err, 'That request was taking too long');
            test.ok(utils.setTimeLimit.called);
            test.ok(utils.stopTimer.called);

            // Keep an eye on this. This should be called, but is not.
            // 2014-11-19
            //test.ok(childProcess.exec.calledWith('kill 12345'));
            //test.ok(childProcess.exec.called);

            utils.setTimeLimit.restore();
            utils.stopTimer.restore();
            childProcess.exec.restore();
            actions.ls.restore();

            test.done();
          });
    },

    // If nothing else, this test reveals that the timer can be cleared before
    // the timeout function is triggered. That's why there's a timeout test
    // clause in addition to the the options.returnNow test
    'Return a 500 error if the agent executes longer than allowed': function(test) {
        test.expect(4);

        // Request object
        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'ls',
                     content: {
                        resource: 'friendos',
                        timeLimit: 1,
                     },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                    this.handle = handler;
                  };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        var p = require('../../routes/perform')(true);
        p.handler(req, res, function(err) { 
            if (err) {
              test.equal(err, 'That request was taking too long');
            }
            test.equal(res.statusCode, 500);
            test.equal(res._getData(), 'That request was taking too long');

            test.done();
        }); 
    },

    'Don\'t kill the process identified in the PID file if the timer is stopped': function(test) {
        test.expect(5);

        sinon.spy(utils, 'setTimeLimit');
        sinon.spy(utils, 'stopTimer');

        var childProcess = require('child_process');
        sinon.stub(childProcess, 'exec', function(command, done) {
            done(null); 
          });

        // Request object
        var req = httpMocks.createRequest({
                method: 'POST',
                url: '/perform',
                body: { 
                     sender: CLIENT,
                     action: 'ls',
                     content: {
                        resource: 'friendos',
                        timeLimit: 5000,
                     },
                },
              });
        req.user = { email: CLIENT, admin: false };
        req.on = function(evt, handler) {
                    this.handle = handler;
                  };

        // Response object
        var res = httpMocks.createResponse({ eventEmitter: events.EventEmitter });
        res.on('end', function() {
            //test.ok(res._isEndCalled());
            test.ok(true);
          });

        var p = require('../../routes/perform')(true);
        p.handler(req, res, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.ok(utils.setTimeLimit.called);
            test.ok(utils.stopTimer.called);

            test.ok(!childProcess.exec.calledWith('kill 12345'));
            test.ok(!childProcess.exec.called);

            utils.setTimeLimit.restore();
            childProcess.exec.restore();

            test.done();
         });
    },
};

//// I can't figure out how to use sinon's mocks, stubs, etc.
//// As such, I can't tell if passport.authenticate is being called
//// TODO: figure out sinon
///**
// * authenticate
// */
//exports.authenticate = {
//
//    setUp: function(callback) {
//        callback();
//    },
//
//    tearDown: function(callback) {
//        callback();
//    },
//
//    'call passort.authenticate if no user in request': function(test) {
//        test.done();
//    },
//
//    'do not call passort.authenticate if user in request': function(test) {
//        test.done();
//    },
//
//};


/**
 * verify
 */
exports.verify = {

    setUp: function(callback) {
        try {
          /**
           * Setup an admin registrant
           */
          var adminRegistrant = new geboDb.registrantModel({
                  name: 'dan',
                  email: 'dan@example.com',
                  password: 'password123',
                  admin: true,
                  _id: new mongo.ObjectID('0123456789AB')
              });

          /**
           * Make a friendo for the gebo
           */
          var friendo = new agentDb.friendoModel({ 
                    name: 'john',
                    email: 'john@painter.com',
                    uri: BASE_ADDRESS,
                    _id: new mongo.ObjectID('23456789ABCD')
                });

          /**
           * Create access permissions for imaginary collection
           */
          friendo.permissions.push({ resource: 'painterApp' });

          /**
           * Create access permissions for action with no associated collection 
           */
          friendo.permissions.push({ resource: 'getCurrentTime', read: false, execute: true });

          adminRegistrant.save(function(err) {
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

    'Return permissions object for a friendo': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { content: { resource: 'painterApp' } }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return permissions object for a friendo when content field is a string': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { content: JSON.stringify({ resource: 'painterApp' }) }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    /**
     * If no resource is specified, then there is no DB collection associated
     * with the attempted action. Thus, the action itself becomes the resource
     */
    'Return permissions object for a friendo when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { action: 'getCurrentTime' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('getCurrentTime')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a friendo without permission to access the specified resource': function(test) {
        test.expect(5);
        perform.verify({ name: 'john', email: 'john@painter.com', admin: false },
                       { action: 'ls' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('ls')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an adminstrator': function(test) {
        test.expect(5);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: true },
                       { content: { resource: 'painterApp' } }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();      
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for an administrator when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'dan', email: 'dan@example.com', admin: true },
                       { action: 'getCurrentTime' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('getCurrentTime')); 
                test.equal(verified.read, true); 
                test.equal(verified.write, true); 
                test.equal(verified.execute, true); 
                test.equal(verified.admin, true); 
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();      
              });
    },

    'Return permissions object for a non-friendo': function(test) {
        test.expect(5);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { content: { resource: 'painterApp' } }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('painterApp')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },

    'Return permissions object for a non-friendo when no resource is specified': function(test) {
        test.expect(5);
        perform.verify({ name: 'richard', email: 'richard@construction.com', admin: false },
                       { action: 'getCurrentTime' }).
            then(function(verified) {
                test.equal(verified.resource, utils.getMongoCollectionName('getCurrentTime')); 
                test.equal(verified.read, false); 
                test.equal(verified.write, false); 
                test.equal(verified.execute, false); 
                test.equal(verified.admin, false);
                test.done();
              }).
            catch(function(err) {
                test.ok(false, err);
                test.done();
              });
    },
};


