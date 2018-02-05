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

it('count', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.count('table1', {
      limit: 1,
    }, {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
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

it('findOneAndUpdate', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.findOneAndUpdate('table1', {}, {title: 'test3'}, {title: 'test2'}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.title, 'test3')
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
    const content = {content: 'updated'}
    conn.update('table1', content, {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.affected_rows, 3)
    assert.equal(rows.changed_rows, 3)
    const content = {$set: {content: 'updated'}}
    conn.update('table1', content, {title: {$regex: /test/}}, next)
  },
  (rows, info, next) => {
    assert.equal(rows.affected_rows, 3)
    assert.equal(rows.changed_rows, 0)
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

it('error-authority', done => {
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
      assert(err.message.match(/sets should be object,array/))
      next()
    })
  },
  (next) => {
    conn.update('table1', 'error update', {}, err => {
      assert(err.message.match(/sets should be object,array/))
      next()
    })
  },
  (next) => {
    conn.release()
    done()
  }
  ], err => {throw err})
})

it('error-operations', done => {
  const client = sqlx.createClient()
  client.define('*', DBCONFIG_RW)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.insert('error', undefined, err => {
      assert(err.message.match(/Missing/))
      next()
    })
  },
  // insert with wrong 'sets'
  (next) => {
    conn.insert('error', [0], err => {
      assert(err)
      next()
    })
  },
  // update with wrong 'sets' and 'where'
  (next) => {
    conn.update('error', [0], [1], err => {
      assert(err)
      next()
    })
  },
  // delete with wrong 'where'
  (next) => {
    conn.delete('error', [0], err => {
      assert(err)
      next()
    })
  },
  // select with wrong 'options' and 'where'
  (next) => {
    conn.select('error', [0], [0], err => {
      assert(err)
      next()
    })
  },
  // find with wrong 'options' and 'where'
  (next) => {
    conn.find('error', [0], [0], err => {
      assert(err)
      next()
    })
  },
  // aggregate with wrong 'options' and 'pipeline'
  (next) => {
    conn.aggregate('error', [0], [0], err => {
      assert(err)
      next()
    })
  },
  (next) => {
    conn.count('error', [0], [0], err => {
      assert(err)
      next()
    })
  },
  (next) => {
    conn.findOneAndUpdate('error', [0], [0], [0], err => {
      assert(err)
      done()
    })
  }
  ], err => {throw err})
})

it('extend', done => {
  const client = sqlx.createClient()
  let config = _.cloneDeep(DBCONFIG_RW)
  let extend_method_called = 0
  config.extend = {
    insert: function(...args) {
      extend_method_called++
      this.constructor.prototype.insert.apply(this, args)
    },
    find: function(...args) {
      extend_method_called++
      this.constructor.prototype.find.apply(this, args)
    },
    asyncTest: async() => {
      extend_method_called++
      await promiseDelay(3000)
      return
    }
  }
  client.define('*', config)
  const conn = client.getConnection(OPCONFIG)
  async.waterfall([
  (next) => {
    conn.insert('table2', {a: 1}, next)
  },
  (rows, info, next) => {
    assert.equal(extend_method_called, 1)
    conn.find('table2', {}, {a: 1}, next)
  },
  (rows, info, next) => {
    assert.equal(rows[0].a, 1)
    assert.equal(extend_method_called, 2)
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
