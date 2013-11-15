'use strict';

var passport = require('passport'),
    nconf = require('nconf'),
    utils = require('../lib/utils'),
    geboSchema = require('../schemata/gebo'),
    agentSchema = require('../schemata/agent'),
    extend = require('extend'),
    q = require('q');

module.exports = function(email) {

    // Turn the email into a mongo-friend database name
    var dbName = utils.ensureDbName(email);
    var action = require('../actions')(dbName);

    /**
     * Receive a request for consideration
     */
    exports.request = [
        function(req, res, next) {
            if (req.user) {
              return next();
            }
            passport.authenticate(['bearer'], { session: false })(req, res, next);
        },
        function(req, res) {

            // There might be files attached to the request
            var message = req.body;
            extend(true, message, req.files);

            // Form a social commitment
            _createSocialCommitment(req.user, 'request', message).
                then(function(sc) {

                _verify(req.user, message).
                    then(function(verified) {
                            console.log('request');
                            console.log(req.user);
                            console.log(req.authInfo);
                            console.log('message');
                            console.log(message);
                            console.log('verified');
                            console.log(verified);
                
                            action[req.body.action](verified, message).
                                then(function(data) {
                                    _fulfilSocialCommitment(sc._id, message.dbName).
                                        then(function(sc) {
                                            res.send(data);
                                          }).
                                        catch(function(err) {
                                            console.log(err);       
                                            res.send(401, err);
                                          });
                                  }).
                                catch(function(err) {
                                    console.log('action error');
                                    console.log(err);
                                    res.send(404, err);
                                  });
                          }).
                    catch(function(err) {
                        console.log('verification error');
                        console.log(err);
                        res.send(401, err);
                      });
                  }).
                catch(function(err) {
                    console.log('Cannot commit');
                    console.log(err);
                    res.send(401, err);
                  });
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

	var verified = {
                collectionName: utils.getMongoCollectionName(message.collectionName),
                admin: agent.admin,
                dbName: utils.getMongoDbName(message.dbName)
            };

        if (!verified.dbName) {
          verified.dbName = utils.getMongoDbName(agent.email);
        }

        if (utils.getMongoDbName(agent.email) !== verified.dbName && !verified.admin) {
          var agentDb = new agentSchema(verified.dbName);
  
          agentDb.friendModel.findOne({ email: agent.email}, function(err, friend) {
                if (err) {
                  deferred.reject(err);
                }
                if (!friend) {
                  deferred.reject('I don\'t know you');
                }
                else { 
                  // Search the array for requested resource
                  var index = utils.getIndexOfObject(friend.hisPermissions, 'email', verified.collectionName);

                  if (index > -1) {
                    verified.read = friend.hisPermissions[index].read;
                    verified.write = friend.hisPermissions[index].write;
                    verified.execute = friend.hisPermissions[index].execute;
                    deferred.resolve(verified);
                  }
                  else {
                    deferred.reject('You don\'t have access to that resource');
                  }
                }
                agentDb.connection.db.close();
              });
        }
        // This agent is requesting access to his own resources
        else {
          verified.read = true;
          verified.write = true;
          verified.execute = true;
          deferred.resolve(verified);
        }

        return deferred.promise;
      };
    exports.verify = _verify;
    
    /**
     * Create a social commitment for an agent to fulfil
     *
     * @param Object
     * @param string
     * @param Object
     *
     * @return promise
     */
    var _createSocialCommitment = function(agent, performative, message) {
        var deferred = q.defer();

        console.log('message');
        console.log(message);
        console.log('agent');
        console.log(agent);
        var agentDb = new agentSchema(message.recipient);
        var sc = new agentDb.socialCommitmentModel({
                        type: performative,
                        action: message.action,
                        data: message,
                        creditor: agent.email,
                        debtor: message.recipient,
                    });
        sc.save(function(err, socialCommitment) {
            if (err) {
              deferred.reject(err);
            }
            else {
              deferred.resolve(socialCommitment);
            }
        });
        return deferred.promise;
      };
    exports.createSocialCommitment = _createSocialCommitment;

    /**
     * Fulfil a social commitment
     *
     * @param string
     * @param string
     *
     * @return promise
     */
    var _fulfilSocialCommitment = function(agent, id) {
        var deferred = q.defer();

        var agentDb = new agentSchema(agent);
        agentDb.socialCommitmentModel.findOneAndUpdate({ _id: id }, { fulfilled: Date.now() }, function(err, sc) {
            if (err) {
              deferred.reject(err);
            }
            else {
              deferred.resolve(sc);
            }
          });
        return deferred.promise;
      };
    exports.fulfilSocialCommitment = _fulfilSocialCommitment;

    return exports;
  };


