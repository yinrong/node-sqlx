function Client(opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  //this._pool = opts.pool
  //this._database = opts.database
  this._defines = {}
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
  if (!this._defines[table]) this._defines[table] = {}
  this._defines[table][method] = definition
}

Client.prototype.getConnection = function(operator_info, callback) {
  callback(null, new Connection(this._defines, operator_info))
}

const async = require('async')
const Connection = require('./Connection')
const $ = require('./$')

var local = {}
local.initDefine = function(c) {
  var define = c.constructor === Object && c.type || '_default'
  var ret = new (require('./define/' + define))(c)
  ret.__defined__ = true
  return ret
}
