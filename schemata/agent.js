'use strict';

var utils = require('../lib/utils');

module.exports = function (email) {

    // Turn the email into a mongo-friend database name
    var dbName = utils.ensureDbName(email);

    /** 
     * Thank you to jaredhanson/passport-local
     * https://github.com/jaredhanson/passport-local
     *
     * and jaredhanson/oauth2orize
     * https://github.com/jaredhanson/oauth2orize
     */
    var mongoose = require('mongoose'),
        bcrypt = require('bcrypt'),
        SALT_WORK_FACTOR = 10;

    /**
     *  Database config
     */
    var uristring =
        process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://localhost/' + dbName;

    var mongoOptions = { db: { safe: true }};

    /**
     * Connect to mongo
     */
    var connection = mongoose.createConnection(uristring, mongoOptions);
    connection.on('open', function() {
        console.log ('Successfully connected to: ' + uristring);
      });

    connection.on('error', function(err) {
        console.log ('ERROR connecting to: ' + uristring + '. ' + err);
      });

    // This is handy for when I need to drop a database
    // during testing
    exports.connection = connection;

    //******* Database schema TODO add more validation
    var Schema = mongoose.Schema,
        ObjectId = Schema.Types.ObjectId;

    /**
     * Client schema
     */
//    var clientSchema = new Schema({
//        name: { type: String, required: true, unique: false },
//        clientId: { type: String, required: true, unique: true },
//        secret: { type: String, required: true, unique: false },
//      });
//    
//    // Export client model
//    try {
//        //var clientModel = mongoose.model('Client', clientSchema);
//        var clientModel = connection.model('Client', clientSchema);
//        exports.clientModel = clientModel;
//      }
//    catch(err) {}

    /**
     * Token schema
     */
//    var tokenSchema = new Schema({
//        agentId: { type: ObjectId, required: true, unique: false },
//        clientId: { type: ObjectId, required: true, unique: false },
//        token: { type: String, required: true, unique: true },
//      });
    
    // Export token model
//    try {
//        var tokenModel = connection.model('Token', tokenSchema);
//        exports.tokenModel = tokenModel;
//      }
//    catch(err) {}

    /**
     * Authorization schema
     */
//    var authorizationSchema = new Schema({
//        agentId: { type: ObjectId, required: true, unique: false },
//        clientId: { type: ObjectId, required: true, unique: false },
//        redirectUri: { type: String, required: true, unique: false },
//        code: { type: String, required: true, unique: true },
//      });
    
    // Export authorization model
//    try {
//        var authorizationModel = connection.model('Authorization', authorizationSchema);
//        exports.authorizationModel = authorizationModel;
//      }
//    catch (error) {}

    /**
     * Agent schema
     */
//    var agentSchema = new Schema({
//        name: { type: String, required: true, unique: false },
//        email: { type: String, required: true, unique: true },
//        password: { type: String, required: true},
//        admin: { type: Boolean, required: true, default: true },
//
////        friends: [friendSchema],
//        // Experimental
////        clientId: { type: String, required: false, unique: false },
////        authorization: { type: String, required: false, unique: false },
////        request: { type: String, required: false, unique: false },
////        verification: { type: String, required: false, unique: false },
////        token: { type: String, required: false, unique: false },
//      });
//
//    /**
//     * Encrypt the agent's password before saving
//     * 
//     * @param function
//     */
//    agentSchema.pre('save', function(next) {
//        var agent = this;
//    
//        if (!agent.isModified('password')) {
//          return next();
//        }
//    
//        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
//            if (err) {
//              return next(err);
//            }
//    
//            bcrypt.hash(agent.password, salt, function(err, hash) {
//                if (err) {
//                  return next(err);
//                }
//                agent.password = hash;
//                next();
//              });
//          });
//      });

    /**
     * Compare the given password to the 
     * one stored in the database
     *
     * @param string
     * @param function
     */
//    agentSchema.methods.comparePassword = function(candidatePassword, cb) {
//        bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
//            if (err) {
//              return cb(err);
//            }
//            cb(null, isMatch);
//          });
//      };
//
//
//    // Export agent model
//    try {
//        var agentModel = connection.model('Agent', agentSchema);
//        exports.agentModel = agentModel;
//      }
//    catch (error) {}

    /**
     * Permission schema
     */
    var permissionSchema = new Schema({
        email: { type: String, required: true, unique: false },
        read: { type: Boolean, required: true, default: true },
        write: { type: Boolean, required: true, default: false },
        execute: { type: Boolean, required: true, default: false },
      });

    // Export permission model
    try {
        var permissionModel = connection.model('Permission', permissionSchema);
        exports.permissionModel = permissionModel;
      }
    catch (error) {}


    /**
     * Friend schema
     */
    var friendSchema = new Schema({
        name: { type: String, required: true, unique: false },
        email: { type: String, required: true, unique: true },

        // Experimental... the friendSchema takes the place of the the clientSchema.
        // As such, name == name, email == clientId, secret == secret (which equals 
        // a mongo-friendly conversion of the email plus a random string)
        //secret: { type: String, required: true, unique: true },

        // Current access tokens
        myToken: { type: String, default: null, unique: false },
        // I don't think I need to store his token. The gebo does that.
        // Access can be granted or denied with permissions. Friendship
        // implies the ability to obtain an access token
//        hisToken: {
//            string: { type: String, default: null, unique: false },
//            expiry: { type: Date, default: null },
//          },

        // Permissions
        myStuff: [permissionSchema],
        hisPermissions: [permissionSchema],

        // Agent communication
        uri: { type: String, required: false, unique: false },
        request: { type: String, required: false, unique: false, default: '/request' },
        propose: { type: String, required: false, unique: false, default: '/propose' },
        inform: { type: String, required: false, unique: false, default: '/inform' },

        // OAuth2
        verify: { type: String, required: false, unique: false, default: '/verify' },
        authorize: { type: String, required: false, unique: false, default: '/authorize' },
        redirect: { type: String, required: false, unique: false, default: '/callback' }, 
      });

    // Export friend model
    try {
        var friendModel = connection.model('Friend', friendSchema);
        exports.friendModel = friendModel;
      }
    catch (error) {}

    /**
     * HAI schema
     */
    var haiSchema = new Schema({
        name: { type: String, required: true, unique: false },
        email: { type: String, required: true, unique: true },
        redirect: { type: String, required: true, unique: false },
        permissions: [permissionSchema],
      });

    /**
     * Get an array of permissions
     *
     * @param string
     */
    haiSchema.methods.getPermissions = function(email) {
        var permissions = [],
            permissionsObj;
        for (var i = 0; i < this.permissions.length; i++) {
          if (this.permissions[i].email === email) {
            permissionsObj = this.permissions[i];
            break;
          }
        }

        if (permissionsObj) {
          if (permissionsObj.read) {
            permissions.push('read');
          }
          if (permissionsObj.write) {
            permissions.push('write');
          }
          if (permissionsObj.execute) {
            permissions.push('execute');
          }
        }
        return permissions;
      };


    // Export HAI model
    try {
        var haiModel = connection.model('Hai', haiSchema);
        exports.haiModel = haiModel;
      }
    catch (error) {}


    /**
     * Group schema
     */
//    var groupSchema = new Schema({
//        name: { type: String, required: true, unique: true },
////        agentIds: [{ type: ObjectId, required: true, unique: true }]
////        emails: [{ type: String, required: false, unique: true }],
////        name: { type: String, required: true, unique: false },
////        token: { type: String, required: false, unique: false },
////        admin: { type: Boolean, required: true },
//      });

    /**
     * inode
     */
//    var inodeSchema = new Schema({
//        owner: { type: ObjectId, required: true, unique: false },
//        group: { type: ObjectId, required: true, unique: false },
//        created: { type: Date, default: Date.now },
//        changed: { type: Date, default: Date.now },
//      });

    /**
     * API
     */
    return exports;
  };
