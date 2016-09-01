function Client(opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  //this._pool = opts.pool
  //this._database = opts.database
  this._contexts = {}
}

module.exports = Client

Client.prototype.define = function(table, method, config) {
  const that = this
  var definition
  if (config.__defined__) {
    definition = config
  } else {
    definition = local.initDefine(config)
  }
  if (table.constructor === Array) {
    return table.forEach(function(t) {
      that.define(t, method, definition)
    })
  }
  if (method.constructor === Array) {
    return method.forEach(function(m) {
      that.define(table, m, definition)
    })
  }
  if (method === '*') {
    return $.ALL_METHODS.forEach(function(m) {
      that.define(table, m, definition)
    })
  }
  if (!this._contexts[table]) this._contexts[table] = {}
  this._contexts[table][method] = definition
}

Client.prototype.getConenction = function(operator_info) {
  return new Connection(this._contexts, operator_info)
}

const async = require('async')
const Connection = require('./Connection')
const $ = require('./$')

var local = {}
local.initDefine = function(config) {
  var define = config.constructor === Object && config.type || '_default'
  var ret = new (require('./define/' + define).Context)(config)
  ret.__defined__ = true
  return ret
}
