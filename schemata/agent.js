'use strict';

var geboMongoose = require('gebo-mongoose-connection');

module.exports = function() {

    // Get the mongoose instance
    var mongoose = geboMongoose.get();

    var Schema = mongoose.Schema,
        ObjectId = Schema.Types.ObjectId;

    /**
     * This is handy for when I need to drop a database
     * during testing
     */
    exports.connection = mongoose.connection;

    /**
     * Permission schema
     */
    var permissionSchema = new Schema({
        resource: { type: String, required: true, unique: false },
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
    var friendoSchema = new Schema({
        name: { type: String, required: true, unique: false, default: 'Innominate' },
        email: { type: String, required: true, unique: true },

        // A friendo doesn't necessarily need to be registered with
        // the gebo. If he is, however, then he can use traditional 
        // authentication to do a login and may have administrative 
        // privileges.
        registrantId: { type: ObjectId, required: false, unique: true },
    
        // Candidates for removal
        // 2014-7-30
//        myPrivateKey: { type: String, default: null, required: false },
//        myCertificate: { type: String, default: null, required: false },

        // Experimental JWT stuff. See config/token
        certificate: { type: String, default: null, unique: false },
    
        permissions: [permissionSchema],
    
        // Agent communication
        gebo: { type: String, required: false, unique: false },
      });
    
    // Export friendo model
    try {
        var friendoModel = mongoose.model('Friendo', friendoSchema);
        exports.friendoModel = friendoModel;
      }
    catch (error) {}
    
    
    /**
     * File schema
     */
    var fileSchema = new Schema({
        name: { type: String, required: true, unique: true },
        resource: { type: String, required: true, unique: false },
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

