'use strict';

var basic = require('gebo-basic-action'),
    agentDb = basic.schemata.agent(),
    action = basic.actions,
    childProcess = require('child_process'),
    extend = require('extend'),
    fs = require('fs-extra'),
    nconf = require('nconf'),
    passport = require('passport'),
    q = require('q'),
    sc = require('../lib/sc'),
    tmp = require('tmp'),
    utils = require('gebo-utils'),
    winston = require('winston');

module.exports = function(testing) {

    var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

    nconf.file({ file: './gebo.json' });
    var logLevel = nconf.get('logLevel');

    // Get this agent's email. Put into
    // test mode, if specified
    var agentEmail = nconf.get('email');
    if (testing) {
      agentEmail = nconf.get('testEmail');
    }


    /**
     * Handle incoming attempts to perform
     * actions on the data specified in the message
     */
    var _handler = function(req, res, done) {

        var _error = null;

        var message = req.body,
            agent = req.user;

        if (logLevel === 'trace') logger.info('message', JSON.stringify(message, null, 2));

        // If the receiver isn't explicitly set, this gebo is the receiver
        if (!message.receiver) {
          message.receiver = agentEmail;
        }

        // Clean up any temporary files when done acting
        res.on('end', function() {
            utils.deleteTmpFiles(req.files, function(err) {
                  if (err) {
                    if (logLevel === 'trace') logger.warn('deleteTmpFiles', err);
                  }
                  done(_error);
              });
          });
 
        // Form a social commitment
        sc.form(agent, 'perform', message).
            then(function(socialCommitment) {
                _verify(agent, message).
                    then(function(verified) {

                        // There might be files attached to the message.
                        // They are included here, because it seems 
                        // silly to attach them to the social commitment.
                        extend(true, message, req.files);

                        if (logLevel === 'trace') logger.info('verified', verified);

                        /**
                         * Actions may be specified in dot notation. This was written
                         * in the heat of the moment, so an agent can currently only
                         * have an action buried one layer deep. Ideally, this should
                         * handle actions buried any arbitrary depth, but at the moment
                         * I can't see why it would ever go deeper than one. So screw it.
                         */
                        var actionPtr = action;
                        var actionParts = message.action.split('.');
                        if (actionParts.length === 2) {
                          actionPtr = actionPtr[actionParts[0]];
                        }

                        /**
                         * Make sure this agent knows how to
                         * perform the requested action
                         */
                        if(!actionPtr[actionParts[actionParts.length - 1]]) {
                          _error = 'I don\'t know how to ' + message.action;
                          res.status(501).send(_error);
                        }
                        else {
                          // Create a temporary PID file before acting
                          tmp.tmpName(function(err, path) {
                              if (err) {
                                if (logLevel === 'trace') logger.error('Temp PID', err);
                              }
                              else if (message.content) {
                                message.content.pidFile = path;
                              }
                              else {
                                message.content = { pidFile: path };
                              }

                              // This is called in the event that the connection with 
                              // the client is broken
                              var killCallback = function() {
                                    var kill = 'kill $(cat ' + path + ')';
                                    if (logLevel === 'trace') logger.warn('gebo-server process:', kill);
                                    childProcess.exec(kill, function(err, stdout, stderr) {
                                        if (err) {
                                          if (logLevel === 'trace') logger.error('perform', 'close', err);
                                        }
                                        if (stderr) {
                                          if (logLevel === 'trace') logger.warn('perform', 'close', stderr);
                                        }
                                        if (stdout) {
                                          if (logLevel === 'trace') logger.info('perform', 'close', stdout);
                                        }
                                        message.content.returnNow = 'Connection was closed by the client';
                                        fs.remove(path, function(err) {
                                            if (err) {
                                              if (logLevel === 'trace') logger.error('perform', 'close', err);
                                            }
                                          });
                                      });
                                };
                              req.on('close', killCallback);

                              // Act!
                              utils.setTimeLimit(message.content, function(timer){
                                  actionPtr[actionParts[actionParts.length - 1]](verified, message).
                                    then(function(data) {
                                        utils.stopTimer(timer, message.content);

                                        if (message.content.returnNow) {
                                          if (logLevel === 'trace') logger.error('Force return');
                                          _error = message.content.returnNow;
                                          res.status(500).send(_error);
                                        }
                                        else if (message.content.timeLimit < 0) {
                                          if (logLevel === 'trace') logger.error('Timeout');
                                          _error = 'That request was taking too long';
                                          res.status(500).send(_error);
                                        }
                                        else if (data && data.error) {
                                          if (logLevel === 'trace') logger.error('Server error', data);
                                          _error = data.error;
                                          res.status(500).send(_error);
                                        }
                                        else {
                                          sc.fulfil(message.receiver, socialCommitment._id).
                                              then(function(sc) {
                                                  if (logLevel === 'trace' && data && !data.filename) logger.info('Done:', data);

                                                  // If you don't set this as a string,
                                                  // the status code will be set to the 
                                                  // numeric value contained in data
                                                  //
                                                  // 2014-7-31 Do I need this anymore?
                                                  //
                                                  // 2014-12-9 Incredibly, I do still need this
                                                  if (typeof data === 'number') {
                                                    res.status(200).send('' + data);
                                                  }
                                                  // 2014-12-8 
                                                  // This could potentially get super confusing
                                                  // This clause is for file address data stored on the
                                                  // server for later download. The clause below is
                                                  // for streaming files retrieved from mongo GridStore
                                                  // 
                                                  // What to do?...
                                                  else if (data && data.filePath) {
        
                                                    if (!data.fileName) {
                                                      var fname = data.filePath.split('/');
                                                      fname = fname[fname.length - 1];
                                                      data.fileName = fname; 
                                                    }
                                                    res.download(data.filePath, data.fileName, function(err) {
                                                          if (err) {
                                                            if (logLevel === 'trace') logger.error('Send file:', err);
                                                          }
                                                          fs.unlink(data.filePath, function(err) {
                                                              if (err) {
                                                                if (logLevel === 'trace') logger.error('File removal:', err);
                                                              }
                                                            });
                                                      });
                                                  }
                                                  else if (data && data.filename) {
                                                    res.header('Content-Type', data.contentType);
                                                    res.header('Content-Disposition', 'attachment; filename="' + data.filename + '"');
                                                    data.stream(true).pipe(res);
                                                  }
                                                  else {
                                                    res.status(200).send(data);
                                                  }
                                                }).
                                              catch(function(err) {
                                                  if (logLevel === 'trace') logger.error('Social commitment fulfil', err);
                                                  _error = err;
                                                  res.status(409).send(_error);
                                                });
                                        }
                                      }).
                                    catch(function(err) {
                                        if (logLevel === 'trace') logger.error('Action', err);
                                        _error = 'You are not allowed access to that resource';
                                        res.status(401).send(_error);
                                      });
                                  });
                            });
                        }
                      }).
                    catch(function(err) {
                        if (logLevel === 'trace') logger.error('Verification', err);
                        _error = 'You could not be verified';
                        res.status(401).send(_error);
                      });
              }).
            catch(function(err) {
                if (logLevel === 'trace') logger.error('Bad request', err);
                _error = 'The request could not be understood by the server';
                res.status(400).send(_error);
              });
       };
    exports.handler = _handler;

    /**
     * Authenticate, if necessary
     */
    function _authenticate(req, res, next) {
        if (req.user) {
          return next();
        }
        passport.authenticate(['bearer'], { session: false })(req, res, next);
      };
    exports.authenticate = _authenticate;

    /**
     * Receive a perform attempt for consideration
     */
    exports.perform = [
        _authenticate,
        // _handler takes a callback for unit testing purposes.
        // passport.authenticate's next() callback screws everything up
        // when the server runs for real. This step, though goofy looking,
        // circumvents that issue.
        //
        // 2014-7-31
        // This also now ensures that the email that corresponds to this
        // token matches the one provided.
        function(req, res, next) {
            // Make sure sender matches the email corresponding to the token
            if (req.user.email.toLowerCase() === req.body.sender.toLowerCase()) {

              // This is a hack that could easily be avoided, but which is 
              // implemented for future reference (i.e., to remind me that 
              // the performative field will eventually be necessary and 
              // that proper response codes need to be issued)
              if (req.body.performative.toLowerCase() === 'request') {
                _handler(req, res, function(){});
              }
              else {
                res.status(501).send('I do not understand that performative');
              }
            }
            else {
              res.status(401).send('The token provided is invalid');
            }
        }
      ];

    /**
     * Determine what permissions an agent has on a
     * given object
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    function _verify(agent, message) {
        var deferred = q.defer();

        // A message's contents may be received as a string.
        if (typeof message.content === 'string') {
          message.content = JSON.parse(message.content);
        }

        /**
         * A resource may be a DB collection or an action
         * performed by the gebo. If no collection is specified
         * then the relevant resource must be an action
         */
        var resource = message.action;
        if (message.content && message.content.resource) {
          resource = utils.getMongoCollectionName(message.content.resource);
        }

        var verified = {
                resource: resource,
                admin: agent.admin,
                read: false,
                write: false,
                execute: false,
            };

        if (agent.admin) {
          verified.read = true;
          verified.write = true;
          verified.execute = true;
          deferred.resolve(verified);
        }
        else {
          agentDb.friendoModel.findOne({ email: agent.email }, function(err, friendo) {
                if (logLevel === 'trace') logger.info('friendo:', agent.email, JSON.stringify(friendo, null, 2));
                if (err) {
                  if (logLevel === 'trace') logger.error('Verification', err);
                  deferred.reject(err);
                }
                if (!friendo) {
                  deferred.resolve(verified);
                }
                else { 
                  // Search the array for relevant resource
                  var index = utils.getIndexOfObject(friendo.permissions, 'resource', verified.resource);

                  if (index > -1) {
                    verified.read = friendo.permissions[index].read;
                    verified.write = friendo.permissions[index].write;
                    verified.execute = friendo.permissions[index].execute;
                  }

                  deferred.resolve(verified);
                }
              });
        }

        return deferred.promise;
      };
    exports.verify = _verify;

    return exports;
  };
