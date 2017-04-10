describe('mysql', function() {

beforeEach(function() {
  child_process.execSync('mysql -uroot < test/mysql_initdb.txt')
})

it('table routing', function(done) {
  const client = sqlx.createClient()
  client.define(['table1'], MYSQL_CONFIG_2)
  client.define(['table2'], MYSQL_CONFIG_2)
  client.define('table3'  , MYSQL_CONFIG_2)
  client.define('table4'  , MYSQL_CONFIG_2)
  client.define('*'       , MYSQL_CONFIG_2)

  const conn = client.getConnection(OPERATER_INFO_1)
  async.waterfall([
  function(next) {
    conn.insert('table1', {a:1}, next)
  },
  function(rows, info, next) {
    conn.update('table1', {a:2}, {a:1}, next)
  },
  function(rows, info, next) {
    conn.insert('tableX', {a:3}, next)
  },
  function(rows, info, next) {
    conn.queryReadonly('select * from table1', next)
  },
  function(rows, info, next) {
    assert(rows.length > 0)
    conn.queryReadonly('update table set a=1', function(err) {
      assert(err.toString().match(/not allowed/))
      next(null, null, null)
    })
  },
  function(rows, info, next) {
    conn.selectEx('table1', 'select * from table1', next)
  },
  function(rows, info, next) {
    assert(rows.length > 0)
    conn.selectEx('table', 'update table set a=1', function(err) {
      assert(err.toString().match(/not allowed/))
      next(null, null, null)
    })
  },
  function(rows, info, next) {
    assert.throws(function() {
      conn.delete('table1', {a:3})
    })
    conn.release()
    done()
  },
  ], function(err) {
    throw err
  })
})


it('where in select', function(done) {
  const client = sqlx.createClient()
  client.define('*', MYSQL_CONFIG_1)
  const conn = client.getConnection(OPERATER_INFO_1)

  async.waterfall([
  function(next) {
    conn.insert(
      'table1',
      [
        {a:1, b:21},
        {a:2, b:22},
        {a:3, b:23},
        {a:3, b:123},
      ],
      next)
  },
  function(rows, info, next) {
    conn.select('table1', '*', {a: 2}, next)
  },
  function(rows, info, next) {
    conn.select('table1', 'b', {a: 2}, next)
  },
  function(rows, info, next) {
    conn.select('table1', ['a','id', 'b'], {a: 2}, next)
  },
  function(rows, info, next) {
    assert.equal(rows.length, 1)
    assert.equal(rows[0].b, 22)
    conn.select('table1', '*', {$and: {a: 3, b: 123}}, next)
  },
  function(rows, info, next) {
    assert.equal(rows.length, 1)
    conn.release()
    done()
  },
  ], function(err) {
    throw err
  })
})


it('where in update', function(done) {
  const client = sqlx.createClient()
  client.define('*', MYSQL_CONFIG_1)
  const conn = client.getConnection(OPERATER_INFO_1)

  async.waterfall([
  function(next) {
    conn.insert(
      'table1',
      [
        {a:1, b:21},
        {a:2, b:22},
        {a:3, b:23},
        {a:3, b:123},
      ],
      next)
  },
  function(rows, info, next) {
    conn.update('table1', {b:1}, {a:3}, next)
  },
  function(result, info, next) {
    assert.equal(result.affectedRows, 2)
    assert.equal(result.changedRows, 2)
    conn.select('table1', '*', {a:3}, next)
  },
  function(rows, info, next) {
    assert.equal(rows.length, 2)
    assert.equal(rows[0].b, 1)
    assert.equal(rows[1].b, 1)
    conn.release()
    done()
  },
  ], function(err) {
    throw err
  })
})


it('where in delete', function(done) {
  const client = sqlx.createClient()
  client.define('*', MYSQL_CONFIG_1)
  const conn = client.getConnection(OPERATER_INFO_1)
  async.waterfall([
  function(next) {
    conn.insert(
      'table1',
      [
        {a:1, b:21},
        {a:2, b:22},
        {a:3, b:23},
        {a:3, b:123},
      ],
      next)
  },
  function(rows, info, next) {
    conn.delete('table1', {a:3}, next)
  },
  function(result, info, next) {
    assert.equal(result.affectedRows, 2)
    conn.release()
    done()
  },
  ], function(err) {
    throw err
  })
})

it('release', (done) => {
  const client = sqlx.createClient()
  client.define('*', MYSQL_CONFIG_1)
  var conn, conn2
  async.waterfall([
  (next) => {
    var called = 0
    conn = client.getConnection(OPERATER_INFO_1)
    conn2 = client.getConnection(OPERATER_INFO_1)
    conn.select('table1', '*', {}, ()=> {
      called++
    })
    conn2.select('table1', '*', {}, ()=> {
      called++
    })
    setTimeout(() => {
      assert.equal(called, 2)
      conn.release()
      conn2.release()
      next(null, null, null)
    }, 1000)
  },
  (rows, info, next) => {
    conn = client.getConnection(OPERATER_INFO_1)
    conn.select('table1', '*', {}, next)
  },
  (rows, info, next) => {
    conn.release()
    conn = client.getConnection(OPERATER_INFO_1)
    conn.select('table1', '*', {}, next)
  },
  (result, info, next) => {
    conn.release()
    done()
  },
  ], (err) => {
    throw err
  })
})

it('extend', function(done) {
  const client = sqlx.createClient()
  var config = _.cloneDeep(MYSQL_CONFIG_1)
  var extend_method_called = 0
  config.extend = {
    insert: function() {
      extend_method_called++
      this.constructor.prototype.insert.apply(this, arguments)
    },
  }
  client.define('*', config)
  const conn = client.getConnection(OPERATER_INFO_1)

  async.waterfall([
  function(next) {
    conn.insert( 'table1', {a:101}, next)
  },
  function(rows, info, next) {
    assert.equal(extend_method_called, 1)
    conn.release()
    done()
  },
  ], function(err) {
    throw err
  })
})

it('undefined in where', done => {
  const client = sqlx.createClient()
  client.define('*', MYSQL_CONFIG_1)
  const conn = client.getConnection(OPERATER_INFO_1)

  async.waterfall([
  (next) => {
    conn.update('table1', {a:1}, {id:1, pin:'xxx'}, err => {
      assert(err && !err.toString().match(/undefined .* not allowed/))
      next()
    })
  },
  (next) => {
    conn.update('table1', {a:1}, {a:undefined}, err => {
      assert(err && err.toString().match(/undefined .* not allowed/))
      next()
    })
  },
  (next) => {
    conn.delete('table1', {a: 1, b: {c: 2, d: undefined}}, err => {
      assert(err && err.toString().match(/undefined .* not allowed/))
      next()
    })
  },
  (next) => {
    conn.release()
    done()
  },
  ], function(err) {
    throw err
  })
})
})

const assert = require('assert')
const async = require('async')
const sqlx = require('..')
const child_process = require('child_process')
const _ = require('lodash')
const MYSQL_CONFIG_1 = {
  type: 'mysql',
  config: {
    connectionLimit: 1,
    host: '127.0.0.1',
    user: 'root',
    password: '',
    //debug: ['ComQueryPacket'],
    database: 'sqlx_mysql',
  } }
const MYSQL_CONFIG_2 = _.merge(_.cloneDeep(MYSQL_CONFIG_1), {
  config: {
    connectionLimit: 5,
  },
})
const OPERATER_INFO_1 = {
    user: '101,23',
    actions: '*',
  }

