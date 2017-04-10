var singleton_pools = {}
module.exports.Context = function(config) {
  assert.equal(config.type, 'mysql')
  const config_key = crypto.createHash('md5')
                           .update(JSON.stringify(config))
                           .digest('hex')
  if (!singleton_pools[config_key]) {
    singleton_pools[config_key] = mysql.createPool(config.config)
    log.info('mysql pool created:', config)
  }
  const pool = singleton_pools[config_key]
  this.getConnection = function() {
    log.info('getConnection mysql')
    var ret = new MysqlConnection(pool, config.readonly)
    if (config.extend) {
      local.extendByConfig(ret, config)
    }
    return ret
  }
}


function MysqlConnection(pool, readonly) {
  this._events = new EventEmitter()
  this._readonly = readonly
  this._connected = false
  this._released = false
  const that = this
  pool.getConnection(function(err, conn) {
    if (err) throw err
    if (that._released) {
      return conn.release()
    }
    that._conn = conn
    that._connected = true
    that._events.emit('connected')
    log.trace('mysql connection established')
  })
}

MysqlConnection.prototype.release = function() {
  this._released = true
  if (!this._conn) return
  this._conn.release()
  this._conn = null
}

MysqlConnection.prototype.__destroy = function() {
  if (!this._conn) return
  this._conn.destroy()
}

MysqlConnection.prototype._init = function(func, args) {
  const that = this
  this._events.on('connected', function() {
    func.apply(that, args)
  })
}

MysqlConnection.prototype.queryReadonly = function(sql, arg2, arg3) {
  if (!this._connected) return this._init(this.queryReadonly, arguments)
  var that_arguments = arguments
  var that = this
  assert(sql)
  var callback
  if (arg3) callback = arg3
  else callback = arg2
  var matches = sql.match(/^[^ ]+/)
  if (!matches || QUERY_READONLY_ALLOW.indexOf(matches[0].toUpperCase()) < 0) {
    return callback(new Error('not allowed: ' + sql))
  }
  async.waterfall([
  function(next) {
    that._conn.query.apply(that._conn, that_arguments)
  },
  ], callback)
}

MysqlConnection.prototype.selectEx = function(table, sql, arg2, arg3) {
    this.queryReadonly.call(this, sql, arg2, arg3)
}

MysqlConnection.prototype._startQuery = function(sql, callback) {
  if (!this._connected) return this._init(this._startQuery, arguments)
  assert(sql)
  assert(callback.constructor === Function)
  var that = this
  async.waterfall([
  function(next) {
    that._conn._query_stack = that._tmp_query_stack
    that._conn.query(sql.text, sql.values, callback)
  },
  ], callback)
}

function errNotAllowed(callback) {
  callback(new Error('not allowed'))
}

MysqlConnection.prototype._insertChangelog = function(data) {
  return
  // {
  //   jdxlocal: {
  //     changelog: true,
  //   },
  //   jdx: {
  //     fieldmap: true,
  //     alert: true,
  //   },
  // }

  // var blacklist = this.CHANGElog_BLACKLIST[this._opts.database]
  // if (blacklist && blacklist[data.table_]) {
  //   return
  // }

  //data.time = +new Date()
  //if (this._cfg.user) {
  //  data.user_id = this._cfg.user.userid
  //  data.dsp_id = this._cfg.user.dspid
  //}
  //this._conn.insert('__changelog__', data, function(err, result, _) {
  //  if (err) {
  //    log.warn('failed to insert changelog. err:', err,
  //      'data:', util.inspect(data, false, {depth:null}))
  //  }
  //  dbt.release()
  //})
}

MysqlConnection.prototype.delete = function(table, where, callback) {
  if (this._readonly) {
    return errNotAllowed(callback)
  }
  this._tmp_query_stack = new Error('QUERY_STACK').stack
  var that = this
  assert(callback.constructor === Function)
  var that = this
  var old_rows
  async.waterfall([
  function(next) {
    that.select(table, '*', where, next)
  },
  function(rows, _, next) {
    if (rows.length === 0) {
      return callback(null, {affectedRows: 0}, null)
    }
    old_rows = rows
    var sql = local.buildSql({
      type: 'delete',
      table: table,
      where: where,
    })
    that._startQuery(sql, next)
  },
  function(result, _, next) {
    that._insertChangelog({
      command: 'delete',
      table_: table,
      where_: where,
      old: util.inspect(old_rows).replace(/\n/g, ''),
    })
    callback(null, result, _)
  },
  ], callback)
}

MysqlConnection.prototype.insert = function(table, sets, callback) {
  if (this._readonly) {
    return errNotAllowed(callback)
  }
  this._tmp_query_stack = new Error('QUERY_STACK').stack
  var that = this
  assert(callback.constructor === Function)
  if (sets.constructor === Array) {
    var ids = []
    async.eachSeries(sets, function(item, next) {
      that.insert(table, item, function(err, rows, info){
        if (err) {
          return callback(err)
        }
        ids.push(rows.insertId)
        next()
      })
    }, function(err) {
      callback(err, {insertIds: ids}, null)
    })
    return
  }
  assert(sets) 
  assert(sets.constructor === Object
        || sets.constructor.name === 'RowDataPacket')
  async.waterfall([
  function(next) {
    var sql = local.buildSql({
      type: 'insert',
      table: table,
      values: sets,
    })
    that._startQuery(sql, next)
  },
  function(result, _, next) {
    // "+" indicated the field is auto generated
    sets['+id'] = result.insertId
    that._insertChangelog({
      command: 'insert',
      table_: table,
      sets: util.inspect(sets).replace(/\n/g, ''),
    })
    callback(null, result, _)
  },
  ], callback)
}

MysqlConnection.prototype.update = function(table, sets, where, callback) {
  if (this._readonly) {
    return errNotAllowed(callback)
  }
  this._tmp_query_stack = new Error('QUERY_STACK').stack
  assert(callback.constructor === Function)
  assert(sets) 
  assert(sets.constructor === Object
        || sets.constructor.name === 'RowDataPacket')
  var that = this
  var old
  async.waterfall([
  function(next) {
    var fields = Object.keys(sets)
    if (fields.indexOf('id') === -1) {
      fields.push('id')
    }
    that.select(table, fields, where, next)
  },
  function(rows, _, next) {
    if (rows.length === 0) {
      return callback(null, {affectedRows: 0}, null)
    }
    old = rows
    var sql = local.buildSql({
      type: 'update',
      table: table,
      where: where,
      values: sets,
    })
    that._startQuery(sql, next)
  },
  function(_1, _2) {
    that._insertChangelog({
      command: 'update',
      table_: table,
      where_: where,
      old : util.inspect(old ).replace(/\n/g, '') ,
      sets: util.inspect(sets).replace(/\n/g, ''),
    })
    callback(null, _1, _2)
  },
  ], callback)
}

MysqlConnection.prototype.select = function(table, fields, where0, callback) {
  this._tmp_query_stack = new Error('QUERY_STACK').stack
  assert(callback.constructor == Function)
  if (fields.constructor !== Array) {
    fields = [fields]
  }
  var sql = local.buildSql({
    type: 'select',
    table: table,
    columns: fields,
    where: where0,
  })
  this._startQuery(sql, callback)
}


const QUERY_READONLY_ALLOW = ['SELECT']
const util = require('util')
const mysql = require('mysql')
const mongo_sql = require('mongo-sql')
const crypto = require('crypto')
const async = require('async')
const assert = require('assert')
const EventEmitter = require('events')
const debug = require('debug')('sqlx')
var local = {}
function __log() {
  debug(util.format.apply(null, arguments))
}
const log = {
  trace: __log,
  error: __log,
  debug: __log,
  info : __log,
}

local.buildSql = (p) => {
  const x = mongo_sql.sql(p)
  sql = x.toString().replace(/\$[0-9]+/g, '?').replace(/"/g, '`')
  return {
    text: sql,
    values: x.values
  }
}

local.extendByConfig = (obj, config) => {
  Object.keys(config.extend).forEach(method_name => {
    obj[method_name] = config.extend[method_name]
  })
}

