# sqlx
database driver with extended features.

## database list
* mysql
* extend to use any database

## feature list
* changelog/oplog
* auto release timeout connection

## interface

### init
```javascript
const mysql = require('mysql')
const pool = mysql.createPool({
    connectionLimit: 1,
    host: '127.0.0.1',
    user: 'root',
    password: '',
    debug: ['ComQueryPacket'],
  })

const sqlx = require('sqlx')
const client = sqlx.createClient({
  pool: pool,
})


// for changelog
var operator_info = {
  user: '101,23',
}

client.getConnection(operator_info, function(err, db) {
  assert(!err, err)
  // db.insert
  // db.update
  // ...
  db.release()
})
```

### database methods
```javascript
db.insert(
  /* table */ 'table1',
  /* set   */ {field1: 20},
  function(err, rows, info) {
  })

db.update(
  /* table */ 'table1',
  /* set   */ {field1: 20},
  /* where */ {field1: 10},
  function(err, rows, info) {
  })

db.select(
  /* table */ 'table1',
  /* field */ ['field1', 'field2'],
  /* where */ {field1: 10},
  function(err, rows, info) {
  })

db.delete(
  /* table */ 'table1',
  /* where */ {field1: 10},
  function(err, rows, info) {
  })
```

### replace method
```javascript
const request = require('request')
client.replace('insert', 'table1', function(table, set, callback) {
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
})
```
