function Default(func) {
  this._func = func
}

module.exports = Default

const $ = require('../$')

$.ALL_METHODS.forEach(function(method) {
  Default.prototype[method] = function() {
    this._func.apply(this, arguments)
  }
})
