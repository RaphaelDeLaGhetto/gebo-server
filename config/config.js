var config = {
    mongo : {
        host: "localhost",
        port: 27017,
        db: "exampleDb",
        collections : ["tweets"],
        serverOptions : {},
        clientOptions : { w: 0 }
    }
}
module.exports = config;
