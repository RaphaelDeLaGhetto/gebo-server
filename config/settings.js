module.exports = function (app, express, passport, logger, root) {

    var nconf = require('nconf'),
//        cachify = require('connect-cachify'),
        winston = require('winston'),
        path = require('path'),
        requestLogger = require('winston-request-logger'),
        bodyParser = require('body-parser'),
        methodOverride = require('method-override'),
        cookieParser = require('cookie-parser'),
        session = require('express-session'),
        favicon = require('static-favicon'),
        errorHandler = require('errorhandler'),
        ClusterStore = require('strong-cluster-express-store');

    if (!root) {
      root = path.normalize(__dirname + '/..');
    }
    nconf.file({ file: root + '/gebo.json' });

    // load assets node from configuration file.
    var assets = nconf.get('assets') || {};

    // What kind of environment is this?
    var env = process.env.NODE_ENV || 'development';

    // Development Configuration
    if ('development' === env) {
      // register the request logger
      app.use(requestLogger.create(logger))
      app.set('DEBUG', true)
      app.use(errorHandler({ dumpExceptions: true, showStack: true }))
    }

    // Production Configuration
    if ('production' === env) {
      app.set('DEBUG', false)
      app.use(errorHandler())
    }

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
        if (!req.secure) {
          var url = nconf.get('domain') + ':' + nconf.get('httpsPort') + req.url;
          console.log(url);
          return res.redirect(url);
        }
        next();
      }


    // Cachify Asset Configuration
//    app.use(cachify.setup(assets, {
//        root: root + '/public',
//        production: nconf.get('cachify')
//    }));

    // Global Configuration
    app.use(allowCrossDomain);
    app.set('views', root + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { layout: false });
    app.use(cookieParser());
    app.use(bodyParser());
    app.use(methodOverride());
    app.use(express.static(root + '/public'));
    app.use(favicon(root + '/favicon.ico'));
    app.use(session({
                store: new ClusterStore(),
                secret: 'What the halo!?'}));
    app.use(requireHttps);
    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session());

};
