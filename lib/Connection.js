function Connection(contexts, opts) {
  this._contexts = contexts
  this._opts = opts
  this._allowed_actions = {
  }
  if (opts.actions) {
    var allowed
    if (opts.actions === '*') {
      allowed = $.ALL_METHODS
    } else {
      allowed = opts.actions
    }
    allowed.forEach(action => this._allowed_actions[action] = true)
    if (this._allowed_actions.select) {
      this._allowed_actions.queryReadonly = true
      this._allowed_actions.selectEx = true
    }
    this._allowed_actions.release = true
  }
}
module.exports = Connection

const $ = require('./$')

function logActionInternal(logAction, start_time, table, method, args) {
  if (!$.util.isFunction(logAction)) {
    return
  }
  logAction({
    table: table,
    method: method,
    duration: new Date() - start_time,
    // remove callback function
    args: $._.pickBy(args, x => !$.util.isFunction(x)),
  })
}

$.ALL_METHODS.forEach(function(method) {
  Connection.prototype[method] = function (table) {
    const callback = arguments[arguments.length - 1]
    if (!this._allowed_actions[method]) {
      return callback(new Error(
        `action "${method}" not allowed for user ${this._opts.user}`))
    }

    var where_pos = local.PARAM_WHERE_POSITION[method]
    if (where_pos !== undefined
      && !local.assureNoUndefined(arguments[where_pos])) {
      return callback(new Error('undefined value not allowed: '
        + $.util.inspect(arguments[where_pos])))
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
    const conn = context.getConnection()
    const timeout_destroy = setTimeout(function() {
      conn.__destroy()
      callback(new Error('connection timeout.'))
    }, this._opts.connection_timeout)

    const start_time = +new Date() // 开始时间
    const that = this
    const args = arguments
    arguments[arguments.length - 1] = function() {
      // if a logAction exits, 记录日志
      if (that._opts && $.util.isFunction(that._opts.logAction)) {
        // queryReadonly do not has table parameter
        var table_name = method != 'queryReadonly' ? table : '-'
        logActionInternal(that._opts.logAction, start_time, table_name, method,
          args)
      }
      conn.release()
      clearTimeout(timeout_destroy)
      callback.apply(null, arguments)
    }
    conn[method].apply(conn, arguments)
  }
})

Connection.prototype.release = function() {
  return
}

var local = {}

local.assureNoUndefined = (obj) => {
  if (obj === undefined) {
    return false
  }
  if (!obj || obj.constructor !== Object) {
    return true
  }
  var keys = Object.keys(obj)
  for (var i in keys) {
    var v = obj[keys[i]]
    if (!local.assureNoUndefined(v)) {
      return false
    }
  }
  return true
}

local.PARAM_WHERE_POSITION = {
  delete: 1,
  update: 2,
}
