'use strict';

var utils = require('../lib/utils');

module.exports = function (dbName) {

    if (!dbName) {
      var nconf = require('nconf');
      nconf.argv().env().file({ file: 'local.json' });
      dbName = nconf.get('email');
    }

    dbName = utils.getMongoDbName(dbName);

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
    exports.mongoose = connection;

    //******* Database schema TODO add more validation
    var Schema = mongoose.Schema,
        ObjectId = Schema.Types.ObjectId;

    /**
     * Client schema
     */
    var clientSchema = new Schema({
        name: { type: String, required: true, unique: false },
        clientId: { type: String, required: true, unique: true },
        secret: { type: String, required: true, unique: false },
      });
    
    // Export client model
    try {
        //var clientModel = mongoose.model('Client', clientSchema);
        var clientModel = connection.model('Client', clientSchema);
        exports.clientModel = clientModel;
      }
    catch(err) {}

    /**
     * Token schema
     */
    var tokenSchema = new Schema({
        agentId: { type: ObjectId, required: true, unique: false },
        clientId: { type: ObjectId, required: true, unique: false },
        token: { type: String, required: true, unique: true },
      });
    
    // Export token model
    try {
        var tokenModel = connection.model('Token', tokenSchema);
        exports.tokenModel = tokenModel;
      }
    catch(err) {}

    /**
     * Authorization schema
     */
    var authorizationSchema = new Schema({
        agentId: { type: ObjectId, required: true, unique: false },
        clientId: { type: ObjectId, required: true, unique: false },
        redirectUri: { type: String, required: true, unique: false },
        code: { type: String, required: true, unique: true },
      });
    
    // Export authorization model
    try {
        var authorizationModel = connection.model('Authorization', authorizationSchema);
        exports.authorizationModel = authorizationModel;
      }
    catch (error) {}

    /**
     * Agent schema
     */
    var agentSchema = new Schema({
        // From the old userSchema
        name: { type: String, required: true, unique: false },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true},
        admin: { type: Boolean, required: true },

        // Experimental
        clientId: { type: String, required: false, unique: false },
        authorization: { type: String, required: false, unique: false },
        request: { type: String, required: false, unique: false },
        verification: { type: String, required: false, unique: false },
        token: { type: String, required: false, unique: false },
//        gebo: { type: String, require: true, unique: false },
      });

    /**
     * Encrypt the agent's password before saving
     * 
     * @param function
     */
    agentSchema.pre('save', function(next) {
        var agent = this;
    
        if (!agent.isModified('password')) {
          return next();
        }
    
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) {
              return next(err);
            }
    
            bcrypt.hash(agent.password, salt, function(err, hash) {
                if (err) {
                  return next(err);
                }
                agent.password = hash;
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
    agentSchema.methods.comparePassword = function(candidatePassword, cb) {
        bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
            if (err) {
              return cb(err);
            }
            cb(null, isMatch);
          });
      };


    // Export agent model
    try {
        var agentModel = connection.model('Agent', agentSchema);
        exports.agentModel = agentModel;
      }
    catch (error) {}


    /**
     * Friend schema
     */
    var friendSchema = new Schema({
        name: { type: String, required: true, unique: false },
        email: { type: String, required: true, unique: true },
        token: { type: String, required: false, unique: false },
        groupIds: [{ type: ObjectId, required: true, unique: true }],
      });


    /**
     * Permission schema
     */
    var permissionSchema = new Schema({
        email: { type: String, required: true, unique: false },
        read: { type: Boolean, required: true },
        write: { type: Boolean, required: true },
        execute: { type: Boolean, required: true },
      });

    /**
     * Group schema
     */
    var groupSchema = new Schema({
        name: { type: String, required: true, unique: true },
//        agentIds: [{ type: ObjectId, required: true, unique: true }]
//        emails: [{ type: String, required: false, unique: true }],
//        name: { type: String, required: true, unique: false },
//        token: { type: String, required: false, unique: false },
//        admin: { type: Boolean, required: true },
      });

    /**
     * inode
     */
    var inodeSchema = new Schema({
        owner: { type: ObjectId, required: true, unique: false },
        group: { type: ObjectId, required: true, unique: false },
        created: { type: Date, default: Date.now },
        changed: { type: Date, default: Date.now },
      });

    /**
     * API
     */
    return exports;
  };
