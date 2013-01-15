var request = require("supertest"),
    configure = require("../../lib/configure"),
    util = require("util")


describe("shover", function() {
  describe("GET /ping", function() {
    it("should have a favicon", function(done) {
      this.request.head("/favicon.ico")
        .expect(200)
        .end(done)
    })

    it("should reply with pong", function(done) {
      this.request.get("/ping")
        .expect(200, "pong")
        .end(done)
    })
  })

  before(function(done) {
    var mocha = this
    configure("../../etc/conf.yml", function(err, conf) {
      mocha.request = request(util.format("http://%s:%d", conf.http.host, conf.http.port))
      mocha.conf = conf
      done()
    })
  })
})
