'use strict';

var config = require('./config'),
    nconf = require('nconf'),
    db = require('./dbschema'),//(nconf.get('name')),
    mongo = require('mongodb'),
    utils = require('../lib/utils'),
    q = require('q');

module.exports = {

    /**
     * Determine if the database exists. To do this,
     * a database is opened and the number of 
     * collections is counted. If the number is zero,
     * this is a new database that did not previously
     * exist.
     * @param string
     *
     * @return bool
     */
    dbExists: function(dbName) {
        var deferred = q.defer();
        var server = new mongo.Server(config.mongo.host,
                                      config.mongo.port,
                                      config.mongo.serverOptions);
        var db = new mongo.Db(dbName, server, config.mongo.clientOptions);

        db.open(function (err, client) {
            if (err) {
	      console.log('ERROR! What is happening here?');
	      console.log(err);
              throw(err);
            }
            client.collectionNames(function(err, names) {
                if (err) {
                  console.log(err);
                  throw(err);
                }

                if (names.length === 0) {
                  deferred.reject(new Error('Database: ' + dbName + ' does not exist'));
                  db.dropDatabase(function(err) {
                    if (err) {
                      deferred.reject(new Error('Database: ' +
                                      dbName + ' was not dropped'));
                    }
                  });
                }
                else {
                  deferred.resolve(client);
                }
              });
          });

        return deferred.promise;
      },

    /**
     * Get the app's collection
     *
     * @param string
     *
     * @return promise
     */
    getCollection: function(dbName, colName) {
        var deferred = q.defer();
        this.dbExists(dbName).
            then(function(client) {
                var collectionName = utils.getMongoCollectionName(colName);
                var collection = new mongo.Collection(client, collectionName);
                deferred.resolve(collection);
              }).
            catch(function(err) {
                deferred.reject(err);       
              });
        return deferred.promise;
      },
    
    /**
     * Save JSON to user's profile
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    save: function(verified, params) {
        var deferred = q.defer();

        this.getCollection(verified.dbName, verified.collectionName).
            then(function(collection) {

                    // Make data._id a string (because it might
                    // otherwise be interpreted as an int or hex)
                    if (params.data._id) {
                      params.data._id = new mongo.ObjectID(params.data._id + '');
                    }

                    collection.save(params.data, { safe: true },
			function(err, ack) {
			    if (err) {
	                      deferred.reject(err);
	                    }
	                    else {
			      deferred.resolve(ack);
	                    }
			  });
              }).
            catch(function(err) {
                    deferred.reject(err);
              }).
            done();
        return deferred.promise;
      },
        
    /**
     * Copy JSON from a user's profile
     *
     * @param Object
     * @param Object
     */
    cp: function(verified, params) {
        var deferred = q.defer();

        this.getCollection(verified.dbName, verified.collectionName).
            then(function(collection) {
		collection.find({ '_id': new mongo.ObjectID(params.id) }).toArray(
                    function(err, docs) {
                        if (err) {
                          deferred.reject(err);
                        }
                        else {
			  // Should I check for multiple matches?
                          deferred.resolve(docs[0]);
                        }
                      });
                   }).
                 catch(function(err) {
                        deferred.reject(err);
                  });
//                 done();
// 
        return deferred.promise;
      },

    /**
     * Remove a doc from a user's profile
     *
     * @param Object
     * @param Object
     */
    rm: function(verified, params) {
        var deferred = q.defer();

        this.getCollection(verified.dbName, verified.collectionName).
            then(function(collection) {
                    // Does this collection exist?
                    collection.count(function(err, count) {
                        if (count === 0) {
                          deferred.reject(
                                  new Error('Collection: ' +
                                          colName + ' does not exist'));
                        }
                        else {
                          collection.remove({ _id: new mongo.ObjectID(params.id) },
                          function(err, ack) {
                              if (err || ack === 0) {
                                deferred.reject(
                                        new Error('Could not delete document: ' + mongoId));
                              }
                              else {
                                deferred.resolve();
                              }
                            });
                        }
                      });
              }).
            catch(function(err) {
                    deferred.reject(err);
              }).
            done();
 
        return deferred.promise;
      },

    /**
     * Remove a collection from the user's profile
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    rmdir: function(verified) {
        var deferred = q.defer();

        this.getCollection(verified.dbName, verified.collectionName).
            then(function(collection) {
                    // Does this collection exist?
                    collection.count(function(err, count) {
                        if (count === 0) {
                          deferred.reject(
                            new Error('Collection: ' +
                                    verified.collectionName + ' does not exist'));
                        }
                        else {
                          collection.drop(
                              function(err, ack) {
                                  if (err || ack === 0) {
                                    deferred.reject(
                                            new Error('Could not delete collection: ' +
                                                    verified.collectionName));
                                  }
                                  else {
                                    deferred.resolve();
                                  }
                                });
                        }
                      });
              }).
            catch(function(err) {
                    deferred.reject(err);
              }).
            done();
        return deferred.promise;
      },
 
    /**
     * Return a list of documents contained in the app's collection
     *
     * @param Object
     *
     * @return promise
     */
    ls: function(params) {
        var deferred = q.defer();
        this.getCollection(params.dbName, params.collectionName).
            then(function(collection) {
                    collection.find({}, ['_id', 'name']).
                        sort('name').
                        toArray(function(err, docs) {
                            if (err) {
                              deferred.reject(err);
                            }
                            else {
                              deferred.resolve(docs);
                            }      
                          });
              }).
            catch(function(err) {
                    deferred.reject(err);
              });
        return deferred.promise;
      },
    
    /**
     * Return a list of registered users 
     *
     * @param Object
     *
     * @return promise
     */
    getUsers: function(params) {
        var deferred = q.defer();
	if (params.admin) {
	  var query = db.userModel.find({}, { password: false });
	  query.exec().
	    then(function(users) {
		deferred.resolve(users);		  
	      });
	}
	else {
	  deferred.reject('You don\'t have permission to view registered users');
	}

        return deferred.promise;
      },

    /**
     * Return a list of a registered user's 
     * documents
     *
     * @param Object
     * @param Object
     *
     * @return promise
     */
    getUserDocuments: function(verified, params) {
        var deferred = q.defer();
	if (verified.admin) {
	    var dbName = utils.getMongoDbName(params.email);
	    this.ls({ dbName: dbName, collectionName: verified.collectionName }).
		then(function(data) {
		    deferred.resolve(data);
		  }).
		catch(function(err) {
		    deferred.reject(err);
		  });
	}
	else {
	  deferred.reject('You don\'t have permission to view user documents');
	}

        return deferred.promise;
      },

    /**
     * Create a new database
     *
     * @param string
     * @param Object - The user's public profile
     *
     * @return promise
     */
    createDatabase: function(dbName, profile) {
        var deferred = q.defer();

        this.dbExists(dbName).
                then(function() {
                    deferred.reject();
                  }).
                catch(function(err) {
                        var server = new mongo.Server(config.mongo.host,
                                         config.mongo.port,
                                         config.mongo.serverOptions);
                        var db = new mongo.Db(
				dbName, server, config.mongo.clientOptions);

                        db.open(function (err, client) {
                            if (err) {
                              deferred.reject(err);
                            }
                            else { 
                              var collection = new mongo.Collection(client, 'profile');
                              collection.save(profile.toObject(), { safe: true },
                                      function(err, ack) {
                                          if (err) {
                                            deferred.reject(err);
                                          }
                                          else {
                                            deferred.resolve(ack);
                                          }
                                          db.close();  
                                        });
                            }
                        });
                  });

        return deferred.promise;
      },

    /**
     * Drop a database
     * 
     * @param string
     *
     * @return promise
     */
    dropDatabase: function(dbName) {
        var deferred = q.defer();
        this.dbExists(dbName).
                then(function() {
                    var server = new mongo.Server(config.mongo.host,
                                     config.mongo.port,
                                     config.mongo.serverOptions);
                    var db = new mongo.Db(dbName, server, config.mongo.clientOptions);

                    db.open(function (err, client) {
                        if (err) {
                          deferred.reject(err);
                        }
                        else { 
                          db.dropDatabase(function(err) {
                              if (err) {
                                deferred.reject(new Error('Database: ' +
                                                dbName + ' was not dropped'));
                              }
                              else {
                                deferred.resolve();
                              }
                            });
                        }
                      });
                  }).
                catch(function(err) {
                   deferred.reject(err);
                });
        return deferred.promise;
      },

  };
