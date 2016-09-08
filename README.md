# sqlx
database driver with extended features.

## database list
* mysql
* define custom function to use any database or service

## feature list
* changelog/oplog
* auto release timeout connection

## interface


### overall
```javascript
const sqlx = require('sqlx')
const client = sqlx.createClient()

// client.define(table, config_or_interface)
client.define(['table1'], config1)
client.define(['table2'], config2)
client.define('logic_table3', InterfaceOne)
client.define('logic_table4', InterfaceTwo)
client.define('*', config3) // match all other tables

// for changelog
var operator_info = {
  user: '101,23',
}
const conn = client.getConnection(operator_info)

conn.insert('table7', {a:1, b:2}, function(err, rows, info) {
  if (err) throw err
  console.log(rows, info)

  conn.release()
})

```

### config_or_interface
```javascript
var config1 = {
    type: 'mysql',
    config: {
      host: '1.1.1.1',
      database: 'db1'
      user: 'root',
      password: '',
    },
  }

var config2 = {
    type: 'mysql',
    config: {
      host: '2.2.2.2',
      database: 'db2'
      user: 'root',
      password: '',
    },
  }

const InterfaceOne = {

  // all methods are optional

  initialize: function(callback) {
    // 1. 'initialize' is called whenever client.define is called
    // 2. 'this' is created whenever 'initialize' is called
    // 3. 'this' is shared between all methods of InterfaceOne

    this._client = require('some-db-drvier').createClient({
      config1: 'value1',
      config2: 'value2',
    })
    this._client.on('connected', callback)
  },

  queryReadonly: function(query_str, callback) { },
  insert: function(table, sets, callback) { },
  delete: function(table, where, callback) { },
  update: function(table, sets, where, callback) { },
  select: function(table, fields, where0, callback) { },
  release: function() {},

}

const InterfaceTwo = {

  select: function(table, set, callback) {

    const request = require('request')
    var p = {
      url: 'http://example.com/table/insert',
      method: 'post',
      json: true,
      body: set,
    }
    request(p, function(err, res, body) {
      // callback must be called with 3 parameters! callback(err, rows, info)
      callback(err, body.rows, null)
    })

  },

}
```


### method
```javascript
conn.queryReadonly(
  /* custom sql */ 'select ... join ...',
  function(err, rows, info) {
  })

conn.insert(
  /* table */ 'table1',
  /* set   */ {field1: 20},
  function(err, rows, info) {
  })

conn.update(
  /* table */ 'table2',
  /* set   */ {field1: 20},
  /* where */ {field1: 10},
  function(err, rows, info) {
  })

conn.select(
  /* table */ 'table3',
  /* field */ ['field1', 'field2'],
  /* where */ {field1: 10},
  function(err, rows, info) {
  })

conn.delete(
  /* table */ 'table4',
  /* where */ {field1: 10},
  function(err, rows, info) {
  })
```


### where
where is mongo-like JSON object, examples:

```javascript
// a == 1 || b == 2
{ $or: {a:1, b:2} }
```


