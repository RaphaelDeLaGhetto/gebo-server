'use strict';

var action = require('../actions')(),
    agentDb = require('../schemata/agent')(),
    extend = require('extend'),
    multiparty = require('connect-multiparty'),
    nconf = require('nconf'),
    passport = require('passport'),
    q = require('q'),
    sc = require('../lib/sc'),
    utils = require('../lib/utils'),
    winston = require('winston');

module.exports = function(testing) {

    var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

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
    
        var message = req.body,
            agent = req.user;

        logger.info('message', JSON.stringify(message, null, 2));
        logger.info('req.files', JSON.stringify(req.files, null, 2));

        // A message's receiver used to be specified in the 
        // message body. Since the vanilla gebo no longer mediates
        // between external agents, the vanilla gebo is always
        // the receiver.
        message.receiver = agentEmail;

        // Form a social commitment
        sc.form(agent, 'perform', message).
            then(function(socialCommitment) {
                _verify(agent, message).
                    then(function(verified) {

                        // There might be files attached to the message.
                        // They are included here, because it seems 
                        // silly to attach them to the social commitment.
                        extend(true, message, req.files);

                        logger.info('verified', verified);

                        /**
                         * Actions may be specified in dot notation. This was written
                         * in the heat of the moment, so an agent can currently only
                         * have an action burried one layer deep. Ideally, this should
                         * handle actions burried any arbitrary depth, but at the moment
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
                          res.status(501).send({ error: 501, message: 'I don\'t know how to ' + message.action });
                          done();
                        }
                        else {
                          actionPtr[actionParts[actionParts.length - 1]](verified, message).
                              then(function(data) {
                                 sc.fulfil(message.receiver, socialCommitment._id).
                                      then(function(sc) {
                                          logger.info('data', data);
                                          // If you don't set this as a string,
                                          // the status code will be set to the 
                                          // numeric value contained in data
                                          //
                                          // 2014-7-31 Do I need this anymore?
                                          if (typeof data === 'number') {
                                            res.status(200).send('' + data);
                                          }
                                          else {
                                            res.status(200).send(data);
                                          }
                                          done();
                                        }).
                                      catch(function(err) {
                                          logger.error('Social commitment fulfil', err);
                                          res.status(401).send({ code: '401', message: err });
                                          done(err);
                                        });
                                }).
                              catch(function(err) {
                                      logger.error('Action', err);
                                      res.status(401).send({ code: '401', message: 'You are not allowed access to that resource' });
                                      done(err);
                                });
                        }
                      }).
                    catch(function(err) {
                        logger.error('Verification', err);
                        res.status(401).send({ code: '401', message: err });
                        done(err);
                      });
              }).
            catch(function(err) {
                logger.error('Bad request', err);
                res.status(400).send({ code: '400', message: 'The request could not be understood by the server' });
                done(err);
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
    var multipartyMiddleware = multiparty();
    exports.perform = [
        multipartyMiddleware,
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
                res.status(501).send({ error: 501, message: 'I do not understand that performative' });
              }
            }
            else {
              res.status(401).send({ error: 401, message: 'The token provided is invalid' });
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
                logger.info('friendo:', agent.email, JSON.stringify(friendo, null, 2));
                if (err) {
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


