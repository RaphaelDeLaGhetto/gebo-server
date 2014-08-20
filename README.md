gebo-server 
===========

Historically, the name _gebo_ spoke to this software's underlying workflow and technology.
I.e., [Grunt](http://gruntjs.com/), [Express](http://expressjs.com/),
[Bootstrap](http://getbootstrap.com/), and [OAuth2](https://github.com/jaredhanson/oauth2orize).

Now it is simply a name for the lowly artificial agent that is rocking your world.

# Getting started

There are two ways to get a gebo server up and running:

1. Clone it from [GitHub](https://github.com/RaphaelDeLaGhetto/gebo-server)

2. Install it via [npm](https://npmjs.org/)

But before all that, there are a few things you'll need...

# Setting the stage

## Install your database (MongoDB)

You're going to need MongoDB on your system, if you haven't got it already:

* [http://docs.mongodb.org/manual/installation/](http://docs.mongodb.org/manual/installation/)

Start MongoDB by executing this at the command line:

```
sudo service mongodb start
```

## Node

If you don't have Node, you're not going anywhere:

```
sudo apt-get install nodejs
```

## g++

gebo-server requires the [bcrypt](https://npmjs.org/package/bcrypt) package, which is compiled with g++:

```
sudo apt-get install g++
```

## npm

[Node Package Manager](https://npmjs.org/) is needed to install all of gebo-server's dependencies. It
should be installed automatically along with Node (see above). If, for some reason, it wasn't, run:

```
sudo apt-get install npm
```

## Bower

Install the [Bower](http://bower.io/) package manager globally with the `-g` option:

```
sudo npm install -g bower
```

# Clone or npm?

As stated, there are two ways to obtain a gebo server...

## 1. Clone it

If you want to experiment or better understand gebo's inner workings, this is the option for you:

```
git clone https://github.com/RaphaelDeLaGhetto/gebo-server.git
cd gebo-server
```

Once downloaded, install your npm modules:

```
sudo npm install
```

Then, install your UI dependencies:

```
bower install
```

## 2. Get it with npm

The gebo server offers all of the basic functionality expected of a communicative artificial
agent. Your gebo's behaviour may be modified or supplemented without messing around with his
basic skill set (yes, I said _his_).

This will get you up and running in no time:

```
mkdir myGebo
cd myGebo
npm init
```

Follow npm's setup instructions and then:

```
sudo npm install gebo-server --save
```

__TO BE CONTINUED...__

### your SSL certificates

There are a couple of files already set up, but it's best that you create your own self-signed certificate:

```
cd cert
rm *
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
cd ..
```

# Seed the database

This step is for quick setup and development purposes. It creates a registered user, admin, and establishes a friendoship between them.

You may need to install [grunt-cli](https://github.com/gruntjs/grunt-cli) first:

```
sudo npm install -g grunt-cli
```

This inserts a couple of test users into your database to confirm that authentication is working.

```
grunt dbseed
```

When you want to start adding your own users, you can erase the existing database like this:

```
grunt dbdrop
```

# Run your server

```
node app.js
```

# Configuration

Agent-specific settings can be adjusted in `gebo.json`. The properties are self-descriptive, and all are required.

`logLevel` currently takes one of three values:

* `trace`: for development and debugging. This is the verbose logging mode.
* `info`: for production. All basic server interactions will be logged.
* `off`: no output will be written to the log files

# Add agent

From the project directory...

## Register agent

This is mostly for human agents who need traditional username/password access through some human-agent interface. A friendo does not need to be a registered agent, though a registered agent does need to be a friendo with permissions set to access any given gebo resource (unless that registered agent is an administrator, that is).

```
grunt registeragent:SomeGuy:someguy@example.com:password123:false
```

## Friendo agent

A friendo is an agent to whom you may assign an access token.

```
grunt friendo:SomeGuy:someguy@example.com
```

## Set permissions

The _someaction_ parameter may also specify a database collection name.

```
grunt setpermission:someguy@example.com:someaction:false:false:true
```

## Create token

This token allows an agent access to all the resources to which he's already been granted permission.

```
grunt createtoken:someguy@example.com:ThisIsMyTokenLetMeIn123
```

# Contributing

Hit me with it.

# License

MIT
