function Connection(defines, operator_info) {
  this._defines = defines
  this._operater_info = operator_info
}
module.exports = Connection

const $ = require('./$')

    debugger
$.ALL_METHODS.forEach(function(method) {
  Connection.prototype[method] = function (table, set, callback) {
    var table
    if (!this._defines[table]) {
      table = '*'
    }
    if (!this._defines[table]) {
      var e = new Error(table + '.' + method + ' is not defined')
      if (callback) return callback(e)
      throw e
    }
    var c = this._defines[table][method]
    c[method].apply(c, arguments)
  }
})

Connection.prototype.release = function() { }
