
var utils = require('../../../lib/utils');

module.exports = function (email) {

    // Turn the email into a mongo-friendly database name
    var dbName = utils.ensureDbName(email);

    var mongoose = require('mongoose');

    /**
     *  Database config
     */
    var uristring =
        process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://localhost/' + dbName;

    var mongoOptions = { db: { safe: true } };

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
     * Test2 schema
     */
    var test2Schema = new Schema({
        data: { type: String, required: true, unique: false },
      });

    // Export test2Model
    try {
        var test2Model = connection.model('Test2', test2Schema);
        exports.test2Model = test2Model;
      }
    catch (error) {}

    /**
     * Test3 schema
     */
    var test3Schema = new Schema({
        data: { type: String, required: true, unique: false },
      });

    // Export test3Model
    try {
        var test3Model = connection.model('Test2', test3Schema);
        exports.test3Model = test3Model;
      }
    catch (error) {}
    
    return exports;
  };

