var config = {
    mongo : {
        host: 'localhost',
        port: 27017,
        db: 'exampleDb',
        collections : ['tweets'],
        serverOptions : {},
        clientOptions : { w: 1 }
      }
    };
module.exports = config;
