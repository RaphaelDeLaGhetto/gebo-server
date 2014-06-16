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
                         * Make sure this agent knows how to
                         * perform the requested action
                         */
                        if(!action[message.action]) {
                          res.send(501, 'I don\'t know how to ' + message.action);
                          done();
                        }
                        else {
                          action[message.action](verified, message).
                              then(function(data) {
                                 sc.fulfil(message.receiver, socialCommitment._id).
                                      then(function(sc) {
                                          logger.info('data', data);
                                          res.send(200, data);
                                          done();
                                        }).
                                      catch(function(err) {
                                          logger.error('Social commitment fulfil', err);
                                          res.send(401, err);
                                          done(err);
                                        });
                                }).
                              catch(function(err) {
                                      logger.error('Action', err);
                                      res.send(401, err);
                                      done(err);
                                });
                        }
                      }).
                    catch(function(err) {
                        logger.error('Verification', err);
                        res.send(401, err);
                        done(err);
                      });
              }).
            catch(function(err) {
                logger.error('Cannot commit', err);
                res.send(401, err);
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
        function(req, res, next) {
            _handler(req, res, function(){});
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

        if (!verified.dbName) {
          verified.dbName = utils.getMongoDbName(agent.email);
        }

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


