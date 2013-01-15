var connect = require("connect"),
    router = require("urlrouter"),
    configure = require("./lib/configure"),
    logger = require("./lib/logger"),
    Shover = require("./lib/shover"),
    _ = require("underscore")


exports.start = function(callback) {
  configure("./etc/conf.yml", function(err, conf) {

    var shover = new Shover(conf),
        app = connect()
          .use(logger(conf))
          .use(connect.favicon())
          .use(connect.cookieParser())
          .use(connect.bodyParser())
          .use(router(function(app) {
            app.get("/ping", function(req, res) {
              res.setHeader("Content-Type", "text/plain")
              res.write("pong")
              res.end()
            })

            app.post("/events", function(req, res) {
              res.writeHead(202)
              res.end()
              shover.broadcast(req.body)
            })

            app.post("/channel/:name/events", function(req, res) {
              res.writeHead(202)
              res.end()
              shover.channel(req.params.name).send(req.body)
            })

            app.get("/user/:id", function(req, res) {
              shover.connection(req.params.id, function(error, connection) {
                if (connection && connection.id) {
                  res.writeHead(200, {"Content-Type": "application/json"})
                  res.end(JSON.stringify({connection: connection.id}))
                } else {
                  res.writeHead(404)
                  res.end()
                }
              })
            })
          }))

    _(["SIGINT", "SIGQUIT", "SIGKILL"]).each(function(signal) {
      process.on(signal, function() {
        console.log("see you space cowboy...")
        app.close()
      })
    })

    app.listen(conf.http.port, function() {
      var server = this
      shover.attachTo(server)
      app.close = function() {
        server.close()
        shover.reset()
      }
      if (_(callback).isFunction()) {
        callback(app)
      }
    })
  })
}

if (module.parent === null) {
  exports.start()
}
