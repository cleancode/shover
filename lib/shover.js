var sockjs = require("sockjs"),
    redis = require("redis"),
    uuid = require("node-uuid"),
    util = require("util"),
    _ = require("underscore")

module.exports = (function(Shover) {

  Shover = function(options) {
    this.redis = redis.createClient(options.redis.port, options.redis.host)
    this.redis.select(options.redis.db)
    this.id = uuid()
    this.connections = {}
    this.channels = {}
    
    this.server = sockjs.createServer({
      log: function(severity, line) {
        if (options.env === "development") {
          return console.log(line)
        }
        if (severity === "error") {
          return console.log(line)
        }
      }
    })

    bind(this.server, this)
  }

  Shover.prototype.broadcast = function(message) {
    _(this.connections).each(function(connection) {
      connection.send(message.event)
    })
  }

  Shover.prototype.identify = function(connection, asUserWithId) {
    this.redis.multi([
      ["set", this.rid("user", asUserWithId, "connection"), connection.id],
      ["set", this.rid("connection", connection.id, "user"), asUserWithId],
    ]).exec(function (err, replies) {
      connection.send({
        command: "identify",
        result: "ok"
      })
    })
  }

  Shover.prototype.connection = function(someKindOfId, callback) {
    var shover = this
    if (shover.connections[someKindOfId]) {
      return callback(null, shover.connections[someKindOfId])
    }
    return this.redis.get(this.rid("user", someKindOfId, "connection"), function(err, connectionId) {
      var connection = shover.connections[connectionId]
      if (connection) {
        return callback(null, connection)
      }
      callback(null, null)
    })
  }

  Shover.prototype.channel = function(name) {
    var shover = this
    if (!this.channels[name]) {
      this.channels[name] = {
        name: name,
        subscribe: function(connection) {
          shover.redis.multi([
            ["sadd", shover.rid("channel", name, "connections"), connection.id],
            ["sadd", shover.rid("connection", connection.id, "channels"), name]
          ]).exec(function (err, replies) {
            connection.send({
              command: "subscribe",
              result: "ok"
            })
          })
        },
        unsubscribe: function(connection) {
          shover.redis.multi([
            ["srem", shover.rid("channel", name, "connections"), connection.id],
            ["srem", shover.rid("connection", connection.id, "channels"), name]
          ]).exec(function (err, replies) {
            connection.send({
              command: "unsubscribe",
              result: "ok"
            })
          })
        },
        send: function(message) {
          shover.redis.smembers(shover.rid("channel", name, "connections"), function(err, connectionIds) {
            _(connectionIds).chain().shuffle().each(function(connectionId) {
              _(shover.connections[connectionId]).andand(function(connection) {
                connection.send({
                  channel: name,
                  event: message
                })
              })
            })
          })
        }
      }
    }
    return this.channels[name]
  }

  Shover.prototype.subscribe = function(connection, toChannel) {
    this.channel(toChannel).subscribe(connection)
  }

  Shover.prototype.unsubscribe = function(connection, fromChannel) {
    this.channel(fromChannel).subscribe(connection)
  }

  Shover.prototype.register = function(connection) {
    this.connections[connection.id] = connection
  }

  Shover.prototype.remove = function(connection) {
    var shover = this
    ;(delete shover.connections[connection.id])
    shover.redis.multi([
      ["get", shover.rid("connection", connection.id, "user")],
      ["smembers", shover.rid("connection", connection.id, "channels")],
    ]).exec(function (err, replies) {
      var userId = replies.shift(), channelNames = replies.shift()
      _(channelNames).each(function(name) {
        shover.channel(name).unsubscribe(connection)
      })
      shover.redis.multi([
        ["del", shover.rid("user", userId, "connection")],
        ["del", shover.rid("connection", connection.id, "channels")],
        ["del", shover.rid("connection", connection.id, "user")],
      ]).exec()
    })
  }

  Shover.prototype.reset = function() {
    this.redis.del("a")
    this.redis.eval(util.format("redis.call('del', unpack(redis.call('keys', '%s')))", this.rid("*")))
  }

  Shover.prototype.attachTo = function(server) {
    this.server.installHandlers(server, {prefix:'/shover'})
  }

  Shover.prototype.rid = function() {
    return ["server", this.id].concat(_(arguments).toArray()).join(":")
  }

  function bind(server, shover) {
    server.on("connection", function(connection) {
      connection.send = function(message) {
        this.write(JSON.stringify(message))
      }
      connection.on("data", function(message) {
        unpack(message, connection, shover)
      })
      connection.on("close", function() {
        shover.remove(connection)
      })
      shover.register(connection)
    })
  }

  function unpack(message, connection, shover) {
    try {
      if (message.command) {
        switch (message.command) {
          case "identify":
            if (message.user) {
              return shover.identify(connection, message.user)
            }
            break
          case "subscribe":
            if (message.channel) {
              return shover.subscribe(connection, message.channel)
            }
            break
          case "unsubscribe":
            if (message.channel) {
              return shover.unsubscribe(connection, message.channel)
            }
            break
        }
      }
      // ignore, not a valid message
    } catch(e) {
      // ignore, not a valid message
    }
  }

  _.mixin({
    andand: function(obj, handle) {
      if (obj) {
        return handle(obj)
      }
      return obj
    }
  })

  return Shover
})()
