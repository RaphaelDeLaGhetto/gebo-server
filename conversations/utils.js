'use strict';

var agentSchema = require('../schemata/agent'),
    https = require('https'),
    utils = require('../lib/utils'),
    q = require('q');

/**
 * Retrieve the conversation, if it exists
 *
 * @param Object - message
 * @param Object - agent
 *
 * @return conversationModel
 */
exports.loadConversation = function(message, agent) {

    var deferred = q.defer();

    // Is this an incoming, or outgoing message?
    var incoming = true;
    if (message.sender === agent.email) {
      incoming = false;
    }

    _getRole(message, incoming).
        then(function(role) {
            if (message.conversationId) {
              var agentDb = new agentSchema(agent.email);
              agentDb.conversationModel.findOne({ conversationId: message.conversationId },
                  function(err, conversation) {
                        if (err) {
                          deferred.reject(err);
                        }
                        else if (!conversation) {
                          _startNewConversation(message, agent, message.performative, role).
                            then(function(conversation) {
                                deferred.resolve(conversation);
                              }).
                            catch(function(err) {
                                deferred.reject(err);
                              });
                        }
                        else {
                          deferred.resolve(conversation);
                        }
                    });
            }
            else {
              _startNewConversation(message, agent, message.performative, role).
                then(function(conversation) {
                    deferred.resolve(conversation);
                  }).
                catch(function(err) {
                    deferred.reject(err);
                  });
            }
      }).
    catch(function(err) {
        deferred.reject(err);
      });

    return deferred.promise;
  };

/**
 * Start a new conversation
 *
 * @param Object
 * @param Object
 * @param string
 * @param string
 *
 * @return promise
 */
var _startNewConversation = function(message, agent, type, role) {
    var deferred = q.defer();

    if (message.performative === type) {
      var conversationId = message.conversationId;
      if (!conversationId) {
        conversationId = message.sender + ':' + Date.now().toString();
      }

      // Get default gebo if not set
      var gebo = message.gebo;
      if (!gebo) {
        gebo = utils.getDefaultDomain();
      }
 
      var agentDb = new agentSchema(agent.email);
      var conversation = new agentDb.conversationModel({
              type: type,
              role: role,
              conversationId: conversationId,
              gebo: gebo, 
          });

      conversation.save(function(err) {
              if (err) {
                deferred.resolve(err);
              }
              else {
                deferred.resolve(conversation);
              }
            });
    }
    else {
      deferred.reject('There\'s no ' + type + ' conversation for this ' + message.performative);
    }
    return deferred.promise;
  };
exports.startNewConversation = _startNewConversation;

/**
 * getFirstUnfulfilledSocialCommitmentIndex
 *
 * @param array
 * @param string
 *
 * @return int
 */
exports.getFirstUnfulfilledSocialCommitmentIndex = function(socialCommitments, performative) {
    for (var i = 0; i < socialCommitments.length; i++) {
      if (socialCommitments[i].performative === performative &&
          socialCommitments[i].fulfilled === null) {
        return i;
      }
    }
    return -1;
  };

/**
 * Establish the role of the agent sending or
 * receiving the message
 *
 * @param Object
 * @param bool
 *
 * @promise
 */
var _getRole = function(message, incoming) {
    var deferred = q.defer();

    if (message.conversationId) {

      var email = message.sender;
      if (incoming) {
        email = message.receiver;
      }

      var agentDb = new agentSchema(email);
      agentDb.conversationModel.findOne({ conversationId: message.conversationId }, function(err, conversation) {

              console.log('conversation',conversation);
            if (err) {
              deferred.reject(err);
            }
            if (conversation) {
              deferred.resolve(conversation.role);
            }
            else {
              switch(message.performative) {
                case 'request':
                    if (incoming) {
                      deferred.resolve('server');
                    }
                    else {
                      deferred.resolve('client');
                    }
                   break;
                case 'propose':
                    if (incoming) {
                      deferred.resolve('client');
                    }
                    else {
                      deferred.resolve('server');
                    }
                    break;
               }
            }
        });
    }
    else {
      switch(message.performative) {
        case 'request':
            if (incoming) {
              deferred.resolve('server');
            }
            else {
              deferred.resolve('client');
            }
            break;
        case 'propose':
            if (incoming) {
              deferred.resolve('client');
            }
            else {
              deferred.resolve('server');
            }
            break;
        }
    }
    
    return deferred.promise;
  };
exports.getRole = _getRole;

/**
 * Take a URI and extract options for making
 * an HTTPS request
 *
 * @param string
 * @param string
 * @param Object
 *
 * @return Object
 */
var _getOptions = function(uri, path, content) {
    var splitUri = uri.split('https://'); 
    uri = splitUri.pop();
    splitUri = uri.split(':'); 
    var port = '443';
    if (splitUri.length > 1) {
      port = splitUri.pop();
      uri = splitUri.pop();
    }

    return {
            host: uri,
            port: port,
            path: path,
            method: 'POST',
            rejectUnauthorized: false,
            requestCert: true,
            agent: false,
            headers: { 'Content-Type': 'application/json',
                       'Content-Length': Buffer.byteLength(JSON.stringify(content)) }
        };
 
  };
exports.getOptions = _getOptions;


/**
 * POST data to the server specified
 *
 * @param string
 * @param string
 * @param Object
 *
 * @return promise
 */
exports.postMessage = function(uri, path, content) {
    console.log('postMessage');
    console.log('uri', uri);
    console.log('path', path);
    var deferred = q.defer();
 
    var options = _getOptions(uri, path, content);
    content = JSON.stringify(content);
 
    console.log('options');
    console.log(options);

    var req = https.request(options, function(res) {
            var data = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                    data += chunk;
                });
            res.on('end', function() {
                    data = JSON.parse(data);
                    if (data.error) {
                      deferred.reject(data.error_description);
                    }
                    else {
                      deferred.resolve(data);
                    }
                });
        }).
      on('error', function(err){
              console.log(err);
              deferred.reject(err);
        });
    
    req.write(content);
    req.end();

    return deferred.promise;
  };

