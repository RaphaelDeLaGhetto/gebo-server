'use strict';

var utils = require('../lib/utils');

module.exports = function (email) {

    // Turn the email into a mongo-friendly database name
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

        // Current access tokens
//        myToken: { type: String, default: null, unique: false },

        // Experimental
        myPrivateKey: { type: String, default: null, required: false },
        myCertificate: { type: String, default: null, required: false },
        hisCertificate: { type: String, default: null, unique: false },

        // I don't think I need to store his token. The gebo does that.
        // Access can be granted or denied with permissions. Friendship
        // implies the ability to obtain an access token
//        hisToken: {
//            string: { type: String, default: null, unique: false },
//            expiry: { type: Date, default: null },
//          },

        // Permissions
        myPermissions: [permissionSchema],
        hisPermissions: [permissionSchema],

        // Agent communication
        gebo: { type: String, required: false, unique: false },
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
     * Social commitment schema
     */
    var socialCommitmentSchema = new Schema({
        performative: { type: String, required: true, unique: false },
        action: { type: String, required: true, unique: false },
        message: { type: Schema.Types.Mixed, required: false, unique: false },
        creditor: { type: String, required: true, unique: false },
        debtor: { type: String, required: true, unique: false },
        created: { type: Date, required: true, default: Date.now() },
        fulfilled: { type: Date, default: null },
      });

    // Export socialCommitmentSchema 
    try {
        var socialCommitmentModel = connection.model('SocialCommitment', socialCommitmentSchema);
        exports.socialCommitmentModel = socialCommitmentModel;
      }
    catch (error) {}

    /**
     * Conversation schema
     */
    var conversationSchema = new Schema({
        type: { type: String, required: true, unique: false },
        role: { type: String, required: true, unique: false },
        conversationId: { type: String, required: true, unique: true },
        socialCommitments: [socialCommitmentSchema],
        gebo: { type: String, required: true, unique: false },
        created: { type: Date, required: true, default: Date.now() },
      });

    // A conversation is terminated when all social
    // commitments are fulfilled
    conversationSchema.virtual('terminated').
        get(function() {
            for (var i = 0; i < this.socialCommitments.length; i++) {
              if (!this.socialCommitments[i].fulfilled) {
                return false;
              }
            }
            return true;      
          });

    // Export conversationSchema 
    try {
        var conversationModel = connection.model('Conversation', conversationSchema);
        exports.conversationModel = conversationModel;
      }
    catch (error) {}

    /**
     * Key schema
     */
    var keySchema = new Schema({
        public: { type: String, required: true, unique: false },
        private: { type: String, required: true, unique: false },
        agent: { type: String, required: true, unique: true },
      });
    
    // Export keySchema
    try {
        var keyModel = connection.model('Key', keySchema);
        exports.keyModel = keyModel;
    }
    catch (error) {}

    /**
     * API
     */
    return exports;
  };

