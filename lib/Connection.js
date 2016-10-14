function Connection(contexts, operator_info) {
  this._contexts = contexts
  this._operater_info = operator_info
  this._allowed_actions = {
  }
  if (operator_info.actions) {
    var allowed
    if (operator_info.actions === '*') {
      allowed = $.ALL_METHODS
    } else {
      allowed = operator_info.actions
    }
    if (allowed.indexOf('select') !== -1) {
      allowed = allowed.concat(['queryReadonly'])
    }
    allowed.forEach(action => this._allowed_actions[action] = true)
  }
  this._connections = {}
  const that = this
}
module.exports = Connection

const $ = require('./$')

$.ALL_METHODS.forEach(function(method) {
  Connection.prototype[method] = function (table) {
    const callback = arguments[arguments.length - 1]

    if (!this._allowed_actions[method]) {
      return callback(new Error(
        `action "${method}" not allowed for user ${this._operater_info.user}`))
    }

    if (callback.constructor !== Function) {
      throw new Error('missing callback')
    }
    var table_def
    if (this._contexts[table]) {
      table_def = table
    } else {
      table_def = '*'
    }
    if (!this._contexts[table_def]) {
      var e = new Error(table + ' is not defined')
      return callback(e)
    }
    const context = this._contexts[table_def]
    if (!this._connections[table_def]) {
      this._connections[table_def] = context.getConnection()
    }
    const conn = this._connections[table_def]
    conn[method].apply(conn, arguments)
  }
})

Connection.prototype.release = function() {
  const that = this
  Object.keys(this._connections).forEach(function(table) {
    const connection = that._connections[table]
    connection.release()
  })
}
