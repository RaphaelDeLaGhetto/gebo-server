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

    /**
     * This is handy for when I need to drop a database
     * during testing
     */
    exports.connection = connection;

    //******* Database schema TODO add more validation
    var Schema = mongoose.Schema,
        ObjectId = Schema.Types.ObjectId;

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
//    var haiSchema = new Schema({
//        name: { type: String, required: true, unique: false },
//        email: { type: String, required: true, unique: true },
//        redirect: { type: String, required: true, unique: false },
//        trusted: { type: Boolean, required: true, default: false },
//        permissions: [permissionSchema],
//      });
//
//    /**
//     * Get an array of permissions
//     *
//     * @param string
//     */
//    haiSchema.methods.getPermissions = function(email) {
//        var permissions = [],
//            permissionsObj;
//        for (var i = 0; i < this.permissions.length; i++) {
//          if (this.permissions[i].email === email) {
//            permissionsObj = this.permissions[i];
//            break;
//          }
//        }
//
//        if (permissionsObj) {
//          if (permissionsObj.read) {
//            permissions.push('read');
//          }
//          if (permissionsObj.write) {
//            permissions.push('write');
//          }
//          if (permissionsObj.execute) {
//            permissions.push('execute');
//          }
//        }
//        return permissions;
//      };
//
//
//    // Export HAI model
//    try {
//        var haiModel = connection.model('Hai', haiSchema);
//        exports.haiModel = haiModel;
//      }
//    catch (error) {}

    /**
     * File schema
     */
    var fileSchema = new Schema({
        name: { type: String, required: true, unique: true },
        collectionName: { type: String, required: true, unique: false },
        type: { type: String, required: false, unique: false },
        size: { type: Number, required: false, unique: false },
        lastModified: { type: Date, required: true, default: Date.now() },
      });

    // Export fileSchema model
    try {
        var fileModel = connection.model('File', fileSchema);
        exports.fileModel = fileModel;
      }
    catch (error) {}
   
    /**
     * API
     */
    return exports;
  };
