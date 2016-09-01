module.exports.Context = function(config) {
  const x = new Default(config)
  this.getConnection = function() {
    return x
  }
}

function Default(func) {
  this._func = func
}

Default.prototype.release = function() {}

const $ = require('../$')

$.ALL_METHODS.forEach(function(method) {
  Default.prototype[method] = function() {
    this._func.apply(this, arguments)
  }
})
