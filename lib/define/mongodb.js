module.exports.Context = class {

constructor(config) {
  if (!config.config.url) {
    throw new Error('url is required for mongodb connection')
  }
  this._config = config
  this._pool = monk(config.config.url)
  this._pool.on('open', () => {
    log.trace('mongodb connection established')
  })
}

getConnection() {
  log.info('getConnection mongodb')
  let ret = new MongoDB(this._pool, this._config.config.readonly)
  if (this._config.extend) {
    Object.keys(this._config.extend).forEach(method_name => {
      ret[method_name] = this._config.extend[method_name]
    })
  }
  return ret
}

}

class MongoDB {

constructor(pool, readonly) {
  this._readonly = readonly
  this._released = false
  this._conn = pool
}

__destroy() {
  // mongodb will auto control mongodb connection pool
}

/**
 * MongoDB.insert()
 * 
 * @param {string} table 
 * @param {object|Array} sets 
 * @param {function} callback 
 */
insert(table, sets, callback) {
  if (sets.constructor !== Object && sets.constructor !== Array) {
    return callback(new Error('invalid sets'))
  }
  if (this._readonly) {
    return errNotAllowd(callback)
  }
  this._conn.collection(table).insert(_.cloneDeep(sets), (err, result) => {
    if (err) {
      return callback(err)
    }
    if (result.constructor === Object) {
      result = [result]
    }
    return callback(err, {
      affected_rows: result.length,
      docs: result,
    }, null)
  })
}

update(table, sets, where, callback) {
  if (sets.constructor !== Object && sets.constructor !== Array) {
    return callback(new Error('invalid sets'))
  }
  if (this._readonly) {
    return errNotAllowd(callback)
  }
  this._conn.collection(table)
    .update(where, {$set: _.cloneDeep(sets)}, {multi: true}, (err, result) => {
      if (err) {
        return callback(err)
      }
      return callback(err, {
        affected_rows: result.n,
        changed_rows: result.nModified,
      }, null)
  })
}

/**
 * Mongodb.remove()
 * 
 * @param {string} table 
 * @param {object} where 
 * @param {function} callback
 */
delete(table, where, callback) {
  if (this._readonly) {
    return errNotAllowd(callback)
  }
  this._conn.collection(table).remove(where, (err, result) => {
    if (err) {
      return callback(err)
    }
    return callback(err, {
      affected_rows: result.deletedCount,
    }, null)
  })
}

/**
 * Mongodb.find()
 * 
 * @param {string} table 
 * @param {string|array} options 
 * @param {string|object_id|object} where 
 * @param {function} callback 
 */
select(table, fields, where, callback) {
  let _fields = fields === '*' ? {} : fields
  this._conn.collection(table).find(where, _fields, (err, docs) => {
    if (err) {
      return callback(err)
    }
    return callback(err, docs, null)
  })
}

/**
 * Mongodb.find()
 * support sort/fileds/limit/skip/rawCursor in options
 * 
 * @param {string} table 
 * @param {object} options 
 * @param {string|object_id|object} where 
 * @param {function} callback 
 */
find(table, options, where, callback) {
  this._conn.collection(table).find(where, options, (err, docs) => {
    if (err) {
      return callback(err)
    }
    return callback(err, docs, null)
  })
}

/**
 * Mongodb.close()
 */
release() {
  // mongodb will auto control mongodb connection pool
}

/**
 * Mongodb.aggregate()
 * 
 * @param {string} table 
 * @param {object} options 
 * @param {array} pipeline 
 * @param {function} callback 
 */
aggregate(table, options, pipeline, callback) {
  this._conn.collection(table).aggregate(pipeline, options, (err, docs) => {
    if (err) {
      return callback(err)
    }
    return callback(err, docs, null)
  })
}

}

const _ = require('lodash')
const util = require('util')
const debug = require('debug')('sqlx')
const monk = require('monk')
function __log() {
  debug(util.format.apply(null, arguments))
}
const log = {
  trace: __log,
  error: __log,
  debug: __log,
  info : __log,
}

function errNotAllowd(callback) {
  return callback(new Error('not allowed'))
}

