function Client(opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  this._opts = opts || {}
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
/*
 * user:
 * actions:
 */
Client.prototype.getConnection = function(options) {
  var opts = $._.clone(options)
  opts.connection_timeout = this._opts.connection_timeout || DEFAULT_TIMEOUT
  opts.logAction = this._opts.logAction
  return new Connection(this._contexts, opts)
}

const async = require('async')
const Connection = require('./Connection')
const $ = require('./$')
const DEFAULT_TIMEOUT = 1000

var local = {}
local.initDefine = function(config) {
  var define = config.constructor === Object && config.type || 'default'
  var ret = new (require('./define/' + define).Context)(config)
  ret.__defined__ = true
  return ret
}
