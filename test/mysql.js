describe('mysql', function() {

it('', function(done) {
  child_process.execSync('mysql -uroot < test/mysql_initdb.txt')
  const client = sqlx.createClient()
  const config1 = { type: 'mysql',
                    config: {
                      connectionLimit: 10,
                      host: '127.0.0.1',
                      user: 'root',
                      password: '',
                      //debug: ['ComQueryPacket'],
                      database: 'sqlx_mysql',
                    } }
  client.define(['table1'], ['insert', 'update'], config1)
  client.define(['table2'], '*'                 , config1)
  client.define('table3'  , 'insert'            , config1)
  client.define('table3'  , 'update'            , config1)
  client.define('table4'  , 'insert'            , config1)
  client.define('*', '*', config1)

  var operator_info = {
    user: '101,23',
  }

  var conn
  async.waterfall([
  function(next) {
    client.getConnection(operator_info, next)
  },
  function(conn_, next) {
    conn = conn_
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
  function(next) {
  },
  function(next) {
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
