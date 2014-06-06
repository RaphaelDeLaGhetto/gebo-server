
var mongooseConnection = require('../../../lib/mongoose-connection'),
    mongoose = require('mongoose'),
    utils = require('../../../lib/utils');

module.exports = function (email) {

    mongooseConnection.get(function(connection) {
        exports.connection = connection;
    
        //******* Database schema TODO add more validation
        var Schema = mongoose.Schema,
            ObjectId = Schema.Types.ObjectId;
    
        /**
         * Test1 schema
         */
        var test1Schema = new Schema({
            data: { type: String, required: true, unique: false },
          });
    
        // Export test1Model
        try {
            var test1Model = connection.model('Test1', test1Schema);
            exports.test1Model = test1Model;
          }
        catch (error) {}
    
      });

    return exports;
  };
