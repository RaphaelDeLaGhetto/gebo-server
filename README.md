gebo-server 
===========

This is an OAuth2 server built with Express

## Setup

### your database (MongoDB)

Install MongoDB on your system, if you haven't already:

* [http://docs.mongodb.org/manual/installation/](http://docs.mongodb.org/manual/installation/)

Start MongoDB by executing this at the command line:

```
sudo service mongodb start
```

### node

If you don't have node, you won't get very far:

```
sudo apt-get install nodejs
```

### g++

The bcrypt package is compiled with g++:

```
sudo apt-get install g++
```

### npm

Node Package Manager is needed to install all of gebo-server's dependencies. It should be installed along with nodejs (see above). If not:

```
sudo apt-get install npm
```

### bower

Install the bower package manager globally with the `-g` option:

```
sudo npm install -g bower
```

### your server

Now, clone the repository:

```
git clone https://github.com/RaphaelDeLaGhetto/gebo-server.git
cd gebo-server
```

Next, install your npm modules:

```
npm install
```

If you get an error suggesting as much, install with `sudo` instead:

```
sudo npm install
```

Then, install your UI dependencies:

```
bower install
```

# Seed the database
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

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/gruntjs/grunt).

## License
MIT
