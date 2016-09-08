module.exports.Context = function(methods) {
  this.getConnection = function() {
    return new Default(methods)
  }
}

const EventEmitter = require('events')
const $ = require('../$')

function Default(methods) {
  this._methods = methods
  this._initialized = !methods.initialize
  this._events = new EventEmitter()
  if (methods.initialize) {
    methods.initialize.call(this, () => {
      this._initialized = true
      this._events.emit('initialized')
    })
  }
}

$.ALL_METHODS.forEach(function(method) {
  Default.prototype[method] = function () {
    if (!this._methods[method]) {
      throw new Error('method "' + method + '"not defined')
    }
    if (!this._initialized) {
      return this._events.once('initialized', () => {
        this._methods[method].apply(this, arguments)
      })
    }
    this._methods[method].apply(this, arguments)
  }
})

