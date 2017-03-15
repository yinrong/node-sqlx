const child_process = require('child_process')
const sqlx = require('..')
const async = require('async')
const assert = require('assert')
const OPERATER_INFO_1 = {
  user: '101,23',
  actions: '*',
}
const MYSQL_CONFIG_1 = {
  type: 'mysql',
  config: {
    connectionLimit: 1,
    host: '127.0.0.1',
    user: 'root',
    password: '',
    //debug: ['ComQueryPacket'],
    database: 'sqlx_mysql',
  },
}
describe('mysql', function() {

beforeEach(function() {
  child_process.execSync('mysql -uroot < test/mysql_initdb.txt')
})

it('timeout', function(done) {
  const client = sqlx.createClient({connection_timeout: 500})
  client.define('table1'  , {
    insert: function(table, sets, callback) {
      setTimeout(() => {
        callback(null, null, null)
      }, 1000)
    },
  })
  const conn = client.getConnection(OPERATER_INFO_1)
  async.waterfall([
  (next) => {
    conn.insert('table1', { a: 101 }, next)
  },
  ], function(err) {
    assert(err.message.match(/connection timeout/))
    done()
  })
})

it('normal', function(done) {
  const client = sqlx.createClient({connection_timeout: 500})
  client.define('*', MYSQL_CONFIG_1)
  const conn = client.getConnection(OPERATER_INFO_1)
  async.waterfall([
  (next) => {
    conn.insert('table1', { a: 101 }, next)
  },
  (_1, _2, next) => {
    next()
  },
  (next) => {
    conn.insert('table1', { a: 102 }, next)
  },
  ], function(err) {
    assert(!err)
    done()
  })
})

})
