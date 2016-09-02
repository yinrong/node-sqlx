function Client(opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  //this._pool = opts.pool
  //this._database = opts.database
  this._contexts = {}
}

module.exports = Client

Client.prototype.define = function(table, config) {
  if (this._contexts[table]) {
    throw new Error('table "' + table + '" is already defined')
  }
  var definition
  if (config.__defined__) {
    definition = config
  } else {
    definition = local.initDefine(config)
  }
  if (table.constructor === Array) {
    const that = this
    return table.forEach(function(t) {
      that.define(t, definition)
    })
  }
  this._contexts[table] = definition
}

Client.prototype.getConnection = function(operator_info) {
  return new Connection(this._contexts, operator_info)
}

const async = require('async')
const Connection = require('./Connection')
const $ = require('./$')

var local = {}
local.initDefine = function(config) {
  var define = config.constructor === Object && config.type || 'default'
  var ret = new (require('./define/' + define).Context)(config)
  ret.__defined__ = true
  return ret
}
