describe('connection', function() {

it('action restriction', function(done) {
  const client = sqlx.createClient()
  client.define('table1'  , {
    delete: function (table, where , callback)         { n_called++; callback() },
    update: function (table, sets  , where, callback)  { n_called++; callback() },
    select: function (table, fields, where0, callback) { n_called++; callback() },
  })


  var n_called = 0
  var operator_info = {
    user: '101,23',
    actions: ['delete'],
  }

  const conn = client.getConnection(operator_info)
  assert.equal(n_called, 0)
  conn.update('table1', {}, {}, function(err){
    assert(err)
    assert(err.toString().match(/action .* not allowed/))
  })
  conn.delete('table1', {}, function(err){
    assert(!err)
  })
  setTimeout(function() {
    assert.equal(n_called, 1)
    conn.release()
    done()
  }, 50)
})


})

const sqlx = require('..')
const assert = require('assert')
const async = require('async')

