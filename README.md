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

// client.define(table, config_or_function)
client.define(['table1'], config1  )
client.define(['table2'], config2  )
client.define('table3'  , function1)
client.define('table3'  , function2)
client.define('table4'  , function3)
client.define('*'       , config3  ) // match all other tables

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

### config_or_function
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

function function1(table, set, callback) {
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


