'use strict';

var passport = require('passport'),
    utils = require('../lib/utils'),
    sc = require('../lib/sc'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    extend = require('extend'),
    multiparty = require('connect-multiparty'),
    q = require('q'),
    winston = require('winston');

module.exports = function(email) {

    var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({ colorize: true }) ] });

    // Turn the email into a mongo-friendly database name
    var dbName = utils.ensureDbName(email);
    var action = require('../actions')(dbName);

    /**
     * Handle incoming attempts to perform
     * actions on the data specified in the message
     */
    var _handler = function(req, res, done) {
    
        var message = req.body,
            agent = req.user;

        logger.info('message', JSON.stringify(message, null, 2));
        logger.info('req.files', JSON.stringify(req.files, null, 2));

        // Form a social commitment
        sc.form(agent, 'perform', message).
            then(function(socialCommitment) {
                _verify(agent, message).
                    then(function(verified) {

                        // There might be files attached to the message.
                        // They are included here, because it seems 
                        // silly to attach them to the social commitment.
                        extend(true, message, req.files);

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

        // A resource does not necessarily need to be specified
        // in every circumstance. The following is experimental
        var resource;
        if (message.content && message.content.resource) {
          resource = utils.getMongoCollectionName(message.content.resource);
        }
        // Experimental:
        // If no resource is set, it is assumed the call to action
        // is not tied with any resource. This is a temporary workaround.
        // At the moment, this behaviour is enabled by setting execute permissions
        // on the gebo agent's own email address.
        //
        // Obviously, this all needs to change
        else {
          resource = utils.getMongoCollectionName(message.receiver);
        }

        var verified = {
                collectionName: resource,
		admin: agent.admin,
		dbName: utils.getMongoDbName(message.receiver),
		read: false,
		write: false,
		execute: false,
            };

        if (!verified.dbName) {
          verified.dbName = utils.getMongoDbName(agent.email);
        }

        if (utils.getMongoDbName(agent.email) !== verified.dbName && !verified.admin) {
          var agentDb = new agentSchema(verified.dbName);
  
          agentDb.friendModel.findOne({ email: agent.email }, function(err, friend) {
                agentDb.connection.db.close();
                if (err) {
                  deferred.reject(err);
                }
                if (!friend) {
                  deferred.resolve(verified);
                  //deferred.reject('I don\'t know you');
                }
                else { 
                  // Search the array for relevant resource
                  var index = utils.getIndexOfObject(friend.hisPermissions, 'email', verified.collectionName);

                  if (index > -1) {
                    verified.read = friend.hisPermissions[index].read;
                    verified.write = friend.hisPermissions[index].write;
                    verified.execute = friend.hisPermissions[index].execute;
                  }

                  deferred.resolve(verified);
                }
              });
        }
        // This agent is attempting to perform an action on his own resource
        else {
          verified.read = true;
          verified.write = true;
          verified.execute = true;
          deferred.resolve(verified);
        }

        return deferred.promise;
      };
    exports.verify = _verify;
    
    return exports;
  };


