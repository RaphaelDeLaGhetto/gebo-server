'use strict';

var geboMongoose = require('gebo-mongoose-connection');

module.exports = function() {

    // Get the DB connection
    var mongoose = geboMongoose.get();

    /**
     * This is handy for when I need to drop a database
     * during testing
     */
    exports.connection = mongoose.connection;
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
        var permissionModel = mongoose.model('Permission', permissionSchema);
        exports.permissionModel = permissionModel;
      }
    catch (error) {}
    
    
    /**
     * Friend schema
     */
    var friendSchema = new Schema({
        name: { type: String, required: true, unique: false, default: 'Innominate' },
        email: { type: String, required: true, unique: true },
    
        // Current access tokens
          myToken: { type: String, default: null, unique: false },
    
        // Experimental
          myPrivateKey: { type: String, default: null, required: false },
          myCertificate: { type: String, default: null, required: false },
        certificate: { type: String, default: null, unique: false },
    
        // I don't think I need to store his token. The gebo does that.
        // Access can be granted or denied with permissions. Friendship
        // implies the ability to obtain an access token
          hisToken: {
              string: { type: String, default: null, unique: false },
              expiry: { type: Date, default: null },
            },
    
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
        var friendModel = mongoose.model('Friend', friendSchema);
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
        var fileModel = mongoose.model('File', fileSchema);
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
        var socialCommitmentModel = mongoose.model('SocialCommitment', socialCommitmentSchema);
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
        var conversationModel = mongoose.model('Conversation', conversationSchema);
        exports.conversationModel = conversationModel;
      }
    catch (error) {}
    
    /**
     * Key schema
     */
    var keySchema = new Schema({
        email: { type: String, required: true, unique: true },
        public: { type: String, required: true, unique: false },
        private: { type: String, required: true, unique: false },
      });
    
    // Export keySchema
    try {
        var keyModel = mongoose.model('Key', keySchema);
        exports.keyModel = keyModel;
    }
    catch (error) {}

    return exports;
  };

