const redis = require("redis")

module.exports.Context = function(config) {
  this.getConnection = function() {
    return new Redis(config)
  }
}

function Redis(config) {
  this._client = redis.createClient(config)
}

Redis.prototype.release = function() {
  this._client.quit()
}

Redis.prototype.select = function(table, fields, where, callback) {
  var key = Object.keys(where)[0]
  this._client.get(key, customCallback(callback))
}

Redis.prototype.insert = function(table, sets, callback) {
  var key = Object.keys(sets)[0]
  this._client.set(key, sets[key], customCallback(callback))
}

Redis.prototype.update = function(table, sets, where, callback) {
  var key = Object.keys(where)[0]
  var value = sets[key]
  this._client.set(key, value, customCallback(callback))
}

Redis.prototype.delete = function(table, where, callback) {
  var key = Object.keys(where)[0]
  this._client.del(key, customCallback(callback))
}

function customCallback(callback) {
  return function(err, reply) {
    callback(err, reply, null)
  }
}
