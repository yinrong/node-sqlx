describe('sqlx-promise', function() {

it('mysql async/await', async () => {
  child_process.execSync('mysql -uroot < test/mysql_initdb.txt')
  const client = sqlx.createClient()
  client.define('*', MYSQL_CONFIG_1)

  const conn = client.getConnection(OPERATER_INFO)
  let result
  // insert
  await conn.insert(
    'table1',
    [
      {a:1, b:21},
      {a:2, b:22},
      {a:3, b:23},
      {a:3, b:123},
    ])
  // select
  result = await conn.select('table1', '*', { $and: { a: 3, b: 123 } })
  assert.equal(result.rows.length, 1)
  // update
  result = await conn.update('table1', {b:1}, {a:3})
  assert.equal(result.rows.affected_rows, 2)
  assert.equal(result.rows.changed_rows, 2)
  // selectEx
  result = await conn.selectEx('table1', 'select * from table1 where a = ?', [2])
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].b, 22)
  // delete
  result = await conn.delete('table1', {a:3})
  assert.equal(result.rows.affected_rows, 2)
  conn.release()
})

it('mongodb async/await', async () => {
  const client = sqlx.createClient()
  client.define('*', MONGODB_CONFIG)
  const conn = client.getConnection(OPERATER_INFO)
  // insert
  result = await conn.insert('table1', {a: 1})
  assert.equal(result.rows.affected_rows, 1)
  // select
  result = await conn.select('table1', '*', {a: 1})
  assert.equal(result.rows[0].a, 1)
  // find
  result = await conn.find('table1', {limit: 1}, {a: 1})
  assert.equal(result.rows[0].a, 1)
  // aggregate
  result = await conn.aggregate(
    'table1', 
    {limit: 1}, 
    [{$match: {a: 1}}, {$sort: {a: 1}}])
  assert.equal(result.rows[0].a, 1)
  // update
  result = await conn.update('table1', {a: 2}, {a: 1})
  assert(result.rows.affected_rows)
  // delete
  result = await conn.delete('table1', {a:2})
  assert(result.rows.affected_rows)
})

it('redis async/await', async () => {
  const client = sqlx.createClient()
  client.define('budget', {type: 'redis', config: REDIS_CONIFG})

  const conn = client.getConnection(OPERATER_INFO)
  let result
  // insert
  result = await conn.insert('budget', {key1: 'value1'})
  assert.equal(result.rows, 'OK')
  // select
  result = await conn.select('budget', '*', {key1: 1})
  assert.equal(result.rows, 'value1')
  // update
  result = await conn.update('budget', {key1: 'value2'}, {key1: 1})
  assert.equal(result.rows, 'OK')
  result = await conn.select('budget', '*', {key1: 1})
  assert.equal(result.rows, 'value2')
  // delete
  result = await conn.delete('budget', {key1: 1})
  assert.equal(result.rows, 1)
  result = await conn.select('budget', '*', {key1: 1})
  assert.equal(result.rows, null)
  conn.release()
})

it('extend promise', async () => {
  const client = sqlx.createClient()
  let config = _.cloneDeep(MONGODB_CONFIG)
  let extend_method_called = 0
  config.extend = {
    insert: function(...args) {
      let table = args[0]
      if (table === 'wrong') {
        throw new Error('table can not be wrong! -- test')
      }
      extend_method_called++
      this.constructor.prototype.insert.apply(this, args)
    },
    find: async function(...args) {
      extend_method_called++
      this.constructor.prototype.find.apply(this, args)
    },
  }
  client.define('*', config)
  const conn = client.getConnection(OPERATER_INFO)
  let result
  try {
    await conn.insert('wrong', {wrong: 1})
  } catch (err) {
    console.log(err.message)
    assert(err.message.match(/wrong/))
    assert.equal(extend_method_called, 0)
  }
  result = await conn.insert('table1', {promise: 1})
  assert.equal(extend_method_called, 1)
  assert.equal(result.rows.affected_rows, 1)
  result = await conn.find('table1', {}, {promise: 1})
  assert.equal(extend_method_called, 2)
  assert.equal(result.rows[0].promise, 1)
})
})


const assert = require('assert')
const async = require('async')
const sqlx = require('..')
const child_process = require('child_process')
const _ = require('lodash')

// mysql
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

// mongodb
const MONGODB_CONFIG = {
  type: 'mongodb',
  config: {
    url: 'mongodb://localhost:27017/test?maxPoolSize=30',
  }
}

// redis
const REDIS_CONIFG = {
  host: '127.0.0.1',
  port: '6379',
}

// sqlx operater
const OPERATER_INFO = {
  user: '101,23',
  actions: '*',
}
