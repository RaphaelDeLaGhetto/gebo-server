'use strict';

module.exports = function (dbName) {

    if (!dbName) {
      var nconf = require('nconf');
      dbName = nconf.get('name');
    }

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

    // This is handy for when I need to drop a database
    // during testing
    exports.mongoose = mongoose;

    /**
     *  Database connect
     */
    var uristring =
        process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://localhost/' + dbName;

    var mongoOptions = { db: { safe: true }};

    /**
     * Open a connection to mongo
     */
    exports.open = function() {
//    var _open = function() {
        mongoose.connect(uristring, mongoOptions, function (err) {//, res) {
            if (err) {
              console.log ('ERROR connecting to: ' + uristring + '. ' + err);
            }
//            else {
//              console.log ('Successfully connected to: ' + uristring);
//            }
          });
      };
    // Call on load
    //exports.open();

    //******* Database schema TODO add more validation
    var Schema = mongoose.Schema,
        ObjectId = Schema.Types.ObjectId;

    /**
     * User schema
     */
    var userSchema = new Schema({
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true},
        admin: { type: Boolean, required: true },
      });


    // Bcrypt middleware
    userSchema.pre('save', function(next) {
        var user = this;
    
        if (!user.isModified('password')) {
          return next();
        }
    
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) {
              return next(err);
            }
    
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) {
                  return next(err);
                }
                user.password = hash;
                next();
              });
          });
      });

    // Password verification
    userSchema.methods.comparePassword = function(candidatePassword, cb) {
        bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
            if (err) {
              return cb(err);
            }
            cb(null, isMatch);
          });
      };

    // Export user model
    try {
        var userModel = mongoose.model('User', userSchema);
        exports.userModel = userModel;
    }
    catch (error) {}

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
        var clientModel = mongoose.model('Client', clientSchema);
        exports.clientModel = clientModel;
    }
    catch(err) {}

    /**
     * Token schema
     */
    var tokenSchema = new Schema({
        userId: { type: ObjectId, required: true, unique: false },
        clientId: { type: ObjectId, required: true, unique: false },
        token: { type: String, required: true, unique: true },
      });
    
    // Export token model
    try {
        var tokenModel = mongoose.model('Token', tokenSchema);
        exports.tokenModel = tokenModel;
    }
    catch(err) {}

    /**
     * Authorization schema
     */
    var authorizationSchema = new Schema({
        userId: { type: ObjectId, required: true, unique: false },
        clientId: { type: ObjectId, required: true, unique: false },
        redirectUri: { type: String, required: true, unique: false },
        code: { type: String, required: true, unique: true },
      });
    
    // Export token model
    try {
        var authorizationModel = mongoose.model('Authorization', authorizationSchema);
        exports.authorizationModel = authorizationModel;
    }
    catch (error) {}

    /**
     * Close the connection
     */
    exports.close = function(next) {
//    var _close = function(next) {
        mongoose.connection.close(next);
      };

    return exports;
    /**
     * API
     */
//    return {
//        close: _close,
//        open: _open,
//        tokenModel: function() { return 'hello, world'; },
//        userModel: _userModel,
//      };
};
