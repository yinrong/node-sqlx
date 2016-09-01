describe('mysql', function() {

beforeEach(function() {
  child_process.execSync('mysql -uroot < test/mysql_initdb.txt')
})

it('table routing', function(done) {
  const client = sqlx.createClient()
  client.define(['table1'], ['insert', 'update'], MYSQL_CONFIG_1)
  client.define(['table2'], '*'                 , MYSQL_CONFIG_1)
  client.define('table3'  , 'insert'            , MYSQL_CONFIG_1)
  client.define('table3'  , 'update'            , MYSQL_CONFIG_1)
  client.define('table4'  , 'insert'            , MYSQL_CONFIG_1)
  client.define('*', '*', MYSQL_CONFIG_1)

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
    conn.release()
    done()
  },
  ], function(err) {
    throw err
  })
})


it('where in select', function(done) {
  const client = sqlx.createClient()
  client.define('*', '*', MYSQL_CONFIG_1)
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
  client.define('*', '*', MYSQL_CONFIG_1)
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

})

const assert = require('assert')
const async = require('async')
const sqlx = require('..')
const child_process = require('child_process')
const MYSQL_CONFIG_1 = {
  type: 'mysql',
  config: {
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: '',
    // debug: ['ComQueryPacket'],
    database: 'sqlx_mysql',
  } }
const OPERATER_INFO_1 = {
    user: '101,23',
  }

