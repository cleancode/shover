var fs = require("fs"),
    glob = require("glob"),
    util = require("util"),
    path = require("path"),
    async = require("async"),
    exec = require("child_process").exec,
    configure = require("./lib/configure"),
    _ = require("underscore")

var PROJECT = _({}).tap(function(PROJECT) {
  PROJECT.root_directory = path.normalize(__dirname)
  PROJECT.lib_directory = path.join(PROJECT.root_directory, "lib")
  PROJECT.etc_directory = path.join(PROJECT.root_directory, "etc")
  PROJECT.work_directory = path.join(PROJECT.root_directory, ".work")
  PROJECT.logs_directory = path.join(PROJECT.work_directory, "logs")
})

task("default", ["test"])

desc("run all tests")
task("test", ["unit", "acceptance"])

desc("run all unit tests")
task("unit", ["prepare"], {async: true}, function() {
  exec("mocha -c test/unit", function(error, stdout, stderr) {
    process.stdout.write(stdout)
    if (stderr.length > 0) console.error(stderr)
    if (error !== null) fail(error)
    complete()
  })
})

desc("run all acceptance tests")
task("acceptance", ["prepare"], {async: true}, function() {
  process.env.NODE_ENV = "test"
  require("./server").start(function(shover) {
    exec("mocha -c test/acceptance", function(error, stdout, stderr) {
      shover.close()
      process.stdout.write(stdout)
      if (stderr.length > 0) console.error(stderr)
      if (error !== null) fail(error)
      complete()
    })
  })
})

desc("remove all created files")
task("clean", ["stop"], {async: true}, function() {
  fs.rmrfdir = require("rimraf")
  fs.rmrfdir(PROJECT.work_directory, complete)
})

desc("start server with all dependencies")
task("start", ["prepare"], {async: true}, function() {
  configure("./etc/conf.yml", function(err, conf) {
    exec(forever(["start redis", "start shover", "list"], conf), function(error, stdout, stderr) {
      process.stdout.write(stdout)
      if (stderr.length > 0) console.error(stderr)
      if (error !== null) fail(error)
      complete()
    })
  })
})

desc("stop server and all dependencies")
task("stop", {async: true}, function() {
  exec(forever(["stopall", "list"]), function(error, stdout, stderr) {
    process.stdout.write(stdout)
    if (stderr.length > 0) console.error(stderr)
    if (error !== null) fail(error)
    complete()
  })
})

desc("prepare work environment")
task("prepare", ["check", "lint"], {async: true}, function() {
  fs.mkdirp = require("mkdirp")
  async.series([
    function(next) {fs.mkdirp(PROJECT.work_directory, next)},
    function(next) {fs.mkdirp(PROJECT.logs_directory, next)}
  ], 
  function(error) {
    if (error) fail(error)
    complete()
  })
}, true)

desc("check external and global dependencies")
task("check", {async: true}, function() {
  jake.exec(["which jshint", "which mocha", "which forever"], complete)
})

desc("lint all files")
task("lint", {async: true}, function() {
  async.parallel(
    [
      function(next) {glob("test/**/*.js", next)},
      function(next) {glob("lib/**/*.js", next)},
      function(next) {glob("*.js", next)}
    ],
    function(error, results) {
      if (error) fail(error)
      jake.exec([util.format("jshint %s", _(results).flatten().join(' '))], complete, {stdout: true})
    }
  )
})

jake.on("complete", function() {
  process.exit(0)
})

function forever(commands, conf) {
  return _([].concat(commands)).map(function(command) {
    var tokens = command.split(/\s+/),
        action = tokens.shift(),
        service = tokens.shift()

    switch (action) {
      case "list":
        return "forever list"
      case "stopall":
        return "forever stopall"
      case "start":
        switch (service) {
          case "shover":
            return util.format(
              "forever start -a -o %s -e %s --watch=true server.js",
              path.join(PROJECT.logs_directory, "shower-stdout.log"),
              path.join(PROJECT.logs_directory, "shower-stderr.log")
            )
          case "redis":
            return util.format(
              "forever start -a -o %s -e %s -c redis-server %s",
              path.join(PROJECT.logs_directory, "redis-stdout.log"),
              path.join(PROJECT.logs_directory, "redis-stderr.log"),
              path.join(PROJECT.etc_directory, conf.redis.conf)
            )
        }
    }
  }).join("; ")
}
