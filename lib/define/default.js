module.exports.Context = function(methods) {
  this.getConnection = function() {
    return new Default(methods)
  }
}

const EventEmitter = require('events')
const $ = require('../$')

function Default(methods) {
  this._methods = methods
  this._initialized = false
  this._events = new EventEmitter()

  if (!methods.release) this.release = () => { }
  this.__destroy = () => { }
  if (!methods.initialize) this.initialize = (cb) => { cb() }
  else this.initialize = methods.initialize
  this.initialize(() => {
    this._initialized = true
    this._events.emit('initialized')
  })
}

$.ALL_METHODS.forEach(function(method) {

  Default.prototype[method] = function () {
    var func = this._methods[method]
    if (!func) {
      throw new Error('method "' + method + '" not defined')
    }
    if (!this._initialized) {
      return this._events.once('initialized', () => {
        func.apply(this, arguments)
      })
    }
    func.apply(this, arguments)
  }

})

