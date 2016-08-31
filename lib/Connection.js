function Connection(contexts, operator_info) {
  this._contexts = contexts
  this._operater_info = operator_info
  this._connections = {}
  const that = this
  Object.keys(contexts).forEach(function(table) {
    that._connections[table] = {}
  })
}
module.exports = Connection

const $ = require('./$')

$.ALL_METHODS.forEach(function(method) {
  Connection.prototype[method] = function (table) {
    const callback = arguments[arguments.length - 1]
    var table_def
    if (this._contexts[table]) {
      table_def = table
    } else {
      table_def = '*'
    }
    if (!this._contexts[table_def]) {
      var e = new Error(table + '.' + method + ' is not defined')
      if (callback) return callback(e)
      throw e
    }
    const context = this._contexts[table_def][method]
    if (!this._connections[table_def][method]) {
      this._connections[table_def][method] = context.createConnection()
    }
    const conn = this._connections[table_def][method]
    conn[method].apply(conn, arguments)
  }
})

Connection.prototype.release = function() { }
