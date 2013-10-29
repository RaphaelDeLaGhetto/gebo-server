module.exports = function (app, express, passport, logger) {

    var nconf = require('nconf'),
        cachify = require('connect-cachify'),
        winston = require('winston'),
        requestLogger = require('winston-request-logger');

    nconf.argv().env().file({ file: 'local.json' });

    // load assets node from configuration file.
    var assets = nconf.get('assets') || {};

    // Development Configuration
    app.configure('development', 'test', function(){
        // register the request logger
        app.use(requestLogger.create(logger))
        app.set('DEBUG', true)
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
    });

    // Production Configuration
    app.configure('production', function(){
        app.set('DEBUG', false)
        app.use(express.errorHandler())
    });

    /**
     * allowCrossDomain
     */
    var allowCrossDomain = function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

        if ('OPTIONS' === req.method) {
          res.send(200);
        }
        else {
          next();
        }
    };

    /**
     * Redirect to HTTPS
     *
     * Peter Lyons, 2013-4-5
     * http://stackoverflow.com/questions/15813677/https-redirection-for-all-routes-node-js-express-security-concerns
     */
    function requireHttps(req, res, next) {
        console.log('requireHttps');
        if (!req.secure) {
          var url = nconf.get('domain') + ':' + nconf.get('httpsPort') + req.url;
          console.log(url);
          return res.redirect(url);
        }
        next();
      }


    // Cachify Asset Configuration
    app.use(cachify.setup(assets, {
        root: __dirname + '/public',
        production: nconf.get('cachify')
    }));

    // Global Configuration
    app.configure(function(){

        app.use(allowCrossDomain);
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.set('view options', { layout: false });
        app.use(express.cookieParser());
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.static(__dirname + '/public'));
        app.use(express.favicon(__dirname + '/favicon.ico'));
        app.use(express.session({secret: 'keyboard cat'}));
        app.use(requireHttps);
        // Initialize Passport!  Also use passport.session() middleware, to support
        // persistent login sessions (recommended).
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(app.router);
    });

    return app;
};
