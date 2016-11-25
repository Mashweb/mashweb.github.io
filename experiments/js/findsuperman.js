var _ = require('underscore');

module.exports = function (values) {
    var foundSuperman = false;
    
    _.find(values, function(name) {
	if (name === 'Clark Kent') {
	    console.log('It\'s Superman!');
	    foundSuperman = true;
	} else {
	    console.log('... No superman!');
	}
    });
    
    return foundSuperman;
}
