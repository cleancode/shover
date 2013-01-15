var sockjs = require("sockjs-client"),
    configure = require("./lib/configure"),
    util = require("util"),
    path = require("path"),
    async = require("async"),
    request = require("superagent"),
    microtime = require("microtime"),
    http = require("http"),
    uuid = require("node-uuid"),
    _ = require("underscore")


var Junkie = (function(Junkie) {

  Junkie = function(counter, conf) {
    this.id = uuid()
    this.name = "junkie-" + this.id
    this.channel = "channel-" + (counter % conf.numberOfChannels)
    this.baseurl = util.format("http://%s:%d", conf.http.host, conf.http.port)
  }

  Junkie.prototype = Object.create(require('events').EventEmitter.prototype)

  Junkie.prototype.enter = function(callback) {
    _(this).tap(function(junkie) {
      junkie.shover = sockjs.create(junkie.baseurl + "/shover")
      junkie.shover.on("connection", function() {
        junkie.once("command-subscribed", function() {
          callback(null, junkie)
        })
        junkie.handle(junkie.shover)
        junkie.shover.write({command: "subscribe", channel: junkie.channel})
      })
    })
  }

  Junkie.prototype.deal = function(callback) {
    _(this).tap(function(junkie) {
      junkie.on(junkie.channel, function(message) {
        if (message.from === junkie.id) {
          console.log(junkie.name, "received in", (microtime.now()-message.at)/1000, "ms")
          callback(null, junkie)
        }
      })
      request.post(junkie.baseurl + "/channel/" + junkie.channel + "/events")
        .set("Content-Type", "application/json")
        .send({
          from: junkie.id,
          say: "Hello everybody",
          at: microtime.now()
        })
        .end()
    })
  }

  Junkie.prototype.leave = function(callback) {
    _(this).tap(function(junkie) {
      if (junkie.shover.isClosed) {
        return callback(null, junkie)
      }
      junkie.shover.on("close", function() {
        // console.log(junkie.name, "leaving, thank you for all the fish...")
        callback(null)
      })
      junkie.shover.close()
    })
  }

  Junkie.prototype.handle = function(connection) {
    _(this).tap(function(junkie) {
      connection.on("data", function(message) {
        try {
          message = JSON.parse(message)
          // console.log(junkie.name, message)
          if (message.channel) {
            junkie.emit(message.channel, message.event)
          }
          if (message.command) {
            junkie.emit("command-" + message.command + "d", message.result)
          }
          junkie.emit("event", message)
        } catch(e) {
          console.error(e)
        }
      })
      connection.on("error", function(err) {
        console.error(err)
      })
    })
  }

  return Junkie
})()



var argv = require('optimist').argv,
    numberOfJunkies = argv.junkies || 10,
    numberOfChannels = argv.channels || 1

async.waterfall([
  function setup(next) {
    configure("./etc/conf.yml", function(err, conf) {
      http.globalAgent.maxSockets = numberOfJunkies+1
      conf.numberOfJunkies = numberOfJunkies
      conf.numberOfChannels = numberOfChannels
      next(null, conf)
    })
  },
  function start(conf, next) {
    async.parallel(
      _(numberOfJunkies).range().map(function(id) {
        return function(next) {
          return async.waterfall([
            function enter(next) {
              (new Junkie(id, conf)).enter(next)
            },
            function deal(junkie, next) {
              junkie.deal(next)
            },
            function leave(junkie, next) {
              junkie.leave(next)
            }
          ], next)
        }
      }),
      next
    )
  },
  function leave(err, next) {
    next(null)
  }
], function(err) {
  console.log("bye bye all")
})

process.on("uncaughtException", function (err) {
  console.log("global exception", err.stack || err)
})
