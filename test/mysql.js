describe('mysql', function() {

before(function() {
  child_process.execSync('mysql -uroot < test/mysql_initdb.txt')
})

it('basic', function(done) {
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
    //debug: ['ComQueryPacket'],
    database: 'sqlx_mysql',
  } }
const OPERATER_INFO_1 = {
    user: '101,23',
  }

