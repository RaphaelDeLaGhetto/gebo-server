
var mongoose = require('gebo-mongoose-connection').get(),
    utils = require('../../../lib/utils');

module.exports = function () {

    exports.connection = mongoose.connection;
    
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
        var test1Model = mongoose.model('Test1', test1Schema);
        exports.test1Model = test1Model;
      }
    catch (error) {}
    
    return exports;
  };
