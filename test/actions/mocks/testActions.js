
module.exports = function(email) {

    var _testAction1 = function() {
        return 'testAction1, yeah yeah!';
      };
    exports.testAction1 = _testAction1;

    var _testAction2 = function() {
            return 'testAction2, yeah yeah!';
      };
    exports.testAction2 = _testAction2;

    return exports;
};
