describe('default', function() {

it('basic', function(done) {
  const client = sqlx.createClient()
  client.define('table1'  , {
    initialize: function (callback) {
      setTimeout(() => {
        this.x = 99
        callback()
      }, 200)
    },
    release: function(callback) {
    },
    queryReadonly: function (query_str,     callback)         { n_called++; callback() },
    delete       : function (table, where , callback)         { n_called++; callback() },
    update       : function (table, sets  , where, callback)  { n_called++; callback() },
    select       : function (table, fields, where0, callback) { n_called++; callback() },
    insert: function(table, sets  , callback) {
      n_called++
      callback(null, this.x)
    },
  })


  var n_called = 0
  var operator_info = {
    user: '101,23',
  }

  const conn = client.getConnection(operator_info)
  conn.insert('table1', {}, function(err, x){
    assert.equal(x, 99)
  })
  conn.update('table1', {}, {}, function(){
  })
  assert.equal(n_called, 0)
  setTimeout(function() {
    assert.equal(n_called, 2)
    conn.release()
    done()
  }, 300)
})


})

const sqlx = require('..')
const assert = require('assert')
const async = require('async')

