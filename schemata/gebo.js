'use strict';

var bcrypt = require('bcrypt'),
    extend = require('extend'),
    //mongooseConnection = require('../lib/mongoose-connection'),
    mongooseConnection = require('gebo-mongoose-connection'),
    mongoose = require('mongoose'),
    utils = require('../lib/utils');

module.exports = function() {

    var SALT_WORK_FACTOR = 10;
    var Schema = mongoose.Schema,
        ObjectId = Schema.Types.ObjectId;

    // Get the DB connection
    mongooseConnection.get(function(connection) {

        /**
         * This is handy for when I need to drop a database
         * during testing
         */
        exports.connection = connection;

        /**
         * Registrant schema
         */
        var registrantSchema = new Schema({
            name: { type: String, required: true, unique: false },
            email: { type: String, required: true, unique: true },
            password: { type: String, required: true},
            admin: { type: Boolean, required: true, default: false },
          });
    
        /**
         * Encrypt the registrant's password before saving
         * 
         * @param function
         */
        registrantSchema.pre('save', function(next) {
            var registrant = this;
        
            if (!registrant.isModified('password')) {
              return next();
            }
        
            bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
                if (err) {
                  return next(err);
                }
        
                bcrypt.hash(registrant.password, salt, function(err, hash) {
                    if (err) {
                      return next(err);
                    }
                    registrant.password = hash;
                    next();
                  });
              });
          });
    
        /**
         * Compare the given password to the 
         * one stored in the database
         *
         * @param string
         * @param function
         */
        registrantSchema.methods.comparePassword = function(candidatePassword, cb) {
            bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
                if (err) {
                  return cb(err);
                }
                cb(null, isMatch);
              });
          };
    
        // Export registrant model
        try {
            var registrantModel = connection.model('Registrant', registrantSchema);
            exports.registrantModel = registrantModel;
          }
        catch (error) {}
    
        /**
         * Token schema
         */
        var tokenSchema = new Schema({
            // The resource owner
            registrantId: { type: ObjectId, required: true, unique: false },
            // The ID of the friend granted access to the resource
            friendId: { type: ObjectId, required: false, default: null },
            // The resource
            collectionName: { type: String, required: true, unique: false },
            // The authorized IP address
            ip: { type: String, required: false, unique: false },
            // The token itself
            string: { type: String, required: true, unique: true },
            expires: { type: Date, required: false, default: null },
          });
        
        // Export token model
        try {
            var tokenModel = connection.model('Token', tokenSchema);
            exports.tokenModel = tokenModel;
          }
        catch(err) {}
    });

    /**
     * API
     */
    return exports;
  };
