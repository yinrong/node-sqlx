/**
 * Convert the API to support Promise
 */
module.exports = (source, methods) => {
  let thenify_api = {}
  methods.forEach((name) => {
    // promisify only if it's a function
    if (typeof source[name] === 'function') {
      thenify_api[name] = thenify(source[name])
    }
  })
  return thenify_api
}

/**
 * Turn async functions into promises and backward compatible with callback
 *
 * @param {Function} __fn__
 * @return {Function}
 */

function thenify(__fn__) {
  return function (...args) {
    let self = this
    // callback was assigned
    if (typeof args[args.length - 1] === 'function') {
      return __fn__.apply(self, args)
    }
    // no callback, return Promise
    return new Promise((resolve, reject) => {
      let args_with_callback = args
      args_with_callback.push(createCallback(resolve, reject))
      __fn__.apply(self, args_with_callback)
    })
  }
}

function createCallback(resolve, reject) {
  return function (err, ...values) {
    if (err) {
      return reject(err)
    }
    let result = {
      rows: values[0],
      info: values[1],
    }
    resolve(result)
  }
}
