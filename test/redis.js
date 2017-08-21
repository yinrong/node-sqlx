const sqlx = require('..')
const async = require('async')
const assert = require('assert')

const REDIS_CONIFG = {
  host: '127.0.0.1',
  port: '6379',
}
const OPERATER_INFO = {
  user: '101,23',
  actions: '*',
}

describe('redis', function() {

it('CRUD', function (done) {
  const client = sqlx.createClient()
  client.define('budget', {type: 'redis', config: REDIS_CONIFG})

  const conn = client.getConnection(OPERATER_INFO)
  async.waterfall([
    function (next) {
      conn.insert('budget', {key1: 'value1'}, next)
    },
    function (ret, info, next) {
      assert.equal(ret, 'OK')
      conn.select('budget', '*', {key1: 1}, next)
    },
    function (ret, info, next) {
      assert.equal(ret, 'value1')
      conn.update('budget', {key1: 'value2'}, {key1: 1}, next)
    },
    function (ret, info, next) {
      assert.equal(ret, 'OK')
      conn.select('budget', '*', {key1: 1}, next)
    },
    function (ret, info, next) {
      assert.equal(ret, 'value2')
      conn.delete('budget', {key1: 1}, next)
    },
    function (ret, info, next) {
      assert.equal(ret, 1)
      conn.select('budget', '*', {key1: 1}, next)
    },
    function(ret, info, next) {
      assert.equal(ret, null)
      conn.release()
      done()
    }
  ], function (err) {
    throw err
  })
})
})
