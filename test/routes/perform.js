/**
 * This ensures that a connection is made to the
 * test databases
 */
var nativeMongoConnection = require('../../lib/native-mongo-connection').get(true, function(){}),
    mongoose = require('gebo-mongoose-connection').get(true);

var childProcess = require('child_process'),
    mongo = require('mongodb'),
    utils = require('gebo-utils'),
    //events = require('events'),
    extend = require('extend'),
    fs = require('fs-extra'),
    geboSchema = require('../../schemata/gebo'),
    agentSchema = require('../../schemata/agent'),
    sinon = require('sinon'),
    tmp = require('tmp'),
    q = require('q');

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

var SEND_REQ = {
        body: { 
             sender: CLIENT,
             performative: 'request',
             action: 'ls',
             content: {
                resource: 'friendos',
             }
          },
        user: { email: CLIENT, admin: false },
        on: function(evt, handler) {
                this.handle = handler;
            },
        handle: null,
      };

var _code, _content, filename;
var RES = {
    status: function(code) {
        _code = code;
        return { 
                send: function(content) {
                    _content = content;
                    return;
                }
        }
    },
    download: function(content, filename, done) {
          _content = content; 
          if (typeof filename === 'function') {
            done = filename;
            _filename = content.split('/')[content.split('/').length-1];
          }
          else if (typeof filename === 'string') {
            _filename = filename;
          }
          done();
    }
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

        _code = undefined;
        _content = undefined;

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
        test.expect(9);
        agentDb.socialCommitmentModel.find({}, function(err, scs) {
            test.equal(scs.length, 0);

            perform.handler(SEND_REQ, RES, function(err) { 
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
        test.expect(3);
        var req = {};
        extend(true, req, SEND_REQ);
        req.user.email = 'some@foreignagent.com';

        perform.handler(req, RES, function(err) { 
            if (err) {
              test.equal(err, 'You are not allowed access to that resource');
            }
            test.equal(_code, 401);
            test.equal(_content, 'You are not allowed access to that resource');
            test.done();
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
        test.expect(13);

        // Make sure a friendo has actually been written to the DB
        agentDb.friendoModel.find({}, function(err, docs) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(docs.length, 1);

            perform.handler(SEND_REQ, RES, function(err) { 
                if (err) {
                  test.ok(false, err);
                }
                // Return data
                test.equal(_code, 200);
                test.equal(_content.length, 1);
                test.equal(_content[0].name, 'Yanfen');
                test.equal(!!_content[0]._id, true);
                
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
        test.done();
    },

    'Return a 501 error if the agent does not know how to perform the requested action': function(test) {
        test.expect(3);

        var req = {};
        extend(true, req, SEND_REQ);
        req.body.action = 'bakeACake';

        perform.handler(req, RES, function(err) { 
            if (err) {
              test.equal(err, 'I don\'t know how to bakeACake');
            }
            test.equal(_code, 501);
            test.equal(_content, 'I don\'t know how to bakeACake');
            test.done();
        }); 
    },

    'Perform proposed or requested actions received in dot notation': function(test) {
        test.expect(2);
        
        // Add some actions from a module
        var actions = require('../../actions')(),
            actionModule = require('../mocks/full-action-module');

        // This is how it's done in the index.enable function
        var keys = Object.keys(actionModule.actions);
        if (keys.length > 0) { 
          actions['mock'] = {};
          for (var i = 0; i < keys.length; i++) {
            actions['mock'][keys[i]] = actionModule.actions[keys[i]]; 
          }
        }

        var req = {
                body: { 
                     sender: CLIENT,
                     action: 'mock.someAction',
                  },
                user: { email: CLIENT, admin: false },
                on: function(evt, handler) {
                        var handle = handler;
                        return;
                    },
              };

        perform.handler(req, RES, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(_code, 200);
            test.equal(_content, 'Hi, guy!');

            test.done();
          });
    },

    'Convert a numeric return value to a string (so it doesn\'t get set as a status code)': function(test) {
        test.expect(3);
        
        // Add some actions from a module
        var actions = require('../../actions')(),
            actionModule = require('../mocks/full-action-module');

        // This is how it's done in the index.enable function
        var keys = Object.keys(actionModule.actions);
        if (keys.length > 0) { 
          actions['mock'] = {};
          for (var i = 0; i < keys.length; i++) {
            actions['mock'][keys[i]] = actionModule.actions[keys[i]]; 
          }
        }

        var req = {
                body: { 
                     sender: CLIENT,
                     action: 'mock.theAnswerToLifeTheUniverseAndEverything',
                  },
                user: { email: CLIENT, admin: false },
                on: function(evt, handler) {
                        var handle = handler;
                        return;
                    },
              };

        perform.handler(req, RES, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(_code, 200);
            test.equal(_content, '42');
            test.equal(typeof _content, 'string');

            test.done();
          });
    },

    'Remove one file attached to the request from the /tmp directory': function(test) {
        test.expect(1);
        var req = {
                body: { 
                     sender: CLIENT,
                     action: 'save',
                     content: { resource: 'fs' },
                  },
                user: { email: CLIENT, admin: false },
                files: {
                    file: { 
                        name: 'pdf0.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf0.pdf',
                    },
                },
                on: function(evt, handler) {
                        var handle = handler;
                        return;
                    },
              };

        // Make sure all the test files are stored in /tmp
        try {
          fs.closeSync(fs.openSync(req.files.file.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        var count = fs.readdirSync('/tmp').length;

        perform.handler(req, RES, function(err) {
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
        test.expect(5);
        var req = {
                body: { 
                     sender: CLIENT,
                     action: 'save',
                     content: { resource: 'fs' },
                  },
                user: { email: CLIENT, admin: false },
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
                on: function(evt, handler) {
                        var handle = handler;
                        return;
                    },
              };

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
        perform.handler(req, RES, function(err) {
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
        test.expect(2);

        // Need to add a dummy action for this test
        // Remove the old modules
        delete require.cache[require.resolve('../../actions')];
        delete require.cache[require.resolve('../../routes/perform')];

        // Create a dummy test to return an object with a filePath property
        var action = require('../../actions')();
        action.add('downloadFileTest', function() {
            var deferred = q.defer();
            deferred.resolve({ filePath: '/tmp/pdf0.pdf' });
            return deferred.promise;
          });

        var perform = require('../../routes/perform')(true);

        var req = {
            body: {
                sender: CLIENT,
                action: 'downloadFileTest',
            },
            user: { email: CLIENT, admin: false },
            on: function(evt, handler) {
                    var handle = handler;
                    return;
                },
          };

        perform.handler(req, RES, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(_content, '/tmp/pdf0.pdf');
            test.equal(_filename, 'pdf0.pdf');

            // These tests are hairy enough as it is. Set things
            // back to the way they were
            delete require.cache[require.resolve('../../actions')];
            delete require.cache[require.resolve('../../routes/perform')];
            require('../../actions')();
            require('../../routes/perform')(true);

            test.done();
          });
    },

    'Send a file if the to-be-returned data object contains the filePath property and a distinct file name': function(test) {
        test.expect(2);

        // Need to add a dummy action for this test
        // Remove the old modules
        delete require.cache[require.resolve('../../actions')];
        delete require.cache[require.resolve('../../routes/perform')];

        // Create a dummy test to return an object with a filePath property
        var action = require('../../actions')();
        action.add('downloadFileTest', function() {
            var deferred = q.defer();
            deferred.resolve({ filePath: '/tmp/pdf0.pdf', fileName: 'myfile.pdf' });
            return deferred.promise;
          });

        var perform = require('../../routes/perform')(true);

        var req = {
            body: {
                sender: CLIENT,
                action: 'downloadFileTest',
            },
            user: { email: CLIENT, admin: false },
            on: function(evt, handler) {
                    var handle = handler;
                    return;
                },
          };

        perform.handler(req, RES, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(_content, '/tmp/pdf0.pdf');
            test.equal(_filename, 'myfile.pdf');

            // These tests are hairy enough as it is. Set things
            // back to the way they were
            delete require.cache[require.resolve('../../actions')];
            delete require.cache[require.resolve('../../routes/perform')];
            require('../../actions')();
            require('../../routes/perform')(true);

            test.done();
          });
    },

    'Remove the file from the file system if the to-be-returned data object contains the filePath property': function(test) {
        test.expect(3);

        // Need to add a dummy action for this test
        // Remove the old modules
        delete require.cache[require.resolve('../../actions')];
        delete require.cache[require.resolve('../../routes/perform')];

        // Create a dummy test to return an object with a filePath property
        var action = require('../../actions')();
        action.add('downloadFileTest', function() {
            var deferred = q.defer();
            deferred.resolve({ filePath: '/tmp/pdf0.pdf', fileName: 'myfile.pdf' });
            return deferred.promise;
          });

        var perform = require('../../routes/perform')(true);

        var req = {
            body: {
                sender: CLIENT,
                action: 'downloadFileTest',
            },
            user: { email: CLIENT, admin: false },
            on: function(evt, handler) {
                    var handle = handler;
                    return;
                },
          };

        // Make sure the file is where it's supposed to be
        try {
          fs.closeSync(fs.openSync('/tmp/pdf0.pdf', 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        perform.handler(req, RES, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.equal(_content, '/tmp/pdf0.pdf');
            test.equal(_filename, 'myfile.pdf');

            // Make sure the file is no longer where it once was
            try {
              fs.closeSync(fs.openSync('/tmp/pdf0.pdf', 'r'));
              test.ok(false, 'This file shouldn\'t exist');
            }
            catch (err) {
              test.ok(true);
            }

            // These tests are hairy enough as it is. Set things
            // back to the way they were
            delete require.cache[require.resolve('../../actions')];
            delete require.cache[require.resolve('../../routes/perform')];
            require('../../actions')();
            require('../../routes/perform')(true);

            test.done();
          });
    },
  
     // https://github.com/jamescarr/nodejs-mongodb-streaming/blob/master/app.coffee
    'Stream to the response object when copying a file': function(test) {
        test.expect(1);
        var req = {
                body: { 
                     sender: CLIENT,
                     action: 'save',
                     content: { resource: 'fs',
                                data: {
                                        _id: new mongo.ObjectID('0123456789AB'),
                                    },
                     },
                },
                user: { email: CLIENT, admin: false },
                files: {
                    file: { 
                        name: 'pdf0.pdf',
                        type: 'application/pdf',
                        path: '/tmp/pdf0.pdf',
                    },
                },
                on: function(evt, handler) {
                        var handle = handler;
                        return;
                    },
              };

        // Make sure all the test files are stored in /tmp
        try {
          fs.closeSync(fs.openSync(req.files.file.path, 'r'));
        }
        catch (err) {
          test.ok(false, err);
        }

        var count = fs.readdirSync('/tmp').length;

        perform.handler(req, RES, function(err) {
            if (err) {
              test.ok(false, err);
            }
            
            // Copy the file back
            var req = {
                    body: { 
                         sender: CLIENT,
                         action: 'cp',
                         content: {
                                 resource: 'fs',
                                 id: '0123456789AB',
                         },
                    },
                    user: { email: CLIENT, admin: false },
                    on: function(evt, handler) {
                            var handle = handler;
                            return;
                        },
                  };

            perform.handler(req, RES, function(err) {
                if (err) {
                  test.ok(false, err);
                }
                console.log(_code, _content);
                test.done();
            });
        });
    },


    /**
     * Kill processes when connection closes prematurely
     */
    'Should add a PID file name to the message\'s content field': function(test) {
        test.expect(2);
        var actions = require('../../actions')();
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            test.ok(message.content.pidFile);
            deferred.resolve();
            return deferred.promise;
          });

        // This has to be required here, otherwise the actions
        // module isn't properly stubbed out
        var p = require('../../routes/perform')(true);
        p.handler(SEND_REQ, RES, function(err) {
           test.ok(actions.ls.called);
           actions.ls.restore();
           test.done();
         });
    },

    'Should call tmp.tmpName to write a file to the /tmp directory': function(test) {
        test.expect(1);
        sinon.stub(tmp, 'tmpName', function(done) {
            done(err, '/tmp/someRandom.pid');
          });

        perform.handler(SEND_REQ, RES, function(err) {
           test.ok(tmp.tmpName.called);
           tmp.tmpName.restore();
           test.done();
         });
    },

    'Should kill the process named in the PID file if it exists and the \'close\' event is emitted': function(test) {
        test.expect(2);

        var actions = require('../../actions')();
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            SEND_REQ.handle();
            // Do I really reject here?
            // 2014-11-17
            deferred.reject();
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
        p.handler(SEND_REQ, RES, function(err) {
            if (err) {
              test.ok(true);
            }
            else {
              test.ok(false);
            }
         });
    },

    'Should do nothing if there is no PID file and the \'close\' event is emitted': function(test) {
        test.expect(4);

        var actions = require('../../actions')();
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            SEND_REQ.handle();
            // Do I really reject here?
            // 2014-11-17
            deferred.reject();
            return deferred.promise;
          });

        sinon.spy(fs, 'readFile');
        sinon.spy(fs, 'remove');

        // This will be overriden so that it can call the 'close' event
        var childProcess = require('child_process');
        sinon.spy(childProcess, 'exec');

        // This has to be required here, otherwise the actions
        // module isn't properly stubbed out
        var p = require('../../routes/perform')(true);
        p.handler(SEND_REQ, RES, function(err) {
            test.ok(fs.readFile.called);
            test.ok(!fs.remove.called);
            test.ok(!childProcess.exec.called);

            if (err) {
              test.ok(true);
            }
            else {
              test.ok(false);
            }
            fs.readFile.restore();
            fs.remove.restore();
            childProcess.exec.restore();
            actions.ls.restore();
            test.done();
         });
    },

    'Should remove the PID file when \'close\' event is emitted': function(test) {
        test.expect(4);

        var actions = require('../../actions')();
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            SEND_REQ.handle();
            // Do I really reject here?
            // 2014-11-17
            deferred.reject();
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
            test.ok(fs.remove.called);
            test.ok(fs.readFile.called);
            test.ok(childProcess.exec.called);
            actions.ls.restore();
            fs.readFile.restore();
            fs.remove.restore();
            childProcess.exec.restore();
            test.done();
          });

        // This has to be required here, otherwise the actions
        // module isn't properly stubbed out
        var p = require('../../routes/perform')(true);
        p.handler(SEND_REQ, RES, function(err) {
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
            console.log('childProcess.exec');
            done(null); 
          });

        // fs.readFile needs to return something, even though no file
        // actually exists
        sinon.stub(fs, 'readFile', function(path, enc, done) {
            done(null, '12345'); 
          });
   
        var req = {};
        extend(true, req, SEND_REQ);
        req.body.content.timeLimit = 1;

        var actions = require('../../actions')();
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            for (var i = 0; i < 3000000; i++) { /* I can't get sinon.useFakeTimers to work */ }
            deferred.resolve();
            return deferred.promise;
          });


        var p = require('../../routes/perform')(true);
        p.handler(req, RES, function(err) {
            test.equal(err, 'Sorry, you ran out of time');
            test.ok(utils.setTimeLimit.called);
            test.ok(utils.stopTimer.called);
            test.ok(fs.readFile.called);

            // Keep an eye on this. This should be called, but is not.
            // 2014-11-19
            //test.ok(childProcess.exec.calledWith('kill 12345'));
            //test.ok(childProcess.exec.called);

            fs.readFile.restore();
            utils.setTimeLimit.restore();
            utils.stopTimer.restore();
            childProcess.exec.restore();
            actions.ls.restore();

            test.done();
          });
    },

    'Return a 500 error if the agent executes longer than allowed': function(test) {
        test.expect(5);

        var childProcess = require('child_process');
        sinon.stub(childProcess, 'exec', function(command, done) {
            done(null); 
          });

        var actions = require('../../actions')();
        sinon.stub(actions, 'ls', function(verified, message) {
            var deferred = q.defer();
            for (var i = 0; i < 3000000; i++) { /* I can't get sinon.useFakeTimers to work */ }
            deferred.resolve();
            return deferred.promise;
          });


        sinon.spy(utils, 'setTimeLimit');

        // fs.readFile needs to return something, even though no file
        // actually exists
        sinon.stub(fs, 'readFile', function(path, enc, done) {
            done(null, '12345'); 
          });


        var req = {};
        extend(true, req, SEND_REQ);
        req.body.content.timeLimit = 1;
 
        var p = require('../../routes/perform')(true);
        p.handler(req, RES, function(err) { 
            if (err) {
              test.equal(err, 'Sorry, you ran out of time');
            }
            test.equal(_code, 500);
            test.equal(_content, 'Sorry, you ran out of time');

            test.ok(utils.setTimeLimit.called);
            test.ok(fs.readFile.called);

            // Keep an eye on this. This should be called, but is not.
            // 2014-11-19
            //test.ok(childProcess.exec.calledWith('kill 12345'));

            actions.ls.restore();
            utils.setTimeLimit.restore();
            childProcess.exec.restore();
            fs.readFile.restore();

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

        // fs.readFile needs to return something, even though no file
        // actually exists
        sinon.stub(fs, 'readFile', function(path, enc, done) {
            done(null, '12345'); 
          });

        var req = {};
        extend(true, req, SEND_REQ);
        req.body.content.timeLimit = 5000;
 
        var p = require('../../routes/perform')(true);
        p.handler(req, RES, function(err) {
            if (err) {
              test.ok(false, err);
            }
            test.ok(utils.setTimeLimit.called);
            test.ok(utils.stopTimer.called);
            test.ok(fs.readFile.called);

            test.ok(!childProcess.exec.calledWith('kill 12345'));
            test.ok(!childProcess.exec.called);

            utils.setTimeLimit.restore();
            childProcess.exec.restore();
            fs.readFile.restore();

            test.done();
         });
    },
};

// I can't figure out how to use sinon's mocks, stubs, etc.
// As such, I can't tell if passport.authenticate is being called
// TODO: figure out sinon
/**
 * authenticate
 */
exports.authenticate = {

    setUp: function(callback) {
        callback();
    },

    tearDown: function(callback) {
        callback();
    },

    'call passort.authenticate if no user in request': function(test) {
        test.done();
    },

    'do not call passort.authenticate if user in request': function(test) {
        test.done();
    },

};


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


