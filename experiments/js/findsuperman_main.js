var _ = require('underscore'),
    names = require('./names.js'),
    findSuperman = require('./findsuperman.js');

if (findSuperman(names())) {
    document.write('We found Superman');
} else {
    document.write('No Superman...');
}
