describe('mongodb', () => {

it('table routing', done => {
  const client = sqlx.createClient()
  client.define('table1', DBCONFIG_RW)
  client.define('table2', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.insert('table1', {a:1}, next)
  },
  (rows, info, next) => {
    assert(rows.affected_rows)
    conn.insert('table2', {b:1}, next)
  },
  (rows, info, next) => {
    assert(rows.affected_rows)
    conn.delete('table1', {}, next)
  },
  (rows, info, next) => {
    assert(rows.affected_rows)
    conn.delete('table2', {}, next)
  },
  (rows, info, next) => {
    assert(rows.affected_rows)
    conn.release()
    done()
  }
  ], err => {
    throw err
  })
})

it('insert', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.insert('table1', {title: 'test1', content: 'hi1'}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.affected_rows, 1)
    conn.insert(
      'table1', 
      [
        {title: 'test2', content: 'hi2'},
        {title: 'test3', content: 'hi3'},
      ],
      next)
  },
  (rows, info, next) => {
    assert.equal(rows.affected_rows, 2)
    conn.select('table1', ['title'], {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.length, 3)
    done()
  }
  ], err => {throw err})
})

it('find', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.find('table1', {
      sort: 'title',
      limit: 1,
      skip: 1
    }, {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
    assert.equal(rows[0].title, 'test2')
    done()
  }
  ], err => {throw err})
})

it('aggregate', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.aggregate('table1', {}, [
      {$match: {title: {$regex: /test/}}},
      {$sort: {title: -1}}
    ], next)
  },
  (rows, info, next) => {
    assert.equal(rows.length, 3)
    assert.equal(rows[0].title, 'test3')
    done()
  }
  ], err => {throw err})
})

it('update', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.update('table1', {content: 'updated'}, {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.affected_rows, 3)
    assert.equal(rows.changed_rows, 3)
    conn.select('table1', '*', {content: 'updated'}, next)
  },
  (rows, info, next) => {
    assert.equal(_.map(rows, 'title').length, 3)
    done()
  }
  ], err => {throw err})
})

it('delete', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.delete('table1', {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.affected_rows, 3)
    conn.select('table1', '*', {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.length, 0)
    done()
  }
  ], err => {throw err})
})

it('error', done => {
  const client = sqlx.createClient()
  try {
    client.define('table1', {type: 'mongodb', config: {uri: 'supposed be url'}})
  } catch (err) {
    assert(err.message.match(/url is required/))
  }
  client.define('table1', DBCONFIG_RW)
  client.define('table2', DBCONFIG_R)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.insert('table2', {title: 'test'}, err => {
      assert(err.message.match(/not allowed/))
      next()
    })
  },
  (next) => {
    conn.update('table2', {}, {}, err => {
      assert(err.message.match(/not allowed/))
      next()
    })
  },
  (next) => {
    conn.delete('table2', {}, err => {
      assert(err.message.match(/not allowed/))
      next()
    })
  },
  (next) => {
    conn.insert('table3', {}, err => {
      assert(err.message.match(/is not defined/))
      next()
    })
  },
  (next) => {
    conn.insert('table1', 'error insert', err => {
      assert(err.message.match(/invalid sets/))
      next()
    })
  },
  (next) => {
    conn.update('table1', 'error update', {}, err => {
      assert(err.message.match(/invalid sets/))
      next()
    })
  },
  (next) => {
    conn.release()
    done()
  }
  ], err => {throw err})
})

})

const DBCONFIG_RW = {
  type: 'mongodb',
  config: {
    url: 'mongodb://localhost:27017/test?maxPoolSize=30',
  }
}

const DBCONFIG_R = {
  type: 'mongodb',
  config: {
    url: 'mongodb://localhost:27017/test?maxPoolSize=30',
    readonly: true,
  }
}

const OPCONFIG = {
  user: 'test user',
  actions: '*',
}

const async = require('async')
const assert = require('assert')
const sqlx = require('..')
const _ = require('lodash')
