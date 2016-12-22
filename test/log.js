
describe('log', function() {

it('log', function(done) {
  var log_obj
  const client = sqlx.createClient({logAction: x => log_obj = x})
  client.define(['table1', '*']  , {
    insert: function (table, sets, callback) { callback() },
    update: function (table, sets, where, callback) { callback() },
    queryReadonly: function (query_str, values, callback) { callback() },
  })

  var operator_info = {
    user: '101,23',
    actions: '*',
  }

  const conn = client.getConnection(operator_info)
  async.waterfall([
  // insert
  (next) => {
    conn.insert('table1', {yn: 1}, function(err, x){
      assert(!err, err)
      next()
    })
  },
  (next) => {
    var expect_log = {
      table: 'table1',
      method: 'insert',
      args: {
        '0': 'table1',
        '1': { yn: 1 },
      }
    }
    var compare_fields = ['table', 'method', 'args']
    assert(_.isEqual(_.pick(log_obj, compare_fields), expect_log))
    assert(!isNaN(log_obj.duration))
    next()
  },
  // update
  (next) => {
    conn.update('table1', {a:1, b:2}, {c: 3}, function(err, x){
      assert(!err, err)
      next()
    })
  },
  (next) => {
    assert.equal(log_obj.table, 'table1')
    assert.equal(log_obj.method, 'update')
    assert(!isNaN(log_obj.duration))
    next()
  },
  // queryReadonly
  (next) => {
    conn.queryReadonly('select x from t where id = ?',
                        [123], function(err, x){
      assert(!err, err)
      next()
    })
  },
  (next) => {
    assert.equal(log_obj.table, '-')
    assert.equal(log_obj.method, 'queryReadonly')
    assert(!isNaN(log_obj.duration))
    done()
  },
  ], function(err) {
    assert(!err, err)
  })
})


})

const sqlx = require('..')
const assert = require('assert')
const async = require('async')
const _ = require('lodash')
