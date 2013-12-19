'use strict';

var passport = require('passport'),
    utils = require('../lib/utils'),
    sc = require('../lib/sc'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    extend = require('extend'),
    q = require('q');

module.exports = function(email) {

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

        console.log('---message');
        console.log(message);
        console.log('req.files');
        console.log(req.files);

        // Form a social commitment
        sc.form(agent, 'perform', message).
            then(function(socialCommitment) {
                console.log('HERE');
                _verify(agent, message).
                    then(function(verified) {

                        // There might be files attached to the message.
                        // They are included here, because it seems 
                        // silly to attach them to the social commitment.
                        extend(true, message, req.files);

//                        console.log('perform');
//                        console.log(agent);
//                        console.log(req.authInfo);
                        console.log('message');
                        console.log(message);
//                        console.log('verified');
//                        console.log(verified);
    
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
                                          console.log('data');
                                          console.log(data);
                                          res.send(200, data);
                                          done();
                                        }).
                                      catch(function(err) {
                                          console.log(err);       
                                          res.send(401, err);
                                          done(err);
                                        });
                                }).
                              catch(function(err) {
                                      console.log('action error');
                                      console.log(err);
                                      res.send(401, err);
                                      done(err);
                                });
                        }
                      }).
                    catch(function(err) {
                        console.log('Verification error');
                        console.log(err);
                        res.send(401, err);
                        done(err);
                      });
              }).
            catch(function(err) {
                console.log('Cannot commit');
                console.log(err);
                res.send(401, err);
                done(err);
              });
       };
    exports.handler = _handler;

    /**
     * Receive a perform attempt for consideration
     */
    exports.perform = [
        function(req, res, next) {
            if (req.user) {
              return next();
            }
            passport.authenticate(['bearer'], { session: false })(req, res, next);
        },
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

        // A resoure does not necessarily need to be specified
        // in every circumstance. The following is experimental
        var resource;
        if (message.content && message.content.resource) {
          resource = utils.getMongoCollectionName(message.content.resource);
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


