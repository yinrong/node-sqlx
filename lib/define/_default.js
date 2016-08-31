module.exports = function createDefault() {
  return new Default()
}

function Default(func) {
  this._func = func
}

const $ = require('../$')

$.ALL_METHODS.forEach(function(method) {
  Default.prototype[method] = function() {
    this._func.apply(this, arguments)
  }
})
