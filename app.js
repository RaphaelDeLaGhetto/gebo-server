var express = require('express')
    , app = express()
    , nconf = require('nconf')
    , winston = require('winston')
    , db = require('./config/dbschema')
    , pass = require('./config/pass')
    , passport = require('passport')
    , api_routes = require('./routes/api')
    , basic_routes = require('./routes/basic')
    , user_routes = require('./routes/user')
    , oauth2_routes = require('./routes/oauth2')
    , util = require('util');
    
// Expose the Express app so that it may be run
// as a virtual host
exports.app = app;

// Logging
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({colorize:true}) ] });

// Load the settings
require('./settings')(app, express, passport, logger);

// Merge nconf overrides with the configuration file.
nconf.argv().env().file({ file: 'local.json' });

// Enable CORS
//app.all('/', function(req, res, next) {
//    res.header('Access-Control-Allow-Origin', '*');
//    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
//    next();
//});

// Alright, what the heck is going on here? What are the security
// implications?
app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Accept');
    res.header('Access-Control-Allow-Headers', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
});


// Basic routes
app.get('/', basic_routes.index);

// Authenticated user routes
app.get('/account', user_routes.account);
app.get('/login', user_routes.getLogin);
app.post('/login', user_routes.postLogin);
app.get('/admin', pass.ensureAuthenticated, pass.ensureAdmin(), user_routes.admin);
app.get('/logout', user_routes.logout);

// OAuth2 routes
app.get('/dialog/authorize', oauth2_routes.authorization); 
app.post('/dialog/authorize/decision', oauth2_routes.decision); 
app.post('/oauth/token', oauth2_routes.token);

// API routes
app.get('/api/userinfo', api_routes.userinfo);
app.post('/api/save', api_routes.save);

logger.info('listening on', nconf.get('port'));
app.listen(process.env.PORT || nconf.get('port'));

