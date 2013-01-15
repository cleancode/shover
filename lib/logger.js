var connect = require("connect")

module.exports = function(conf) {
  if (conf.env === "test") {
    return function(req, res, next) {
      next()
    }
  }
  return connect.logger()
}
