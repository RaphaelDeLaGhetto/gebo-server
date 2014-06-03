'use strict';

var agentSchema = require('../schemata/agent'),
    q = require('q');

/**
 * Create a social commitment for an agent to fulfil
 *
 * @param Object
 * @param string
 * @param Object
 *
 * @return promise
 */
exports.form = function(agent, performative, message) {
    var deferred = q.defer();

    var agentDb = new agentSchema(message.receiver);
    if (message.socialCommitmentId) {
      agentDb.socialCommitmentModel.findById(message.socialCommitmentId, function (err, sc) {
            if (err) {
              deferred.reject(err);
            }
            else {
              deferred.resolve(sc);
            }
        });
    }
    else {
      var sc = new agentDb.socialCommitmentModel({
                      performative: performative,
                      action: message.action,
                      message: message,
                      creditor: agent.email,
                      debtor: message.receiver,
                  });
      sc.save(function(err, socialCommitment) {
          if (err) {
            deferred.reject(err);
          }
          else {
            deferred.resolve(socialCommitment);
          }
        });
    }
    return deferred.promise;
  };

/**
 * Fulfil a social commitment
 *
 * @param string
 * @param string
 *
 * @return promise
 */
exports.fulfil = function(agent, id) {
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

