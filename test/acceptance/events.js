var request = require("supertest"),
    expect = require("expect.js"),
    sockjs = require("sockjs-client"),
    configure = require("../../lib/configure"),
    util = require("util")


describe("shover", function() {
  it("should let a sockjs client to connect", function(done) {
    var connected = false, client = this.client
    client = sockjs.create(this.baseurl + "/shover")
    client.on("connection", function(connection) {
      connected = true
      client.close()
    })
    client.on("close", function(connection) {
      expect(connected).to.be(true)
      done()
    })
  })

  describe("POST /events", function() {
    before(function() {
      this.event = {
        event: {
          say: "I'm excited, this is my first event (blush)"
        }
      }
    })

    it("should work", function() {
      expect(true).to.be(true)
    })

    it("should send an event", function(done) {
      this.request.post("/events")
        .set('Content-Type', 'application/json')
        .send(this.event)
        .expect(202)
        .end(done)
    })

    it("should push the event to all clients", function(done) {
      var mocha = this
      this.client.on("data", function(event) {
        expect(JSON.parse(event)).to.be.eql(mocha.event.event)
        done()
      })
      this.request.post("/events")
        .set("Content-Type", "application/json")
        .send(this.event)
        .expect(202)
        .end(this.noop)
    })

    beforeEach(function(done) {
      this.client = sockjs.create(this.baseurl + "/shover")
      this.client.on("connection", function(connection) {
        done()
      })
    })

    afterEach(function(done) {
      this.client.on("close", function() {
        done()
      })
      this.client.close()
    })
  })

  before(function(done) {
    var mocha = this
    configure("../../etc/conf.yml", function(err, conf) {
      mocha.noop = function() {}
      mocha.baseurl = util.format("http://%s:%d", conf.http.host, conf.http.port)
      mocha.request = request(mocha.baseurl)
      mocha.conf = conf
      done()
    })
  })
})
