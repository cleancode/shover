# INSTALL

Install nvm
    $ git clone git://github.com/creationix/nvm.git ~/.nvm
    $ source ~/.nvm/nvm.sh
Install node
    $ nvm install 0.8.14
    $ nvm alias default 0.8.14
Install global node modules
    $ npm install -g jake jshint mocha forever jsontool
Install local node modules
    $ cd PROJECT_DIRECTORY
    $ npm install

# USE

Run all tests
    $ jake
Run all unit tests
    $ jake unit
Run all acceptance tests
    $ jake acceptance
Start all services
    $ jake start
Stop all services
    $ jake stop
Services related stuffs
    $ forever --help
Clean working copy
    $ jake clean

# RECIPE

* package.json = npm project specification with metadata and dependencies
* Jakefile = jake build specification
* server.js = shower server
* lib/ = local modules not installed by npm
* etc/ = environment configuration
* test/unit = unit test sources
* test/acceptance = acceptance test sources
* node\_modules/ = local modules installed by npm
* .jshintrc = jshint project configuration
* .foreverignore = files ignored by forever
* .vimrc = vim project configuration (need to have vim-addon-local-vimrc plugin installed)
* .work/ = work directory created by 'jake prepare' for temporary/disposable files

# NOTES

* sockjs-client close method is sync/async based on transport see test/acceptance/events.js
* instead of arrays and objects for data structures consider to use in memory db like sqlite
