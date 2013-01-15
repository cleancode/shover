var fs = require("fs"),
    path = require("path"),
    yaml = require("js-yaml")

module.exports = function(fileRelativePath, callback) {
  var filePath = path.join(path.dirname(module.parent.filename), fileRelativePath)
  fs.exists(filePath, function(exists) {
    if (!exists) {
      throw new Error("Unable to find configuration file " + filePath)
    }
    fs.readFile(filePath, "utf8", function(error, data) {
      if (error) {
        throw new Error("Unable to read configuration file " + filePath)
      }
      yaml.loadAll(data, function(conf) {
        callback(null, process.conf = conf[process.env.NODE_ENV || "development"])
      })
    })
  })
}
