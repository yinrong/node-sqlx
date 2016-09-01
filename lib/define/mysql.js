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
  this.getConenction = function() {
    return new MysqlConnection(pool, config.readonly)
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

MysqlConnection.prototype._init = function(func, args) {
  const that = this
  this._events.on('connected', function() {
    func.apply(that, args)
  })
}

MysqlConnection.prototype.queryReadonly = function(sql, arg2, arg3) {
  if (!this._connected) return this._init(this.queryReadonly, arguments)
  log.trace('queryReadonly', sql.toString())
  var that_arguments = arguments
  var that = this
  assert(sql)
  var callback
  if (arg3) callback = arg3
  else callback = arg2
  var matches = sql.match(/^[^ ]+/)
  if (matches &&
  QUERY_READONLY_ALLOW.indexOf(matches[0].toUpperCase()) !== -1) {
    async.waterfall([
    function(next) {
      that._conn.query.apply(that._conn, that_arguments)
    },
    ], callback)
  } else {
    callback(new Error('unsupported sql command: ' + sql))
  }
}

MysqlConnection.prototype._startQuery = function(sql, callback, fixup) {
  log.trace('_startQuery', sql.toString(), fixup, 'connected =', this._connected)
  if (!this._connected) return this._init(this._startQuery, arguments)
  log.trace('_startQuery', sql.toString(), fixup)
  assert(sql)
  assert(callback.constructor === Function)
  var that = this
  async.waterfall([
  function(next) {
    that._conn._query_stack = that._tmp_query_stack
    var sqltext = sql.toString()
    if (!that._sqls) that._sqls = []
    that._sqls.push(sqltext)
    if (fixup) {
      sqltext += fixup
    }
    log.trace()
    that._conn.query(sqltext, callback)
    log.debug(sqltext, 'init =', this._init)
  },
  ], callback)
}

function sqlSets(sql, sets) {
  for (var key in sets) {
    var value = sets[key]
    var dontQuote = false
    if (value === undefined || value === null) {
      value = null
    } else if (value.constructor === String) {
      dontQuote = true
      if (value[0] === '@') {
        // '@' indicates the value should not be quoted
        value = value.slice(1)
      } else {
        value = mysql.escape(value)
      }
    } else {
    }
    sql.set(key, value, {dontQuote: dontQuote})
  }
}

function errInvalidWhere(where, callback) {
  callback([400, util.inspect(where), 'invalid clause'])
}
function errNotAllowed(callback) {
  callback([403, 'not allowed'])
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

  data.time = +new Date()
  if (this._cfg.user) {
    data.user_id = this._cfg.user.userid
    data.dsp_id = this._cfg.user.dspid
  }
  this._conn.insert('__changelog__', data, function(err, result, _) {
    if (err) {
      log.warn('failed to insert changelog. err:', err,
        'data:', util.inspect(data, false, {depth:null}))
    }
    dbt.release()
  })
}

MysqlConnection.prototype.delete = function(table, where0, callback) {
  if (this._readonly) {
    return errNotAllowed(callback)
  }
  this._tmp_query_stack = new Error('QUERY_STACK').stack
  var that = this
  assert(callback.constructor === Function)
  var where = local.genWhereClause(where0)
  if (!where) {
    return errInvalidWhere(where0, callback)
  }
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
    var sql = squel.delete().from(table).where(where)
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
    return async.each(sets, function(item, next) {
      that.insert(table, item, next)
    }, callback)
  }
  assert(sets.constructor === Object)
  async.waterfall([
  function(next) {
    var sql = squel.insert().into(table)
    sqlSets(sql, sets)
    var fixup
    if (Object.keys(sets).length == 0) {
      fixup = ' () VALUES ()'
    }
    that._startQuery(sql, next, fixup)
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

MysqlConnection.prototype.update = function(table, sets, where0, callback) {
  if (this._readonly) {
    return errNotAllowed(callback)
  }
  this._tmp_query_stack = new Error('QUERY_STACK').stack
  assert(callback.constructor === Function)
  var where = local.genWhereClause(where0)
  if (!where) {
    return errInvalidWhere(where0, callback)
  }
  assert(sets.constructor === Object)
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
    var sql = squel.update().table(table).where(where)
    sqlSets(sql, sets)
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
  assert(fields)
  assert(callback.constructor == Function)
  if (fields.constructor === Array) {
    fields = fields.join(',')
  }
  var where = local.genWhereClause(where0)
  if (!where && where !== '') {
    return errInvalidWhere(where0, callback)
  }
  var sql = squel.select().from(table).field(fields).where(where)
  this._startQuery(sql, callback)
}


const QUERY_READONLY_ALLOW = ['SELECT']
const util = require('util')
const mysql = require('mysql')
const crypto = require('crypto')
const async = require('async')
const assert = require('assert')
const squel = require('squel')
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

/*
 *  make where sql clause using a map
 *  e.g.  filters = {id : 123, name : 'dsp'}
 *        -> 'id = 123 AND name = dsp'
 */
local.genWhereClause = function(filters) {
  if (!filters) return '';
  if (filters.constructor === String) {
    return filters;
  }
  var clauses = [];
  var keys = Object.keys(filters);
  for (var i = 0; i < keys.length; i++) {
    var val = filters[keys[i]];
    var op;
    if (val === undefined || val === null) {
      op = 'is';
      val = "null";
    } else if (val.constructor === Array) {
      val = '(' + val.join(', ') + ')'
      op = 'in';
    } else if (val.constructor === String) {
      if (val[0] === '@') {
        op = '';
        val = val.slice(1);
      } else {
        op = '=';
        val = "'" + val + "'";
      }
    } else if (val.constructor === Number || typeof val === 'boolean') {
      op = '=';
    } else {
      return null;
    }
    clauses.push(keys[i] + ' ' +  op + ' ' + val);
  }
  return clauses.join(" AND ");
}
