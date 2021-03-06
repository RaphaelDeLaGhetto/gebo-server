
var mongoose = require('gebo-mongoose-connection').get(true);
    
module.exports = function() {

    // Get the DB connection
//    mongooseConnection.get(function(connection) {

        /**
         * This is handy for when I need to drop a database
         * during testing
         */
        exports.connection = mongoose.connection;
    
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
            var test2Model = mongoose.model('Test2', test2Schema);
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
            var test3Model = mongoose.model('Test2', test3Schema);
            exports.test3Model = test3Model;
          }
        catch (error) {}
    
//    });

    return exports;
  };

