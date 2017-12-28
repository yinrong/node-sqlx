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
