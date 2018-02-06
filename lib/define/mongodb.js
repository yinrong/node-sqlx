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
  try {
    checkParams({table, sets, callback})
  } catch (err) {
    return callback(err)
  }
  if (this._readonly) {
    return errNotAllowd(callback)
  }
  this._conn.collection(table).insert(
    _.cloneDeep(sets),
    {castIds: false},
    (err, result) => {
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
  try {
    checkParams({table, sets, where, callback})
  } catch (err) {
    return callback(err)
  }
  if (this._readonly) {
    return errNotAllowd(callback)
  }
  let update_doc = {}
  if (sets.constructor === Array) {
    update_doc['$set'] = sets
  } else {
    let keys = _.join(_.keys(sets), '')
    keys.includes('$') ? 
      update_doc = sets :
      update_doc['$set'] = sets
  }
  this._conn.collection(table)
    .update(where, update_doc, {multi: true, castIds: false}, (err, result) => {
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
  try {
    checkParams({table, where, callback})
  } catch (err) {
    return callback(err)
  }
  if (this._readonly) {
    return errNotAllowd(callback)
  }
  this._conn.collection(table).remove(where, {castIds: false}, (err, result) => {
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
  try {
    checkParams({table, fields, where, callback})
  } catch (err) {
    return callback(err)
  }
  let _fields = fields === '*' ? {} : fields
  _fields.castIds = false
  this._conn.collection(table).find(where, _fields, (err, docs) => {
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
  try {
    checkParams({table, options, where, callback})
  } catch (err) {
    return callback(err)
  }
  let _options = _.cloneDeep(options)
  _options.castIds = false
  this._conn.collection(table).find(where, _options, (err, docs) => {
    return callback(err, docs, null)
  })
}

/**
 * Mongodb.findOneAndUpdate()
 * 
 * @param {stinrg} table 
 * @param {object} options
 * @param {object} sets 
 * @param {object} where 
 * @param {function} callback 
 */
findOneAndUpdate(table, options, sets, where, callback) {
  try {
    checkParams({table, options, sets, where, callback})
  } catch (err) {
    return callback(err)
  }
  let _options = _.cloneDeep(options)
  _options.castIds = false
  this._conn.collection(table).findOneAndUpdate(where, sets, _options,
    (err, updated_doc) => {
      return callback(err, updated_doc, null)
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
  try {
    checkParams({table, options, pipeline, callback})
  } catch (err) {
    return callback(err)
  }
  let _options = _.cloneDeep(options)
  _options.castIds = false
  this._conn.collection(table).aggregate(pipeline, _options, (err, docs) => {
    return callback(err, docs, null)
  })
}

/**
 * Mongodb.count()
 * 
 * @param {string} table
 * @param {object} options
 * @param {object} where
 * @param {function} callback
 */
count(table, options, where, callback) {
  try {
    checkParams({table, options, where, callback})
  } catch (err) {
    return callback(err)
  }
  let _options = _.cloneDeep(options)
  _options.castIds = false
  this._conn.collection(table).count(where, _options, (err, count) => {
    return callback(err, count, null)
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

// ------ validator -----
const Ajv = require('ajv')
const validator = (new Ajv()).compile({
  type: 'object',
  properties: {
    table: {type: 'string'},
    options: {type: 'object'},
    pipeline: {type: 'array'},
    where: {type: ['object', 'string']},
    sets: {type: ['object', 'array']},
    fields: {type: ['array', 'string']}
  },
  required: ['table'],
})
/**
 * 
 * @param {object}          params 
 * @param {string}          params.table
 * @param {string|Array}    params.fileds
 * @param {object|Array}    params.sets
 * @param {object}          params.where
 * @param {object}          params.options
 * @param {function}        params.callback
 */
function checkParams(params) {
  for (let key of _.keys(params)) {
    if (util.isNullOrUndefined(params[key])) {
      throw new Error(`Missing parameter: ${key}`)
    }
  }
  if (!validator(params)) {
    throw new Error(validator.errors.map(err => {
      return err.dataPath + ' ' + err.message
    }))
  }
}
