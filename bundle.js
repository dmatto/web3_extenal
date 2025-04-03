(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
window.solanaWeb3 = require('./transpiled-index.js');

},{"./transpiled-index.js":53}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHash = getHash;
exports.createCurve = createCurve;
/**
 * Utilities for short weierstrass curves, combined with noble-hashes.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const hmac_1 = require("@noble/hashes/hmac");
const utils_1 = require("@noble/hashes/utils");
const weierstrass_js_1 = require("./abstract/weierstrass.js");
/** connects noble-curves to noble-hashes */
function getHash(hash) {
    return {
        hash,
        hmac: (key, ...msgs) => (0, hmac_1.hmac)(hash, key, (0, utils_1.concatBytes)(...msgs)),
        randomBytes: utils_1.randomBytes,
    };
}
function createCurve(curveDef, defHash) {
    const create = (hash) => (0, weierstrass_js_1.weierstrass)({ ...curveDef, ...getHash(hash) });
    return { ...create(defHash), create };
}

},{"./abstract/weierstrass.js":12,"@noble/hashes/hmac":19,"@noble/hashes/utils":23}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wNAF = wNAF;
exports.pippenger = pippenger;
exports.precomputeMSMUnsafe = precomputeMSMUnsafe;
exports.validateBasic = validateBasic;
/**
 * Methods for elliptic curve multiplication by scalars.
 * Contains wNAF, pippenger
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const modular_js_1 = require("./modular.js");
const utils_js_1 = require("./utils.js");
const _0n = BigInt(0);
const _1n = BigInt(1);
function constTimeNegate(condition, item) {
    const neg = item.negate();
    return condition ? neg : item;
}
function validateW(W, bits) {
    if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
        throw new Error('invalid window size, expected [1..' + bits + '], got W=' + W);
}
function calcWOpts(W, bits) {
    validateW(W, bits);
    const windows = Math.ceil(bits / W) + 1; // +1, because
    const windowSize = 2 ** (W - 1); // -1 because we skip zero
    return { windows, windowSize };
}
function validateMSMPoints(points, c) {
    if (!Array.isArray(points))
        throw new Error('array expected');
    points.forEach((p, i) => {
        if (!(p instanceof c))
            throw new Error('invalid point at index ' + i);
    });
}
function validateMSMScalars(scalars, field) {
    if (!Array.isArray(scalars))
        throw new Error('array of scalars expected');
    scalars.forEach((s, i) => {
        if (!field.isValid(s))
            throw new Error('invalid scalar at index ' + i);
    });
}
// Since points in different groups cannot be equal (different object constructor),
// we can have single place to store precomputes
const pointPrecomputes = new WeakMap();
const pointWindowSizes = new WeakMap(); // This allows use make points immutable (nothing changes inside)
function getW(P) {
    return pointWindowSizes.get(P) || 1;
}
/**
 * Elliptic curve multiplication of Point by scalar. Fragile.
 * Scalars should always be less than curve order: this should be checked inside of a curve itself.
 * Creates precomputation tables for fast multiplication:
 * - private scalar is split by fixed size windows of W bits
 * - every window point is collected from window's table & added to accumulator
 * - since windows are different, same point inside tables won't be accessed more than once per calc
 * - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
 * - +1 window is neccessary for wNAF
 * - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
 *
 * @todo Research returning 2d JS array of windows, instead of a single window.
 * This would allow windows to be in different memory locations
 */
function wNAF(c, bits) {
    return {
        constTimeNegate,
        hasPrecomputes(elm) {
            return getW(elm) !== 1;
        },
        // non-const time multiplication ladder
        unsafeLadder(elm, n, p = c.ZERO) {
            let d = elm;
            while (n > _0n) {
                if (n & _1n)
                    p = p.add(d);
                d = d.double();
                n >>= _1n;
            }
            return p;
        },
        /**
         * Creates a wNAF precomputation window. Used for caching.
         * Default window size is set by `utils.precompute()` and is equal to 8.
         * Number of precomputed points depends on the curve size:
         * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
         * - 𝑊 is the window size
         * - 𝑛 is the bitlength of the curve order.
         * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
         * @param elm Point instance
         * @param W window size
         * @returns precomputed point tables flattened to a single array
         */
        precomputeWindow(elm, W) {
            const { windows, windowSize } = calcWOpts(W, bits);
            const points = [];
            let p = elm;
            let base = p;
            for (let window = 0; window < windows; window++) {
                base = p;
                points.push(base);
                // =1, because we skip zero
                for (let i = 1; i < windowSize; i++) {
                    base = base.add(p);
                    points.push(base);
                }
                p = base.double();
            }
            return points;
        },
        /**
         * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
         * @param W window size
         * @param precomputes precomputed tables
         * @param n scalar (we don't check here, but should be less than curve order)
         * @returns real and fake (for const-time) points
         */
        wNAF(W, precomputes, n) {
            // TODO: maybe check that scalar is less than group order? wNAF behavious is undefined otherwise
            // But need to carefully remove other checks before wNAF. ORDER == bits here
            const { windows, windowSize } = calcWOpts(W, bits);
            let p = c.ZERO;
            let f = c.BASE;
            const mask = BigInt(2 ** W - 1); // Create mask with W ones: 0b1111 for W=4 etc.
            const maxNumber = 2 ** W;
            const shiftBy = BigInt(W);
            for (let window = 0; window < windows; window++) {
                const offset = window * windowSize;
                // Extract W bits.
                let wbits = Number(n & mask);
                // Shift number by W bits.
                n >>= shiftBy;
                // If the bits are bigger than max size, we'll split those.
                // +224 => 256 - 32
                if (wbits > windowSize) {
                    wbits -= maxNumber;
                    n += _1n;
                }
                // This code was first written with assumption that 'f' and 'p' will never be infinity point:
                // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
                // there is negate now: it is possible that negated element from low value
                // would be the same as high element, which will create carry into next window.
                // It's not obvious how this can fail, but still worth investigating later.
                // Check if we're onto Zero point.
                // Add random point inside current window to f.
                const offset1 = offset;
                const offset2 = offset + Math.abs(wbits) - 1; // -1 because we skip zero
                const cond1 = window % 2 !== 0;
                const cond2 = wbits < 0;
                if (wbits === 0) {
                    // The most important part for const-time getPublicKey
                    f = f.add(constTimeNegate(cond1, precomputes[offset1]));
                }
                else {
                    p = p.add(constTimeNegate(cond2, precomputes[offset2]));
                }
            }
            // JIT-compiler should not eliminate f here, since it will later be used in normalizeZ()
            // Even if the variable is still unused, there are some checks which will
            // throw an exception, so compiler needs to prove they won't happen, which is hard.
            // At this point there is a way to F be infinity-point even if p is not,
            // which makes it less const-time: around 1 bigint multiply.
            return { p, f };
        },
        /**
         * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
         * @param W window size
         * @param precomputes precomputed tables
         * @param n scalar (we don't check here, but should be less than curve order)
         * @param acc accumulator point to add result of multiplication
         * @returns point
         */
        wNAFUnsafe(W, precomputes, n, acc = c.ZERO) {
            const { windows, windowSize } = calcWOpts(W, bits);
            const mask = BigInt(2 ** W - 1); // Create mask with W ones: 0b1111 for W=4 etc.
            const maxNumber = 2 ** W;
            const shiftBy = BigInt(W);
            for (let window = 0; window < windows; window++) {
                const offset = window * windowSize;
                if (n === _0n)
                    break; // No need to go over empty scalar
                // Extract W bits.
                let wbits = Number(n & mask);
                // Shift number by W bits.
                n >>= shiftBy;
                // If the bits are bigger than max size, we'll split those.
                // +224 => 256 - 32
                if (wbits > windowSize) {
                    wbits -= maxNumber;
                    n += _1n;
                }
                if (wbits === 0)
                    continue;
                let curr = precomputes[offset + Math.abs(wbits) - 1]; // -1 because we skip zero
                if (wbits < 0)
                    curr = curr.negate();
                // NOTE: by re-using acc, we can save a lot of additions in case of MSM
                acc = acc.add(curr);
            }
            return acc;
        },
        getPrecomputes(W, P, transform) {
            // Calculate precomputes on a first run, reuse them after
            let comp = pointPrecomputes.get(P);
            if (!comp) {
                comp = this.precomputeWindow(P, W);
                if (W !== 1)
                    pointPrecomputes.set(P, transform(comp));
            }
            return comp;
        },
        wNAFCached(P, n, transform) {
            const W = getW(P);
            return this.wNAF(W, this.getPrecomputes(W, P, transform), n);
        },
        wNAFCachedUnsafe(P, n, transform, prev) {
            const W = getW(P);
            if (W === 1)
                return this.unsafeLadder(P, n, prev); // For W=1 ladder is ~x2 faster
            return this.wNAFUnsafe(W, this.getPrecomputes(W, P, transform), n, prev);
        },
        // We calculate precomputes for elliptic curve point multiplication
        // using windowed method. This specifies window size and
        // stores precomputed values. Usually only base point would be precomputed.
        setWindowSize(P, W) {
            validateW(W, bits);
            pointWindowSizes.set(P, W);
            pointPrecomputes.delete(P);
        },
    };
}
/**
 * Pippenger algorithm for multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
 * 30x faster vs naive addition on L=4096, 10x faster with precomputes.
 * For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
 * Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
 * @param c Curve Point constructor
 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
 * @param points array of L curve points
 * @param scalars array of L scalars (aka private keys / bigints)
 */
function pippenger(c, fieldN, points, scalars) {
    // If we split scalars by some window (let's say 8 bits), every chunk will only
    // take 256 buckets even if there are 4096 scalars, also re-uses double.
    // TODO:
    // - https://eprint.iacr.org/2024/750.pdf
    // - https://tches.iacr.org/index.php/TCHES/article/view/10287
    // 0 is accepted in scalars
    validateMSMPoints(points, c);
    validateMSMScalars(scalars, fieldN);
    if (points.length !== scalars.length)
        throw new Error('arrays of points and scalars must have equal length');
    const zero = c.ZERO;
    const wbits = (0, utils_js_1.bitLen)(BigInt(points.length));
    const windowSize = wbits > 12 ? wbits - 3 : wbits > 4 ? wbits - 2 : wbits ? 2 : 1; // in bits
    const MASK = (1 << windowSize) - 1;
    const buckets = new Array(MASK + 1).fill(zero); // +1 for zero array
    const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
    let sum = zero;
    for (let i = lastBits; i >= 0; i -= windowSize) {
        buckets.fill(zero);
        for (let j = 0; j < scalars.length; j++) {
            const scalar = scalars[j];
            const wbits = Number((scalar >> BigInt(i)) & BigInt(MASK));
            buckets[wbits] = buckets[wbits].add(points[j]);
        }
        let resI = zero; // not using this will do small speed-up, but will lose ct
        // Skip first bucket, because it is zero
        for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
            sumI = sumI.add(buckets[j]);
            resI = resI.add(sumI);
        }
        sum = sum.add(resI);
        if (i !== 0)
            for (let j = 0; j < windowSize; j++)
                sum = sum.double();
    }
    return sum;
}
/**
 * Precomputed multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
 * @param c Curve Point constructor
 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
 * @param points array of L curve points
 * @returns function which multiplies points with scaars
 */
function precomputeMSMUnsafe(c, fieldN, points, windowSize) {
    /**
     * Performance Analysis of Window-based Precomputation
     *
     * Base Case (256-bit scalar, 8-bit window):
     * - Standard precomputation requires:
     *   - 31 additions per scalar × 256 scalars = 7,936 ops
     *   - Plus 255 summary additions = 8,191 total ops
     *   Note: Summary additions can be optimized via accumulator
     *
     * Chunked Precomputation Analysis:
     * - Using 32 chunks requires:
     *   - 255 additions per chunk
     *   - 256 doublings
     *   - Total: (255 × 32) + 256 = 8,416 ops
     *
     * Memory Usage Comparison:
     * Window Size | Standard Points | Chunked Points
     * ------------|-----------------|---------------
     *     4-bit   |     520         |      15
     *     8-bit   |    4,224        |     255
     *    10-bit   |   13,824        |   1,023
     *    16-bit   |  557,056        |  65,535
     *
     * Key Advantages:
     * 1. Enables larger window sizes due to reduced memory overhead
     * 2. More efficient for smaller scalar counts:
     *    - 16 chunks: (16 × 255) + 256 = 4,336 ops
     *    - ~2x faster than standard 8,191 ops
     *
     * Limitations:
     * - Not suitable for plain precomputes (requires 256 constant doublings)
     * - Performance degrades with larger scalar counts:
     *   - Optimal for ~256 scalars
     *   - Less efficient for 4096+ scalars (Pippenger preferred)
     */
    validateW(windowSize, fieldN.BITS);
    validateMSMPoints(points, c);
    const zero = c.ZERO;
    const tableSize = 2 ** windowSize - 1; // table size (without zero)
    const chunks = Math.ceil(fieldN.BITS / windowSize); // chunks of item
    const MASK = BigInt((1 << windowSize) - 1);
    const tables = points.map((p) => {
        const res = [];
        for (let i = 0, acc = p; i < tableSize; i++) {
            res.push(acc);
            acc = acc.add(p);
        }
        return res;
    });
    return (scalars) => {
        validateMSMScalars(scalars, fieldN);
        if (scalars.length > points.length)
            throw new Error('array of scalars must be smaller than array of points');
        let res = zero;
        for (let i = 0; i < chunks; i++) {
            // No need to double if accumulator is still zero.
            if (res !== zero)
                for (let j = 0; j < windowSize; j++)
                    res = res.double();
            const shiftBy = BigInt(chunks * windowSize - (i + 1) * windowSize);
            for (let j = 0; j < scalars.length; j++) {
                const n = scalars[j];
                const curr = Number((n >> shiftBy) & MASK);
                if (!curr)
                    continue; // skip zero scalars chunks
                res = res.add(tables[j][curr - 1]);
            }
        }
        return res;
    };
}
function validateBasic(curve) {
    (0, modular_js_1.validateField)(curve.Fp);
    (0, utils_js_1.validateObject)(curve, {
        n: 'bigint',
        h: 'bigint',
        Gx: 'field',
        Gy: 'field',
    }, {
        nBitLength: 'isSafeInteger',
        nByteLength: 'isSafeInteger',
    });
    // Set defaults
    return Object.freeze({
        ...(0, modular_js_1.nLength)(curve.n, curve.nBitLength),
        ...curve,
        ...{ p: curve.Fp.ORDER },
    });
}

},{"./modular.js":9,"./utils.js":11}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.twistedEdwards = twistedEdwards;
/**
 * Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
 * For design rationale of types / exports, see weierstrass module documentation.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const curve_js_1 = require("./curve.js");
const modular_js_1 = require("./modular.js");
const ut = require("./utils.js");
const utils_js_1 = require("./utils.js");
// Be friendly to bad ECMAScript parsers by not using bigint literals
// prettier-ignore
const _0n = BigInt(0),
  _1n = BigInt(1),
  _2n = BigInt(2),
  _8n = BigInt(8);
// verification rule is either zip215 or rfc8032 / nist186-5. Consult fromHex:
const VERIFY_DEFAULT = {
  zip215: true
};
function validateOpts(curve) {
  const opts = (0, curve_js_1.validateBasic)(curve);
  ut.validateObject(curve, {
    hash: 'function',
    a: 'bigint',
    d: 'bigint',
    randomBytes: 'function'
  }, {
    adjustScalarBytes: 'function',
    domain: 'function',
    uvRatio: 'function',
    mapToCurve: 'function'
  });
  // Set defaults
  return Object.freeze({
    ...opts
  });
}
/**
 * Creates Twisted Edwards curve with EdDSA signatures.
 * @example
 * import { Field } from '@noble/curves/abstract/modular';
 * // Before that, define BigInt-s: a, d, p, n, Gx, Gy, h
 * const curve = twistedEdwards({ a, d, Fp: Field(p), n, Gx, Gy, h })
 */
function twistedEdwards(curveDef) {
  const CURVE = validateOpts(curveDef);
  const {
    Fp,
    n: CURVE_ORDER,
    prehash: prehash,
    hash: cHash,
    randomBytes,
    nByteLength,
    h: cofactor
  } = CURVE;
  // Important:
  // There are some places where Fp.BYTES is used instead of nByteLength.
  // So far, everything has been tested with curves of Fp.BYTES == nByteLength.
  // TODO: test and find curves which behave otherwise.
  const MASK = _2n << BigInt(nByteLength * 8) - _1n;
  const modP = Fp.create; // Function overrides
  const Fn = (0, modular_js_1.Field)(CURVE.n, CURVE.nBitLength);
  // sqrt(u/v)
  const uvRatio = CURVE.uvRatio || ((u, v) => {
    try {
      return {
        isValid: true,
        value: Fp.sqrt(u * Fp.inv(v))
      };
    } catch (e) {
      return {
        isValid: false,
        value: _0n
      };
    }
  });
  const adjustScalarBytes = CURVE.adjustScalarBytes || (bytes => bytes); // NOOP
  const domain = CURVE.domain || ((data, ctx, phflag) => {
    (0, utils_js_1.abool)('phflag', phflag);
    if (ctx.length || phflag) throw new Error('Contexts/pre-hash are not supported');
    return data;
  }); // NOOP
  // 0 <= n < MASK
  // Coordinates larger than Fp.ORDER are allowed for zip215
  function aCoordinate(title, n) {
    ut.aInRange('coordinate ' + title, n, _0n, MASK);
  }
  function assertPoint(other) {
    if (!(other instanceof Point)) throw new Error('ExtendedPoint expected');
  }
  // Converts Extended point to default (x, y) coordinates.
  // Can accept precomputed Z^-1 - for example, from invertBatch.
  const toAffineMemo = (0, utils_js_1.memoized)((p, iz) => {
    const {
      ex: x,
      ey: y,
      ez: z
    } = p;
    const is0 = p.is0();
    if (iz == null) iz = is0 ? _8n : Fp.inv(z); // 8 was chosen arbitrarily
    const ax = modP(x * iz);
    const ay = modP(y * iz);
    const zz = modP(z * iz);
    if (is0) return {
      x: _0n,
      y: _1n
    };
    if (zz !== _1n) throw new Error('invZ was invalid');
    return {
      x: ax,
      y: ay
    };
  });
  const assertValidMemo = (0, utils_js_1.memoized)(p => {
    const {
      a,
      d
    } = CURVE;
    if (p.is0()) throw new Error('bad point: ZERO'); // TODO: optimize, with vars below?
    // Equation in affine coordinates: ax² + y² = 1 + dx²y²
    // Equation in projective coordinates (X/Z, Y/Z, Z):  (aX² + Y²)Z² = Z⁴ + dX²Y²
    const {
      ex: X,
      ey: Y,
      ez: Z,
      et: T
    } = p;
    const X2 = modP(X * X); // X²
    const Y2 = modP(Y * Y); // Y²
    const Z2 = modP(Z * Z); // Z²
    const Z4 = modP(Z2 * Z2); // Z⁴
    const aX2 = modP(X2 * a); // aX²
    const left = modP(Z2 * modP(aX2 + Y2)); // (aX² + Y²)Z²
    const right = modP(Z4 + modP(d * modP(X2 * Y2))); // Z⁴ + dX²Y²
    if (left !== right) throw new Error('bad point: equation left != right (1)');
    // In Extended coordinates we also have T, which is x*y=T/Z: check X*Y == Z*T
    const XY = modP(X * Y);
    const ZT = modP(Z * T);
    if (XY !== ZT) throw new Error('bad point: equation left != right (2)');
    return true;
  });
  // Extended Point works in extended coordinates: (x, y, z, t) ∋ (x=x/z, y=y/z, t=xy).
  // https://en.wikipedia.org/wiki/Twisted_Edwards_curve#Extended_coordinates
  class Point {
    constructor(ex, ey, ez, et) {
      this.ex = ex;
      this.ey = ey;
      this.ez = ez;
      this.et = et;
      aCoordinate('x', ex);
      aCoordinate('y', ey);
      aCoordinate('z', ez);
      aCoordinate('t', et);
      Object.freeze(this);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    static fromAffine(p) {
      if (p instanceof Point) throw new Error('extended point not allowed');
      const {
        x,
        y
      } = p || {};
      aCoordinate('x', x);
      aCoordinate('y', y);
      return new Point(x, y, _1n, modP(x * y));
    }
    static normalizeZ(points) {
      const toInv = Fp.invertBatch(points.map(p => p.ez));
      return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
    }
    // Multiscalar Multiplication
    static msm(points, scalars) {
      return (0, curve_js_1.pippenger)(Point, Fn, points, scalars);
    }
    // "Private method", don't use it directly
    _setWindowSize(windowSize) {
      wnaf.setWindowSize(this, windowSize);
    }
    // Not required for fromHex(), which always creates valid points.
    // Could be useful for fromAffine().
    assertValidity() {
      assertValidMemo(this);
    }
    // Compare one point to another.
    equals(other) {
      assertPoint(other);
      const {
        ex: X1,
        ey: Y1,
        ez: Z1
      } = this;
      const {
        ex: X2,
        ey: Y2,
        ez: Z2
      } = other;
      const X1Z2 = modP(X1 * Z2);
      const X2Z1 = modP(X2 * Z1);
      const Y1Z2 = modP(Y1 * Z2);
      const Y2Z1 = modP(Y2 * Z1);
      return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    negate() {
      // Flips point sign to a negative one (-x, y in affine coords)
      return new Point(modP(-this.ex), this.ey, this.ez, modP(-this.et));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const {
        a
      } = CURVE;
      const {
        ex: X1,
        ey: Y1,
        ez: Z1
      } = this;
      const A = modP(X1 * X1); // A = X12
      const B = modP(Y1 * Y1); // B = Y12
      const C = modP(_2n * modP(Z1 * Z1)); // C = 2*Z12
      const D = modP(a * A); // D = a*A
      const x1y1 = X1 + Y1;
      const E = modP(modP(x1y1 * x1y1) - A - B); // E = (X1+Y1)2-A-B
      const G = D + B; // G = D+B
      const F = G - C; // F = G-C
      const H = D - B; // H = D-B
      const X3 = modP(E * F); // X3 = E*F
      const Y3 = modP(G * H); // Y3 = G*H
      const T3 = modP(E * H); // T3 = E*H
      const Z3 = modP(F * G); // Z3 = F*G
      return new Point(X3, Y3, Z3, T3);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(other) {
      assertPoint(other);
      const {
        a,
        d
      } = CURVE;
      const {
        ex: X1,
        ey: Y1,
        ez: Z1,
        et: T1
      } = this;
      const {
        ex: X2,
        ey: Y2,
        ez: Z2,
        et: T2
      } = other;
      // Faster algo for adding 2 Extended Points when curve's a=-1.
      // http://hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html#addition-add-2008-hwcd-4
      // Cost: 8M + 8add + 2*2.
      // Note: It does not check whether the `other` point is valid.
      if (a === BigInt(-1)) {
        const A = modP((Y1 - X1) * (Y2 + X2));
        const B = modP((Y1 + X1) * (Y2 - X2));
        const F = modP(B - A);
        if (F === _0n) return this.double(); // Same point. Tests say it doesn't affect timing
        const C = modP(Z1 * _2n * T2);
        const D = modP(T1 * _2n * Z2);
        const E = D + C;
        const G = B + A;
        const H = D - C;
        const X3 = modP(E * F);
        const Y3 = modP(G * H);
        const T3 = modP(E * H);
        const Z3 = modP(F * G);
        return new Point(X3, Y3, Z3, T3);
      }
      const A = modP(X1 * X2); // A = X1*X2
      const B = modP(Y1 * Y2); // B = Y1*Y2
      const C = modP(T1 * d * T2); // C = T1*d*T2
      const D = modP(Z1 * Z2); // D = Z1*Z2
      const E = modP((X1 + Y1) * (X2 + Y2) - A - B); // E = (X1+Y1)*(X2+Y2)-A-B
      const F = D - C; // F = D-C
      const G = D + C; // G = D+C
      const H = modP(B - a * A); // H = B-a*A
      const X3 = modP(E * F); // X3 = E*F
      const Y3 = modP(G * H); // Y3 = G*H
      const T3 = modP(E * H); // T3 = E*H
      const Z3 = modP(F * G); // Z3 = F*G
      return new Point(X3, Y3, Z3, T3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    wNAF(n) {
      return wnaf.wNAFCached(this, n, Point.normalizeZ);
    }
    // Constant-time multiplication.
    multiply(scalar) {
      const n = scalar;
      ut.aInRange('scalar', n, _1n, CURVE_ORDER); // 1 <= scalar < L
      const {
        p,
        f
      } = this.wNAF(n);
      return Point.normalizeZ([p, f])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Does NOT allow scalars higher than CURVE.n.
    // Accepts optional accumulator to merge with multiply (important for sparse scalars)
    multiplyUnsafe(scalar, acc = Point.ZERO) {
      const n = scalar;
      ut.aInRange('scalar', n, _0n, CURVE_ORDER); // 0 <= scalar < L
      if (n === _0n) return I;
      if (this.is0() || n === _1n) return this;
      return wnaf.wNAFCachedUnsafe(this, n, Point.normalizeZ, acc);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Multiplies point by cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.multiplyUnsafe(cofactor).is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return wnaf.unsafeLadder(this, CURVE_ORDER).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(iz) {
      return toAffineMemo(this, iz);
    }
    clearCofactor() {
      const {
        h: cofactor
      } = CURVE;
      if (cofactor === _1n) return this;
      return this.multiplyUnsafe(cofactor);
    }
    // Converts hash string or Uint8Array to Point.
    // Uses algo from RFC8032 5.1.3.
    static fromHex(hex, zip215 = false) {
      const {
        d,
        a
      } = CURVE;
      const len = Fp.BYTES;
      hex = (0, utils_js_1.ensureBytes)('pointHex', hex, len); // copy hex to a new array
      (0, utils_js_1.abool)('zip215', zip215);
      const normed = hex.slice(); // copy again, we'll manipulate it
      const lastByte = hex[len - 1]; // select last byte
      normed[len - 1] = lastByte & ~0x80; // clear last bit
      const y = ut.bytesToNumberLE(normed);
      // zip215=true is good for consensus-critical apps. =false follows RFC8032 / NIST186-5.
      // RFC8032 prohibits >= p, but ZIP215 doesn't
      // zip215=true:  0 <= y < MASK (2^256 for ed25519)
      // zip215=false: 0 <= y < P (2^255-19 for ed25519)
      const max = zip215 ? MASK : Fp.ORDER;
      ut.aInRange('pointHex.y', y, _0n, max);
      // Ed25519: x² = (y²-1)/(dy²+1) mod p. Ed448: x² = (y²-1)/(dy²-1) mod p. Generic case:
      // ax²+y²=1+dx²y² => y²-1=dx²y²-ax² => y²-1=x²(dy²-a) => x²=(y²-1)/(dy²-a)
      const y2 = modP(y * y); // denominator is always non-0 mod p.
      const u = modP(y2 - _1n); // u = y² - 1
      const v = modP(d * y2 - a); // v = d y² + 1.
      let {
        isValid,
        value: x
      } = uvRatio(u, v); // √(u/v)
      if (!isValid) throw new Error('Point.fromHex: invalid y coordinate');
      const isXOdd = (x & _1n) === _1n; // There are 2 square roots. Use x_0 bit to select proper
      const isLastByteOdd = (lastByte & 0x80) !== 0; // x_0, last bit
      if (!zip215 && x === _0n && isLastByteOdd)
        // if x=0 and x_0 = 1, fail
        throw new Error('Point.fromHex: x=0 and x_0=1');
      if (isLastByteOdd !== isXOdd) x = modP(-x); // if x_0 != x mod 2, set x = p-x
      return Point.fromAffine({
        x,
        y
      });
    }
    static fromPrivateKey(privKey) {
      return getExtendedPublicKey(privKey).point;
    }
    toRawBytes() {
      const {
        x,
        y
      } = this.toAffine();
      const bytes = ut.numberToBytesLE(y, Fp.BYTES); // each y has 2 x values (x, -y)
      bytes[bytes.length - 1] |= x & _1n ? 0x80 : 0; // when compressing, it's enough to store y
      return bytes; // and use the last byte to encode sign of x
    }
    toHex() {
      return ut.bytesToHex(this.toRawBytes()); // Same as toRawBytes, but returns string.
    }
  }
  Point.BASE = new Point(CURVE.Gx, CURVE.Gy, _1n, modP(CURVE.Gx * CURVE.Gy));
  Point.ZERO = new Point(_0n, _1n, _1n, _0n); // 0, 1, 1, 0
  const {
    BASE: G,
    ZERO: I
  } = Point;
  const wnaf = (0, curve_js_1.wNAF)(Point, nByteLength * 8);
  function modN(a) {
    return (0, modular_js_1.mod)(a, CURVE_ORDER);
  }
  // Little-endian SHA512 with modulo n
  function modN_LE(hash) {
    return modN(ut.bytesToNumberLE(hash));
  }
  /** Convenience method that creates public key and other stuff. RFC8032 5.1.5 */
  function getExtendedPublicKey(key) {
    const len = Fp.BYTES;
    key = (0, utils_js_1.ensureBytes)('private key', key, len);
    // Hash private key with curve's hash function to produce uniformingly random input
    // Check byte lengths: ensure(64, h(ensure(32, key)))
    const hashed = (0, utils_js_1.ensureBytes)('hashed private key', cHash(key), 2 * len);
    const head = adjustScalarBytes(hashed.slice(0, len)); // clear first half bits, produce FE
    const prefix = hashed.slice(len, 2 * len); // second half is called key prefix (5.1.6)
    const scalar = modN_LE(head); // The actual private scalar
    const point = G.multiply(scalar); // Point on Edwards curve aka public key
    const pointBytes = point.toRawBytes(); // Uint8Array representation
    return {
      head,
      prefix,
      scalar,
      point,
      pointBytes
    };
  }
  // Calculates EdDSA pub key. RFC8032 5.1.5. Privkey is hashed. Use first half with 3 bits cleared
  function getPublicKey(privKey) {
    return getExtendedPublicKey(privKey).pointBytes;
  }
  // int('LE', SHA512(dom2(F, C) || msgs)) mod N
  function hashDomainToScalar(context = new Uint8Array(), ...msgs) {
    const msg = ut.concatBytes(...msgs);
    return modN_LE(cHash(domain(msg, (0, utils_js_1.ensureBytes)('context', context), !!prehash)));
  }
  /** Signs message with privateKey. RFC8032 5.1.6 */
  function sign(msg, privKey, options = {}) {
    msg = (0, utils_js_1.ensureBytes)('message', msg);
    if (prehash) msg = prehash(msg); // for ed25519ph etc.
    const {
      prefix,
      scalar,
      pointBytes
    } = getExtendedPublicKey(privKey);
    const r = hashDomainToScalar(options.context, prefix, msg); // r = dom2(F, C) || prefix || PH(M)
    const R = G.multiply(r).toRawBytes(); // R = rG
    const k = hashDomainToScalar(options.context, R, pointBytes, msg); // R || A || PH(M)
    const s = modN(r + k * scalar); // S = (r + k * s) mod L
    ut.aInRange('signature.s', s, _0n, CURVE_ORDER); // 0 <= s < l
    const res = ut.concatBytes(R, ut.numberToBytesLE(s, Fp.BYTES));
    return (0, utils_js_1.ensureBytes)('result', res, Fp.BYTES * 2); // 64-byte signature
  }
  const verifyOpts = VERIFY_DEFAULT;
  /**
   * Verifies EdDSA signature against message and public key. RFC8032 5.1.7.
   * An extended group equation is checked.
   */
  function verify(sig, msg, publicKey, options = verifyOpts) {
    const {
      context,
      zip215
    } = options;
    const len = Fp.BYTES; // Verifies EdDSA signature against message and public key. RFC8032 5.1.7.
    sig = (0, utils_js_1.ensureBytes)('signature', sig, 2 * len); // An extended group equation is checked.
    msg = (0, utils_js_1.ensureBytes)('message', msg);
    publicKey = (0, utils_js_1.ensureBytes)('publicKey', publicKey, len);
    if (zip215 !== undefined) (0, utils_js_1.abool)('zip215', zip215);
    if (prehash) msg = prehash(msg); // for ed25519ph, etc
    const s = ut.bytesToNumberLE(sig.slice(len, 2 * len));
    let A, R, SB;
    try {
      // zip215=true is good for consensus-critical apps. =false follows RFC8032 / NIST186-5.
      // zip215=true:  0 <= y < MASK (2^256 for ed25519)
      // zip215=false: 0 <= y < P (2^255-19 for ed25519)
      A = Point.fromHex(publicKey, zip215);
      R = Point.fromHex(sig.slice(0, len), zip215);
      SB = G.multiplyUnsafe(s); // 0 <= s < l is done inside
    } catch (error) {
      return false;
    }
    if (!zip215 && A.isSmallOrder()) return false;
    const k = hashDomainToScalar(context, R.toRawBytes(), A.toRawBytes(), msg);
    const RkA = R.add(A.multiplyUnsafe(k));
    // Extended group equation
    // [8][S]B = [8]R + [8][k]A'
    return RkA.subtract(SB).clearCofactor().equals(Point.ZERO);
  }
  G._setWindowSize(8); // Enable precomputes. Slows down first publicKey computation by 20ms.
  const utils = {
    getExtendedPublicKey,
    // ed25519 private keys are uniform 32b. No need to check for modulo bias, like in secp256k1.
    randomPrivateKey: () => randomBytes(Fp.BYTES),
    /**
     * We're doing scalar multiplication (used in getPublicKey etc) with precomputed BASE_POINT
     * values. This slows down first getPublicKey() by milliseconds (see Speed section),
     * but allows to speed-up subsequent getPublicKey() calls up to 20x.
     * @param windowSize 2, 4, 8, 16
     */
    precompute(windowSize = 8, point = Point.BASE) {
      point._setWindowSize(windowSize);
      point.multiply(BigInt(3));
      return point;
    }
  };
  return {
    CURVE,
    getPublicKey,
    sign,
    verify,
    ExtendedPoint: Point,
    utils
  };
}

},{"./curve.js":6,"./modular.js":9,"./utils.js":11}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expand_message_xmd = expand_message_xmd;
exports.expand_message_xof = expand_message_xof;
exports.hash_to_field = hash_to_field;
exports.isogenyMap = isogenyMap;
exports.createHasher = createHasher;
const modular_js_1 = require("./modular.js");
const utils_js_1 = require("./utils.js");
// Octet Stream to Integer. "spec" implementation of os2ip is 2.5x slower vs bytesToNumberBE.
const os2ip = utils_js_1.bytesToNumberBE;
// Integer to Octet Stream (numberToBytesBE)
function i2osp(value, length) {
    anum(value);
    anum(length);
    if (value < 0 || value >= 1 << (8 * length))
        throw new Error('invalid I2OSP input: ' + value);
    const res = Array.from({ length }).fill(0);
    for (let i = length - 1; i >= 0; i--) {
        res[i] = value & 0xff;
        value >>>= 8;
    }
    return new Uint8Array(res);
}
function strxor(a, b) {
    const arr = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        arr[i] = a[i] ^ b[i];
    }
    return arr;
}
function anum(item) {
    if (!Number.isSafeInteger(item))
        throw new Error('number expected');
}
/**
 * Produces a uniformly random byte string using a cryptographic hash function H that outputs b bits.
 * [RFC 9380 5.3.1](https://www.rfc-editor.org/rfc/rfc9380#section-5.3.1).
 */
function expand_message_xmd(msg, DST, lenInBytes, H) {
    (0, utils_js_1.abytes)(msg);
    (0, utils_js_1.abytes)(DST);
    anum(lenInBytes);
    // https://www.rfc-editor.org/rfc/rfc9380#section-5.3.3
    if (DST.length > 255)
        DST = H((0, utils_js_1.concatBytes)((0, utils_js_1.utf8ToBytes)('H2C-OVERSIZE-DST-'), DST));
    const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
    const ell = Math.ceil(lenInBytes / b_in_bytes);
    if (lenInBytes > 65535 || ell > 255)
        throw new Error('expand_message_xmd: invalid lenInBytes');
    const DST_prime = (0, utils_js_1.concatBytes)(DST, i2osp(DST.length, 1));
    const Z_pad = i2osp(0, r_in_bytes);
    const l_i_b_str = i2osp(lenInBytes, 2); // len_in_bytes_str
    const b = new Array(ell);
    const b_0 = H((0, utils_js_1.concatBytes)(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
    b[0] = H((0, utils_js_1.concatBytes)(b_0, i2osp(1, 1), DST_prime));
    for (let i = 1; i <= ell; i++) {
        const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
        b[i] = H((0, utils_js_1.concatBytes)(...args));
    }
    const pseudo_random_bytes = (0, utils_js_1.concatBytes)(...b);
    return pseudo_random_bytes.slice(0, lenInBytes);
}
/**
 * Produces a uniformly random byte string using an extendable-output function (XOF) H.
 * 1. The collision resistance of H MUST be at least k bits.
 * 2. H MUST be an XOF that has been proved indifferentiable from
 *    a random oracle under a reasonable cryptographic assumption.
 * [RFC 9380 5.3.2](https://www.rfc-editor.org/rfc/rfc9380#section-5.3.2).
 */
function expand_message_xof(msg, DST, lenInBytes, k, H) {
    (0, utils_js_1.abytes)(msg);
    (0, utils_js_1.abytes)(DST);
    anum(lenInBytes);
    // https://www.rfc-editor.org/rfc/rfc9380#section-5.3.3
    // DST = H('H2C-OVERSIZE-DST-' || a_very_long_DST, Math.ceil((lenInBytes * k) / 8));
    if (DST.length > 255) {
        const dkLen = Math.ceil((2 * k) / 8);
        DST = H.create({ dkLen }).update((0, utils_js_1.utf8ToBytes)('H2C-OVERSIZE-DST-')).update(DST).digest();
    }
    if (lenInBytes > 65535 || DST.length > 255)
        throw new Error('expand_message_xof: invalid lenInBytes');
    return (H.create({ dkLen: lenInBytes })
        .update(msg)
        .update(i2osp(lenInBytes, 2))
        // 2. DST_prime = DST || I2OSP(len(DST), 1)
        .update(DST)
        .update(i2osp(DST.length, 1))
        .digest());
}
/**
 * Hashes arbitrary-length byte strings to a list of one or more elements of a finite field F.
 * [RFC 9380 5.2](https://www.rfc-editor.org/rfc/rfc9380#section-5.2).
 * @param msg a byte string containing the message to hash
 * @param count the number of elements of F to output
 * @param options `{DST: string, p: bigint, m: number, k: number, expand: 'xmd' | 'xof', hash: H}`, see above
 * @returns [u_0, ..., u_(count - 1)], a list of field elements.
 */
function hash_to_field(msg, count, options) {
    (0, utils_js_1.validateObject)(options, {
        DST: 'stringOrUint8Array',
        p: 'bigint',
        m: 'isSafeInteger',
        k: 'isSafeInteger',
        hash: 'hash',
    });
    const { p, k, m, hash, expand, DST: _DST } = options;
    (0, utils_js_1.abytes)(msg);
    anum(count);
    const DST = typeof _DST === 'string' ? (0, utils_js_1.utf8ToBytes)(_DST) : _DST;
    const log2p = p.toString(2).length;
    const L = Math.ceil((log2p + k) / 8); // section 5.1 of ietf draft link above
    const len_in_bytes = count * m * L;
    let prb; // pseudo_random_bytes
    if (expand === 'xmd') {
        prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
    }
    else if (expand === 'xof') {
        prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
    }
    else if (expand === '_internal_pass') {
        // for internal tests only
        prb = msg;
    }
    else {
        throw new Error('expand must be "xmd" or "xof"');
    }
    const u = new Array(count);
    for (let i = 0; i < count; i++) {
        const e = new Array(m);
        for (let j = 0; j < m; j++) {
            const elm_offset = L * (j + i * m);
            const tv = prb.subarray(elm_offset, elm_offset + L);
            e[j] = (0, modular_js_1.mod)(os2ip(tv), p);
        }
        u[i] = e;
    }
    return u;
}
function isogenyMap(field, map) {
    // Make same order as in spec
    const COEFF = map.map((i) => Array.from(i).reverse());
    return (x, y) => {
        const [xNum, xDen, yNum, yDen] = COEFF.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
        x = field.div(xNum, xDen); // xNum / xDen
        y = field.mul(y, field.div(yNum, yDen)); // y * (yNum / yDev)
        return { x: x, y: y };
    };
}
/** Creates hash-to-curve methods from EC Point and mapToCurve function. */
function createHasher(Point, mapToCurve, def) {
    if (typeof mapToCurve !== 'function')
        throw new Error('mapToCurve() must be defined');
    return {
        // Encodes byte string to elliptic curve.
        // hash_to_curve from https://www.rfc-editor.org/rfc/rfc9380#section-3
        hashToCurve(msg, options) {
            const u = hash_to_field(msg, 2, { ...def, DST: def.DST, ...options });
            const u0 = Point.fromAffine(mapToCurve(u[0]));
            const u1 = Point.fromAffine(mapToCurve(u[1]));
            const P = u0.add(u1).clearCofactor();
            P.assertValidity();
            return P;
        },
        // Encodes byte string to elliptic curve.
        // encode_to_curve from https://www.rfc-editor.org/rfc/rfc9380#section-3
        encodeToCurve(msg, options) {
            const u = hash_to_field(msg, 1, { ...def, DST: def.encodeDST, ...options });
            const P = Point.fromAffine(mapToCurve(u[0])).clearCofactor();
            P.assertValidity();
            return P;
        },
        // Same as encodeToCurve, but without hash
        mapToCurve(scalars) {
            if (!Array.isArray(scalars))
                throw new Error('mapToCurve: expected array of bigints');
            for (const i of scalars)
                if (typeof i !== 'bigint')
                    throw new Error('mapToCurve: expected array of bigints');
            const P = Point.fromAffine(mapToCurve(scalars)).clearCofactor();
            P.assertValidity();
            return P;
        },
    };
}

},{"./modular.js":9,"./utils.js":11}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNegativeLE = void 0;
exports.mod = mod;
exports.pow = pow;
exports.pow2 = pow2;
exports.invert = invert;
exports.tonelliShanks = tonelliShanks;
exports.FpSqrt = FpSqrt;
exports.validateField = validateField;
exports.FpPow = FpPow;
exports.FpInvertBatch = FpInvertBatch;
exports.FpDiv = FpDiv;
exports.FpLegendre = FpLegendre;
exports.FpIsSquare = FpIsSquare;
exports.nLength = nLength;
exports.Field = Field;
exports.FpSqrtOdd = FpSqrtOdd;
exports.FpSqrtEven = FpSqrtEven;
exports.hashToPrivateScalar = hashToPrivateScalar;
exports.getFieldBytesLength = getFieldBytesLength;
exports.getMinHashLength = getMinHashLength;
exports.mapHashToField = mapHashToField;
/**
 * Utils for modular division and finite fields.
 * A finite field over 11 is integer number operations `mod 11`.
 * There is no division: it is replaced by modular multiplicative inverse.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const utils_js_1 = require("./utils.js");
// prettier-ignore
const _0n = BigInt(0), _1n = BigInt(1), _2n = /* @__PURE__ */ BigInt(2), _3n = /* @__PURE__ */ BigInt(3);
// prettier-ignore
const _4n = /* @__PURE__ */ BigInt(4), _5n = /* @__PURE__ */ BigInt(5), _8n = /* @__PURE__ */ BigInt(8);
// prettier-ignore
const _9n = /* @__PURE__ */ BigInt(9), _16n = /* @__PURE__ */ BigInt(16);
// Calculates a modulo b
function mod(a, b) {
    const result = a % b;
    return result >= _0n ? result : b + result;
}
/**
 * Efficiently raise num to power and do modular division.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 * @todo use field version && remove
 * @example
 * pow(2n, 6n, 11n) // 64n % 11n == 9n
 */
function pow(num, power, modulo) {
    if (power < _0n)
        throw new Error('invalid exponent, negatives unsupported');
    if (modulo <= _0n)
        throw new Error('invalid modulus');
    if (modulo === _1n)
        return _0n;
    let res = _1n;
    while (power > _0n) {
        if (power & _1n)
            res = (res * num) % modulo;
        num = (num * num) % modulo;
        power >>= _1n;
    }
    return res;
}
/** Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)` */
function pow2(x, power, modulo) {
    let res = x;
    while (power-- > _0n) {
        res *= res;
        res %= modulo;
    }
    return res;
}
/**
 * Inverses number over modulo.
 * Implemented using [Euclidean GCD](https://brilliant.org/wiki/extended-euclidean-algorithm/).
 */
function invert(number, modulo) {
    if (number === _0n)
        throw new Error('invert: expected non-zero number');
    if (modulo <= _0n)
        throw new Error('invert: expected positive modulus, got ' + modulo);
    // Fermat's little theorem "CT-like" version inv(n) = n^(m-2) mod m is 30x slower.
    let a = mod(number, modulo);
    let b = modulo;
    // prettier-ignore
    let x = _0n, y = _1n, u = _1n, v = _0n;
    while (a !== _0n) {
        // JIT applies optimization if those two lines follow each other
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;
        // prettier-ignore
        b = a, a = r, x = u, y = v, u = m, v = n;
    }
    const gcd = b;
    if (gcd !== _1n)
        throw new Error('invert: does not exist');
    return mod(x, modulo);
}
/**
 * Tonelli-Shanks square root search algorithm.
 * 1. https://eprint.iacr.org/2012/685.pdf (page 12)
 * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
 * Will start an infinite loop if field order P is not prime.
 * @param P field order
 * @returns function that takes field Fp (created from P) and number n
 */
function tonelliShanks(P) {
    // Legendre constant: used to calculate Legendre symbol (a | p),
    // which denotes the value of a^((p-1)/2) (mod p).
    // (a | p) ≡ 1    if a is a square (mod p)
    // (a | p) ≡ -1   if a is not a square (mod p)
    // (a | p) ≡ 0    if a ≡ 0 (mod p)
    const legendreC = (P - _1n) / _2n;
    let Q, S, Z;
    // Step 1: By factoring out powers of 2 from p - 1,
    // find q and s such that p - 1 = q*(2^s) with q odd
    for (Q = P - _1n, S = 0; Q % _2n === _0n; Q /= _2n, S++)
        ;
    // Step 2: Select a non-square z such that (z | p) ≡ -1 and set c ≡ zq
    for (Z = _2n; Z < P && pow(Z, legendreC, P) !== P - _1n; Z++) {
        // Crash instead of infinity loop, we cannot reasonable count until P.
        if (Z > 1000)
            throw new Error('Cannot find square root: likely non-prime P');
    }
    // Fast-path
    if (S === 1) {
        const p1div4 = (P + _1n) / _4n;
        return function tonelliFast(Fp, n) {
            const root = Fp.pow(n, p1div4);
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Slow-path
    const Q1div2 = (Q + _1n) / _2n;
    return function tonelliSlow(Fp, n) {
        // Step 0: Check that n is indeed a square: (n | p) should not be ≡ -1
        if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE))
            throw new Error('Cannot find square root');
        let r = S;
        // TODO: will fail at Fp2/etc
        let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q); // will update both x and b
        let x = Fp.pow(n, Q1div2); // first guess at the square root
        let b = Fp.pow(n, Q); // first guess at the fudge factor
        while (!Fp.eql(b, Fp.ONE)) {
            if (Fp.eql(b, Fp.ZERO))
                return Fp.ZERO; // https://en.wikipedia.org/wiki/Tonelli%E2%80%93Shanks_algorithm (4. If t = 0, return r = 0)
            // Find m such b^(2^m)==1
            let m = 1;
            for (let t2 = Fp.sqr(b); m < r; m++) {
                if (Fp.eql(t2, Fp.ONE))
                    break;
                t2 = Fp.sqr(t2); // t2 *= t2
            }
            // NOTE: r-m-1 can be bigger than 32, need to convert to bigint before shift, otherwise there will be overflow
            const ge = Fp.pow(g, _1n << BigInt(r - m - 1)); // ge = 2^(r-m-1)
            g = Fp.sqr(ge); // g = ge * ge
            x = Fp.mul(x, ge); // x *= ge
            b = Fp.mul(b, g); // b *= g
            r = m;
        }
        return x;
    };
}
/**
 * Square root for a finite field. It will try to check if optimizations are applicable and fall back to 4:
 *
 * 1. P ≡ 3 (mod 4)
 * 2. P ≡ 5 (mod 8)
 * 3. P ≡ 9 (mod 16)
 * 4. Tonelli-Shanks algorithm
 *
 * Different algorithms can give different roots, it is up to user to decide which one they want.
 * For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
 */
function FpSqrt(P) {
    // P ≡ 3 (mod 4)
    // √n = n^((P+1)/4)
    if (P % _4n === _3n) {
        // Not all roots possible!
        // const ORDER =
        //   0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        // const NUM = 72057594037927816n;
        const p1div4 = (P + _1n) / _4n;
        return function sqrt3mod4(Fp, n) {
            const root = Fp.pow(n, p1div4);
            // Throw if root**2 != n
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Atkin algorithm for q ≡ 5 (mod 8), https://eprint.iacr.org/2012/685.pdf (page 10)
    if (P % _8n === _5n) {
        const c1 = (P - _5n) / _8n;
        return function sqrt5mod8(Fp, n) {
            const n2 = Fp.mul(n, _2n);
            const v = Fp.pow(n2, c1);
            const nv = Fp.mul(n, v);
            const i = Fp.mul(Fp.mul(nv, _2n), v);
            const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // P ≡ 9 (mod 16)
    if (P % _16n === _9n) {
        // NOTE: tonelli is too slow for bls-Fp2 calculations even on start
        // Means we cannot use sqrt for constants at all!
        //
        // const c1 = Fp.sqrt(Fp.negate(Fp.ONE)); //  1. c1 = sqrt(-1) in F, i.e., (c1^2) == -1 in F
        // const c2 = Fp.sqrt(c1);                //  2. c2 = sqrt(c1) in F, i.e., (c2^2) == c1 in F
        // const c3 = Fp.sqrt(Fp.negate(c1));     //  3. c3 = sqrt(-c1) in F, i.e., (c3^2) == -c1 in F
        // const c4 = (P + _7n) / _16n;           //  4. c4 = (q + 7) / 16        # Integer arithmetic
        // sqrt = (x) => {
        //   let tv1 = Fp.pow(x, c4);             //  1. tv1 = x^c4
        //   let tv2 = Fp.mul(c1, tv1);           //  2. tv2 = c1 * tv1
        //   const tv3 = Fp.mul(c2, tv1);         //  3. tv3 = c2 * tv1
        //   let tv4 = Fp.mul(c3, tv1);           //  4. tv4 = c3 * tv1
        //   const e1 = Fp.equals(Fp.square(tv2), x); //  5.  e1 = (tv2^2) == x
        //   const e2 = Fp.equals(Fp.square(tv3), x); //  6.  e2 = (tv3^2) == x
        //   tv1 = Fp.cmov(tv1, tv2, e1); //  7. tv1 = CMOV(tv1, tv2, e1)  # Select tv2 if (tv2^2) == x
        //   tv2 = Fp.cmov(tv4, tv3, e2); //  8. tv2 = CMOV(tv4, tv3, e2)  # Select tv3 if (tv3^2) == x
        //   const e3 = Fp.equals(Fp.square(tv2), x); //  9.  e3 = (tv2^2) == x
        //   return Fp.cmov(tv1, tv2, e3); //  10.  z = CMOV(tv1, tv2, e3)  # Select the sqrt from tv1 and tv2
        // }
    }
    // Other cases: Tonelli-Shanks algorithm
    return tonelliShanks(P);
}
// Little-endian check for first LE bit (last BE bit);
const isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n) === _1n;
exports.isNegativeLE = isNegativeLE;
// prettier-ignore
const FIELD_FIELDS = [
    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
    'eql', 'add', 'sub', 'mul', 'pow', 'div',
    'addN', 'subN', 'mulN', 'sqrN'
];
function validateField(field) {
    const initial = {
        ORDER: 'bigint',
        MASK: 'bigint',
        BYTES: 'isSafeInteger',
        BITS: 'isSafeInteger',
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
        map[val] = 'function';
        return map;
    }, initial);
    return (0, utils_js_1.validateObject)(field, opts);
}
// Generic field functions
/**
 * Same as `pow` but for Fp: non-constant-time.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 */
function FpPow(f, num, power) {
    // Should have same speed as pow for bigints
    // TODO: benchmark!
    if (power < _0n)
        throw new Error('invalid exponent, negatives unsupported');
    if (power === _0n)
        return f.ONE;
    if (power === _1n)
        return num;
    let p = f.ONE;
    let d = num;
    while (power > _0n) {
        if (power & _1n)
            p = f.mul(p, d);
        d = f.sqr(d);
        power >>= _1n;
    }
    return p;
}
/**
 * Efficiently invert an array of Field elements.
 * `inv(0)` will return `undefined` here: make sure to throw an error.
 */
function FpInvertBatch(f, nums) {
    const tmp = new Array(nums.length);
    // Walk from first to last, multiply them by each other MOD p
    const lastMultiplied = nums.reduce((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = acc;
        return f.mul(acc, num);
    }, f.ONE);
    // Invert last element
    const inverted = f.inv(lastMultiplied);
    // Walk from last to first, multiply them by inverted each other MOD p
    nums.reduceRight((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = f.mul(acc, tmp[i]);
        return f.mul(acc, num);
    }, inverted);
    return tmp;
}
function FpDiv(f, lhs, rhs) {
    return f.mul(lhs, typeof rhs === 'bigint' ? invert(rhs, f.ORDER) : f.inv(rhs));
}
/**
 * Legendre symbol.
 * * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
 * * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
 * * (a | p) ≡ 0    if a ≡ 0 (mod p)
 */
function FpLegendre(order) {
    const legendreConst = (order - _1n) / _2n; // Integer arithmetic
    return (f, x) => f.pow(x, legendreConst);
}
// This function returns True whenever the value x is a square in the field F.
function FpIsSquare(f) {
    const legendre = FpLegendre(f.ORDER);
    return (x) => {
        const p = legendre(f, x);
        return f.eql(p, f.ZERO) || f.eql(p, f.ONE);
    };
}
// CURVE.n lengths
function nLength(n, nBitLength) {
    // Bit size, byte size of CURVE.n
    const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
}
/**
 * Initializes a finite field over prime.
 * Major performance optimizations:
 * * a) denormalized operations like mulN instead of mul
 * * b) same object shape: never add or remove keys
 * * c) Object.freeze
 * Fragile: always run a benchmark on a change.
 * Security note: operations don't check 'isValid' for all elements for performance reasons,
 * it is caller responsibility to check this.
 * This is low-level code, please make sure you know what you're doing.
 * @param ORDER prime positive bigint
 * @param bitLen how many bits the field consumes
 * @param isLE (def: false) if encoding / decoding should be in little-endian
 * @param redef optional faster redefinitions of sqrt and other methods
 */
function Field(ORDER, bitLen, isLE = false, redef = {}) {
    if (ORDER <= _0n)
        throw new Error('invalid field: expected ORDER > 0, got ' + ORDER);
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
    if (BYTES > 2048)
        throw new Error('invalid field: expected ORDER of <= 2048 bytes');
    let sqrtP; // cached sqrtP
    const f = Object.freeze({
        ORDER,
        isLE,
        BITS,
        BYTES,
        MASK: (0, utils_js_1.bitMask)(BITS),
        ZERO: _0n,
        ONE: _1n,
        create: (num) => mod(num, ORDER),
        isValid: (num) => {
            if (typeof num !== 'bigint')
                throw new Error('invalid field element: expected bigint, got ' + typeof num);
            return _0n <= num && num < ORDER; // 0 is valid element, but it's not invertible
        },
        is0: (num) => num === _0n,
        isOdd: (num) => (num & _1n) === _1n,
        neg: (num) => mod(-num, ORDER),
        eql: (lhs, rhs) => lhs === rhs,
        sqr: (num) => mod(num * num, ORDER),
        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
        pow: (num, power) => FpPow(f, num, power),
        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
        // Same as above, but doesn't normalize
        sqrN: (num) => num * num,
        addN: (lhs, rhs) => lhs + rhs,
        subN: (lhs, rhs) => lhs - rhs,
        mulN: (lhs, rhs) => lhs * rhs,
        inv: (num) => invert(num, ORDER),
        sqrt: redef.sqrt ||
            ((n) => {
                if (!sqrtP)
                    sqrtP = FpSqrt(ORDER);
                return sqrtP(f, n);
            }),
        invertBatch: (lst) => FpInvertBatch(f, lst),
        // TODO: do we really need constant cmov?
        // We don't have const-time bigints anyway, so probably will be not very useful
        cmov: (a, b, c) => (c ? b : a),
        toBytes: (num) => (isLE ? (0, utils_js_1.numberToBytesLE)(num, BYTES) : (0, utils_js_1.numberToBytesBE)(num, BYTES)),
        fromBytes: (bytes) => {
            if (bytes.length !== BYTES)
                throw new Error('Field.fromBytes: expected ' + BYTES + ' bytes, got ' + bytes.length);
            return isLE ? (0, utils_js_1.bytesToNumberLE)(bytes) : (0, utils_js_1.bytesToNumberBE)(bytes);
        },
    });
    return Object.freeze(f);
}
function FpSqrtOdd(Fp, elm) {
    if (!Fp.isOdd)
        throw new Error("Field doesn't have isOdd");
    const root = Fp.sqrt(elm);
    return Fp.isOdd(root) ? root : Fp.neg(root);
}
function FpSqrtEven(Fp, elm) {
    if (!Fp.isOdd)
        throw new Error("Field doesn't have isOdd");
    const root = Fp.sqrt(elm);
    return Fp.isOdd(root) ? Fp.neg(root) : root;
}
/**
 * "Constant-time" private key generation utility.
 * Same as mapKeyToField, but accepts less bytes (40 instead of 48 for 32-byte field).
 * Which makes it slightly more biased, less secure.
 * @deprecated use `mapKeyToField` instead
 */
function hashToPrivateScalar(hash, groupOrder, isLE = false) {
    hash = (0, utils_js_1.ensureBytes)('privateHash', hash);
    const hashLen = hash.length;
    const minLen = nLength(groupOrder).nByteLength + 8;
    if (minLen < 24 || hashLen < minLen || hashLen > 1024)
        throw new Error('hashToPrivateScalar: expected ' + minLen + '-1024 bytes of input, got ' + hashLen);
    const num = isLE ? (0, utils_js_1.bytesToNumberLE)(hash) : (0, utils_js_1.bytesToNumberBE)(hash);
    return mod(num, groupOrder - _1n) + _1n;
}
/**
 * Returns total number of bytes consumed by the field element.
 * For example, 32 bytes for usual 256-bit weierstrass curve.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of field
 */
function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== 'bigint')
        throw new Error('field order must be bigint');
    const bitLength = fieldOrder.toString(2).length;
    return Math.ceil(bitLength / 8);
}
/**
 * Returns minimal amount of bytes that can be safely reduced
 * by field order.
 * Should be 2^-128 for 128-bit curve such as P256.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of target hash
 */
function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
}
/**
 * "Constant-time" private key generation utility.
 * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
 * and convert them into private scalar, with the modulo bias being negligible.
 * Needs at least 48 bytes of input for 32-byte private key.
 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
 * FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
 * RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
 * @param hash hash output from SHA3 or a similar function
 * @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
 * @param isLE interpret hash bytes as LE num
 * @returns valid private scalar
 */
function mapHashToField(key, fieldOrder, isLE = false) {
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = getMinHashLength(fieldOrder);
    // No small numbers: need to understand bias story. No huge numbers: easier to detect JS timings.
    if (len < 16 || len < minLen || len > 1024)
        throw new Error('expected ' + minLen + '-1024 bytes of input, got ' + len);
    const num = isLE ? (0, utils_js_1.bytesToNumberLE)(key) : (0, utils_js_1.bytesToNumberBE)(key);
    // `mod(x, 11)` can sometimes produce 0. `mod(x, 10) + 1` is the same, but no 0
    const reduced = mod(num, fieldOrder - _1n) + _1n;
    return isLE ? (0, utils_js_1.numberToBytesLE)(reduced, fieldLen) : (0, utils_js_1.numberToBytesBE)(reduced, fieldLen);
}

},{"./utils.js":11}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.montgomery = montgomery;
/**
 * Montgomery curve methods. It's not really whole montgomery curve,
 * just bunch of very specific methods for X25519 / X448 from
 * [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const modular_js_1 = require("./modular.js");
const utils_js_1 = require("./utils.js");
const _0n = BigInt(0);
const _1n = BigInt(1);
function validateOpts(curve) {
    (0, utils_js_1.validateObject)(curve, {
        a: 'bigint',
    }, {
        montgomeryBits: 'isSafeInteger',
        nByteLength: 'isSafeInteger',
        adjustScalarBytes: 'function',
        domain: 'function',
        powPminus2: 'function',
        Gu: 'bigint',
    });
    // Set defaults
    return Object.freeze({ ...curve });
}
// Uses only one coordinate instead of two
function montgomery(curveDef) {
    const CURVE = validateOpts(curveDef);
    const { P } = CURVE;
    const modP = (n) => (0, modular_js_1.mod)(n, P);
    const montgomeryBits = CURVE.montgomeryBits;
    const montgomeryBytes = Math.ceil(montgomeryBits / 8);
    const fieldLen = CURVE.nByteLength;
    const adjustScalarBytes = CURVE.adjustScalarBytes || ((bytes) => bytes);
    const powPminus2 = CURVE.powPminus2 || ((x) => (0, modular_js_1.pow)(x, P - BigInt(2), P));
    // cswap from RFC7748. But it is not from RFC7748!
    /*
      cswap(swap, x_2, x_3):
           dummy = mask(swap) AND (x_2 XOR x_3)
           x_2 = x_2 XOR dummy
           x_3 = x_3 XOR dummy
           Return (x_2, x_3)
    Where mask(swap) is the all-1 or all-0 word of the same length as x_2
     and x_3, computed, e.g., as mask(swap) = 0 - swap.
    */
    function cswap(swap, x_2, x_3) {
        const dummy = modP(swap * (x_2 - x_3));
        x_2 = modP(x_2 - dummy);
        x_3 = modP(x_3 + dummy);
        return [x_2, x_3];
    }
    // x25519 from 4
    // The constant a24 is (486662 - 2) / 4 = 121665 for curve25519/X25519
    const a24 = (CURVE.a - BigInt(2)) / BigInt(4);
    /**
     *
     * @param pointU u coordinate (x) on Montgomery Curve 25519
     * @param scalar by which the point would be multiplied
     * @returns new Point on Montgomery curve
     */
    function montgomeryLadder(u, scalar) {
        (0, utils_js_1.aInRange)('u', u, _0n, P);
        (0, utils_js_1.aInRange)('scalar', scalar, _0n, P);
        // Section 5: Implementations MUST accept non-canonical values and process them as
        // if they had been reduced modulo the field prime.
        const k = scalar;
        const x_1 = u;
        let x_2 = _1n;
        let z_2 = _0n;
        let x_3 = u;
        let z_3 = _1n;
        let swap = _0n;
        let sw;
        for (let t = BigInt(montgomeryBits - 1); t >= _0n; t--) {
            const k_t = (k >> t) & _1n;
            swap ^= k_t;
            sw = cswap(swap, x_2, x_3);
            x_2 = sw[0];
            x_3 = sw[1];
            sw = cswap(swap, z_2, z_3);
            z_2 = sw[0];
            z_3 = sw[1];
            swap = k_t;
            const A = x_2 + z_2;
            const AA = modP(A * A);
            const B = x_2 - z_2;
            const BB = modP(B * B);
            const E = AA - BB;
            const C = x_3 + z_3;
            const D = x_3 - z_3;
            const DA = modP(D * A);
            const CB = modP(C * B);
            const dacb = DA + CB;
            const da_cb = DA - CB;
            x_3 = modP(dacb * dacb);
            z_3 = modP(x_1 * modP(da_cb * da_cb));
            x_2 = modP(AA * BB);
            z_2 = modP(E * (AA + modP(a24 * E)));
        }
        // (x_2, x_3) = cswap(swap, x_2, x_3)
        sw = cswap(swap, x_2, x_3);
        x_2 = sw[0];
        x_3 = sw[1];
        // (z_2, z_3) = cswap(swap, z_2, z_3)
        sw = cswap(swap, z_2, z_3);
        z_2 = sw[0];
        z_3 = sw[1];
        // z_2^(p - 2)
        const z2 = powPminus2(z_2);
        // Return x_2 * (z_2^(p - 2))
        return modP(x_2 * z2);
    }
    function encodeUCoordinate(u) {
        return (0, utils_js_1.numberToBytesLE)(modP(u), montgomeryBytes);
    }
    function decodeUCoordinate(uEnc) {
        // Section 5: When receiving such an array, implementations of X25519
        // MUST mask the most significant bit in the final byte.
        const u = (0, utils_js_1.ensureBytes)('u coordinate', uEnc, montgomeryBytes);
        if (fieldLen === 32)
            u[31] &= 127; // 0b0111_1111
        return (0, utils_js_1.bytesToNumberLE)(u);
    }
    function decodeScalar(n) {
        const bytes = (0, utils_js_1.ensureBytes)('scalar', n);
        const len = bytes.length;
        if (len !== montgomeryBytes && len !== fieldLen) {
            let valid = '' + montgomeryBytes + ' or ' + fieldLen;
            throw new Error('invalid scalar, expected ' + valid + ' bytes, got ' + len);
        }
        return (0, utils_js_1.bytesToNumberLE)(adjustScalarBytes(bytes));
    }
    function scalarMult(scalar, u) {
        const pointU = decodeUCoordinate(u);
        const _scalar = decodeScalar(scalar);
        const pu = montgomeryLadder(pointU, _scalar);
        // The result was not contributory
        // https://cr.yp.to/ecdh.html#validate
        if (pu === _0n)
            throw new Error('invalid private or public key received');
        return encodeUCoordinate(pu);
    }
    // Computes public key from private. By doing scalar multiplication of base point.
    const GuBytes = encodeUCoordinate(CURVE.Gu);
    function scalarMultBase(scalar) {
        return scalarMult(scalar, GuBytes);
    }
    return {
        scalarMult,
        scalarMultBase,
        getSharedSecret: (privateKey, publicKey) => scalarMult(privateKey, publicKey),
        getPublicKey: (privateKey) => scalarMultBase(privateKey),
        utils: { randomPrivateKey: () => CURVE.randomBytes(CURVE.nByteLength) },
        GuBytes: GuBytes,
    };
}

},{"./modular.js":9,"./utils.js":11}],11:[function(require,module,exports){
"use strict";
/**
 * Hex, bytes and number utilities.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notImplemented = exports.bitMask = void 0;
exports.isBytes = isBytes;
exports.abytes = abytes;
exports.abool = abool;
exports.bytesToHex = bytesToHex;
exports.numberToHexUnpadded = numberToHexUnpadded;
exports.hexToNumber = hexToNumber;
exports.hexToBytes = hexToBytes;
exports.bytesToNumberBE = bytesToNumberBE;
exports.bytesToNumberLE = bytesToNumberLE;
exports.numberToBytesBE = numberToBytesBE;
exports.numberToBytesLE = numberToBytesLE;
exports.numberToVarBytesBE = numberToVarBytesBE;
exports.ensureBytes = ensureBytes;
exports.concatBytes = concatBytes;
exports.equalBytes = equalBytes;
exports.utf8ToBytes = utf8ToBytes;
exports.inRange = inRange;
exports.aInRange = aInRange;
exports.bitLen = bitLen;
exports.bitGet = bitGet;
exports.bitSet = bitSet;
exports.createHmacDrbg = createHmacDrbg;
exports.validateObject = validateObject;
exports.memoized = memoized;
// 100 lines of code in the file are duplicated from noble-hashes (utils).
// This is OK: `abstract` directory does not use noble-hashes.
// User may opt-in into using different hashing library. This way, noble-hashes
// won't be included into their bundle.
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n = /* @__PURE__ */ BigInt(2);
function isBytes(a) {
    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
}
function abytes(item) {
    if (!isBytes(item))
        throw new Error('Uint8Array expected');
}
function abool(title, value) {
    if (typeof value !== 'boolean')
        throw new Error(title + ' boolean expected, got ' + value);
}
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
    abytes(bytes);
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += hexes[bytes[i]];
    }
    return hex;
}
function numberToHexUnpadded(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? '0' + hex : hex;
}
function hexToNumber(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    return hex === '' ? _0n : BigInt('0x' + hex); // Big Endian
}
// We use optimized technique to convert hex string to byte array
const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase16(ch) {
    if (ch >= asciis._0 && ch <= asciis._9)
        return ch - asciis._0; // '2' => 50-48
    if (ch >= asciis.A && ch <= asciis.F)
        return ch - (asciis.A - 10); // 'B' => 66-(65-10)
    if (ch >= asciis.a && ch <= asciis.f)
        return ch - (asciis.a - 10); // 'b' => 98-(97-10)
    return;
}
/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
        throw new Error('hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
        const n1 = asciiToBase16(hex.charCodeAt(hi));
        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
        if (n1 === undefined || n2 === undefined) {
            const char = hex[hi] + hex[hi + 1];
            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
        }
        array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
    }
    return array;
}
// BE: Big Endian, LE: Little Endian
function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
    abytes(bytes);
    return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
    return hexToBytes(n.toString(16).padStart(len * 2, '0'));
}
function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
}
// Unpadded, rarely used
function numberToVarBytesBE(n) {
    return hexToBytes(numberToHexUnpadded(n));
}
/**
 * Takes hex string or Uint8Array, converts to Uint8Array.
 * Validates output length.
 * Will throw error for other types.
 * @param title descriptive title for an error e.g. 'private key'
 * @param hex hex string or Uint8Array
 * @param expectedLength optional, will compare to result array's length
 * @returns
 */
function ensureBytes(title, hex, expectedLength) {
    let res;
    if (typeof hex === 'string') {
        try {
            res = hexToBytes(hex);
        }
        catch (e) {
            throw new Error(title + ' must be hex string or Uint8Array, cause: ' + e);
        }
    }
    else if (isBytes(hex)) {
        // Uint8Array.from() instead of hash.slice() because node.js Buffer
        // is instance of Uint8Array, and its slice() creates **mutable** copy
        res = Uint8Array.from(hex);
    }
    else {
        throw new Error(title + ' must be hex string or Uint8Array');
    }
    const len = res.length;
    if (typeof expectedLength === 'number' && len !== expectedLength)
        throw new Error(title + ' of length ' + expectedLength + ' expected, got ' + len);
    return res;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
        const a = arrays[i];
        abytes(a);
        sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const a = arrays[i];
        res.set(a, pad);
        pad += a.length;
    }
    return res;
}
// Compares 2 u8a-s in kinda constant time
function equalBytes(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
        diff |= a[i] ^ b[i];
    return diff === 0;
}
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
    if (typeof str !== 'string')
        throw new Error('string expected');
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
// Is positive bigint
const isPosBig = (n) => typeof n === 'bigint' && _0n <= n;
function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
/**
 * Asserts min <= n < max. NOTE: It's < max and not <= max.
 * @example
 * aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
 */
function aInRange(title, n, min, max) {
    // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
    // consider P=256n, min=0n, max=P
    // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
    // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
    // - our way is the cleanest:               `inRange('x', x, 0n, P)
    if (!inRange(n, min, max))
        throw new Error('expected valid ' + title + ': ' + min + ' <= n < ' + max + ', got ' + n);
}
// Bit operations
/**
 * Calculates amount of bits in a bigint.
 * Same as `n.toString(2).length`
 */
function bitLen(n) {
    let len;
    for (len = 0; n > _0n; n >>= _1n, len += 1)
        ;
    return len;
}
/**
 * Gets single bit at position.
 * NOTE: first bit position is 0 (same as arrays)
 * Same as `!!+Array.from(n.toString(2)).reverse()[pos]`
 */
function bitGet(n, pos) {
    return (n >> BigInt(pos)) & _1n;
}
/**
 * Sets single bit at position.
 */
function bitSet(n, pos, value) {
    return n | ((value ? _1n : _0n) << BigInt(pos));
}
/**
 * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
 * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
 */
const bitMask = (n) => (_2n << BigInt(n - 1)) - _1n;
exports.bitMask = bitMask;
// DRBG
const u8n = (data) => new Uint8Array(data); // creates Uint8Array
const u8fr = (arr) => Uint8Array.from(arr); // another shortcut
/**
 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
 * @returns function that will call DRBG until 2nd arg returns something meaningful
 * @example
 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
 */
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    if (typeof hashLen !== 'number' || hashLen < 2)
        throw new Error('hashLen must be a number');
    if (typeof qByteLen !== 'number' || qByteLen < 2)
        throw new Error('qByteLen must be a number');
    if (typeof hmacFn !== 'function')
        throw new Error('hmacFn must be a function');
    // Step B, Step C: set hashLen to 8*ceil(hlen/8)
    let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
    let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
    let i = 0; // Iterations counter, will throw when over 1000
    const reset = () => {
        v.fill(1);
        k.fill(0);
        i = 0;
    };
    const h = (...b) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
    const reseed = (seed = u8n()) => {
        // HMAC-DRBG reseed() function. Steps D-G
        k = h(u8fr([0x00]), seed); // k = hmac(k || v || 0x00 || seed)
        v = h(); // v = hmac(k || v)
        if (seed.length === 0)
            return;
        k = h(u8fr([0x01]), seed); // k = hmac(k || v || 0x01 || seed)
        v = h(); // v = hmac(k || v)
    };
    const gen = () => {
        // HMAC-DRBG generate() function
        if (i++ >= 1000)
            throw new Error('drbg: tried 1000 values');
        let len = 0;
        const out = [];
        while (len < qByteLen) {
            v = h();
            const sl = v.slice();
            out.push(sl);
            len += v.length;
        }
        return concatBytes(...out);
    };
    const genUntil = (seed, pred) => {
        reset();
        reseed(seed); // Steps D-G
        let res = undefined; // Step H: grind until k is in [1..n-1]
        while (!(res = pred(gen())))
            reseed();
        reset();
        return res;
    };
    return genUntil;
}
// Validating curves and fields
const validatorFns = {
    bigint: (val) => typeof val === 'bigint',
    function: (val) => typeof val === 'function',
    boolean: (val) => typeof val === 'boolean',
    string: (val) => typeof val === 'string',
    stringOrUint8Array: (val) => typeof val === 'string' || isBytes(val),
    isSafeInteger: (val) => Number.isSafeInteger(val),
    array: (val) => Array.isArray(val),
    field: (val, object) => object.Fp.isValid(val),
    hash: (val) => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
};
// type Record<K extends string | number | symbol, T> = { [P in K]: T; }
function validateObject(object, validators, optValidators = {}) {
    const checkField = (fieldName, type, isOptional) => {
        const checkVal = validatorFns[type];
        if (typeof checkVal !== 'function')
            throw new Error('invalid validator function');
        const val = object[fieldName];
        if (isOptional && val === undefined)
            return;
        if (!checkVal(val, object)) {
            throw new Error('param ' + String(fieldName) + ' is invalid. Expected ' + type + ', got ' + val);
        }
    };
    for (const [fieldName, type] of Object.entries(validators))
        checkField(fieldName, type, false);
    for (const [fieldName, type] of Object.entries(optValidators))
        checkField(fieldName, type, true);
    return object;
}
// validate type tests
// const o: { a: number; b: number; c: number } = { a: 1, b: 5, c: 6 };
// const z0 = validateObject(o, { a: 'isSafeInteger' }, { c: 'bigint' }); // Ok!
// // Should fail type-check
// const z1 = validateObject(o, { a: 'tmp' }, { c: 'zz' });
// const z2 = validateObject(o, { a: 'isSafeInteger' }, { c: 'zz' });
// const z3 = validateObject(o, { test: 'boolean', z: 'bug' });
// const z4 = validateObject(o, { a: 'boolean', z: 'bug' });
/**
 * throws not implemented error
 */
const notImplemented = () => {
    throw new Error('not implemented');
};
exports.notImplemented = notImplemented;
/**
 * Memoizes (caches) computation result.
 * Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
 */
function memoized(fn) {
    const map = new WeakMap();
    return (arg, ...args) => {
        const val = map.get(arg);
        if (val !== undefined)
            return val;
        const computed = fn(arg, ...args);
        map.set(arg, computed);
        return computed;
    };
}

},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DER = exports.DERErr = void 0;
exports.weierstrassPoints = weierstrassPoints;
exports.weierstrass = weierstrass;
exports.SWUFpSqrtRatio = SWUFpSqrtRatio;
exports.mapToCurveSimpleSWU = mapToCurveSimpleSWU;
/**
 * Short Weierstrass curve methods. The formula is: y² = x³ + ax + b.
 *
 * ### Design rationale for types
 *
 * * Interaction between classes from different curves should fail:
 *   `k256.Point.BASE.add(p256.Point.BASE)`
 * * For this purpose we want to use `instanceof` operator, which is fast and works during runtime
 * * Different calls of `curve()` would return different classes -
 *   `curve(params) !== curve(params)`: if somebody decided to monkey-patch their curve,
 *   it won't affect others
 *
 * TypeScript can't infer types for classes created inside a function. Classes is one instance
 * of nominative types in TypeScript and interfaces only check for shape, so it's hard to create
 * unique type for every function call.
 *
 * We can use generic types via some param, like curve opts, but that would:
 *     1. Enable interaction between `curve(params)` and `curve(params)` (curves of same params)
 *     which is hard to debug.
 *     2. Params can be generic and we can't enforce them to be constant value:
 *     if somebody creates curve from non-constant params,
 *     it would be allowed to interact with other curves with non-constant params
 *
 * @todo https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const curve_js_1 = require("./curve.js");
const modular_js_1 = require("./modular.js");
const ut = require("./utils.js");
const utils_js_1 = require("./utils.js");
function validateSigVerOpts(opts) {
  if (opts.lowS !== undefined) (0, utils_js_1.abool)('lowS', opts.lowS);
  if (opts.prehash !== undefined) (0, utils_js_1.abool)('prehash', opts.prehash);
}
function validatePointOpts(curve) {
  const opts = (0, curve_js_1.validateBasic)(curve);
  ut.validateObject(opts, {
    a: 'field',
    b: 'field'
  }, {
    allowedPrivateKeyLengths: 'array',
    wrapPrivateKey: 'boolean',
    isTorsionFree: 'function',
    clearCofactor: 'function',
    allowInfinityPoint: 'boolean',
    fromBytes: 'function',
    toBytes: 'function'
  });
  const {
    endo,
    Fp,
    a
  } = opts;
  if (endo) {
    if (!Fp.eql(a, Fp.ZERO)) {
      throw new Error('invalid endomorphism, can only be defined for Koblitz curves that have a=0');
    }
    if (typeof endo !== 'object' || typeof endo.beta !== 'bigint' || typeof endo.splitScalar !== 'function') {
      throw new Error('invalid endomorphism, expected beta: bigint and splitScalar: function');
    }
  }
  return Object.freeze({
    ...opts
  });
}
const {
  bytesToNumberBE: b2n,
  hexToBytes: h2b
} = ut;
class DERErr extends Error {
  constructor(m = '') {
    super(m);
  }
}
exports.DERErr = DERErr;
/**
 * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
 *
 *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
 *
 * Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
 */
exports.DER = {
  // asn.1 DER encoding utils
  Err: DERErr,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (tag, data) => {
      const {
        Err: E
      } = exports.DER;
      if (tag < 0 || tag > 256) throw new E('tlv.encode: wrong tag');
      if (data.length & 1) throw new E('tlv.encode: unpadded data');
      const dataLen = data.length / 2;
      const len = ut.numberToHexUnpadded(dataLen);
      if (len.length / 2 & 128) throw new E('tlv.encode: long form length too big');
      // length of length with long form flag
      const lenLen = dataLen > 127 ? ut.numberToHexUnpadded(len.length / 2 | 128) : '';
      const t = ut.numberToHexUnpadded(tag);
      return t + lenLen + len + data;
    },
    // v - value, l - left bytes (unparsed)
    decode(tag, data) {
      const {
        Err: E
      } = exports.DER;
      let pos = 0;
      if (tag < 0 || tag > 256) throw new E('tlv.encode: wrong tag');
      if (data.length < 2 || data[pos++] !== tag) throw new E('tlv.decode: wrong tlv');
      const first = data[pos++];
      const isLong = !!(first & 128); // First bit of first length byte is flag for short/long form
      let length = 0;
      if (!isLong) length = first;else {
        // Long form: [longFlag(1bit), lengthLength(7bit), length (BE)]
        const lenLen = first & 127;
        if (!lenLen) throw new E('tlv.decode(long): indefinite length not supported');
        if (lenLen > 4) throw new E('tlv.decode(long): byte length is too big'); // this will overflow u32 in js
        const lengthBytes = data.subarray(pos, pos + lenLen);
        if (lengthBytes.length !== lenLen) throw new E('tlv.decode: length bytes not complete');
        if (lengthBytes[0] === 0) throw new E('tlv.decode(long): zero leftmost byte');
        for (const b of lengthBytes) length = length << 8 | b;
        pos += lenLen;
        if (length < 128) throw new E('tlv.decode(long): not minimal encoding');
      }
      const v = data.subarray(pos, pos + length);
      if (v.length !== length) throw new E('tlv.decode: wrong value length');
      return {
        v,
        l: data.subarray(pos + length)
      };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(num) {
      const {
        Err: E
      } = exports.DER;
      if (num < _0n) throw new E('integer: negative integers are not allowed');
      let hex = ut.numberToHexUnpadded(num);
      // Pad with zero byte if negative flag is present
      if (Number.parseInt(hex[0], 16) & 0b1000) hex = '00' + hex;
      if (hex.length & 1) throw new E('unexpected DER parsing assertion: unpadded hex');
      return hex;
    },
    decode(data) {
      const {
        Err: E
      } = exports.DER;
      if (data[0] & 128) throw new E('invalid signature integer: negative');
      if (data[0] === 0x00 && !(data[1] & 128)) throw new E('invalid signature integer: unnecessary leading zero');
      return b2n(data);
    }
  },
  toSig(hex) {
    // parse DER signature
    const {
      Err: E,
      _int: int,
      _tlv: tlv
    } = exports.DER;
    const data = typeof hex === 'string' ? h2b(hex) : hex;
    ut.abytes(data);
    const {
      v: seqBytes,
      l: seqLeftBytes
    } = tlv.decode(0x30, data);
    if (seqLeftBytes.length) throw new E('invalid signature: left bytes after parsing');
    const {
      v: rBytes,
      l: rLeftBytes
    } = tlv.decode(0x02, seqBytes);
    const {
      v: sBytes,
      l: sLeftBytes
    } = tlv.decode(0x02, rLeftBytes);
    if (sLeftBytes.length) throw new E('invalid signature: left bytes after parsing');
    return {
      r: int.decode(rBytes),
      s: int.decode(sBytes)
    };
  },
  hexFromSig(sig) {
    const {
      _tlv: tlv,
      _int: int
    } = exports.DER;
    const rs = tlv.encode(0x02, int.encode(sig.r));
    const ss = tlv.encode(0x02, int.encode(sig.s));
    const seq = rs + ss;
    return tlv.encode(0x30, seq);
  }
};
// Be friendly to bad ECMAScript parsers by not using bigint literals
// prettier-ignore
const _0n = BigInt(0),
  _1n = BigInt(1),
  _2n = BigInt(2),
  _3n = BigInt(3),
  _4n = BigInt(4);
function weierstrassPoints(opts) {
  const CURVE = validatePointOpts(opts);
  const {
    Fp
  } = CURVE; // All curves has same field / group length as for now, but they can differ
  const Fn = (0, modular_js_1.Field)(CURVE.n, CURVE.nBitLength);
  const toBytes = CURVE.toBytes || ((_c, point, _isCompressed) => {
    const a = point.toAffine();
    return ut.concatBytes(Uint8Array.from([0x04]), Fp.toBytes(a.x), Fp.toBytes(a.y));
  });
  const fromBytes = CURVE.fromBytes || (bytes => {
    // const head = bytes[0];
    const tail = bytes.subarray(1);
    // if (head !== 0x04) throw new Error('Only non-compressed encoding is supported');
    const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
    const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
    return {
      x,
      y
    };
  });
  /**
   * y² = x³ + ax + b: Short weierstrass curve formula
   * @returns y²
   */
  function weierstrassEquation(x) {
    const {
      a,
      b
    } = CURVE;
    const x2 = Fp.sqr(x); // x * x
    const x3 = Fp.mul(x2, x); // x2 * x
    return Fp.add(Fp.add(x3, Fp.mul(x, a)), b); // x3 + a * x + b
  }
  // Validate whether the passed curve params are valid.
  // We check if curve equation works for generator point.
  // `assertValidity()` won't work: `isTorsionFree()` is not available at this point in bls12-381.
  // ProjectivePoint class has not been initialized yet.
  if (!Fp.eql(Fp.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx))) throw new Error('bad generator point: equation left != right');
  // Valid group elements reside in range 1..n-1
  function isWithinCurveOrder(num) {
    return ut.inRange(num, _1n, CURVE.n);
  }
  // Validates if priv key is valid and converts it to bigint.
  // Supports options allowedPrivateKeyLengths and wrapPrivateKey.
  function normPrivateKeyToScalar(key) {
    const {
      allowedPrivateKeyLengths: lengths,
      nByteLength,
      wrapPrivateKey,
      n: N
    } = CURVE;
    if (lengths && typeof key !== 'bigint') {
      if (ut.isBytes(key)) key = ut.bytesToHex(key);
      // Normalize to hex string, pad. E.g. P521 would norm 130-132 char hex to 132-char bytes
      if (typeof key !== 'string' || !lengths.includes(key.length)) throw new Error('invalid private key');
      key = key.padStart(nByteLength * 2, '0');
    }
    let num;
    try {
      num = typeof key === 'bigint' ? key : ut.bytesToNumberBE((0, utils_js_1.ensureBytes)('private key', key, nByteLength));
    } catch (error) {
      throw new Error('invalid private key, expected hex or ' + nByteLength + ' bytes, got ' + typeof key);
    }
    if (wrapPrivateKey) num = (0, modular_js_1.mod)(num, N); // disabled by default, enabled for BLS
    ut.aInRange('private key', num, _1n, N); // num in range [1..N-1]
    return num;
  }
  function assertPrjPoint(other) {
    if (!(other instanceof Point)) throw new Error('ProjectivePoint expected');
  }
  // Memoized toAffine / validity check. They are heavy. Points are immutable.
  // Converts Projective point to affine (x, y) coordinates.
  // Can accept precomputed Z^-1 - for example, from invertBatch.
  // (x, y, z) ∋ (x=x/z, y=y/z)
  const toAffineMemo = (0, utils_js_1.memoized)((p, iz) => {
    const {
      px: x,
      py: y,
      pz: z
    } = p;
    // Fast-path for normalized points
    if (Fp.eql(z, Fp.ONE)) return {
      x,
      y
    };
    const is0 = p.is0();
    // If invZ was 0, we return zero point. However we still want to execute
    // all operations, so we replace invZ with a random number, 1.
    if (iz == null) iz = is0 ? Fp.ONE : Fp.inv(z);
    const ax = Fp.mul(x, iz);
    const ay = Fp.mul(y, iz);
    const zz = Fp.mul(z, iz);
    if (is0) return {
      x: Fp.ZERO,
      y: Fp.ZERO
    };
    if (!Fp.eql(zz, Fp.ONE)) throw new Error('invZ was invalid');
    return {
      x: ax,
      y: ay
    };
  });
  // NOTE: on exception this will crash 'cached' and no value will be set.
  // Otherwise true will be return
  const assertValidMemo = (0, utils_js_1.memoized)(p => {
    if (p.is0()) {
      // (0, 1, 0) aka ZERO is invalid in most contexts.
      // In BLS, ZERO can be serialized, so we allow it.
      // (0, 0, 0) is invalid representation of ZERO.
      if (CURVE.allowInfinityPoint && !Fp.is0(p.py)) return;
      throw new Error('bad point: ZERO');
    }
    // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
    const {
      x,
      y
    } = p.toAffine();
    // Check if x, y are valid field elements
    if (!Fp.isValid(x) || !Fp.isValid(y)) throw new Error('bad point: x or y not FE');
    const left = Fp.sqr(y); // y²
    const right = weierstrassEquation(x); // x³ + ax + b
    if (!Fp.eql(left, right)) throw new Error('bad point: equation left != right');
    if (!p.isTorsionFree()) throw new Error('bad point: not in prime-order subgroup');
    return true;
  });
  /**
   * Projective Point works in 3d / projective (homogeneous) coordinates: (x, y, z) ∋ (x=x/z, y=y/z)
   * Default Point works in 2d / affine coordinates: (x, y)
   * We're doing calculations in projective, because its operations don't require costly inversion.
   */
  class Point {
    constructor(px, py, pz) {
      this.px = px;
      this.py = py;
      this.pz = pz;
      if (px == null || !Fp.isValid(px)) throw new Error('x required');
      if (py == null || !Fp.isValid(py)) throw new Error('y required');
      if (pz == null || !Fp.isValid(pz)) throw new Error('z required');
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const {
        x,
        y
      } = p || {};
      if (!p || !Fp.isValid(x) || !Fp.isValid(y)) throw new Error('invalid affine point');
      if (p instanceof Point) throw new Error('projective point not allowed');
      const is0 = i => Fp.eql(i, Fp.ZERO);
      // fromAffine(x:0, y:0) would produce (x:0, y:0, z:1), but we need (x:0, y:1, z:0)
      if (is0(x) && is0(y)) return Point.ZERO;
      return new Point(x, y, Fp.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(points) {
      const toInv = Fp.invertBatch(points.map(p => p.pz));
      return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(hex) {
      const P = Point.fromAffine(fromBytes((0, utils_js_1.ensureBytes)('pointHex', hex)));
      P.assertValidity();
      return P;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(privateKey) {
      return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
    }
    // Multiscalar Multiplication
    static msm(points, scalars) {
      return (0, curve_js_1.pippenger)(Point, Fn, points, scalars);
    }
    // "Private method", don't use it directly
    _setWindowSize(windowSize) {
      wnaf.setWindowSize(this, windowSize);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      assertValidMemo(this);
    }
    hasEvenY() {
      const {
        y
      } = this.toAffine();
      if (Fp.isOdd) return !Fp.isOdd(y);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(other) {
      assertPrjPoint(other);
      const {
        px: X1,
        py: Y1,
        pz: Z1
      } = this;
      const {
        px: X2,
        py: Y2,
        pz: Z2
      } = other;
      const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
      const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
      return U1 && U2;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new Point(this.px, Fp.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const {
        a,
        b
      } = CURVE;
      const b3 = Fp.mul(b, _3n);
      const {
        px: X1,
        py: Y1,
        pz: Z1
      } = this;
      let X3 = Fp.ZERO,
        Y3 = Fp.ZERO,
        Z3 = Fp.ZERO; // prettier-ignore
      let t0 = Fp.mul(X1, X1); // step 1
      let t1 = Fp.mul(Y1, Y1);
      let t2 = Fp.mul(Z1, Z1);
      let t3 = Fp.mul(X1, Y1);
      t3 = Fp.add(t3, t3); // step 5
      Z3 = Fp.mul(X1, Z1);
      Z3 = Fp.add(Z3, Z3);
      X3 = Fp.mul(a, Z3);
      Y3 = Fp.mul(b3, t2);
      Y3 = Fp.add(X3, Y3); // step 10
      X3 = Fp.sub(t1, Y3);
      Y3 = Fp.add(t1, Y3);
      Y3 = Fp.mul(X3, Y3);
      X3 = Fp.mul(t3, X3);
      Z3 = Fp.mul(b3, Z3); // step 15
      t2 = Fp.mul(a, t2);
      t3 = Fp.sub(t0, t2);
      t3 = Fp.mul(a, t3);
      t3 = Fp.add(t3, Z3);
      Z3 = Fp.add(t0, t0); // step 20
      t0 = Fp.add(Z3, t0);
      t0 = Fp.add(t0, t2);
      t0 = Fp.mul(t0, t3);
      Y3 = Fp.add(Y3, t0);
      t2 = Fp.mul(Y1, Z1); // step 25
      t2 = Fp.add(t2, t2);
      t0 = Fp.mul(t2, t3);
      X3 = Fp.sub(X3, t0);
      Z3 = Fp.mul(t2, t1);
      Z3 = Fp.add(Z3, Z3); // step 30
      Z3 = Fp.add(Z3, Z3);
      return new Point(X3, Y3, Z3);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(other) {
      assertPrjPoint(other);
      const {
        px: X1,
        py: Y1,
        pz: Z1
      } = this;
      const {
        px: X2,
        py: Y2,
        pz: Z2
      } = other;
      let X3 = Fp.ZERO,
        Y3 = Fp.ZERO,
        Z3 = Fp.ZERO; // prettier-ignore
      const a = CURVE.a;
      const b3 = Fp.mul(CURVE.b, _3n);
      let t0 = Fp.mul(X1, X2); // step 1
      let t1 = Fp.mul(Y1, Y2);
      let t2 = Fp.mul(Z1, Z2);
      let t3 = Fp.add(X1, Y1);
      let t4 = Fp.add(X2, Y2); // step 5
      t3 = Fp.mul(t3, t4);
      t4 = Fp.add(t0, t1);
      t3 = Fp.sub(t3, t4);
      t4 = Fp.add(X1, Z1);
      let t5 = Fp.add(X2, Z2); // step 10
      t4 = Fp.mul(t4, t5);
      t5 = Fp.add(t0, t2);
      t4 = Fp.sub(t4, t5);
      t5 = Fp.add(Y1, Z1);
      X3 = Fp.add(Y2, Z2); // step 15
      t5 = Fp.mul(t5, X3);
      X3 = Fp.add(t1, t2);
      t5 = Fp.sub(t5, X3);
      Z3 = Fp.mul(a, t4);
      X3 = Fp.mul(b3, t2); // step 20
      Z3 = Fp.add(X3, Z3);
      X3 = Fp.sub(t1, Z3);
      Z3 = Fp.add(t1, Z3);
      Y3 = Fp.mul(X3, Z3);
      t1 = Fp.add(t0, t0); // step 25
      t1 = Fp.add(t1, t0);
      t2 = Fp.mul(a, t2);
      t4 = Fp.mul(b3, t4);
      t1 = Fp.add(t1, t2);
      t2 = Fp.sub(t0, t2); // step 30
      t2 = Fp.mul(a, t2);
      t4 = Fp.add(t4, t2);
      t0 = Fp.mul(t1, t4);
      Y3 = Fp.add(Y3, t0);
      t0 = Fp.mul(t5, t4); // step 35
      X3 = Fp.mul(t3, X3);
      X3 = Fp.sub(X3, t0);
      t0 = Fp.mul(t3, t1);
      Z3 = Fp.mul(t5, Z3);
      Z3 = Fp.add(Z3, t0); // step 40
      return new Point(X3, Y3, Z3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    wNAF(n) {
      return wnaf.wNAFCached(this, n, Point.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(sc) {
      const {
        endo,
        n: N
      } = CURVE;
      ut.aInRange('scalar', sc, _0n, N);
      const I = Point.ZERO;
      if (sc === _0n) return I;
      if (this.is0() || sc === _1n) return this;
      // Case a: no endomorphism. Case b: has precomputes.
      if (!endo || wnaf.hasPrecomputes(this)) return wnaf.wNAFCachedUnsafe(this, sc, Point.normalizeZ);
      // Case c: endomorphism
      let {
        k1neg,
        k1,
        k2neg,
        k2
      } = endo.splitScalar(sc);
      let k1p = I;
      let k2p = I;
      let d = this;
      while (k1 > _0n || k2 > _0n) {
        if (k1 & _1n) k1p = k1p.add(d);
        if (k2 & _1n) k2p = k2p.add(d);
        d = d.double();
        k1 >>= _1n;
        k2 >>= _1n;
      }
      if (k1neg) k1p = k1p.negate();
      if (k2neg) k2p = k2p.negate();
      k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
      return k1p.add(k2p);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(scalar) {
      const {
        endo,
        n: N
      } = CURVE;
      ut.aInRange('scalar', scalar, _1n, N);
      let point, fake; // Fake point is used to const-time mult
      if (endo) {
        const {
          k1neg,
          k1,
          k2neg,
          k2
        } = endo.splitScalar(scalar);
        let {
          p: k1p,
          f: f1p
        } = this.wNAF(k1);
        let {
          p: k2p,
          f: f2p
        } = this.wNAF(k2);
        k1p = wnaf.constTimeNegate(k1neg, k1p);
        k2p = wnaf.constTimeNegate(k2neg, k2p);
        k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
        point = k1p.add(k2p);
        fake = f1p.add(f2p);
      } else {
        const {
          p,
          f
        } = this.wNAF(scalar);
        point = p;
        fake = f;
      }
      // Normalize `z` for both points, but return only real one
      return Point.normalizeZ([point, fake])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(Q, a, b) {
      const G = Point.BASE; // No Strauss-Shamir trick: we have 10% faster G precomputes
      const mul = (P, a // Select faster multiply() method
      ) => a === _0n || a === _1n || !P.equals(G) ? P.multiplyUnsafe(a) : P.multiply(a);
      const sum = mul(this, a).add(mul(Q, b));
      return sum.is0() ? undefined : sum;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(iz) {
      return toAffineMemo(this, iz);
    }
    isTorsionFree() {
      const {
        h: cofactor,
        isTorsionFree
      } = CURVE;
      if (cofactor === _1n) return true; // No subgroups, always torsion-free
      if (isTorsionFree) return isTorsionFree(Point, this);
      throw new Error('isTorsionFree() has not been declared for the elliptic curve');
    }
    clearCofactor() {
      const {
        h: cofactor,
        clearCofactor
      } = CURVE;
      if (cofactor === _1n) return this; // Fast-path
      if (clearCofactor) return clearCofactor(Point, this);
      return this.multiplyUnsafe(CURVE.h);
    }
    toRawBytes(isCompressed = true) {
      (0, utils_js_1.abool)('isCompressed', isCompressed);
      this.assertValidity();
      return toBytes(Point, this, isCompressed);
    }
    toHex(isCompressed = true) {
      (0, utils_js_1.abool)('isCompressed', isCompressed);
      return ut.bytesToHex(this.toRawBytes(isCompressed));
    }
  }
  Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
  Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
  const _bits = CURVE.nBitLength;
  const wnaf = (0, curve_js_1.wNAF)(Point, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
  // Validate if generator point is on curve
  return {
    CURVE,
    ProjectivePoint: Point,
    normPrivateKeyToScalar,
    weierstrassEquation,
    isWithinCurveOrder
  };
}
function validateOpts(curve) {
  const opts = (0, curve_js_1.validateBasic)(curve);
  ut.validateObject(opts, {
    hash: 'hash',
    hmac: 'function',
    randomBytes: 'function'
  }, {
    bits2int: 'function',
    bits2int_modN: 'function',
    lowS: 'boolean'
  });
  return Object.freeze({
    lowS: true,
    ...opts
  });
}
/**
 * Creates short weierstrass curve and ECDSA signature methods for it.
 * @example
 * import { Field } from '@noble/curves/abstract/modular';
 * // Before that, define BigInt-s: a, b, p, n, Gx, Gy
 * const curve = weierstrass({ a, b, Fp: Field(p), n, Gx, Gy, h: 1n })
 */
function weierstrass(curveDef) {
  const CURVE = validateOpts(curveDef);
  const {
    Fp,
    n: CURVE_ORDER
  } = CURVE;
  const compressedLen = Fp.BYTES + 1; // e.g. 33 for 32
  const uncompressedLen = 2 * Fp.BYTES + 1; // e.g. 65 for 32
  function modN(a) {
    return (0, modular_js_1.mod)(a, CURVE_ORDER);
  }
  function invN(a) {
    return (0, modular_js_1.invert)(a, CURVE_ORDER);
  }
  const {
    ProjectivePoint: Point,
    normPrivateKeyToScalar,
    weierstrassEquation,
    isWithinCurveOrder
  } = weierstrassPoints({
    ...CURVE,
    toBytes(_c, point, isCompressed) {
      const a = point.toAffine();
      const x = Fp.toBytes(a.x);
      const cat = ut.concatBytes;
      (0, utils_js_1.abool)('isCompressed', isCompressed);
      if (isCompressed) {
        return cat(Uint8Array.from([point.hasEvenY() ? 0x02 : 0x03]), x);
      } else {
        return cat(Uint8Array.from([0x04]), x, Fp.toBytes(a.y));
      }
    },
    fromBytes(bytes) {
      const len = bytes.length;
      const head = bytes[0];
      const tail = bytes.subarray(1);
      // this.assertValidity() is done inside of fromHex
      if (len === compressedLen && (head === 0x02 || head === 0x03)) {
        const x = ut.bytesToNumberBE(tail);
        if (!ut.inRange(x, _1n, Fp.ORDER)) throw new Error('Point is not on curve');
        const y2 = weierstrassEquation(x); // y² = x³ + ax + b
        let y;
        try {
          y = Fp.sqrt(y2); // y = y² ^ (p+1)/4
        } catch (sqrtError) {
          const suffix = sqrtError instanceof Error ? ': ' + sqrtError.message : '';
          throw new Error('Point is not on curve' + suffix);
        }
        const isYOdd = (y & _1n) === _1n;
        // ECDSA
        const isHeadOdd = (head & 1) === 1;
        if (isHeadOdd !== isYOdd) y = Fp.neg(y);
        return {
          x,
          y
        };
      } else if (len === uncompressedLen && head === 0x04) {
        const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
        const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
        return {
          x,
          y
        };
      } else {
        const cl = compressedLen;
        const ul = uncompressedLen;
        throw new Error('invalid Point, expected length of ' + cl + ', or uncompressed ' + ul + ', got ' + len);
      }
    }
  });
  const numToNByteStr = num => ut.bytesToHex(ut.numberToBytesBE(num, CURVE.nByteLength));
  function isBiggerThanHalfOrder(number) {
    const HALF = CURVE_ORDER >> _1n;
    return number > HALF;
  }
  function normalizeS(s) {
    return isBiggerThanHalfOrder(s) ? modN(-s) : s;
  }
  // slice bytes num
  const slcNum = (b, from, to) => ut.bytesToNumberBE(b.slice(from, to));
  /**
   * ECDSA signature with its (r, s) properties. Supports DER & compact representations.
   */
  class Signature {
    constructor(r, s, recovery) {
      this.r = r;
      this.s = s;
      this.recovery = recovery;
      this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(hex) {
      const l = CURVE.nByteLength;
      hex = (0, utils_js_1.ensureBytes)('compactSignature', hex, l * 2);
      return new Signature(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(hex) {
      const {
        r,
        s
      } = exports.DER.toSig((0, utils_js_1.ensureBytes)('DER', hex));
      return new Signature(r, s);
    }
    assertValidity() {
      ut.aInRange('r', this.r, _1n, CURVE_ORDER); // r in [1..N]
      ut.aInRange('s', this.s, _1n, CURVE_ORDER); // s in [1..N]
    }
    addRecoveryBit(recovery) {
      return new Signature(this.r, this.s, recovery);
    }
    recoverPublicKey(msgHash) {
      const {
        r,
        s,
        recovery: rec
      } = this;
      const h = bits2int_modN((0, utils_js_1.ensureBytes)('msgHash', msgHash)); // Truncate hash
      if (rec == null || ![0, 1, 2, 3].includes(rec)) throw new Error('recovery id invalid');
      const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
      if (radj >= Fp.ORDER) throw new Error('recovery id 2 or 3 invalid');
      const prefix = (rec & 1) === 0 ? '02' : '03';
      const R = Point.fromHex(prefix + numToNByteStr(radj));
      const ir = invN(radj); // r^-1
      const u1 = modN(-h * ir); // -hr^-1
      const u2 = modN(s * ir); // sr^-1
      const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2); // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1)
      if (!Q) throw new Error('point at infinify'); // unsafe is fine: no priv data leaked
      Q.assertValidity();
      return Q;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return isBiggerThanHalfOrder(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return ut.hexToBytes(this.toDERHex());
    }
    toDERHex() {
      return exports.DER.hexFromSig({
        r: this.r,
        s: this.s
      });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return ut.hexToBytes(this.toCompactHex());
    }
    toCompactHex() {
      return numToNByteStr(this.r) + numToNByteStr(this.s);
    }
  }
  const utils = {
    isValidPrivateKey(privateKey) {
      try {
        normPrivateKeyToScalar(privateKey);
        return true;
      } catch (error) {
        return false;
      }
    },
    normPrivateKeyToScalar: normPrivateKeyToScalar,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const length = (0, modular_js_1.getMinHashLength)(CURVE.n);
      return (0, modular_js_1.mapHashToField)(CURVE.randomBytes(length), CURVE.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(windowSize = 8, point = Point.BASE) {
      point._setWindowSize(windowSize);
      point.multiply(BigInt(3)); // 3 is arbitrary, just need any number here
      return point;
    }
  };
  /**
   * Computes public key for a private key. Checks for validity of the private key.
   * @param privateKey private key
   * @param isCompressed whether to return compact (default), or full key
   * @returns Public key, full when isCompressed=false; short when isCompressed=true
   */
  function getPublicKey(privateKey, isCompressed = true) {
    return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
  }
  /**
   * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
   */
  function isProbPub(item) {
    const arr = ut.isBytes(item);
    const str = typeof item === 'string';
    const len = (arr || str) && item.length;
    if (arr) return len === compressedLen || len === uncompressedLen;
    if (str) return len === 2 * compressedLen || len === 2 * uncompressedLen;
    if (item instanceof Point) return true;
    return false;
  }
  /**
   * ECDH (Elliptic Curve Diffie Hellman).
   * Computes shared public key from private key and public key.
   * Checks: 1) private key validity 2) shared key is on-curve.
   * Does NOT hash the result.
   * @param privateA private key
   * @param publicB different public key
   * @param isCompressed whether to return compact (default), or full key
   * @returns shared public key
   */
  function getSharedSecret(privateA, publicB, isCompressed = true) {
    if (isProbPub(privateA)) throw new Error('first arg must be private key');
    if (!isProbPub(publicB)) throw new Error('second arg must be public key');
    const b = Point.fromHex(publicB); // check for being on-curve
    return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
  }
  // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
  // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
  // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
  // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
  const bits2int = CURVE.bits2int || function (bytes) {
    // Our custom check "just in case"
    if (bytes.length > 8192) throw new Error('input is too large');
    // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
    // for some cases, since bytes.length * 8 is not actual bitLength.
    const num = ut.bytesToNumberBE(bytes); // check for == u8 done here
    const delta = bytes.length * 8 - CURVE.nBitLength; // truncate to nBitLength leftmost bits
    return delta > 0 ? num >> BigInt(delta) : num;
  };
  const bits2int_modN = CURVE.bits2int_modN || function (bytes) {
    return modN(bits2int(bytes)); // can't use bytesToNumberBE here
  };
  // NOTE: pads output with zero as per spec
  const ORDER_MASK = ut.bitMask(CURVE.nBitLength);
  /**
   * Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`.
   */
  function int2octets(num) {
    ut.aInRange('num < 2^' + CURVE.nBitLength, num, _0n, ORDER_MASK);
    // works with order, can have different size than numToField!
    return ut.numberToBytesBE(num, CURVE.nByteLength);
  }
  // Steps A, D of RFC6979 3.2
  // Creates RFC6979 seed; converts msg/privKey to numbers.
  // Used only in sign, not in verify.
  // NOTE: we cannot assume here that msgHash has same amount of bytes as curve order,
  // this will be invalid at least for P521. Also it can be bigger for P224 + SHA256
  function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
    if (['recovered', 'canonical'].some(k => k in opts)) throw new Error('sign() legacy options not supported');
    const {
      hash,
      randomBytes
    } = CURVE;
    let {
      lowS,
      prehash,
      extraEntropy: ent
    } = opts; // generates low-s sigs by default
    if (lowS == null) lowS = true; // RFC6979 3.2: we skip step A, because we already provide hash
    msgHash = (0, utils_js_1.ensureBytes)('msgHash', msgHash);
    validateSigVerOpts(opts);
    if (prehash) msgHash = (0, utils_js_1.ensureBytes)('prehashed msgHash', hash(msgHash));
    // We can't later call bits2octets, since nested bits2int is broken for curves
    // with nBitLength % 8 !== 0. Because of that, we unwrap it here as int2octets call.
    // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
    const h1int = bits2int_modN(msgHash);
    const d = normPrivateKeyToScalar(privateKey); // validate private key, convert to bigint
    const seedArgs = [int2octets(d), int2octets(h1int)];
    // extraEntropy. RFC6979 3.6: additional k' (optional).
    if (ent != null && ent !== false) {
      // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
      const e = ent === true ? randomBytes(Fp.BYTES) : ent; // generate random bytes OR pass as-is
      seedArgs.push((0, utils_js_1.ensureBytes)('extraEntropy', e)); // check for being bytes
    }
    const seed = ut.concatBytes(...seedArgs); // Step D of RFC6979 3.2
    const m = h1int; // NOTE: no need to call bits2int second time here, it is inside truncateHash!
    // Converts signature params into point w r/s, checks result for validity.
    function k2sig(kBytes) {
      // RFC 6979 Section 3.2, step 3: k = bits2int(T)
      const k = bits2int(kBytes); // Cannot use fields methods, since it is group element
      if (!isWithinCurveOrder(k)) return; // Important: all mod() calls here must be done over N
      const ik = invN(k); // k^-1 mod n
      const q = Point.BASE.multiply(k).toAffine(); // q = Gk
      const r = modN(q.x); // r = q.x mod n
      if (r === _0n) return;
      // Can use scalar blinding b^-1(bm + bdr) where b ∈ [1,q−1] according to
      // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. We've decided against it:
      // a) dependency on CSPRNG b) 15% slowdown c) doesn't really help since bigints are not CT
      const s = modN(ik * modN(m + r * d)); // Not using blinding here
      if (s === _0n) return;
      let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n); // recovery bit (2 or 3, when q.x > n)
      let normS = s;
      if (lowS && isBiggerThanHalfOrder(s)) {
        normS = normalizeS(s); // if lowS was passed, ensure s is always
        recovery ^= 1; // // in the bottom half of N
      }
      return new Signature(r, normS, recovery); // use normS, not s
    }
    return {
      seed,
      k2sig
    };
  }
  const defaultSigOpts = {
    lowS: CURVE.lowS,
    prehash: false
  };
  const defaultVerOpts = {
    lowS: CURVE.lowS,
    prehash: false
  };
  /**
   * Signs message hash with a private key.
   * ```
   * sign(m, d, k) where
   *   (x, y) = G × k
   *   r = x mod n
   *   s = (m + dr)/k mod n
   * ```
   * @param msgHash NOT message. msg needs to be hashed to `msgHash`, or use `prehash`.
   * @param privKey private key
   * @param opts lowS for non-malleable sigs. extraEntropy for mixing randomness into k. prehash will hash first arg.
   * @returns signature with recovery param
   */
  function sign(msgHash, privKey, opts = defaultSigOpts) {
    const {
      seed,
      k2sig
    } = prepSig(msgHash, privKey, opts); // Steps A, D of RFC6979 3.2.
    const C = CURVE;
    const drbg = ut.createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
    return drbg(seed, k2sig); // Steps B, C, D, E, F, G
  }
  // Enable precomputes. Slows down first publicKey computation by 20ms.
  Point.BASE._setWindowSize(8);
  // utils.precompute(8, ProjectivePoint.BASE)
  /**
   * Verifies a signature against message hash and public key.
   * Rejects lowS signatures by default: to override,
   * specify option `{lowS: false}`. Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
   *
   * ```
   * verify(r, s, h, P) where
   *   U1 = hs^-1 mod n
   *   U2 = rs^-1 mod n
   *   R = U1⋅G - U2⋅P
   *   mod(R.x, n) == r
   * ```
   */
  function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
    const sg = signature;
    msgHash = (0, utils_js_1.ensureBytes)('msgHash', msgHash);
    publicKey = (0, utils_js_1.ensureBytes)('publicKey', publicKey);
    const {
      lowS,
      prehash,
      format
    } = opts;
    // Verify opts, deduce signature format
    validateSigVerOpts(opts);
    if ('strict' in opts) throw new Error('options.strict was renamed to lowS');
    if (format !== undefined && format !== 'compact' && format !== 'der') throw new Error('format must be compact or der');
    const isHex = typeof sg === 'string' || ut.isBytes(sg);
    const isObj = !isHex && !format && typeof sg === 'object' && sg !== null && typeof sg.r === 'bigint' && typeof sg.s === 'bigint';
    if (!isHex && !isObj) throw new Error('invalid signature, expected Uint8Array, hex string or Signature instance');
    let _sig = undefined;
    let P;
    try {
      if (isObj) _sig = new Signature(sg.r, sg.s);
      if (isHex) {
        // Signature can be represented in 2 ways: compact (2*nByteLength) & DER (variable-length).
        // Since DER can also be 2*nByteLength bytes, we check for it first.
        try {
          if (format !== 'compact') _sig = Signature.fromDER(sg);
        } catch (derError) {
          if (!(derError instanceof exports.DER.Err)) throw derError;
        }
        if (!_sig && format !== 'der') _sig = Signature.fromCompact(sg);
      }
      P = Point.fromHex(publicKey);
    } catch (error) {
      return false;
    }
    if (!_sig) return false;
    if (lowS && _sig.hasHighS()) return false;
    if (prehash) msgHash = CURVE.hash(msgHash);
    const {
      r,
      s
    } = _sig;
    const h = bits2int_modN(msgHash); // Cannot use fields methods, since it is group element
    const is = invN(s); // s^-1
    const u1 = modN(h * is); // u1 = hs^-1 mod n
    const u2 = modN(r * is); // u2 = rs^-1 mod n
    const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine(); // R = u1⋅G + u2⋅P
    if (!R) return false;
    const v = modN(R.x);
    return v === r;
  }
  return {
    CURVE,
    getPublicKey,
    getSharedSecret,
    sign,
    verify,
    ProjectivePoint: Point,
    Signature,
    utils
  };
}
/**
 * Implementation of the Shallue and van de Woestijne method for any weierstrass curve.
 * TODO: check if there is a way to merge this with uvRatio in Edwards; move to modular.
 * b = True and y = sqrt(u / v) if (u / v) is square in F, and
 * b = False and y = sqrt(Z * (u / v)) otherwise.
 * @param Fp
 * @param Z
 * @returns
 */
function SWUFpSqrtRatio(Fp, Z) {
  // Generic implementation
  const q = Fp.ORDER;
  let l = _0n;
  for (let o = q - _1n; o % _2n === _0n; o /= _2n) l += _1n;
  const c1 = l; // 1. c1, the largest integer such that 2^c1 divides q - 1.
  // We need 2n ** c1 and 2n ** (c1-1). We can't use **; but we can use <<.
  // 2n ** c1 == 2n << (c1-1)
  const _2n_pow_c1_1 = _2n << c1 - _1n - _1n;
  const _2n_pow_c1 = _2n_pow_c1_1 * _2n;
  const c2 = (q - _1n) / _2n_pow_c1; // 2. c2 = (q - 1) / (2^c1)  # Integer arithmetic
  const c3 = (c2 - _1n) / _2n; // 3. c3 = (c2 - 1) / 2            # Integer arithmetic
  const c4 = _2n_pow_c1 - _1n; // 4. c4 = 2^c1 - 1                # Integer arithmetic
  const c5 = _2n_pow_c1_1; // 5. c5 = 2^(c1 - 1)                  # Integer arithmetic
  const c6 = Fp.pow(Z, c2); // 6. c6 = Z^c2
  const c7 = Fp.pow(Z, (c2 + _1n) / _2n); // 7. c7 = Z^((c2 + 1) / 2)
  let sqrtRatio = (u, v) => {
    let tv1 = c6; // 1. tv1 = c6
    let tv2 = Fp.pow(v, c4); // 2. tv2 = v^c4
    let tv3 = Fp.sqr(tv2); // 3. tv3 = tv2^2
    tv3 = Fp.mul(tv3, v); // 4. tv3 = tv3 * v
    let tv5 = Fp.mul(u, tv3); // 5. tv5 = u * tv3
    tv5 = Fp.pow(tv5, c3); // 6. tv5 = tv5^c3
    tv5 = Fp.mul(tv5, tv2); // 7. tv5 = tv5 * tv2
    tv2 = Fp.mul(tv5, v); // 8. tv2 = tv5 * v
    tv3 = Fp.mul(tv5, u); // 9. tv3 = tv5 * u
    let tv4 = Fp.mul(tv3, tv2); // 10. tv4 = tv3 * tv2
    tv5 = Fp.pow(tv4, c5); // 11. tv5 = tv4^c5
    let isQR = Fp.eql(tv5, Fp.ONE); // 12. isQR = tv5 == 1
    tv2 = Fp.mul(tv3, c7); // 13. tv2 = tv3 * c7
    tv5 = Fp.mul(tv4, tv1); // 14. tv5 = tv4 * tv1
    tv3 = Fp.cmov(tv2, tv3, isQR); // 15. tv3 = CMOV(tv2, tv3, isQR)
    tv4 = Fp.cmov(tv5, tv4, isQR); // 16. tv4 = CMOV(tv5, tv4, isQR)
    // 17. for i in (c1, c1 - 1, ..., 2):
    for (let i = c1; i > _1n; i--) {
      let tv5 = i - _2n; // 18.    tv5 = i - 2
      tv5 = _2n << tv5 - _1n; // 19.    tv5 = 2^tv5
      let tvv5 = Fp.pow(tv4, tv5); // 20.    tv5 = tv4^tv5
      const e1 = Fp.eql(tvv5, Fp.ONE); // 21.    e1 = tv5 == 1
      tv2 = Fp.mul(tv3, tv1); // 22.    tv2 = tv3 * tv1
      tv1 = Fp.mul(tv1, tv1); // 23.    tv1 = tv1 * tv1
      tvv5 = Fp.mul(tv4, tv1); // 24.    tv5 = tv4 * tv1
      tv3 = Fp.cmov(tv2, tv3, e1); // 25.    tv3 = CMOV(tv2, tv3, e1)
      tv4 = Fp.cmov(tvv5, tv4, e1); // 26.    tv4 = CMOV(tv5, tv4, e1)
    }
    return {
      isValid: isQR,
      value: tv3
    };
  };
  if (Fp.ORDER % _4n === _3n) {
    // sqrt_ratio_3mod4(u, v)
    const c1 = (Fp.ORDER - _3n) / _4n; // 1. c1 = (q - 3) / 4     # Integer arithmetic
    const c2 = Fp.sqrt(Fp.neg(Z)); // 2. c2 = sqrt(-Z)
    sqrtRatio = (u, v) => {
      let tv1 = Fp.sqr(v); // 1. tv1 = v^2
      const tv2 = Fp.mul(u, v); // 2. tv2 = u * v
      tv1 = Fp.mul(tv1, tv2); // 3. tv1 = tv1 * tv2
      let y1 = Fp.pow(tv1, c1); // 4. y1 = tv1^c1
      y1 = Fp.mul(y1, tv2); // 5. y1 = y1 * tv2
      const y2 = Fp.mul(y1, c2); // 6. y2 = y1 * c2
      const tv3 = Fp.mul(Fp.sqr(y1), v); // 7. tv3 = y1^2; 8. tv3 = tv3 * v
      const isQR = Fp.eql(tv3, u); // 9. isQR = tv3 == u
      let y = Fp.cmov(y2, y1, isQR); // 10. y = CMOV(y2, y1, isQR)
      return {
        isValid: isQR,
        value: y
      }; // 11. return (isQR, y) isQR ? y : y*c2
    };
  }
  // No curves uses that
  // if (Fp.ORDER % _8n === _5n) // sqrt_ratio_5mod8
  return sqrtRatio;
}
/**
 * Simplified Shallue-van de Woestijne-Ulas Method
 * https://www.rfc-editor.org/rfc/rfc9380#section-6.6.2
 */
function mapToCurveSimpleSWU(Fp, opts) {
  (0, modular_js_1.validateField)(Fp);
  if (!Fp.isValid(opts.A) || !Fp.isValid(opts.B) || !Fp.isValid(opts.Z)) throw new Error('mapToCurveSimpleSWU: invalid opts');
  const sqrtRatio = SWUFpSqrtRatio(Fp, opts.Z);
  if (!Fp.isOdd) throw new Error('Fp.isOdd is not implemented!');
  // Input: u, an element of F.
  // Output: (x, y), a point on E.
  return u => {
    // prettier-ignore
    let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
    tv1 = Fp.sqr(u); // 1.  tv1 = u^2
    tv1 = Fp.mul(tv1, opts.Z); // 2.  tv1 = Z * tv1
    tv2 = Fp.sqr(tv1); // 3.  tv2 = tv1^2
    tv2 = Fp.add(tv2, tv1); // 4.  tv2 = tv2 + tv1
    tv3 = Fp.add(tv2, Fp.ONE); // 5.  tv3 = tv2 + 1
    tv3 = Fp.mul(tv3, opts.B); // 6.  tv3 = B * tv3
    tv4 = Fp.cmov(opts.Z, Fp.neg(tv2), !Fp.eql(tv2, Fp.ZERO)); // 7.  tv4 = CMOV(Z, -tv2, tv2 != 0)
    tv4 = Fp.mul(tv4, opts.A); // 8.  tv4 = A * tv4
    tv2 = Fp.sqr(tv3); // 9.  tv2 = tv3^2
    tv6 = Fp.sqr(tv4); // 10. tv6 = tv4^2
    tv5 = Fp.mul(tv6, opts.A); // 11. tv5 = A * tv6
    tv2 = Fp.add(tv2, tv5); // 12. tv2 = tv2 + tv5
    tv2 = Fp.mul(tv2, tv3); // 13. tv2 = tv2 * tv3
    tv6 = Fp.mul(tv6, tv4); // 14. tv6 = tv6 * tv4
    tv5 = Fp.mul(tv6, opts.B); // 15. tv5 = B * tv6
    tv2 = Fp.add(tv2, tv5); // 16. tv2 = tv2 + tv5
    x = Fp.mul(tv1, tv3); // 17.   x = tv1 * tv3
    const {
      isValid,
      value
    } = sqrtRatio(tv2, tv6); // 18. (is_gx1_square, y1) = sqrt_ratio(tv2, tv6)
    y = Fp.mul(tv1, u); // 19.   y = tv1 * u  -> Z * u^3 * y1
    y = Fp.mul(y, value); // 20.   y = y * y1
    x = Fp.cmov(x, tv3, isValid); // 21.   x = CMOV(x, tv3, is_gx1_square)
    y = Fp.cmov(y, value, isValid); // 22.   y = CMOV(y, y1, is_gx1_square)
    const e1 = Fp.isOdd(u) === Fp.isOdd(y); // 23.  e1 = sgn0(u) == sgn0(y)
    y = Fp.cmov(Fp.neg(y), y, e1); // 24.   y = CMOV(-y, y, e1)
    x = Fp.div(x, tv4); // 25.   x = x / tv4
    return {
      x,
      y
    };
  };
}

},{"./curve.js":6,"./modular.js":9,"./utils.js":11}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hash_to_ristretto255 = exports.hashToRistretto255 = exports.RistrettoPoint = exports.encodeToCurve = exports.hashToCurve = exports.edwardsToMontgomery = exports.x25519 = exports.ed25519ph = exports.ed25519ctx = exports.ed25519 = exports.ED25519_TORSION_SUBGROUP = void 0;
exports.edwardsToMontgomeryPub = edwardsToMontgomeryPub;
exports.edwardsToMontgomeryPriv = edwardsToMontgomeryPriv;
/**
 * ed25519 Twisted Edwards curve with following addons:
 * - X25519 ECDH
 * - Ristretto cofactor elimination
 * - Elligator hash-to-group / point indistinguishability
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sha512_1 = require("@noble/hashes/sha512");
const utils_1 = require("@noble/hashes/utils");
const curve_js_1 = require("./abstract/curve.js");
const edwards_js_1 = require("./abstract/edwards.js");
const hash_to_curve_js_1 = require("./abstract/hash-to-curve.js");
const modular_js_1 = require("./abstract/modular.js");
const montgomery_js_1 = require("./abstract/montgomery.js");
const utils_js_1 = require("./abstract/utils.js");
const ED25519_P = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');
// √(-1) aka √(a) aka 2^((p-1)/4)
const ED25519_SQRT_M1 = /* @__PURE__ */BigInt('19681161376707505956807079304988542015446066515923890162744021073123829784752');
// prettier-ignore
const _0n = BigInt(0),
  _1n = BigInt(1),
  _2n = BigInt(2),
  _3n = BigInt(3);
// prettier-ignore
const _5n = BigInt(5),
  _8n = BigInt(8);
function ed25519_pow_2_252_3(x) {
  // prettier-ignore
  const _10n = BigInt(10),
    _20n = BigInt(20),
    _40n = BigInt(40),
    _80n = BigInt(80);
  const P = ED25519_P;
  const x2 = x * x % P;
  const b2 = x2 * x % P; // x^3, 11
  const b4 = (0, modular_js_1.pow2)(b2, _2n, P) * b2 % P; // x^15, 1111
  const b5 = (0, modular_js_1.pow2)(b4, _1n, P) * x % P; // x^31
  const b10 = (0, modular_js_1.pow2)(b5, _5n, P) * b5 % P;
  const b20 = (0, modular_js_1.pow2)(b10, _10n, P) * b10 % P;
  const b40 = (0, modular_js_1.pow2)(b20, _20n, P) * b20 % P;
  const b80 = (0, modular_js_1.pow2)(b40, _40n, P) * b40 % P;
  const b160 = (0, modular_js_1.pow2)(b80, _80n, P) * b80 % P;
  const b240 = (0, modular_js_1.pow2)(b160, _80n, P) * b80 % P;
  const b250 = (0, modular_js_1.pow2)(b240, _10n, P) * b10 % P;
  const pow_p_5_8 = (0, modular_js_1.pow2)(b250, _2n, P) * x % P;
  // ^ To pow to (p+3)/8, multiply it by x.
  return {
    pow_p_5_8,
    b2
  };
}
function adjustScalarBytes(bytes) {
  // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
  // set the three least significant bits of the first byte
  bytes[0] &= 248; // 0b1111_1000
  // and the most significant bit of the last to zero,
  bytes[31] &= 127; // 0b0111_1111
  // set the second most significant bit of the last byte to 1
  bytes[31] |= 64; // 0b0100_0000
  return bytes;
}
// sqrt(u/v)
function uvRatio(u, v) {
  const P = ED25519_P;
  const v3 = (0, modular_js_1.mod)(v * v * v, P); // v³
  const v7 = (0, modular_js_1.mod)(v3 * v3 * v, P); // v⁷
  // (p+3)/8 and (p-5)/8
  const pow = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
  let x = (0, modular_js_1.mod)(u * v3 * pow, P); // (uv³)(uv⁷)^(p-5)/8
  const vx2 = (0, modular_js_1.mod)(v * x * x, P); // vx²
  const root1 = x; // First root candidate
  const root2 = (0, modular_js_1.mod)(x * ED25519_SQRT_M1, P); // Second root candidate
  const useRoot1 = vx2 === u; // If vx² = u (mod p), x is a square root
  const useRoot2 = vx2 === (0, modular_js_1.mod)(-u, P); // If vx² = -u, set x <-- x * 2^((p-1)/4)
  const noRoot = vx2 === (0, modular_js_1.mod)(-u * ED25519_SQRT_M1, P); // There is no valid root, vx² = -u√(-1)
  if (useRoot1) x = root1;
  if (useRoot2 || noRoot) x = root2; // We return root2 anyway, for const-time
  if ((0, modular_js_1.isNegativeLE)(x, P)) x = (0, modular_js_1.mod)(-x, P);
  return {
    isValid: useRoot1 || useRoot2,
    value: x
  };
}
// Just in case
exports.ED25519_TORSION_SUBGROUP = ['0100000000000000000000000000000000000000000000000000000000000000', 'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a', '0000000000000000000000000000000000000000000000000000000000000080', '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05', 'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f', '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85', '0000000000000000000000000000000000000000000000000000000000000000', 'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa'];
const Fp = /* @__PURE__ */(() => (0, modular_js_1.Field)(ED25519_P, undefined, true))();
const ed25519Defaults = /* @__PURE__ */(() => ({
  // Param: a
  a: BigInt(-1),
  // Fp.create(-1) is proper; our way still works and is faster
  // d is equal to -121665/121666 over finite field.
  // Negative number is P - number, and division is invert(number, P)
  d: BigInt('37095705934669439343138083508754565189542113879843219016388785533085940283555'),
  // Finite field 𝔽p over which we'll do calculations; 2n**255n - 19n
  Fp,
  // Subgroup order: how many points curve has
  // 2n**252n + 27742317777372353535851937790883648493n;
  n: BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989'),
  // Cofactor
  h: _8n,
  // Base point (x, y) aka generator point
  Gx: BigInt('15112221349535400772501151409588531511454012693041857206046113283949847762202'),
  Gy: BigInt('46316835694926478169428394003475163141307993866256225615783033603165251855960'),
  hash: sha512_1.sha512,
  randomBytes: utils_1.randomBytes,
  adjustScalarBytes,
  // dom2
  // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
  // Constant-time, u/√v
  uvRatio
}))();
/**
 * ed25519 curve with EdDSA signatures.
 * @example
 * import { ed25519 } from '@noble/curves/ed25519';
 * const priv = ed25519.utils.randomPrivateKey();
 * const pub = ed25519.getPublicKey(priv);
 * const msg = new TextEncoder().encode('hello');
 * const sig = ed25519.sign(msg, priv);
 * ed25519.verify(sig, msg, pub); // Default mode: follows ZIP215
 * ed25519.verify(sig, msg, pub, { zip215: false }); // RFC8032 / FIPS 186-5
 */
exports.ed25519 = (() => (0, edwards_js_1.twistedEdwards)(ed25519Defaults))();
function ed25519_domain(data, ctx, phflag) {
  if (ctx.length > 255) throw new Error('Context is too big');
  return (0, utils_1.concatBytes)((0, utils_1.utf8ToBytes)('SigEd25519 no Ed25519 collisions'), new Uint8Array([phflag ? 1 : 0, ctx.length]), ctx, data);
}
exports.ed25519ctx = (() => (0, edwards_js_1.twistedEdwards)({
  ...ed25519Defaults,
  domain: ed25519_domain
}))();
exports.ed25519ph = (() => (0, edwards_js_1.twistedEdwards)(Object.assign({}, ed25519Defaults, {
  domain: ed25519_domain,
  prehash: sha512_1.sha512
})))();
/**
 * ECDH using curve25519 aka x25519.
 * @example
 * import { x25519 } from '@noble/curves/ed25519';
 * const priv = 'a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4';
 * const pub = 'e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c';
 * x25519.getSharedSecret(priv, pub) === x25519.scalarMult(priv, pub); // aliases
 * x25519.getPublicKey(priv) === x25519.scalarMultBase(priv);
 * x25519.getPublicKey(x25519.utils.randomPrivateKey());
 */
exports.x25519 = (() => (0, montgomery_js_1.montgomery)({
  P: ED25519_P,
  a: BigInt(486662),
  montgomeryBits: 255,
  // n is 253 bits
  nByteLength: 32,
  Gu: BigInt(9),
  powPminus2: x => {
    const P = ED25519_P;
    // x^(p-2) aka x^(2^255-21)
    const {
      pow_p_5_8,
      b2
    } = ed25519_pow_2_252_3(x);
    return (0, modular_js_1.mod)((0, modular_js_1.pow2)(pow_p_5_8, _3n, P) * b2, P);
  },
  adjustScalarBytes,
  randomBytes: utils_1.randomBytes
}))();
/**
 * Converts ed25519 public key to x25519 public key. Uses formula:
 * * `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
 * * `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
 * @example
 *   const someonesPub = ed25519.getPublicKey(ed25519.utils.randomPrivateKey());
 *   const aPriv = x25519.utils.randomPrivateKey();
 *   x25519.getSharedSecret(aPriv, edwardsToMontgomeryPub(someonesPub))
 */
function edwardsToMontgomeryPub(edwardsPub) {
  const {
    y
  } = exports.ed25519.ExtendedPoint.fromHex(edwardsPub);
  const _1n = BigInt(1);
  return Fp.toBytes(Fp.create((_1n + y) * Fp.inv(_1n - y)));
}
exports.edwardsToMontgomery = edwardsToMontgomeryPub; // deprecated
/**
 * Converts ed25519 secret key to x25519 secret key.
 * @example
 *   const someonesPub = x25519.getPublicKey(x25519.utils.randomPrivateKey());
 *   const aPriv = ed25519.utils.randomPrivateKey();
 *   x25519.getSharedSecret(edwardsToMontgomeryPriv(aPriv), someonesPub)
 */
function edwardsToMontgomeryPriv(edwardsPriv) {
  const hashed = ed25519Defaults.hash(edwardsPriv.subarray(0, 32));
  return ed25519Defaults.adjustScalarBytes(hashed).subarray(0, 32);
}
// Hash To Curve Elligator2 Map (NOTE: different from ristretto255 elligator)
// NOTE: very important part is usage of FpSqrtEven for ELL2_C1_EDWARDS, since
// SageMath returns different root first and everything falls apart
const ELL2_C1 = /* @__PURE__ */(() => (Fp.ORDER + _3n) / _8n)(); // 1. c1 = (q + 3) / 8       # Integer arithmetic
const ELL2_C2 = /* @__PURE__ */(() => Fp.pow(_2n, ELL2_C1))(); // 2. c2 = 2^c1
const ELL2_C3 = /* @__PURE__ */(() => Fp.sqrt(Fp.neg(Fp.ONE)))(); // 3. c3 = sqrt(-1)
// prettier-ignore
function map_to_curve_elligator2_curve25519(u) {
  const ELL2_C4 = (Fp.ORDER - _5n) / _8n; // 4. c4 = (q - 5) / 8       # Integer arithmetic
  const ELL2_J = BigInt(486662);
  let tv1 = Fp.sqr(u); //  1.  tv1 = u^2
  tv1 = Fp.mul(tv1, _2n); //  2.  tv1 = 2 * tv1
  let xd = Fp.add(tv1, Fp.ONE); //  3.   xd = tv1 + 1         # Nonzero: -1 is square (mod p), tv1 is not
  let x1n = Fp.neg(ELL2_J); //  4.  x1n = -J              # x1 = x1n / xd = -J / (1 + 2 * u^2)
  let tv2 = Fp.sqr(xd); //  5.  tv2 = xd^2
  let gxd = Fp.mul(tv2, xd); //  6.  gxd = tv2 * xd        # gxd = xd^3
  let gx1 = Fp.mul(tv1, ELL2_J); //  7.  gx1 = J * tv1         # x1n + J * xd
  gx1 = Fp.mul(gx1, x1n); //  8.  gx1 = gx1 * x1n       # x1n^2 + J * x1n * xd
  gx1 = Fp.add(gx1, tv2); //  9.  gx1 = gx1 + tv2       # x1n^2 + J * x1n * xd + xd^2
  gx1 = Fp.mul(gx1, x1n); //  10. gx1 = gx1 * x1n       # x1n^3 + J * x1n^2 * xd + x1n * xd^2
  let tv3 = Fp.sqr(gxd); //  11. tv3 = gxd^2
  tv2 = Fp.sqr(tv3); //  12. tv2 = tv3^2           # gxd^4
  tv3 = Fp.mul(tv3, gxd); //  13. tv3 = tv3 * gxd       # gxd^3
  tv3 = Fp.mul(tv3, gx1); //  14. tv3 = tv3 * gx1       # gx1 * gxd^3
  tv2 = Fp.mul(tv2, tv3); //  15. tv2 = tv2 * tv3       # gx1 * gxd^7
  let y11 = Fp.pow(tv2, ELL2_C4); //  16. y11 = tv2^c4        # (gx1 * gxd^7)^((p - 5) / 8)
  y11 = Fp.mul(y11, tv3); //  17. y11 = y11 * tv3       # gx1*gxd^3*(gx1*gxd^7)^((p-5)/8)
  let y12 = Fp.mul(y11, ELL2_C3); //  18. y12 = y11 * c3
  tv2 = Fp.sqr(y11); //  19. tv2 = y11^2
  tv2 = Fp.mul(tv2, gxd); //  20. tv2 = tv2 * gxd
  let e1 = Fp.eql(tv2, gx1); //  21.  e1 = tv2 == gx1
  let y1 = Fp.cmov(y12, y11, e1); //  22.  y1 = CMOV(y12, y11, e1)  # If g(x1) is square, this is its sqrt
  let x2n = Fp.mul(x1n, tv1); //  23. x2n = x1n * tv1       # x2 = x2n / xd = 2 * u^2 * x1n / xd
  let y21 = Fp.mul(y11, u); //  24. y21 = y11 * u
  y21 = Fp.mul(y21, ELL2_C2); //  25. y21 = y21 * c2
  let y22 = Fp.mul(y21, ELL2_C3); //  26. y22 = y21 * c3
  let gx2 = Fp.mul(gx1, tv1); //  27. gx2 = gx1 * tv1       # g(x2) = gx2 / gxd = 2 * u^2 * g(x1)
  tv2 = Fp.sqr(y21); //  28. tv2 = y21^2
  tv2 = Fp.mul(tv2, gxd); //  29. tv2 = tv2 * gxd
  let e2 = Fp.eql(tv2, gx2); //  30.  e2 = tv2 == gx2
  let y2 = Fp.cmov(y22, y21, e2); //  31.  y2 = CMOV(y22, y21, e2)  # If g(x2) is square, this is its sqrt
  tv2 = Fp.sqr(y1); //  32. tv2 = y1^2
  tv2 = Fp.mul(tv2, gxd); //  33. tv2 = tv2 * gxd
  let e3 = Fp.eql(tv2, gx1); //  34.  e3 = tv2 == gx1
  let xn = Fp.cmov(x2n, x1n, e3); //  35.  xn = CMOV(x2n, x1n, e3)  # If e3, x = x1, else x = x2
  let y = Fp.cmov(y2, y1, e3); //  36.   y = CMOV(y2, y1, e3)    # If e3, y = y1, else y = y2
  let e4 = Fp.isOdd(y); //  37.  e4 = sgn0(y) == 1        # Fix sign of y
  y = Fp.cmov(y, Fp.neg(y), e3 !== e4); //  38.   y = CMOV(y, -y, e3 XOR e4)
  return {
    xMn: xn,
    xMd: xd,
    yMn: y,
    yMd: _1n
  }; //  39. return (xn, xd, y, 1)
}
const ELL2_C1_EDWARDS = /* @__PURE__ */(() => (0, modular_js_1.FpSqrtEven)(Fp, Fp.neg(BigInt(486664))))(); // sgn0(c1) MUST equal 0
function map_to_curve_elligator2_edwards25519(u) {
  const {
    xMn,
    xMd,
    yMn,
    yMd
  } = map_to_curve_elligator2_curve25519(u); //  1.  (xMn, xMd, yMn, yMd) =
  // map_to_curve_elligator2_curve25519(u)
  let xn = Fp.mul(xMn, yMd); //  2.  xn = xMn * yMd
  xn = Fp.mul(xn, ELL2_C1_EDWARDS); //  3.  xn = xn * c1
  let xd = Fp.mul(xMd, yMn); //  4.  xd = xMd * yMn    # xn / xd = c1 * xM / yM
  let yn = Fp.sub(xMn, xMd); //  5.  yn = xMn - xMd
  let yd = Fp.add(xMn, xMd); //  6.  yd = xMn + xMd    # (n / d - 1) / (n / d + 1) = (n - d) / (n + d)
  let tv1 = Fp.mul(xd, yd); //  7. tv1 = xd * yd
  let e = Fp.eql(tv1, Fp.ZERO); //  8.   e = tv1 == 0
  xn = Fp.cmov(xn, Fp.ZERO, e); //  9.  xn = CMOV(xn, 0, e)
  xd = Fp.cmov(xd, Fp.ONE, e); //  10. xd = CMOV(xd, 1, e)
  yn = Fp.cmov(yn, Fp.ONE, e); //  11. yn = CMOV(yn, 1, e)
  yd = Fp.cmov(yd, Fp.ONE, e); //  12. yd = CMOV(yd, 1, e)
  const inv = Fp.invertBatch([xd, yd]); // batch division
  return {
    x: Fp.mul(xn, inv[0]),
    y: Fp.mul(yn, inv[1])
  }; //  13. return (xn, xd, yn, yd)
}
const htf = /* @__PURE__ */(() => (0, hash_to_curve_js_1.createHasher)(exports.ed25519.ExtendedPoint, scalars => map_to_curve_elligator2_edwards25519(scalars[0]), {
  DST: 'edwards25519_XMD:SHA-512_ELL2_RO_',
  encodeDST: 'edwards25519_XMD:SHA-512_ELL2_NU_',
  p: Fp.ORDER,
  m: 1,
  k: 128,
  expand: 'xmd',
  hash: sha512_1.sha512
}))();
exports.hashToCurve = (() => htf.hashToCurve)();
exports.encodeToCurve = (() => htf.encodeToCurve)();
function assertRstPoint(other) {
  if (!(other instanceof RistPoint)) throw new Error('RistrettoPoint expected');
}
// √(-1) aka √(a) aka 2^((p-1)/4)
const SQRT_M1 = ED25519_SQRT_M1;
// √(ad - 1)
const SQRT_AD_MINUS_ONE = /* @__PURE__ */BigInt('25063068953384623474111414158702152701244531502492656460079210482610430750235');
// 1 / √(a-d)
const INVSQRT_A_MINUS_D = /* @__PURE__ */BigInt('54469307008909316920995813868745141605393597292927456921205312896311721017578');
// 1-d²
const ONE_MINUS_D_SQ = /* @__PURE__ */BigInt('1159843021668779879193775521855586647937357759715417654439879720876111806838');
// (d-1)²
const D_MINUS_ONE_SQ = /* @__PURE__ */BigInt('40440834346308536858101042469323190826248399146238708352240133220865137265952');
// Calculates 1/√(number)
const invertSqrt = number => uvRatio(_1n, number);
const MAX_255B = /* @__PURE__ */BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
const bytes255ToNumberLE = bytes => exports.ed25519.CURVE.Fp.create((0, utils_js_1.bytesToNumberLE)(bytes) & MAX_255B);
// Computes Elligator map for Ristretto
// https://ristretto.group/formulas/elligator.html
function calcElligatorRistrettoMap(r0) {
  const {
    d
  } = exports.ed25519.CURVE;
  const P = exports.ed25519.CURVE.Fp.ORDER;
  const mod = exports.ed25519.CURVE.Fp.create;
  const r = mod(SQRT_M1 * r0 * r0); // 1
  const Ns = mod((r + _1n) * ONE_MINUS_D_SQ); // 2
  let c = BigInt(-1); // 3
  const D = mod((c - d * r) * mod(r + d)); // 4
  let {
    isValid: Ns_D_is_sq,
    value: s
  } = uvRatio(Ns, D); // 5
  let s_ = mod(s * r0); // 6
  if (!(0, modular_js_1.isNegativeLE)(s_, P)) s_ = mod(-s_);
  if (!Ns_D_is_sq) s = s_; // 7
  if (!Ns_D_is_sq) c = r; // 8
  const Nt = mod(c * (r - _1n) * D_MINUS_ONE_SQ - D); // 9
  const s2 = s * s;
  const W0 = mod((s + s) * D); // 10
  const W1 = mod(Nt * SQRT_AD_MINUS_ONE); // 11
  const W2 = mod(_1n - s2); // 12
  const W3 = mod(_1n + s2); // 13
  return new exports.ed25519.ExtendedPoint(mod(W0 * W3), mod(W2 * W1), mod(W1 * W3), mod(W0 * W2));
}
/**
 * Each ed25519/ExtendedPoint has 8 different equivalent points. This can be
 * a source of bugs for protocols like ring signatures. Ristretto was created to solve this.
 * Ristretto point operates in X:Y:Z:T extended coordinates like ExtendedPoint,
 * but it should work in its own namespace: do not combine those two.
 * https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-ristretto255-decaf448
 */
class RistPoint {
  // Private property to discourage combining ExtendedPoint + RistrettoPoint
  // Always use Ristretto encoding/decoding instead.
  constructor(ep) {
    this.ep = ep;
  }
  static fromAffine(ap) {
    return new RistPoint(exports.ed25519.ExtendedPoint.fromAffine(ap));
  }
  /**
   * Takes uniform output of 64-byte hash function like sha512 and converts it to `RistrettoPoint`.
   * The hash-to-group operation applies Elligator twice and adds the results.
   * **Note:** this is one-way map, there is no conversion from point to hash.
   * https://ristretto.group/formulas/elligator.html
   * @param hex 64-byte output of a hash function
   */
  static hashToCurve(hex) {
    hex = (0, utils_js_1.ensureBytes)('ristrettoHash', hex, 64);
    const r1 = bytes255ToNumberLE(hex.slice(0, 32));
    const R1 = calcElligatorRistrettoMap(r1);
    const r2 = bytes255ToNumberLE(hex.slice(32, 64));
    const R2 = calcElligatorRistrettoMap(r2);
    return new RistPoint(R1.add(R2));
  }
  /**
   * Converts ristretto-encoded string to ristretto point.
   * https://ristretto.group/formulas/decoding.html
   * @param hex Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
   */
  static fromHex(hex) {
    hex = (0, utils_js_1.ensureBytes)('ristrettoHex', hex, 32);
    const {
      a,
      d
    } = exports.ed25519.CURVE;
    const P = exports.ed25519.CURVE.Fp.ORDER;
    const mod = exports.ed25519.CURVE.Fp.create;
    const emsg = 'RistrettoPoint.fromHex: the hex is not valid encoding of RistrettoPoint';
    const s = bytes255ToNumberLE(hex);
    // 1. Check that s_bytes is the canonical encoding of a field element, or else abort.
    // 3. Check that s is non-negative, or else abort
    if (!(0, utils_js_1.equalBytes)((0, utils_js_1.numberToBytesLE)(s, 32), hex) || (0, modular_js_1.isNegativeLE)(s, P)) throw new Error(emsg);
    const s2 = mod(s * s);
    const u1 = mod(_1n + a * s2); // 4 (a is -1)
    const u2 = mod(_1n - a * s2); // 5
    const u1_2 = mod(u1 * u1);
    const u2_2 = mod(u2 * u2);
    const v = mod(a * d * u1_2 - u2_2); // 6
    const {
      isValid,
      value: I
    } = invertSqrt(mod(v * u2_2)); // 7
    const Dx = mod(I * u2); // 8
    const Dy = mod(I * Dx * v); // 9
    let x = mod((s + s) * Dx); // 10
    if ((0, modular_js_1.isNegativeLE)(x, P)) x = mod(-x); // 10
    const y = mod(u1 * Dy); // 11
    const t = mod(x * y); // 12
    if (!isValid || (0, modular_js_1.isNegativeLE)(t, P) || y === _0n) throw new Error(emsg);
    return new RistPoint(new exports.ed25519.ExtendedPoint(x, y, _1n, t));
  }
  static msm(points, scalars) {
    const Fn = (0, modular_js_1.Field)(exports.ed25519.CURVE.n, exports.ed25519.CURVE.nBitLength);
    return (0, curve_js_1.pippenger)(RistPoint, Fn, points, scalars);
  }
  /**
   * Encodes ristretto point to Uint8Array.
   * https://ristretto.group/formulas/encoding.html
   */
  toRawBytes() {
    let {
      ex: x,
      ey: y,
      ez: z,
      et: t
    } = this.ep;
    const P = exports.ed25519.CURVE.Fp.ORDER;
    const mod = exports.ed25519.CURVE.Fp.create;
    const u1 = mod(mod(z + y) * mod(z - y)); // 1
    const u2 = mod(x * y); // 2
    // Square root always exists
    const u2sq = mod(u2 * u2);
    const {
      value: invsqrt
    } = invertSqrt(mod(u1 * u2sq)); // 3
    const D1 = mod(invsqrt * u1); // 4
    const D2 = mod(invsqrt * u2); // 5
    const zInv = mod(D1 * D2 * t); // 6
    let D; // 7
    if ((0, modular_js_1.isNegativeLE)(t * zInv, P)) {
      let _x = mod(y * SQRT_M1);
      let _y = mod(x * SQRT_M1);
      x = _x;
      y = _y;
      D = mod(D1 * INVSQRT_A_MINUS_D);
    } else {
      D = D2; // 8
    }
    if ((0, modular_js_1.isNegativeLE)(x * zInv, P)) y = mod(-y); // 9
    let s = mod((z - y) * D); // 10 (check footer's note, no sqrt(-a))
    if ((0, modular_js_1.isNegativeLE)(s, P)) s = mod(-s);
    return (0, utils_js_1.numberToBytesLE)(s, 32); // 11
  }
  toHex() {
    return (0, utils_js_1.bytesToHex)(this.toRawBytes());
  }
  toString() {
    return this.toHex();
  }
  // Compare one point to another.
  equals(other) {
    assertRstPoint(other);
    const {
      ex: X1,
      ey: Y1
    } = this.ep;
    const {
      ex: X2,
      ey: Y2
    } = other.ep;
    const mod = exports.ed25519.CURVE.Fp.create;
    // (x1 * y2 == y1 * x2) | (y1 * y2 == x1 * x2)
    const one = mod(X1 * Y2) === mod(Y1 * X2);
    const two = mod(Y1 * Y2) === mod(X1 * X2);
    return one || two;
  }
  add(other) {
    assertRstPoint(other);
    return new RistPoint(this.ep.add(other.ep));
  }
  subtract(other) {
    assertRstPoint(other);
    return new RistPoint(this.ep.subtract(other.ep));
  }
  multiply(scalar) {
    return new RistPoint(this.ep.multiply(scalar));
  }
  multiplyUnsafe(scalar) {
    return new RistPoint(this.ep.multiplyUnsafe(scalar));
  }
  double() {
    return new RistPoint(this.ep.double());
  }
  negate() {
    return new RistPoint(this.ep.negate());
  }
}
exports.RistrettoPoint = (() => {
  if (!RistPoint.BASE) RistPoint.BASE = new RistPoint(exports.ed25519.ExtendedPoint.BASE);
  if (!RistPoint.ZERO) RistPoint.ZERO = new RistPoint(exports.ed25519.ExtendedPoint.ZERO);
  return RistPoint;
})();
// Hashing to ristretto255. https://www.rfc-editor.org/rfc/rfc9380#appendix-B
const hashToRistretto255 = (msg, options) => {
  const d = options.DST;
  const DST = typeof d === 'string' ? (0, utils_1.utf8ToBytes)(d) : d;
  const uniform_bytes = (0, hash_to_curve_js_1.expand_message_xmd)(msg, DST, 64, sha512_1.sha512);
  const P = RistPoint.hashToCurve(uniform_bytes);
  return P;
};
exports.hashToRistretto255 = hashToRistretto255;
exports.hash_to_ristretto255 = exports.hashToRistretto255; // legacy

},{"./abstract/curve.js":6,"./abstract/edwards.js":7,"./abstract/hash-to-curve.js":8,"./abstract/modular.js":9,"./abstract/montgomery.js":10,"./abstract/utils.js":11,"@noble/hashes/sha512":22,"@noble/hashes/utils":23}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeToCurve = exports.hashToCurve = exports.schnorr = exports.secp256k1 = void 0;
/**
 * NIST secp256k1. See [pdf](https://www.secg.org/sec2-v2.pdf).
 *
 * Seems to be rigid (not backdoored)
 * [as per discussion](https://bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975).
 *
 * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
 * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
 * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
 * [See explanation](https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066).
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sha256_1 = require("@noble/hashes/sha256");
const utils_1 = require("@noble/hashes/utils");
const _shortw_utils_js_1 = require("./_shortw_utils.js");
const hash_to_curve_js_1 = require("./abstract/hash-to-curve.js");
const modular_js_1 = require("./abstract/modular.js");
const utils_js_1 = require("./abstract/utils.js");
const weierstrass_js_1 = require("./abstract/weierstrass.js");
const secp256k1P = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
const secp256k1N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const _1n = BigInt(1);
const _2n = BigInt(2);
const divNearest = (a, b) => (a + b / _2n) / b;
/**
 * √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
 * (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
 */
function sqrtMod(y) {
  const P = secp256k1P;
  // prettier-ignore
  const _3n = BigInt(3),
    _6n = BigInt(6),
    _11n = BigInt(11),
    _22n = BigInt(22);
  // prettier-ignore
  const _23n = BigInt(23),
    _44n = BigInt(44),
    _88n = BigInt(88);
  const b2 = y * y * y % P; // x^3, 11
  const b3 = b2 * b2 * y % P; // x^7
  const b6 = (0, modular_js_1.pow2)(b3, _3n, P) * b3 % P;
  const b9 = (0, modular_js_1.pow2)(b6, _3n, P) * b3 % P;
  const b11 = (0, modular_js_1.pow2)(b9, _2n, P) * b2 % P;
  const b22 = (0, modular_js_1.pow2)(b11, _11n, P) * b11 % P;
  const b44 = (0, modular_js_1.pow2)(b22, _22n, P) * b22 % P;
  const b88 = (0, modular_js_1.pow2)(b44, _44n, P) * b44 % P;
  const b176 = (0, modular_js_1.pow2)(b88, _88n, P) * b88 % P;
  const b220 = (0, modular_js_1.pow2)(b176, _44n, P) * b44 % P;
  const b223 = (0, modular_js_1.pow2)(b220, _3n, P) * b3 % P;
  const t1 = (0, modular_js_1.pow2)(b223, _23n, P) * b22 % P;
  const t2 = (0, modular_js_1.pow2)(t1, _6n, P) * b2 % P;
  const root = (0, modular_js_1.pow2)(t2, _2n, P);
  if (!Fpk1.eql(Fpk1.sqr(root), y)) throw new Error('Cannot find square root');
  return root;
}
const Fpk1 = (0, modular_js_1.Field)(secp256k1P, undefined, undefined, {
  sqrt: sqrtMod
});
/**
 * secp256k1 short weierstrass curve and ECDSA signatures over it.
 *
 * @example
 * import { secp256k1 } from '@noble/curves/secp256k1';
 *
 * const priv = secp256k1.utils.randomPrivateKey();
 * const pub = secp256k1.getPublicKey(priv);
 * const msg = new Uint8Array(32).fill(1); // message hash (not message) in ecdsa
 * const sig = secp256k1.sign(msg, priv); // `{prehash: true}` option is available
 * const isValid = secp256k1.verify(sig, msg, pub) === true;
 */
exports.secp256k1 = (0, _shortw_utils_js_1.createCurve)({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  Fp: Fpk1,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: secp256k1N,
  // Curve order, total count of valid points in the field
  // Base point (x, y) aka generator point
  Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
  Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
  h: BigInt(1),
  // Cofactor
  lowS: true,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
    splitScalar: k => {
      const n = secp256k1N;
      const a1 = BigInt('0x3086d221a7d46bcde86c90e49284eb15');
      const b1 = -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3');
      const a2 = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
      const b2 = a1;
      const POW_2_128 = BigInt('0x100000000000000000000000000000000'); // (2n**128n).toString(16)
      const c1 = divNearest(b2 * k, n);
      const c2 = divNearest(-b1 * k, n);
      let k1 = (0, modular_js_1.mod)(k - c1 * a1 - c2 * a2, n);
      let k2 = (0, modular_js_1.mod)(-c1 * b1 - c2 * b2, n);
      const k1neg = k1 > POW_2_128;
      const k2neg = k2 > POW_2_128;
      if (k1neg) k1 = n - k1;
      if (k2neg) k2 = n - k2;
      if (k1 > POW_2_128 || k2 > POW_2_128) {
        throw new Error('splitScalar: Endomorphism failed, k=' + k);
      }
      return {
        k1neg,
        k1,
        k2neg,
        k2
      };
    }
  }
}, sha256_1.sha256);
// Schnorr signatures are superior to ECDSA from above. Below is Schnorr-specific BIP0340 code.
// https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
const _0n = BigInt(0);
/** An object mapping tags to their tagged hash prefix of [SHA256(tag) | SHA256(tag)] */
const TAGGED_HASH_PREFIXES = {};
function taggedHash(tag, ...messages) {
  let tagP = TAGGED_HASH_PREFIXES[tag];
  if (tagP === undefined) {
    const tagH = (0, sha256_1.sha256)(Uint8Array.from(tag, c => c.charCodeAt(0)));
    tagP = (0, utils_js_1.concatBytes)(tagH, tagH);
    TAGGED_HASH_PREFIXES[tag] = tagP;
  }
  return (0, sha256_1.sha256)((0, utils_js_1.concatBytes)(tagP, ...messages));
}
// ECDSA compact points are 33-byte. Schnorr is 32: we strip first byte 0x02 or 0x03
const pointToBytes = point => point.toRawBytes(true).slice(1);
const numTo32b = n => (0, utils_js_1.numberToBytesBE)(n, 32);
const modP = x => (0, modular_js_1.mod)(x, secp256k1P);
const modN = x => (0, modular_js_1.mod)(x, secp256k1N);
const Point = exports.secp256k1.ProjectivePoint;
const GmulAdd = (Q, a, b) => Point.BASE.multiplyAndAddUnsafe(Q, a, b);
// Calculate point, scalar and bytes
function schnorrGetExtPubKey(priv) {
  let d_ = exports.secp256k1.utils.normPrivateKeyToScalar(priv); // same method executed in fromPrivateKey
  let p = Point.fromPrivateKey(d_); // P = d'⋅G; 0 < d' < n check is done inside
  const scalar = p.hasEvenY() ? d_ : modN(-d_);
  return {
    scalar: scalar,
    bytes: pointToBytes(p)
  };
}
/**
 * lift_x from BIP340. Convert 32-byte x coordinate to elliptic curve point.
 * @returns valid point checked for being on-curve
 */
function lift_x(x) {
  (0, utils_js_1.aInRange)('x', x, _1n, secp256k1P); // Fail if x ≥ p.
  const xx = modP(x * x);
  const c = modP(xx * x + BigInt(7)); // Let c = x³ + 7 mod p.
  let y = sqrtMod(c); // Let y = c^(p+1)/4 mod p.
  if (y % _2n !== _0n) y = modP(-y); // Return the unique point P such that x(P) = x and
  const p = new Point(x, y, _1n); // y(P) = y if y mod 2 = 0 or y(P) = p-y otherwise.
  p.assertValidity();
  return p;
}
const num = utils_js_1.bytesToNumberBE;
/**
 * Create tagged hash, convert it to bigint, reduce modulo-n.
 */
function challenge(...args) {
  return modN(num(taggedHash('BIP0340/challenge', ...args)));
}
/**
 * Schnorr public key is just `x` coordinate of Point as per BIP340.
 */
function schnorrGetPublicKey(privateKey) {
  return schnorrGetExtPubKey(privateKey).bytes; // d'=int(sk). Fail if d'=0 or d'≥n. Ret bytes(d'⋅G)
}
/**
 * Creates Schnorr signature as per BIP340. Verifies itself before returning anything.
 * auxRand is optional and is not the sole source of k generation: bad CSPRNG won't be dangerous.
 */
function schnorrSign(message, privateKey, auxRand = (0, utils_1.randomBytes)(32)) {
  const m = (0, utils_js_1.ensureBytes)('message', message);
  const {
    bytes: px,
    scalar: d
  } = schnorrGetExtPubKey(privateKey); // checks for isWithinCurveOrder
  const a = (0, utils_js_1.ensureBytes)('auxRand', auxRand, 32); // Auxiliary random data a: a 32-byte array
  const t = numTo32b(d ^ num(taggedHash('BIP0340/aux', a))); // Let t be the byte-wise xor of bytes(d) and hash/aux(a)
  const rand = taggedHash('BIP0340/nonce', t, px, m); // Let rand = hash/nonce(t || bytes(P) || m)
  const k_ = modN(num(rand)); // Let k' = int(rand) mod n
  if (k_ === _0n) throw new Error('sign failed: k is zero'); // Fail if k' = 0.
  const {
    bytes: rx,
    scalar: k
  } = schnorrGetExtPubKey(k_); // Let R = k'⋅G.
  const e = challenge(rx, px, m); // Let e = int(hash/challenge(bytes(R) || bytes(P) || m)) mod n.
  const sig = new Uint8Array(64); // Let sig = bytes(R) || bytes((k + ed) mod n).
  sig.set(rx, 0);
  sig.set(numTo32b(modN(k + e * d)), 32);
  // If Verify(bytes(P), m, sig) (see below) returns failure, abort
  if (!schnorrVerify(sig, m, px)) throw new Error('sign: Invalid signature produced');
  return sig;
}
/**
 * Verifies Schnorr signature.
 * Will swallow errors & return false except for initial type validation of arguments.
 */
function schnorrVerify(signature, message, publicKey) {
  const sig = (0, utils_js_1.ensureBytes)('signature', signature, 64);
  const m = (0, utils_js_1.ensureBytes)('message', message);
  const pub = (0, utils_js_1.ensureBytes)('publicKey', publicKey, 32);
  try {
    const P = lift_x(num(pub)); // P = lift_x(int(pk)); fail if that fails
    const r = num(sig.subarray(0, 32)); // Let r = int(sig[0:32]); fail if r ≥ p.
    if (!(0, utils_js_1.inRange)(r, _1n, secp256k1P)) return false;
    const s = num(sig.subarray(32, 64)); // Let s = int(sig[32:64]); fail if s ≥ n.
    if (!(0, utils_js_1.inRange)(s, _1n, secp256k1N)) return false;
    const e = challenge(numTo32b(r), pointToBytes(P), m); // int(challenge(bytes(r)||bytes(P)||m))%n
    const R = GmulAdd(P, s, modN(-e)); // R = s⋅G - e⋅P
    if (!R || !R.hasEvenY() || R.toAffine().x !== r) return false; // -eP == (n-e)P
    return true; // Fail if is_infinite(R) / not has_even_y(R) / x(R) ≠ r.
  } catch (error) {
    return false;
  }
}
/**
 * Schnorr signatures over secp256k1.
 * https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
 * @example
 * import { schnorr } from '@noble/curves/secp256k1';
 * const priv = schnorr.utils.randomPrivateKey();
 * const pub = schnorr.getPublicKey(priv);
 * const msg = new TextEncoder().encode('hello');
 * const sig = schnorr.sign(msg, priv);
 * const isValid = schnorr.verify(sig, msg, pub);
 */
exports.schnorr = (() => ({
  getPublicKey: schnorrGetPublicKey,
  sign: schnorrSign,
  verify: schnorrVerify,
  utils: {
    randomPrivateKey: exports.secp256k1.utils.randomPrivateKey,
    lift_x,
    pointToBytes,
    numberToBytesBE: utils_js_1.numberToBytesBE,
    bytesToNumberBE: utils_js_1.bytesToNumberBE,
    taggedHash,
    mod: modular_js_1.mod
  }
}))();
const isoMap = /* @__PURE__ */(() => (0, hash_to_curve_js_1.isogenyMap)(Fpk1, [
// xNum
['0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7', '0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581', '0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262', '0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c'],
// xDen
['0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b', '0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14', '0x0000000000000000000000000000000000000000000000000000000000000001' // LAST 1
],
// yNum
['0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c', '0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3', '0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931', '0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84'],
// yDen
['0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b', '0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573', '0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f', '0x0000000000000000000000000000000000000000000000000000000000000001' // LAST 1
]].map(i => i.map(j => BigInt(j)))))();
const mapSWU = /* @__PURE__ */(() => (0, weierstrass_js_1.mapToCurveSimpleSWU)(Fpk1, {
  A: BigInt('0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533'),
  B: BigInt('1771'),
  Z: Fpk1.create(BigInt('-11'))
}))();
const htf = /* @__PURE__ */(() => (0, hash_to_curve_js_1.createHasher)(exports.secp256k1.ProjectivePoint, scalars => {
  const {
    x,
    y
  } = mapSWU(Fpk1.create(scalars[0]));
  return isoMap(x, y);
}, {
  DST: 'secp256k1_XMD:SHA-256_SSWU_RO_',
  encodeDST: 'secp256k1_XMD:SHA-256_SSWU_NU_',
  p: Fpk1.ORDER,
  m: 1,
  k: 128,
  expand: 'xmd',
  hash: sha256_1.sha256
}))();
/** secp256k1 hash-to-curve from [RFC 9380](https://www.rfc-editor.org/rfc/rfc9380). */
exports.hashToCurve = (() => htf.hashToCurve)();
/** secp256k1 encode-to-curve from [RFC 9380](https://www.rfc-editor.org/rfc/rfc9380). */
exports.encodeToCurve = (() => htf.encodeToCurve)();

},{"./_shortw_utils.js":5,"./abstract/hash-to-curve.js":8,"./abstract/modular.js":9,"./abstract/utils.js":11,"./abstract/weierstrass.js":12,"@noble/hashes/sha256":20,"@noble/hashes/utils":23}],15:[function(require,module,exports){
"use strict";
/**
 * Internal assertion helpers.
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.anumber = anumber;
exports.abytes = abytes;
exports.ahash = ahash;
exports.aexists = aexists;
exports.aoutput = aoutput;
/** Asserts something is positive integer. */
function anumber(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error('positive integer expected, got ' + n);
}
/** Is number an Uint8Array? Copied from utils for perf. */
function isBytes(a) {
    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
}
/** Asserts something is Uint8Array. */
function abytes(b, ...lengths) {
    if (!isBytes(b))
        throw new Error('Uint8Array expected');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
}
/** Asserts something is hash */
function ahash(h) {
    if (typeof h !== 'function' || typeof h.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    anumber(h.outputLen);
    anumber(h.blockLen);
}
/** Asserts a hash instance has not been destroyed / finished */
function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
/** Asserts output is properly-sized byte array */
function aoutput(out, instance) {
    abytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error('digestInto() expects output buffer of length at least ' + min);
    }
}

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashMD = void 0;
exports.setBigUint64 = setBigUint64;
exports.Chi = Chi;
exports.Maj = Maj;
/**
 * Internal Merkle-Damgard hash utils.
 * @module
 */
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
/** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
/** Choice: a ? b : c */
function Chi(a, b, c) {
    return (a & b) ^ (~a & c);
}
/** Majority function, true if any two inputs is true. */
function Maj(a, b, c) {
    return (a & b) ^ (a & c) ^ (b & c);
}
/**
 * Merkle-Damgard hash construction base class.
 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
 */
class HashMD extends utils_js_1.Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = (0, utils_js_1.createView)(this.buffer);
    }
    update(data) {
        (0, _assert_js_1.aexists)(this);
        const { view, buffer, blockLen } = this;
        data = (0, utils_js_1.toBytes)(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = (0, utils_js_1.createView)(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        (0, _assert_js_1.aexists)(this);
        (0, _assert_js_1.aoutput)(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in
        // current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = (0, utils_js_1.createView)(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
exports.HashMD = HashMD;

},{"./_assert.js":15,"./utils.js":23}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add5L = exports.add5H = exports.add4H = exports.add4L = exports.add3H = exports.add3L = exports.rotlBL = exports.rotlBH = exports.rotlSL = exports.rotlSH = exports.rotr32L = exports.rotr32H = exports.rotrBL = exports.rotrBH = exports.rotrSL = exports.rotrSH = exports.shrSL = exports.shrSH = exports.toBig = void 0;
exports.fromBig = fromBig;
exports.split = split;
exports.add = add;
/**
 * Internal helpers for u64. BigUint64Array is too slow as per 2025, so we implement it using Uint32Array.
 * @todo re-check https://issues.chromium.org/issues/42212588
 * @module
 */
const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
exports.toBig = toBig;
// for Shift in [0, 32)
const shrSH = (h, _l, s) => h >>> s;
exports.shrSH = shrSH;
const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
exports.shrSL = shrSL;
// Right rotate for Shift in [1, 32)
const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
exports.rotrSH = rotrSH;
const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
exports.rotrSL = rotrSL;
// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
exports.rotrBH = rotrBH;
const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
exports.rotrBL = rotrBL;
// Right rotate for shift===32 (just swaps l&h)
const rotr32H = (_h, l) => l;
exports.rotr32H = rotr32H;
const rotr32L = (h, _l) => h;
exports.rotr32L = rotr32L;
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
exports.rotlSH = rotlSH;
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
exports.rotlSL = rotlSL;
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
exports.rotlBH = rotlBH;
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
exports.rotlBL = rotlBL;
// JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.
function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
// Addition with more than 2 elements
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
exports.add3L = add3L;
const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
exports.add3H = add3H;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
exports.add4L = add4L;
const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
exports.add4H = add4H;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
exports.add5L = add5L;
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
exports.add5H = add5H;
// prettier-ignore
const u64 = {
    fromBig, split, toBig,
    shrSH, shrSL,
    rotrSH, rotrSL, rotrBH, rotrBL,
    rotr32H, rotr32L,
    rotlSH, rotlSL, rotlBH, rotlBL,
    add, add3L, add3H, add4L, add4H, add5H, add5L,
};
exports.default = u64;

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crypto = void 0;
exports.crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;

},{}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hmac = exports.HMAC = void 0;
/**
 * HMAC: RFC2104 message authentication code.
 * @module
 */
const _assert_js_1 = require("./_assert.js");
const utils_js_1 = require("./utils.js");
class HMAC extends utils_js_1.Hash {
  constructor(hash, _key) {
    super();
    this.finished = false;
    this.destroyed = false;
    (0, _assert_js_1.ahash)(hash);
    const key = (0, utils_js_1.toBytes)(_key);
    this.iHash = hash.create();
    if (typeof this.iHash.update !== 'function') throw new Error('Expected instance of class which extends utils.Hash');
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    // blockLen can be bigger than outputLen
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++) pad[i] ^= 0x36;
    this.iHash.update(pad);
    // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
    this.oHash = hash.create();
    // Undo internal XOR && apply outer XOR
    for (let i = 0; i < pad.length; i++) pad[i] ^= 0x36 ^ 0x5c;
    this.oHash.update(pad);
    pad.fill(0);
  }
  update(buf) {
    (0, _assert_js_1.aexists)(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    (0, _assert_js_1.aexists)(this);
    (0, _assert_js_1.abytes)(out, this.outputLen);
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    // Create new instance without calling constructor since key already in state and we don't know it.
    to || (to = Object.create(Object.getPrototypeOf(this), {}));
    const {
      oHash,
      iHash,
      finished,
      destroyed,
      blockLen,
      outputLen
    } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
}
exports.HMAC = HMAC;
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 * @example
 * import { hmac } from '@noble/hashes/hmac';
 * import { sha256 } from '@noble/hashes/sha2';
 * const mac1 = hmac(sha256, 'key', 'message');
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
exports.hmac = hmac;
exports.hmac.create = (hash, key) => new HMAC(hash, key);

},{"./_assert.js":15,"./utils.js":23}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha224 = exports.sha256 = exports.SHA256 = void 0;
/**
 * SHA2-256 a.k.a. sha256. In JS, it is the fastest hash, even faster than Blake3.
 *
 * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
 * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
 *
 * Check out [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
 * @module
 */
const _md_js_1 = require("./_md.js");
const utils_js_1 = require("./utils.js");
/** Round constants: first 32 bits of fractional parts of the cube roots of the first 64 primes 2..311). */
// prettier-ignore
const SHA256_K = /* @__PURE__ */ new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
/** Initial state: first 32 bits of fractional parts of the square roots of the first 8 primes 2..19. */
// prettier-ignore
const SHA256_IV = /* @__PURE__ */ new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
/**
 * Temporary buffer, not used to store anything between runs.
 * Named this way because it matches specification.
 */
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
class SHA256 extends _md_js_1.HashMD {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = SHA256_IV[0] | 0;
        this.B = SHA256_IV[1] | 0;
        this.C = SHA256_IV[2] | 0;
        this.D = SHA256_IV[3] | 0;
        this.E = SHA256_IV[4] | 0;
        this.F = SHA256_IV[5] | 0;
        this.G = SHA256_IV[6] | 0;
        this.H = SHA256_IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = (0, utils_js_1.rotr)(W15, 7) ^ (0, utils_js_1.rotr)(W15, 18) ^ (W15 >>> 3);
            const s1 = (0, utils_js_1.rotr)(W2, 17) ^ (0, utils_js_1.rotr)(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = (0, utils_js_1.rotr)(E, 6) ^ (0, utils_js_1.rotr)(E, 11) ^ (0, utils_js_1.rotr)(E, 25);
            const T1 = (H + sigma1 + (0, _md_js_1.Chi)(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = (0, utils_js_1.rotr)(A, 2) ^ (0, utils_js_1.rotr)(A, 13) ^ (0, utils_js_1.rotr)(A, 22);
            const T2 = (sigma0 + (0, _md_js_1.Maj)(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
exports.SHA256 = SHA256;
/**
 * Constants taken from https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf.
 */
class SHA224 extends SHA256 {
    constructor() {
        super();
        this.A = 0xc1059ed8 | 0;
        this.B = 0x367cd507 | 0;
        this.C = 0x3070dd17 | 0;
        this.D = 0xf70e5939 | 0;
        this.E = 0xffc00b31 | 0;
        this.F = 0x68581511 | 0;
        this.G = 0x64f98fa7 | 0;
        this.H = 0xbefa4fa4 | 0;
        this.outputLen = 28;
    }
}
/** SHA2-256 hash function */
exports.sha256 = (0, utils_js_1.wrapConstructor)(() => new SHA256());
/** SHA2-224 hash function */
exports.sha224 = (0, utils_js_1.wrapConstructor)(() => new SHA224());

},{"./_md.js":16,"./utils.js":23}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shake256 = exports.shake128 = exports.keccak_512 = exports.keccak_384 = exports.keccak_256 = exports.keccak_224 = exports.sha3_512 = exports.sha3_384 = exports.sha3_256 = exports.sha3_224 = exports.Keccak = void 0;
exports.keccakP = keccakP;
/**
 * SHA3 (keccak) hash function, based on a new "Sponge function" design.
 * Different from older hashes, the internal state is bigger than output size.
 *
 * Check out [FIPS-202](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf),
 * [Website](https://keccak.team/keccak.html),
 * [the differences between SHA-3 and Keccak](https://crypto.stackexchange.com/questions/15727/what-are-the-key-differences-between-the-draft-sha-3-standard-and-the-keccak-sub).
 *
 * Check out `sha3-addons` module for cSHAKE, k12, and others.
 * @module
 */
const _assert_js_1 = require("./_assert.js");
const _u64_js_1 = require("./_u64.js");
const utils_js_1 = require("./utils.js");
// Various per round constants calculations
const SHA3_PI = [];
const SHA3_ROTL = [];
const _SHA3_IOTA = [];
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n = /* @__PURE__ */ BigInt(2);
const _7n = /* @__PURE__ */ BigInt(7);
const _256n = /* @__PURE__ */ BigInt(256);
const _0x71n = /* @__PURE__ */ BigInt(0x71);
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
    // Pi
    [x, y] = [y, (2 * x + 3 * y) % 5];
    SHA3_PI.push(2 * (5 * y + x));
    // Rotational
    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
    // Iota
    let t = _0n;
    for (let j = 0; j < 7; j++) {
        R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
        if (R & _2n)
            t ^= _1n << ((_1n << /* @__PURE__ */ BigInt(j)) - _1n);
    }
    _SHA3_IOTA.push(t);
}
const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ (0, _u64_js_1.split)(_SHA3_IOTA, true);
// Left rotation (without 0, 32, 64)
const rotlH = (h, l, s) => (s > 32 ? (0, _u64_js_1.rotlBH)(h, l, s) : (0, _u64_js_1.rotlSH)(h, l, s));
const rotlL = (h, l, s) => (s > 32 ? (0, _u64_js_1.rotlBL)(h, l, s) : (0, _u64_js_1.rotlSL)(h, l, s));
/** `keccakf1600` internal function, additionally allows to adjust round count. */
function keccakP(s, rounds = 24) {
    const B = new Uint32Array(5 * 2);
    // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
    for (let round = 24 - rounds; round < 24; round++) {
        // Theta θ
        for (let x = 0; x < 10; x++)
            B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
        for (let x = 0; x < 10; x += 2) {
            const idx1 = (x + 8) % 10;
            const idx0 = (x + 2) % 10;
            const B0 = B[idx0];
            const B1 = B[idx0 + 1];
            const Th = rotlH(B0, B1, 1) ^ B[idx1];
            const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
            for (let y = 0; y < 50; y += 10) {
                s[x + y] ^= Th;
                s[x + y + 1] ^= Tl;
            }
        }
        // Rho (ρ) and Pi (π)
        let curH = s[2];
        let curL = s[3];
        for (let t = 0; t < 24; t++) {
            const shift = SHA3_ROTL[t];
            const Th = rotlH(curH, curL, shift);
            const Tl = rotlL(curH, curL, shift);
            const PI = SHA3_PI[t];
            curH = s[PI];
            curL = s[PI + 1];
            s[PI] = Th;
            s[PI + 1] = Tl;
        }
        // Chi (χ)
        for (let y = 0; y < 50; y += 10) {
            for (let x = 0; x < 10; x++)
                B[x] = s[y + x];
            for (let x = 0; x < 10; x++)
                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
        }
        // Iota (ι)
        s[0] ^= SHA3_IOTA_H[round];
        s[1] ^= SHA3_IOTA_L[round];
    }
    B.fill(0);
}
/** Keccak sponge function. */
class Keccak extends utils_js_1.Hash {
    // NOTE: we accept arguments in bytes instead of bits here.
    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        // Can be passed from user as dkLen
        (0, _assert_js_1.anumber)(outputLen);
        // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
        // 0 < blockLen < 200
        if (0 >= this.blockLen || this.blockLen >= 200)
            throw new Error('Sha3 supports only keccak-f1600 function');
        this.state = new Uint8Array(200);
        this.state32 = (0, utils_js_1.u32)(this.state);
    }
    keccak() {
        if (!utils_js_1.isLE)
            (0, utils_js_1.byteSwap32)(this.state32);
        keccakP(this.state32, this.rounds);
        if (!utils_js_1.isLE)
            (0, utils_js_1.byteSwap32)(this.state32);
        this.posOut = 0;
        this.pos = 0;
    }
    update(data) {
        (0, _assert_js_1.aexists)(this);
        const { blockLen, state } = this;
        data = (0, utils_js_1.toBytes)(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            for (let i = 0; i < take; i++)
                state[this.pos++] ^= data[pos++];
            if (this.pos === blockLen)
                this.keccak();
        }
        return this;
    }
    finish() {
        if (this.finished)
            return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        // Do the padding
        state[pos] ^= suffix;
        if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
            this.keccak();
        state[blockLen - 1] ^= 0x80;
        this.keccak();
    }
    writeInto(out) {
        (0, _assert_js_1.aexists)(this, false);
        (0, _assert_js_1.abytes)(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len;) {
            if (this.posOut >= blockLen)
                this.keccak();
            const take = Math.min(blockLen - this.posOut, len - pos);
            out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
            this.posOut += take;
            pos += take;
        }
        return out;
    }
    xofInto(out) {
        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
        if (!this.enableXOF)
            throw new Error('XOF is not possible for this instance');
        return this.writeInto(out);
    }
    xof(bytes) {
        (0, _assert_js_1.anumber)(bytes);
        return this.xofInto(new Uint8Array(bytes));
    }
    digestInto(out) {
        (0, _assert_js_1.aoutput)(out, this);
        if (this.finished)
            throw new Error('digest() was already called');
        this.writeInto(out);
        this.destroy();
        return out;
    }
    digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
    }
    destroy() {
        this.destroyed = true;
        this.state.fill(0);
    }
    _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        // Suffix can change in cSHAKE
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
    }
}
exports.Keccak = Keccak;
const gen = (suffix, blockLen, outputLen) => (0, utils_js_1.wrapConstructor)(() => new Keccak(blockLen, suffix, outputLen));
/** SHA3-224 hash function. */
exports.sha3_224 = gen(0x06, 144, 224 / 8);
/** SHA3-256 hash function. Different from keccak-256. */
exports.sha3_256 = gen(0x06, 136, 256 / 8);
/** SHA3-384 hash function. */
exports.sha3_384 = gen(0x06, 104, 384 / 8);
/** SHA3-512 hash function. */
exports.sha3_512 = gen(0x06, 72, 512 / 8);
/** keccak-224 hash function. */
exports.keccak_224 = gen(0x01, 144, 224 / 8);
/** keccak-256 hash function. Different from SHA3-256. */
exports.keccak_256 = gen(0x01, 136, 256 / 8);
/** keccak-384 hash function. */
exports.keccak_384 = gen(0x01, 104, 384 / 8);
/** keccak-512 hash function. */
exports.keccak_512 = gen(0x01, 72, 512 / 8);
const genShake = (suffix, blockLen, outputLen) => (0, utils_js_1.wrapXOFConstructorWithOpts)((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === undefined ? outputLen : opts.dkLen, true));
/** SHAKE128 XOF with 128-bit security. */
exports.shake128 = genShake(0x1f, 168, 128 / 8);
/** SHAKE256 XOF with 256-bit security. */
exports.shake256 = genShake(0x1f, 136, 256 / 8);

},{"./_assert.js":15,"./_u64.js":17,"./utils.js":23}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha384 = exports.sha512_256 = exports.sha512_224 = exports.sha512 = exports.SHA384 = exports.SHA512_256 = exports.SHA512_224 = exports.SHA512 = void 0;
/**
 * SHA2-512 a.k.a. sha512 and sha384. It is slower than sha256 in js because u64 operations are slow.
 *
 * Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
 * [the paper on truncated SHA512/256](https://eprint.iacr.org/2010/548.pdf).
 * @module
 */
const _md_js_1 = require("./_md.js");
const _u64_js_1 = require("./_u64.js");
const utils_js_1 = require("./utils.js");
// Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
// prettier-ignore
const [SHA512_Kh, SHA512_Kl] = /* @__PURE__ */ (() => _u64_js_1.default.split([
    '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
    '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
    '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
    '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
    '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
    '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
    '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
    '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
    '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
    '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
    '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
    '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
    '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
    '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
    '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
    '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
    '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
    '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
    '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
    '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
].map(n => BigInt(n))))();
// Temporary buffer, not used to store anything between runs
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
class SHA512 extends _md_js_1.HashMD {
    constructor() {
        super(128, 64, 16, false);
        // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
        // Also looks cleaner and easier to verify with spec.
        // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x6a09e667 | 0;
        this.Al = 0xf3bcc908 | 0;
        this.Bh = 0xbb67ae85 | 0;
        this.Bl = 0x84caa73b | 0;
        this.Ch = 0x3c6ef372 | 0;
        this.Cl = 0xfe94f82b | 0;
        this.Dh = 0xa54ff53a | 0;
        this.Dl = 0x5f1d36f1 | 0;
        this.Eh = 0x510e527f | 0;
        this.El = 0xade682d1 | 0;
        this.Fh = 0x9b05688c | 0;
        this.Fl = 0x2b3e6c1f | 0;
        this.Gh = 0x1f83d9ab | 0;
        this.Gl = 0xfb41bd6b | 0;
        this.Hh = 0x5be0cd19 | 0;
        this.Hl = 0x137e2179 | 0;
    }
    // prettier-ignore
    get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4) {
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32((offset += 4));
        }
        for (let i = 16; i < 80; i++) {
            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = _u64_js_1.default.rotrSH(W15h, W15l, 1) ^ _u64_js_1.default.rotrSH(W15h, W15l, 8) ^ _u64_js_1.default.shrSH(W15h, W15l, 7);
            const s0l = _u64_js_1.default.rotrSL(W15h, W15l, 1) ^ _u64_js_1.default.rotrSL(W15h, W15l, 8) ^ _u64_js_1.default.shrSL(W15h, W15l, 7);
            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = _u64_js_1.default.rotrSH(W2h, W2l, 19) ^ _u64_js_1.default.rotrBH(W2h, W2l, 61) ^ _u64_js_1.default.shrSH(W2h, W2l, 6);
            const s1l = _u64_js_1.default.rotrSL(W2h, W2l, 19) ^ _u64_js_1.default.rotrBL(W2h, W2l, 61) ^ _u64_js_1.default.shrSL(W2h, W2l, 6);
            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
            const SUMl = _u64_js_1.default.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = _u64_js_1.default.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        // Compression function main loop, 80 rounds
        for (let i = 0; i < 80; i++) {
            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
            const sigma1h = _u64_js_1.default.rotrSH(Eh, El, 14) ^ _u64_js_1.default.rotrSH(Eh, El, 18) ^ _u64_js_1.default.rotrBH(Eh, El, 41);
            const sigma1l = _u64_js_1.default.rotrSL(Eh, El, 14) ^ _u64_js_1.default.rotrSL(Eh, El, 18) ^ _u64_js_1.default.rotrBL(Eh, El, 41);
            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
            const CHIl = (El & Fl) ^ (~El & Gl);
            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
            // prettier-ignore
            const T1ll = _u64_js_1.default.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = _u64_js_1.default.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
            const sigma0h = _u64_js_1.default.rotrSH(Ah, Al, 28) ^ _u64_js_1.default.rotrBH(Ah, Al, 34) ^ _u64_js_1.default.rotrBH(Ah, Al, 39);
            const sigma0l = _u64_js_1.default.rotrSL(Ah, Al, 28) ^ _u64_js_1.default.rotrBL(Ah, Al, 34) ^ _u64_js_1.default.rotrBL(Ah, Al, 39);
            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = _u64_js_1.default.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = _u64_js_1.default.add3L(T1l, sigma0l, MAJl);
            Ah = _u64_js_1.default.add3H(All, T1h, sigma0h, MAJh);
            Al = All | 0;
        }
        // Add the compressed chunk to the current hash value
        ({ h: Ah, l: Al } = _u64_js_1.default.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = _u64_js_1.default.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = _u64_js_1.default.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = _u64_js_1.default.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = _u64_js_1.default.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = _u64_js_1.default.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = _u64_js_1.default.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = _u64_js_1.default.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
        SHA512_W_H.fill(0);
        SHA512_W_L.fill(0);
    }
    destroy() {
        this.buffer.fill(0);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
exports.SHA512 = SHA512;
class SHA512_224 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x8c3d37c8 | 0;
        this.Al = 0x19544da2 | 0;
        this.Bh = 0x73e19966 | 0;
        this.Bl = 0x89dcd4d6 | 0;
        this.Ch = 0x1dfab7ae | 0;
        this.Cl = 0x32ff9c82 | 0;
        this.Dh = 0x679dd514 | 0;
        this.Dl = 0x582f9fcf | 0;
        this.Eh = 0x0f6d2b69 | 0;
        this.El = 0x7bd44da8 | 0;
        this.Fh = 0x77e36f73 | 0;
        this.Fl = 0x04c48942 | 0;
        this.Gh = 0x3f9d85a8 | 0;
        this.Gl = 0x6a1d36c8 | 0;
        this.Hh = 0x1112e6ad | 0;
        this.Hl = 0x91d692a1 | 0;
        this.outputLen = 28;
    }
}
exports.SHA512_224 = SHA512_224;
class SHA512_256 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x22312194 | 0;
        this.Al = 0xfc2bf72c | 0;
        this.Bh = 0x9f555fa3 | 0;
        this.Bl = 0xc84c64c2 | 0;
        this.Ch = 0x2393b86b | 0;
        this.Cl = 0x6f53b151 | 0;
        this.Dh = 0x96387719 | 0;
        this.Dl = 0x5940eabd | 0;
        this.Eh = 0x96283ee2 | 0;
        this.El = 0xa88effe3 | 0;
        this.Fh = 0xbe5e1e25 | 0;
        this.Fl = 0x53863992 | 0;
        this.Gh = 0x2b0199fc | 0;
        this.Gl = 0x2c85b8aa | 0;
        this.Hh = 0x0eb72ddc | 0;
        this.Hl = 0x81c52ca2 | 0;
        this.outputLen = 32;
    }
}
exports.SHA512_256 = SHA512_256;
class SHA384 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0xcbbb9d5d | 0;
        this.Al = 0xc1059ed8 | 0;
        this.Bh = 0x629a292a | 0;
        this.Bl = 0x367cd507 | 0;
        this.Ch = 0x9159015a | 0;
        this.Cl = 0x3070dd17 | 0;
        this.Dh = 0x152fecd8 | 0;
        this.Dl = 0xf70e5939 | 0;
        this.Eh = 0x67332667 | 0;
        this.El = 0xffc00b31 | 0;
        this.Fh = 0x8eb44a87 | 0;
        this.Fl = 0x68581511 | 0;
        this.Gh = 0xdb0c2e0d | 0;
        this.Gl = 0x64f98fa7 | 0;
        this.Hh = 0x47b5481d | 0;
        this.Hl = 0xbefa4fa4 | 0;
        this.outputLen = 48;
    }
}
exports.SHA384 = SHA384;
/** SHA2-512 hash function. */
exports.sha512 = (0, utils_js_1.wrapConstructor)(() => new SHA512());
/** SHA2-512/224 "truncated" hash function, with improved resistance to length extension attacks. */
exports.sha512_224 = (0, utils_js_1.wrapConstructor)(() => new SHA512_224());
/** SHA2-512/256 "truncated" hash function, with improved resistance to length extension attacks. */
exports.sha512_256 = (0, utils_js_1.wrapConstructor)(() => new SHA512_256());
/** SHA2-384 hash function. */
exports.sha384 = (0, utils_js_1.wrapConstructor)(() => new SHA384());

},{"./_md.js":16,"./_u64.js":17,"./utils.js":23}],23:[function(require,module,exports){
"use strict";

/**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Hash = exports.nextTick = exports.byteSwapIfBE = exports.isLE = void 0;
exports.isBytes = isBytes;
exports.u8 = u8;
exports.u32 = u32;
exports.createView = createView;
exports.rotr = rotr;
exports.rotl = rotl;
exports.byteSwap = byteSwap;
exports.byteSwap32 = byteSwap32;
exports.bytesToHex = bytesToHex;
exports.hexToBytes = hexToBytes;
exports.asyncLoop = asyncLoop;
exports.utf8ToBytes = utf8ToBytes;
exports.toBytes = toBytes;
exports.concatBytes = concatBytes;
exports.checkOpts = checkOpts;
exports.wrapConstructor = wrapConstructor;
exports.wrapConstructorWithOpts = wrapConstructorWithOpts;
exports.wrapXOFConstructorWithOpts = wrapXOFConstructorWithOpts;
exports.randomBytes = randomBytes;
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
const crypto_1 = require("@noble/hashes/crypto");
const _assert_js_1 = require("./_assert.js");
// export { isBytes } from './_assert.js';
// We can't reuse isBytes from _assert, because somehow this causes huge perf issues
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array';
}
// Cast array to different type
function u8(arr) {
  return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
// Cast array to view
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/** The rotate right (circular right shift) operation for uint32 */
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
/** The rotate left (circular left shift) operation for uint32 */
function rotl(word, shift) {
  return word << shift | word >>> 32 - shift >>> 0;
}
/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
exports.isLE = (() => new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();
// The byte swap operation for uint32
function byteSwap(word) {
  return word << 24 & 0xff000000 | word << 8 & 0xff0000 | word >>> 8 & 0xff00 | word >>> 24 & 0xff;
}
/** Conditionally byte swap if on a big-endian platform */
exports.byteSwapIfBE = exports.isLE ? n => n : n => byteSwap(n);
/** In place byte swap for Uint32Array */
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
}
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */Array.from({
  length: 256
}, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * Convert byte array to hex string.
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
  (0, _assert_js_1.abytes)(bytes);
  // pre-caching improves the speed 6x
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
// We use optimized technique to convert hex string to byte array
const asciis = {
  _0: 48,
  _9: 57,
  A: 65,
  F: 70,
  a: 97,
  f: 102
};
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9) return ch - asciis._0; // '2' => 50-48
  if (ch >= asciis.A && ch <= asciis.F) return ch - (asciis.A - 10); // 'B' => 66-(65-10)
  if (ch >= asciis.a && ch <= asciis.f) return ch - (asciis.a - 10); // 'b' => 98-(97-10)
  return;
}
/**
 * Convert hex string to byte array.
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
  if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2) throw new Error('hex string expected, got unpadded hex of length ' + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === undefined || n2 === undefined) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
  }
  return array;
}
/**
 * There is no setImmediate in browser and setTimeout is slow.
 * Call of async fn will return Promise, which will be fullfiled only on
 * next scheduler queue processing step and this is exactly what we need.
 */
const nextTick = async () => {};
exports.nextTick = nextTick;
/** Returns control to thread each 'tick' ms to avoid blocking. */
async function asyncLoop(iters, tick, cb) {
  let ts = Date.now();
  for (let i = 0; i < iters; i++) {
    cb(i);
    // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
    const diff = Date.now() - ts;
    if (diff >= 0 && diff < tick) continue;
    await (0, exports.nextTick)();
    ts += diff;
  }
}
/**
 * Convert JS string to byte array.
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
  if (typeof str !== 'string') throw new Error('utf8ToBytes expected string, got ' + typeof str);
  return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes(data) {
  if (typeof data === 'string') data = utf8ToBytes(data);
  (0, _assert_js_1.abytes)(data);
  return data;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    (0, _assert_js_1.abytes)(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
/** For runtime check if class implements interface */
class Hash {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
exports.Hash = Hash;
function checkOpts(defaults, opts) {
  if (opts !== undefined && {}.toString.call(opts) !== '[object Object]') throw new Error('Options should be object or undefined');
  const merged = Object.assign(defaults, opts);
  return merged;
}
/** Wraps hash function, creating an interface on top of it */
function wrapConstructor(hashCons) {
  const hashC = msg => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function wrapConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = opts => hashCons(opts);
  return hashC;
}
function wrapXOFConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = opts => hashCons(opts);
  return hashC;
}
/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
function randomBytes(bytesLength = 32) {
  if (crypto_1.crypto && typeof crypto_1.crypto.getRandomValues === 'function') {
    return crypto_1.crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  // Legacy Node.js compatibility
  if (crypto_1.crypto && typeof crypto_1.crypto.randomBytes === 'function') {
    return crypto_1.crypto.randomBytes(bytesLength);
  }
  throw new Error('crypto.getRandomValues must be defined');
}

},{"./_assert.js":15,"@noble/hashes/crypto":18}],24:[function(require,module,exports){
/* The MIT License (MIT)
 *
 * Copyright 2015-2018 Peter A. Bigot
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * Support for translating between Uint8Array instances and JavaScript
 * native types.
 *
 * {@link module:Layout~Layout|Layout} is the basis of a class
 * hierarchy that associates property names with sequences of encoded
 * bytes.
 *
 * Layouts are supported for these scalar (numeric) types:
 * * {@link module:Layout~UInt|Unsigned integers in little-endian
 *   format} with {@link module:Layout.u8|8-bit}, {@link
 *   module:Layout.u16|16-bit}, {@link module:Layout.u24|24-bit},
 *   {@link module:Layout.u32|32-bit}, {@link
 *   module:Layout.u40|40-bit}, and {@link module:Layout.u48|48-bit}
 *   representation ranges;
 * * {@link module:Layout~UIntBE|Unsigned integers in big-endian
 *   format} with {@link module:Layout.u16be|16-bit}, {@link
 *   module:Layout.u24be|24-bit}, {@link module:Layout.u32be|32-bit},
 *   {@link module:Layout.u40be|40-bit}, and {@link
 *   module:Layout.u48be|48-bit} representation ranges;
 * * {@link module:Layout~Int|Signed integers in little-endian
 *   format} with {@link module:Layout.s8|8-bit}, {@link
 *   module:Layout.s16|16-bit}, {@link module:Layout.s24|24-bit},
 *   {@link module:Layout.s32|32-bit}, {@link
 *   module:Layout.s40|40-bit}, and {@link module:Layout.s48|48-bit}
 *   representation ranges;
 * * {@link module:Layout~IntBE|Signed integers in big-endian format}
 *   with {@link module:Layout.s16be|16-bit}, {@link
 *   module:Layout.s24be|24-bit}, {@link module:Layout.s32be|32-bit},
 *   {@link module:Layout.s40be|40-bit}, and {@link
 *   module:Layout.s48be|48-bit} representation ranges;
 * * 64-bit integral values that decode to an exact (if magnitude is
 *   less than 2^53) or nearby integral Number in {@link
 *   module:Layout.nu64|unsigned little-endian}, {@link
 *   module:Layout.nu64be|unsigned big-endian}, {@link
 *   module:Layout.ns64|signed little-endian}, and {@link
 *   module:Layout.ns64be|unsigned big-endian} encodings;
 * * 32-bit floating point values with {@link
 *   module:Layout.f32|little-endian} and {@link
 *   module:Layout.f32be|big-endian} representations;
 * * 64-bit floating point values with {@link
 *   module:Layout.f64|little-endian} and {@link
 *   module:Layout.f64be|big-endian} representations;
 * * {@link module:Layout.const|Constants} that take no space in the
 *   encoded expression.
 *
 * and for these aggregate types:
 * * {@link module:Layout.seq|Sequence}s of instances of a {@link
 *   module:Layout~Layout|Layout}, with JavaScript representation as
 *   an Array and constant or data-dependent {@link
 *   module:Layout~Sequence#count|length};
 * * {@link module:Layout.struct|Structure}s that aggregate a
 *   heterogeneous sequence of {@link module:Layout~Layout|Layout}
 *   instances, with JavaScript representation as an Object;
 * * {@link module:Layout.union|Union}s that support multiple {@link
 *   module:Layout~VariantLayout|variant layouts} over a fixed
 *   (padded) or variable (not padded) span of bytes, using an
 *   unsigned integer at the start of the data or a separate {@link
 *   module:Layout.unionLayoutDiscriminator|layout element} to
 *   determine which layout to use when interpreting the buffer
 *   contents;
 * * {@link module:Layout.bits|BitStructure}s that contain a sequence
 *   of individual {@link
 *   module:Layout~BitStructure#addField|BitField}s packed into an 8,
 *   16, 24, or 32-bit unsigned integer starting at the least- or
 *   most-significant bit;
 * * {@link module:Layout.cstr|C strings} of varying length;
 * * {@link module:Layout.blob|Blobs} of fixed- or variable-{@link
 *   module:Layout~Blob#length|length} raw data.
 *
 * All {@link module:Layout~Layout|Layout} instances are immutable
 * after construction, to prevent internal state from becoming
 * inconsistent.
 *
 * @local Layout
 * @local ExternalLayout
 * @local GreedyCount
 * @local OffsetLayout
 * @local UInt
 * @local UIntBE
 * @local Int
 * @local IntBE
 * @local NearUInt64
 * @local NearUInt64BE
 * @local NearInt64
 * @local NearInt64BE
 * @local Float
 * @local FloatBE
 * @local Double
 * @local DoubleBE
 * @local Sequence
 * @local Structure
 * @local UnionDiscriminator
 * @local UnionLayoutDiscriminator
 * @local Union
 * @local VariantLayout
 * @local BitStructure
 * @local BitField
 * @local Boolean
 * @local Blob
 * @local CString
 * @local Constant
 * @local bindConstructorLayout
 * @module Layout
 * @license MIT
 * @author Peter A. Bigot
 * @see {@link https://github.com/pabigot/buffer-layout|buffer-layout on GitHub}
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.s16 = exports.s8 = exports.nu64be = exports.u48be = exports.u40be = exports.u32be = exports.u24be = exports.u16be = exports.nu64 = exports.u48 = exports.u40 = exports.u32 = exports.u24 = exports.u16 = exports.u8 = exports.offset = exports.greedy = exports.Constant = exports.UTF8 = exports.CString = exports.Blob = exports.Boolean = exports.BitField = exports.BitStructure = exports.VariantLayout = exports.Union = exports.UnionLayoutDiscriminator = exports.UnionDiscriminator = exports.Structure = exports.Sequence = exports.DoubleBE = exports.Double = exports.FloatBE = exports.Float = exports.NearInt64BE = exports.NearInt64 = exports.NearUInt64BE = exports.NearUInt64 = exports.IntBE = exports.Int = exports.UIntBE = exports.UInt = exports.OffsetLayout = exports.GreedyCount = exports.ExternalLayout = exports.bindConstructorLayout = exports.nameWithProperty = exports.Layout = exports.uint8ArrayToBuffer = exports.checkUint8Array = void 0;
exports.constant = exports.utf8 = exports.cstr = exports.blob = exports.unionLayoutDiscriminator = exports.union = exports.seq = exports.bits = exports.struct = exports.f64be = exports.f64 = exports.f32be = exports.f32 = exports.ns64be = exports.s48be = exports.s40be = exports.s32be = exports.s24be = exports.s16be = exports.ns64 = exports.s48 = exports.s40 = exports.s32 = exports.s24 = void 0;
const buffer_1 = require("buffer");
/* Check if a value is a Uint8Array.
 *
 * @ignore */
function checkUint8Array(b) {
    if (!(b instanceof Uint8Array)) {
        throw new TypeError('b must be a Uint8Array');
    }
}
exports.checkUint8Array = checkUint8Array;
/* Create a Buffer instance from a Uint8Array.
 *
 * @ignore */
function uint8ArrayToBuffer(b) {
    checkUint8Array(b);
    return buffer_1.Buffer.from(b.buffer, b.byteOffset, b.length);
}
exports.uint8ArrayToBuffer = uint8ArrayToBuffer;
/**
 * Base class for layout objects.
 *
 * **NOTE** This is an abstract base class; you can create instances
 * if it amuses you, but they won't support the {@link
 * Layout#encode|encode} or {@link Layout#decode|decode} functions.
 *
 * @param {Number} span - Initializer for {@link Layout#span|span}.  The
 * parameter must be an integer; a negative value signifies that the
 * span is {@link Layout#getSpan|value-specific}.
 *
 * @param {string} [property] - Initializer for {@link
 * Layout#property|property}.
 *
 * @abstract
 */
class Layout {
    constructor(span, property) {
        if (!Number.isInteger(span)) {
            throw new TypeError('span must be an integer');
        }
        /** The span of the layout in bytes.
         *
         * Positive values are generally expected.
         *
         * Zero will only appear in {@link Constant}s and in {@link
         * Sequence}s where the {@link Sequence#count|count} is zero.
         *
         * A negative value indicates that the span is value-specific, and
         * must be obtained using {@link Layout#getSpan|getSpan}. */
        this.span = span;
        /** The property name used when this layout is represented in an
         * Object.
         *
         * Used only for layouts that {@link Layout#decode|decode} to Object
         * instances.  If left undefined the span of the unnamed layout will
         * be treated as padding: it will not be mutated by {@link
         * Layout#encode|encode} nor represented as a property in the
         * decoded Object. */
        this.property = property;
    }
    /** Function to create an Object into which decoded properties will
     * be written.
     *
     * Used only for layouts that {@link Layout#decode|decode} to Object
     * instances, which means:
     * * {@link Structure}
     * * {@link Union}
     * * {@link VariantLayout}
     * * {@link BitStructure}
     *
     * If left undefined the JavaScript representation of these layouts
     * will be Object instances.
     *
     * See {@link bindConstructorLayout}.
     */
    makeDestinationObject() {
        return {};
    }
    /**
     * Calculate the span of a specific instance of a layout.
     *
     * @param {Uint8Array} b - the buffer that contains an encoded instance.
     *
     * @param {Number} [offset] - the offset at which the encoded instance
     * starts.  If absent a zero offset is inferred.
     *
     * @return {Number} - the number of bytes covered by the layout
     * instance.  If this method is not overridden in a subclass the
     * definition-time constant {@link Layout#span|span} will be
     * returned.
     *
     * @throws {RangeError} - if the length of the value cannot be
     * determined.
     */
    getSpan(b, offset) {
        if (0 > this.span) {
            throw new RangeError('indeterminate span');
        }
        return this.span;
    }
    /**
     * Replicate the layout using a new property.
     *
     * This function must be used to get a structurally-equivalent layout
     * with a different name since all {@link Layout} instances are
     * immutable.
     *
     * **NOTE** This is a shallow copy.  All fields except {@link
     * Layout#property|property} are strictly equal to the origin layout.
     *
     * @param {String} property - the value for {@link
     * Layout#property|property} in the replica.
     *
     * @returns {Layout} - the copy with {@link Layout#property|property}
     * set to `property`.
     */
    replicate(property) {
        const rv = Object.create(this.constructor.prototype);
        Object.assign(rv, this);
        rv.property = property;
        return rv;
    }
    /**
     * Create an object from layout properties and an array of values.
     *
     * **NOTE** This function returns `undefined` if invoked on a layout
     * that does not return its value as an Object.  Objects are
     * returned for things that are a {@link Structure}, which includes
     * {@link VariantLayout|variant layouts} if they are structures, and
     * excludes {@link Union}s.  If you want this feature for a union
     * you must use {@link Union.getVariant|getVariant} to select the
     * desired layout.
     *
     * @param {Array} values - an array of values that correspond to the
     * default order for properties.  As with {@link Layout#decode|decode}
     * layout elements that have no property name are skipped when
     * iterating over the array values.  Only the top-level properties are
     * assigned; arguments are not assigned to properties of contained
     * layouts.  Any unused values are ignored.
     *
     * @return {(Object|undefined)}
     */
    fromArray(values) {
        return undefined;
    }
}
exports.Layout = Layout;
/* Provide text that carries a name (such as for a function that will
 * be throwing an error) annotated with the property of a given layout
 * (such as one for which the value was unacceptable).
 *
 * @ignore */
function nameWithProperty(name, lo) {
    if (lo.property) {
        return name + '[' + lo.property + ']';
    }
    return name;
}
exports.nameWithProperty = nameWithProperty;
/**
 * Augment a class so that instances can be encoded/decoded using a
 * given layout.
 *
 * Calling this function couples `Class` with `layout` in several ways:
 *
 * * `Class.layout_` becomes a static member property equal to `layout`;
 * * `layout.boundConstructor_` becomes a static member property equal
 *    to `Class`;
 * * The {@link Layout#makeDestinationObject|makeDestinationObject()}
 *   property of `layout` is set to a function that returns a `new
 *   Class()`;
 * * `Class.decode(b, offset)` becomes a static member function that
 *   delegates to {@link Layout#decode|layout.decode}.  The
 *   synthesized function may be captured and extended.
 * * `Class.prototype.encode(b, offset)` provides an instance member
 *   function that delegates to {@link Layout#encode|layout.encode}
 *   with `src` set to `this`.  The synthesized function may be
 *   captured and extended, but when the extension is invoked `this`
 *   must be explicitly bound to the instance.
 *
 * @param {class} Class - a JavaScript class with a nullary
 * constructor.
 *
 * @param {Layout} layout - the {@link Layout} instance used to encode
 * instances of `Class`.
 */
// `Class` must be a constructor Function, but the assignment of a `layout_` property to it makes it difficult to type
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function bindConstructorLayout(Class, layout) {
    if ('function' !== typeof Class) {
        throw new TypeError('Class must be constructor');
    }
    if (Object.prototype.hasOwnProperty.call(Class, 'layout_')) {
        throw new Error('Class is already bound to a layout');
    }
    if (!(layout && (layout instanceof Layout))) {
        throw new TypeError('layout must be a Layout');
    }
    if (Object.prototype.hasOwnProperty.call(layout, 'boundConstructor_')) {
        throw new Error('layout is already bound to a constructor');
    }
    Class.layout_ = layout;
    layout.boundConstructor_ = Class;
    layout.makeDestinationObject = (() => new Class());
    Object.defineProperty(Class.prototype, 'encode', {
        value(b, offset) {
            return layout.encode(this, b, offset);
        },
        writable: true,
    });
    Object.defineProperty(Class, 'decode', {
        value(b, offset) {
            return layout.decode(b, offset);
        },
        writable: true,
    });
}
exports.bindConstructorLayout = bindConstructorLayout;
/**
 * An object that behaves like a layout but does not consume space
 * within its containing layout.
 *
 * This is primarily used to obtain metadata about a member, such as a
 * {@link OffsetLayout} that can provide data about a {@link
 * Layout#getSpan|value-specific span}.
 *
 * **NOTE** This is an abstract base class; you can create instances
 * if it amuses you, but they won't support {@link
 * ExternalLayout#isCount|isCount} or other {@link Layout} functions.
 *
 * @param {Number} span - initializer for {@link Layout#span|span}.
 * The parameter can range from 1 through 6.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @abstract
 * @augments {Layout}
 */
class ExternalLayout extends Layout {
    /**
     * Return `true` iff the external layout decodes to an unsigned
     * integer layout.
     *
     * In that case it can be used as the source of {@link
     * Sequence#count|Sequence counts}, {@link Blob#length|Blob lengths},
     * or as {@link UnionLayoutDiscriminator#layout|external union
     * discriminators}.
     *
     * @abstract
     */
    isCount() {
        throw new Error('ExternalLayout is abstract');
    }
}
exports.ExternalLayout = ExternalLayout;
/**
 * An {@link ExternalLayout} that determines its {@link
 * Layout#decode|value} based on offset into and length of the buffer
 * on which it is invoked.
 *
 * *Factory*: {@link module:Layout.greedy|greedy}
 *
 * @param {Number} [elementSpan] - initializer for {@link
 * GreedyCount#elementSpan|elementSpan}.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {ExternalLayout}
 */
class GreedyCount extends ExternalLayout {
    constructor(elementSpan = 1, property) {
        if ((!Number.isInteger(elementSpan)) || (0 >= elementSpan)) {
            throw new TypeError('elementSpan must be a (positive) integer');
        }
        super(-1, property);
        /** The layout for individual elements of the sequence.  The value
         * must be a positive integer.  If not provided, the value will be
         * 1. */
        this.elementSpan = elementSpan;
    }
    /** @override */
    isCount() {
        return true;
    }
    /** @override */
    decode(b, offset = 0) {
        checkUint8Array(b);
        const rem = b.length - offset;
        return Math.floor(rem / this.elementSpan);
    }
    /** @override */
    encode(src, b, offset) {
        return 0;
    }
}
exports.GreedyCount = GreedyCount;
/**
 * An {@link ExternalLayout} that supports accessing a {@link Layout}
 * at a fixed offset from the start of another Layout.  The offset may
 * be before, within, or after the base layout.
 *
 * *Factory*: {@link module:Layout.offset|offset}
 *
 * @param {Layout} layout - initializer for {@link
 * OffsetLayout#layout|layout}, modulo `property`.
 *
 * @param {Number} [offset] - Initializes {@link
 * OffsetLayout#offset|offset}.  Defaults to zero.
 *
 * @param {string} [property] - Optional new property name for a
 * {@link Layout#replicate| replica} of `layout` to be used as {@link
 * OffsetLayout#layout|layout}.  If not provided the `layout` is used
 * unchanged.
 *
 * @augments {Layout}
 */
class OffsetLayout extends ExternalLayout {
    constructor(layout, offset = 0, property) {
        if (!(layout instanceof Layout)) {
            throw new TypeError('layout must be a Layout');
        }
        if (!Number.isInteger(offset)) {
            throw new TypeError('offset must be integer or undefined');
        }
        super(layout.span, property || layout.property);
        /** The subordinated layout. */
        this.layout = layout;
        /** The location of {@link OffsetLayout#layout} relative to the
         * start of another layout.
         *
         * The value may be positive or negative, but an error will thrown
         * if at the point of use it goes outside the span of the Uint8Array
         * being accessed.  */
        this.offset = offset;
    }
    /** @override */
    isCount() {
        return ((this.layout instanceof UInt)
            || (this.layout instanceof UIntBE));
    }
    /** @override */
    decode(b, offset = 0) {
        return this.layout.decode(b, offset + this.offset);
    }
    /** @override */
    encode(src, b, offset = 0) {
        return this.layout.encode(src, b, offset + this.offset);
    }
}
exports.OffsetLayout = OffsetLayout;
/**
 * Represent an unsigned integer in little-endian format.
 *
 * *Factory*: {@link module:Layout.u8|u8}, {@link
 *  module:Layout.u16|u16}, {@link module:Layout.u24|u24}, {@link
 *  module:Layout.u32|u32}, {@link module:Layout.u40|u40}, {@link
 *  module:Layout.u48|u48}
 *
 * @param {Number} span - initializer for {@link Layout#span|span}.
 * The parameter can range from 1 through 6.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class UInt extends Layout {
    constructor(span, property) {
        super(span, property);
        if (6 < this.span) {
            throw new RangeError('span must not exceed 6 bytes');
        }
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readUIntLE(offset, this.span);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeUIntLE(src, offset, this.span);
        return this.span;
    }
}
exports.UInt = UInt;
/**
 * Represent an unsigned integer in big-endian format.
 *
 * *Factory*: {@link module:Layout.u8be|u8be}, {@link
 * module:Layout.u16be|u16be}, {@link module:Layout.u24be|u24be},
 * {@link module:Layout.u32be|u32be}, {@link
 * module:Layout.u40be|u40be}, {@link module:Layout.u48be|u48be}
 *
 * @param {Number} span - initializer for {@link Layout#span|span}.
 * The parameter can range from 1 through 6.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class UIntBE extends Layout {
    constructor(span, property) {
        super(span, property);
        if (6 < this.span) {
            throw new RangeError('span must not exceed 6 bytes');
        }
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readUIntBE(offset, this.span);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeUIntBE(src, offset, this.span);
        return this.span;
    }
}
exports.UIntBE = UIntBE;
/**
 * Represent a signed integer in little-endian format.
 *
 * *Factory*: {@link module:Layout.s8|s8}, {@link
 *  module:Layout.s16|s16}, {@link module:Layout.s24|s24}, {@link
 *  module:Layout.s32|s32}, {@link module:Layout.s40|s40}, {@link
 *  module:Layout.s48|s48}
 *
 * @param {Number} span - initializer for {@link Layout#span|span}.
 * The parameter can range from 1 through 6.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class Int extends Layout {
    constructor(span, property) {
        super(span, property);
        if (6 < this.span) {
            throw new RangeError('span must not exceed 6 bytes');
        }
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readIntLE(offset, this.span);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeIntLE(src, offset, this.span);
        return this.span;
    }
}
exports.Int = Int;
/**
 * Represent a signed integer in big-endian format.
 *
 * *Factory*: {@link module:Layout.s8be|s8be}, {@link
 * module:Layout.s16be|s16be}, {@link module:Layout.s24be|s24be},
 * {@link module:Layout.s32be|s32be}, {@link
 * module:Layout.s40be|s40be}, {@link module:Layout.s48be|s48be}
 *
 * @param {Number} span - initializer for {@link Layout#span|span}.
 * The parameter can range from 1 through 6.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class IntBE extends Layout {
    constructor(span, property) {
        super(span, property);
        if (6 < this.span) {
            throw new RangeError('span must not exceed 6 bytes');
        }
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readIntBE(offset, this.span);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeIntBE(src, offset, this.span);
        return this.span;
    }
}
exports.IntBE = IntBE;
const V2E32 = Math.pow(2, 32);
/* True modulus high and low 32-bit words, where low word is always
 * non-negative. */
function divmodInt64(src) {
    const hi32 = Math.floor(src / V2E32);
    const lo32 = src - (hi32 * V2E32);
    return { hi32, lo32 };
}
/* Reconstruct Number from quotient and non-negative remainder */
function roundedInt64(hi32, lo32) {
    return hi32 * V2E32 + lo32;
}
/**
 * Represent an unsigned 64-bit integer in little-endian format when
 * encoded and as a near integral JavaScript Number when decoded.
 *
 * *Factory*: {@link module:Layout.nu64|nu64}
 *
 * **NOTE** Values with magnitude greater than 2^52 may not decode to
 * the exact value of the encoded representation.
 *
 * @augments {Layout}
 */
class NearUInt64 extends Layout {
    constructor(property) {
        super(8, property);
    }
    /** @override */
    decode(b, offset = 0) {
        const buffer = uint8ArrayToBuffer(b);
        const lo32 = buffer.readUInt32LE(offset);
        const hi32 = buffer.readUInt32LE(offset + 4);
        return roundedInt64(hi32, lo32);
    }
    /** @override */
    encode(src, b, offset = 0) {
        const split = divmodInt64(src);
        const buffer = uint8ArrayToBuffer(b);
        buffer.writeUInt32LE(split.lo32, offset);
        buffer.writeUInt32LE(split.hi32, offset + 4);
        return 8;
    }
}
exports.NearUInt64 = NearUInt64;
/**
 * Represent an unsigned 64-bit integer in big-endian format when
 * encoded and as a near integral JavaScript Number when decoded.
 *
 * *Factory*: {@link module:Layout.nu64be|nu64be}
 *
 * **NOTE** Values with magnitude greater than 2^52 may not decode to
 * the exact value of the encoded representation.
 *
 * @augments {Layout}
 */
class NearUInt64BE extends Layout {
    constructor(property) {
        super(8, property);
    }
    /** @override */
    decode(b, offset = 0) {
        const buffer = uint8ArrayToBuffer(b);
        const hi32 = buffer.readUInt32BE(offset);
        const lo32 = buffer.readUInt32BE(offset + 4);
        return roundedInt64(hi32, lo32);
    }
    /** @override */
    encode(src, b, offset = 0) {
        const split = divmodInt64(src);
        const buffer = uint8ArrayToBuffer(b);
        buffer.writeUInt32BE(split.hi32, offset);
        buffer.writeUInt32BE(split.lo32, offset + 4);
        return 8;
    }
}
exports.NearUInt64BE = NearUInt64BE;
/**
 * Represent a signed 64-bit integer in little-endian format when
 * encoded and as a near integral JavaScript Number when decoded.
 *
 * *Factory*: {@link module:Layout.ns64|ns64}
 *
 * **NOTE** Values with magnitude greater than 2^52 may not decode to
 * the exact value of the encoded representation.
 *
 * @augments {Layout}
 */
class NearInt64 extends Layout {
    constructor(property) {
        super(8, property);
    }
    /** @override */
    decode(b, offset = 0) {
        const buffer = uint8ArrayToBuffer(b);
        const lo32 = buffer.readUInt32LE(offset);
        const hi32 = buffer.readInt32LE(offset + 4);
        return roundedInt64(hi32, lo32);
    }
    /** @override */
    encode(src, b, offset = 0) {
        const split = divmodInt64(src);
        const buffer = uint8ArrayToBuffer(b);
        buffer.writeUInt32LE(split.lo32, offset);
        buffer.writeInt32LE(split.hi32, offset + 4);
        return 8;
    }
}
exports.NearInt64 = NearInt64;
/**
 * Represent a signed 64-bit integer in big-endian format when
 * encoded and as a near integral JavaScript Number when decoded.
 *
 * *Factory*: {@link module:Layout.ns64be|ns64be}
 *
 * **NOTE** Values with magnitude greater than 2^52 may not decode to
 * the exact value of the encoded representation.
 *
 * @augments {Layout}
 */
class NearInt64BE extends Layout {
    constructor(property) {
        super(8, property);
    }
    /** @override */
    decode(b, offset = 0) {
        const buffer = uint8ArrayToBuffer(b);
        const hi32 = buffer.readInt32BE(offset);
        const lo32 = buffer.readUInt32BE(offset + 4);
        return roundedInt64(hi32, lo32);
    }
    /** @override */
    encode(src, b, offset = 0) {
        const split = divmodInt64(src);
        const buffer = uint8ArrayToBuffer(b);
        buffer.writeInt32BE(split.hi32, offset);
        buffer.writeUInt32BE(split.lo32, offset + 4);
        return 8;
    }
}
exports.NearInt64BE = NearInt64BE;
/**
 * Represent a 32-bit floating point number in little-endian format.
 *
 * *Factory*: {@link module:Layout.f32|f32}
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class Float extends Layout {
    constructor(property) {
        super(4, property);
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readFloatLE(offset);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeFloatLE(src, offset);
        return 4;
    }
}
exports.Float = Float;
/**
 * Represent a 32-bit floating point number in big-endian format.
 *
 * *Factory*: {@link module:Layout.f32be|f32be}
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class FloatBE extends Layout {
    constructor(property) {
        super(4, property);
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readFloatBE(offset);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeFloatBE(src, offset);
        return 4;
    }
}
exports.FloatBE = FloatBE;
/**
 * Represent a 64-bit floating point number in little-endian format.
 *
 * *Factory*: {@link module:Layout.f64|f64}
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class Double extends Layout {
    constructor(property) {
        super(8, property);
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readDoubleLE(offset);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeDoubleLE(src, offset);
        return 8;
    }
}
exports.Double = Double;
/**
 * Represent a 64-bit floating point number in big-endian format.
 *
 * *Factory*: {@link module:Layout.f64be|f64be}
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class DoubleBE extends Layout {
    constructor(property) {
        super(8, property);
    }
    /** @override */
    decode(b, offset = 0) {
        return uint8ArrayToBuffer(b).readDoubleBE(offset);
    }
    /** @override */
    encode(src, b, offset = 0) {
        uint8ArrayToBuffer(b).writeDoubleBE(src, offset);
        return 8;
    }
}
exports.DoubleBE = DoubleBE;
/**
 * Represent a contiguous sequence of a specific layout as an Array.
 *
 * *Factory*: {@link module:Layout.seq|seq}
 *
 * @param {Layout} elementLayout - initializer for {@link
 * Sequence#elementLayout|elementLayout}.
 *
 * @param {(Number|ExternalLayout)} count - initializer for {@link
 * Sequence#count|count}.  The parameter must be either a positive
 * integer or an instance of {@link ExternalLayout}.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class Sequence extends Layout {
    constructor(elementLayout, count, property) {
        if (!(elementLayout instanceof Layout)) {
            throw new TypeError('elementLayout must be a Layout');
        }
        if (!(((count instanceof ExternalLayout) && count.isCount())
            || (Number.isInteger(count) && (0 <= count)))) {
            throw new TypeError('count must be non-negative integer '
                + 'or an unsigned integer ExternalLayout');
        }
        let span = -1;
        if ((!(count instanceof ExternalLayout))
            && (0 < elementLayout.span)) {
            span = count * elementLayout.span;
        }
        super(span, property);
        /** The layout for individual elements of the sequence. */
        this.elementLayout = elementLayout;
        /** The number of elements in the sequence.
         *
         * This will be either a non-negative integer or an instance of
         * {@link ExternalLayout} for which {@link
         * ExternalLayout#isCount|isCount()} is `true`. */
        this.count = count;
    }
    /** @override */
    getSpan(b, offset = 0) {
        if (0 <= this.span) {
            return this.span;
        }
        let span = 0;
        let count = this.count;
        if (count instanceof ExternalLayout) {
            count = count.decode(b, offset);
        }
        if (0 < this.elementLayout.span) {
            span = count * this.elementLayout.span;
        }
        else {
            let idx = 0;
            while (idx < count) {
                span += this.elementLayout.getSpan(b, offset + span);
                ++idx;
            }
        }
        return span;
    }
    /** @override */
    decode(b, offset = 0) {
        const rv = [];
        let i = 0;
        let count = this.count;
        if (count instanceof ExternalLayout) {
            count = count.decode(b, offset);
        }
        while (i < count) {
            rv.push(this.elementLayout.decode(b, offset));
            offset += this.elementLayout.getSpan(b, offset);
            i += 1;
        }
        return rv;
    }
    /** Implement {@link Layout#encode|encode} for {@link Sequence}.
     *
     * **NOTE** If `src` is shorter than {@link Sequence#count|count} then
     * the unused space in the buffer is left unchanged.  If `src` is
     * longer than {@link Sequence#count|count} the unneeded elements are
     * ignored.
     *
     * **NOTE** If {@link Layout#count|count} is an instance of {@link
     * ExternalLayout} then the length of `src` will be encoded as the
     * count after `src` is encoded. */
    encode(src, b, offset = 0) {
        const elo = this.elementLayout;
        const span = src.reduce((span, v) => {
            return span + elo.encode(v, b, offset + span);
        }, 0);
        if (this.count instanceof ExternalLayout) {
            this.count.encode(src.length, b, offset);
        }
        return span;
    }
}
exports.Sequence = Sequence;
/**
 * Represent a contiguous sequence of arbitrary layout elements as an
 * Object.
 *
 * *Factory*: {@link module:Layout.struct|struct}
 *
 * **NOTE** The {@link Layout#span|span} of the structure is variable
 * if any layout in {@link Structure#fields|fields} has a variable
 * span.  When {@link Layout#encode|encoding} we must have a value for
 * all variable-length fields, or we wouldn't be able to figure out
 * how much space to use for storage.  We can only identify the value
 * for a field when it has a {@link Layout#property|property}.  As
 * such, although a structure may contain both unnamed fields and
 * variable-length fields, it cannot contain an unnamed
 * variable-length field.
 *
 * @param {Layout[]} fields - initializer for {@link
 * Structure#fields|fields}.  An error is raised if this contains a
 * variable-length field for which a {@link Layout#property|property}
 * is not defined.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @param {Boolean} [decodePrefixes] - initializer for {@link
 * Structure#decodePrefixes|property}.
 *
 * @throws {Error} - if `fields` contains an unnamed variable-length
 * layout.
 *
 * @augments {Layout}
 */
class Structure extends Layout {
    constructor(fields, property, decodePrefixes) {
        if (!(Array.isArray(fields)
            && fields.reduce((acc, v) => acc && (v instanceof Layout), true))) {
            throw new TypeError('fields must be array of Layout instances');
        }
        if (('boolean' === typeof property)
            && (undefined === decodePrefixes)) {
            decodePrefixes = property;
            property = undefined;
        }
        /* Verify absence of unnamed variable-length fields. */
        for (const fd of fields) {
            if ((0 > fd.span)
                && (undefined === fd.property)) {
                throw new Error('fields cannot contain unnamed variable-length layout');
            }
        }
        let span = -1;
        try {
            span = fields.reduce((span, fd) => span + fd.getSpan(), 0);
        }
        catch (e) {
            // ignore error
        }
        super(span, property);
        /** The sequence of {@link Layout} values that comprise the
         * structure.
         *
         * The individual elements need not be the same type, and may be
         * either scalar or aggregate layouts.  If a member layout leaves
         * its {@link Layout#property|property} undefined the
         * corresponding region of the buffer associated with the element
         * will not be mutated.
         *
         * @type {Layout[]} */
        this.fields = fields;
        /** Control behavior of {@link Layout#decode|decode()} given short
         * buffers.
         *
         * In some situations a structure many be extended with additional
         * fields over time, with older installations providing only a
         * prefix of the full structure.  If this property is `true`
         * decoding will accept those buffers and leave subsequent fields
         * undefined, as long as the buffer ends at a field boundary.
         * Defaults to `false`. */
        this.decodePrefixes = !!decodePrefixes;
    }
    /** @override */
    getSpan(b, offset = 0) {
        if (0 <= this.span) {
            return this.span;
        }
        let span = 0;
        try {
            span = this.fields.reduce((span, fd) => {
                const fsp = fd.getSpan(b, offset);
                offset += fsp;
                return span + fsp;
            }, 0);
        }
        catch (e) {
            throw new RangeError('indeterminate span');
        }
        return span;
    }
    /** @override */
    decode(b, offset = 0) {
        checkUint8Array(b);
        const dest = this.makeDestinationObject();
        for (const fd of this.fields) {
            if (undefined !== fd.property) {
                dest[fd.property] = fd.decode(b, offset);
            }
            offset += fd.getSpan(b, offset);
            if (this.decodePrefixes
                && (b.length === offset)) {
                break;
            }
        }
        return dest;
    }
    /** Implement {@link Layout#encode|encode} for {@link Structure}.
     *
     * If `src` is missing a property for a member with a defined {@link
     * Layout#property|property} the corresponding region of the buffer is
     * left unmodified. */
    encode(src, b, offset = 0) {
        const firstOffset = offset;
        let lastOffset = 0;
        let lastWrote = 0;
        for (const fd of this.fields) {
            let span = fd.span;
            lastWrote = (0 < span) ? span : 0;
            if (undefined !== fd.property) {
                const fv = src[fd.property];
                if (undefined !== fv) {
                    lastWrote = fd.encode(fv, b, offset);
                    if (0 > span) {
                        /* Read the as-encoded span, which is not necessarily the
                         * same as what we wrote. */
                        span = fd.getSpan(b, offset);
                    }
                }
            }
            lastOffset = offset;
            offset += span;
        }
        /* Use (lastOffset + lastWrote) instead of offset because the last
         * item may have had a dynamic length and we don't want to include
         * the padding between it and the end of the space reserved for
         * it. */
        return (lastOffset + lastWrote) - firstOffset;
    }
    /** @override */
    fromArray(values) {
        const dest = this.makeDestinationObject();
        for (const fd of this.fields) {
            if ((undefined !== fd.property)
                && (0 < values.length)) {
                dest[fd.property] = values.shift();
            }
        }
        return dest;
    }
    /**
     * Get access to the layout of a given property.
     *
     * @param {String} property - the structure member of interest.
     *
     * @return {Layout} - the layout associated with `property`, or
     * undefined if there is no such property.
     */
    layoutFor(property) {
        if ('string' !== typeof property) {
            throw new TypeError('property must be string');
        }
        for (const fd of this.fields) {
            if (fd.property === property) {
                return fd;
            }
        }
        return undefined;
    }
    /**
     * Get the offset of a structure member.
     *
     * @param {String} property - the structure member of interest.
     *
     * @return {Number} - the offset in bytes to the start of `property`
     * within the structure, or undefined if `property` is not a field
     * within the structure.  If the property is a member but follows a
     * variable-length structure member a negative number will be
     * returned.
     */
    offsetOf(property) {
        if ('string' !== typeof property) {
            throw new TypeError('property must be string');
        }
        let offset = 0;
        for (const fd of this.fields) {
            if (fd.property === property) {
                return offset;
            }
            if (0 > fd.span) {
                offset = -1;
            }
            else if (0 <= offset) {
                offset += fd.span;
            }
        }
        return undefined;
    }
}
exports.Structure = Structure;
/**
 * An object that can provide a {@link
 * Union#discriminator|discriminator} API for {@link Union}.
 *
 * **NOTE** This is an abstract base class; you can create instances
 * if it amuses you, but they won't support the {@link
 * UnionDiscriminator#encode|encode} or {@link
 * UnionDiscriminator#decode|decode} functions.
 *
 * @param {string} [property] - Default for {@link
 * UnionDiscriminator#property|property}.
 *
 * @abstract
 */
class UnionDiscriminator {
    constructor(property) {
        /** The {@link Layout#property|property} to be used when the
         * discriminator is referenced in isolation (generally when {@link
         * Union#decode|Union decode} cannot delegate to a specific
         * variant). */
        this.property = property;
    }
    /** Analog to {@link Layout#decode|Layout decode} for union discriminators.
     *
     * The implementation of this method need not reference the buffer if
     * variant information is available through other means. */
    decode(b, offset) {
        throw new Error('UnionDiscriminator is abstract');
    }
    /** Analog to {@link Layout#decode|Layout encode} for union discriminators.
     *
     * The implementation of this method need not store the value if
     * variant information is maintained through other means. */
    encode(src, b, offset) {
        throw new Error('UnionDiscriminator is abstract');
    }
}
exports.UnionDiscriminator = UnionDiscriminator;
/**
 * An object that can provide a {@link
 * UnionDiscriminator|discriminator API} for {@link Union} using an
 * unsigned integral {@link Layout} instance located either inside or
 * outside the union.
 *
 * @param {ExternalLayout} layout - initializes {@link
 * UnionLayoutDiscriminator#layout|layout}.  Must satisfy {@link
 * ExternalLayout#isCount|isCount()}.
 *
 * @param {string} [property] - Default for {@link
 * UnionDiscriminator#property|property}, superseding the property
 * from `layout`, but defaulting to `variant` if neither `property`
 * nor layout provide a property name.
 *
 * @augments {UnionDiscriminator}
 */
class UnionLayoutDiscriminator extends UnionDiscriminator {
    constructor(layout, property) {
        if (!((layout instanceof ExternalLayout)
            && layout.isCount())) {
            throw new TypeError('layout must be an unsigned integer ExternalLayout');
        }
        super(property || layout.property || 'variant');
        /** The {@link ExternalLayout} used to access the discriminator
         * value. */
        this.layout = layout;
    }
    /** Delegate decoding to {@link UnionLayoutDiscriminator#layout|layout}. */
    decode(b, offset) {
        return this.layout.decode(b, offset);
    }
    /** Delegate encoding to {@link UnionLayoutDiscriminator#layout|layout}. */
    encode(src, b, offset) {
        return this.layout.encode(src, b, offset);
    }
}
exports.UnionLayoutDiscriminator = UnionLayoutDiscriminator;
/**
 * Represent any number of span-compatible layouts.
 *
 * *Factory*: {@link module:Layout.union|union}
 *
 * If the union has a {@link Union#defaultLayout|default layout} that
 * layout must have a non-negative {@link Layout#span|span}.  The span
 * of a fixed-span union includes its {@link
 * Union#discriminator|discriminator} if the variant is a {@link
 * Union#usesPrefixDiscriminator|prefix of the union}, plus the span
 * of its {@link Union#defaultLayout|default layout}.
 *
 * If the union does not have a default layout then the encoded span
 * of the union depends on the encoded span of its variant (which may
 * be fixed or variable).
 *
 * {@link VariantLayout#layout|Variant layout}s are added through
 * {@link Union#addVariant|addVariant}.  If the union has a default
 * layout, the span of the {@link VariantLayout#layout|layout
 * contained by the variant} must not exceed the span of the {@link
 * Union#defaultLayout|default layout} (minus the span of a {@link
 * Union#usesPrefixDiscriminator|prefix disriminator}, if used).  The
 * span of the variant will equal the span of the union itself.
 *
 * The variant for a buffer can only be identified from the {@link
 * Union#discriminator|discriminator} {@link
 * UnionDiscriminator#property|property} (in the case of the {@link
 * Union#defaultLayout|default layout}), or by using {@link
 * Union#getVariant|getVariant} and examining the resulting {@link
 * VariantLayout} instance.
 *
 * A variant compatible with a JavaScript object can be identified
 * using {@link Union#getSourceVariant|getSourceVariant}.
 *
 * @param {(UnionDiscriminator|ExternalLayout|Layout)} discr - How to
 * identify the layout used to interpret the union contents.  The
 * parameter must be an instance of {@link UnionDiscriminator}, an
 * {@link ExternalLayout} that satisfies {@link
 * ExternalLayout#isCount|isCount()}, or {@link UInt} (or {@link
 * UIntBE}).  When a non-external layout element is passed the layout
 * appears at the start of the union.  In all cases the (synthesized)
 * {@link UnionDiscriminator} instance is recorded as {@link
 * Union#discriminator|discriminator}.
 *
 * @param {(Layout|null)} defaultLayout - initializer for {@link
 * Union#defaultLayout|defaultLayout}.  If absent defaults to `null`.
 * If `null` there is no default layout: the union has data-dependent
 * length and attempts to decode or encode unrecognized variants will
 * throw an exception.  A {@link Layout} instance must have a
 * non-negative {@link Layout#span|span}, and if it lacks a {@link
 * Layout#property|property} the {@link
 * Union#defaultLayout|defaultLayout} will be a {@link
 * Layout#replicate|replica} with property `content`.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class Union extends Layout {
    constructor(discr, defaultLayout, property) {
        let discriminator;
        if ((discr instanceof UInt)
            || (discr instanceof UIntBE)) {
            discriminator = new UnionLayoutDiscriminator(new OffsetLayout(discr));
        }
        else if ((discr instanceof ExternalLayout)
            && discr.isCount()) {
            discriminator = new UnionLayoutDiscriminator(discr);
        }
        else if (!(discr instanceof UnionDiscriminator)) {
            throw new TypeError('discr must be a UnionDiscriminator '
                + 'or an unsigned integer layout');
        }
        else {
            discriminator = discr;
        }
        if (undefined === defaultLayout) {
            defaultLayout = null;
        }
        if (!((null === defaultLayout)
            || (defaultLayout instanceof Layout))) {
            throw new TypeError('defaultLayout must be null or a Layout');
        }
        if (null !== defaultLayout) {
            if (0 > defaultLayout.span) {
                throw new Error('defaultLayout must have constant span');
            }
            if (undefined === defaultLayout.property) {
                defaultLayout = defaultLayout.replicate('content');
            }
        }
        /* The union span can be estimated only if there's a default
         * layout.  The union spans its default layout, plus any prefix
         * variant layout.  By construction both layouts, if present, have
         * non-negative span. */
        let span = -1;
        if (defaultLayout) {
            span = defaultLayout.span;
            if ((0 <= span) && ((discr instanceof UInt)
                || (discr instanceof UIntBE))) {
                span += discriminator.layout.span;
            }
        }
        super(span, property);
        /** The interface for the discriminator value in isolation.
         *
         * This a {@link UnionDiscriminator} either passed to the
         * constructor or synthesized from the `discr` constructor
         * argument.  {@link
         * Union#usesPrefixDiscriminator|usesPrefixDiscriminator} will be
         * `true` iff the `discr` parameter was a non-offset {@link
         * Layout} instance. */
        this.discriminator = discriminator;
        /** `true` if the {@link Union#discriminator|discriminator} is the
         * first field in the union.
         *
         * If `false` the discriminator is obtained from somewhere
         * else. */
        this.usesPrefixDiscriminator = (discr instanceof UInt)
            || (discr instanceof UIntBE);
        /** The layout for non-discriminator content when the value of the
         * discriminator is not recognized.
         *
         * This is the value passed to the constructor.  It is
         * structurally equivalent to the second component of {@link
         * Union#layout|layout} but may have a different property
         * name. */
        this.defaultLayout = defaultLayout;
        /** A registry of allowed variants.
         *
         * The keys are unsigned integers which should be compatible with
         * {@link Union.discriminator|discriminator}.  The property value
         * is the corresponding {@link VariantLayout} instances assigned
         * to this union by {@link Union#addVariant|addVariant}.
         *
         * **NOTE** The registry remains mutable so that variants can be
         * {@link Union#addVariant|added} at any time.  Users should not
         * manipulate the content of this property. */
        this.registry = {};
        /* Private variable used when invoking getSourceVariant */
        let boundGetSourceVariant = this.defaultGetSourceVariant.bind(this);
        /** Function to infer the variant selected by a source object.
         *
         * Defaults to {@link
         * Union#defaultGetSourceVariant|defaultGetSourceVariant} but may
         * be overridden using {@link
         * Union#configGetSourceVariant|configGetSourceVariant}.
         *
         * @param {Object} src - as with {@link
         * Union#defaultGetSourceVariant|defaultGetSourceVariant}.
         *
         * @returns {(undefined|VariantLayout)} The default variant
         * (`undefined`) or first registered variant that uses a property
         * available in `src`. */
        this.getSourceVariant = function (src) {
            return boundGetSourceVariant(src);
        };
        /** Function to override the implementation of {@link
         * Union#getSourceVariant|getSourceVariant}.
         *
         * Use this if the desired variant cannot be identified using the
         * algorithm of {@link
         * Union#defaultGetSourceVariant|defaultGetSourceVariant}.
         *
         * **NOTE** The provided function will be invoked bound to this
         * Union instance, providing local access to {@link
         * Union#registry|registry}.
         *
         * @param {Function} gsv - a function that follows the API of
         * {@link Union#defaultGetSourceVariant|defaultGetSourceVariant}. */
        this.configGetSourceVariant = function (gsv) {
            boundGetSourceVariant = gsv.bind(this);
        };
    }
    /** @override */
    getSpan(b, offset = 0) {
        if (0 <= this.span) {
            return this.span;
        }
        /* Default layouts always have non-negative span, so we don't have
         * one and we have to recognize the variant which will in turn
         * determine the span. */
        const vlo = this.getVariant(b, offset);
        if (!vlo) {
            throw new Error('unable to determine span for unrecognized variant');
        }
        return vlo.getSpan(b, offset);
    }
    /**
     * Method to infer a registered Union variant compatible with `src`.
     *
     * The first satisfied rule in the following sequence defines the
     * return value:
     * * If `src` has properties matching the Union discriminator and
     *   the default layout, `undefined` is returned regardless of the
     *   value of the discriminator property (this ensures the default
     *   layout will be used);
     * * If `src` has a property matching the Union discriminator, the
     *   value of the discriminator identifies a registered variant, and
     *   either (a) the variant has no layout, or (b) `src` has the
     *   variant's property, then the variant is returned (because the
     *   source satisfies the constraints of the variant it identifies);
     * * If `src` does not have a property matching the Union
     *   discriminator, but does have a property matching a registered
     *   variant, then the variant is returned (because the source
     *   matches a variant without an explicit conflict);
     * * An error is thrown (because we either can't identify a variant,
     *   or we were explicitly told the variant but can't satisfy it).
     *
     * @param {Object} src - an object presumed to be compatible with
     * the content of the Union.
     *
     * @return {(undefined|VariantLayout)} - as described above.
     *
     * @throws {Error} - if `src` cannot be associated with a default or
     * registered variant.
     */
    defaultGetSourceVariant(src) {
        if (Object.prototype.hasOwnProperty.call(src, this.discriminator.property)) {
            if (this.defaultLayout && this.defaultLayout.property
                && Object.prototype.hasOwnProperty.call(src, this.defaultLayout.property)) {
                return undefined;
            }
            const vlo = this.registry[src[this.discriminator.property]];
            if (vlo
                && ((!vlo.layout)
                    || (vlo.property && Object.prototype.hasOwnProperty.call(src, vlo.property)))) {
                return vlo;
            }
        }
        else {
            for (const tag in this.registry) {
                const vlo = this.registry[tag];
                if (vlo.property && Object.prototype.hasOwnProperty.call(src, vlo.property)) {
                    return vlo;
                }
            }
        }
        throw new Error('unable to infer src variant');
    }
    /** Implement {@link Layout#decode|decode} for {@link Union}.
     *
     * If the variant is {@link Union#addVariant|registered} the return
     * value is an instance of that variant, with no explicit
     * discriminator.  Otherwise the {@link Union#defaultLayout|default
     * layout} is used to decode the content. */
    decode(b, offset = 0) {
        let dest;
        const dlo = this.discriminator;
        const discr = dlo.decode(b, offset);
        const clo = this.registry[discr];
        if (undefined === clo) {
            const defaultLayout = this.defaultLayout;
            let contentOffset = 0;
            if (this.usesPrefixDiscriminator) {
                contentOffset = dlo.layout.span;
            }
            dest = this.makeDestinationObject();
            dest[dlo.property] = discr;
            // defaultLayout.property can be undefined, but this is allowed by buffer-layout
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            dest[defaultLayout.property] = defaultLayout.decode(b, offset + contentOffset);
        }
        else {
            dest = clo.decode(b, offset);
        }
        return dest;
    }
    /** Implement {@link Layout#encode|encode} for {@link Union}.
     *
     * This API assumes the `src` object is consistent with the union's
     * {@link Union#defaultLayout|default layout}.  To encode variants
     * use the appropriate variant-specific {@link VariantLayout#encode}
     * method. */
    encode(src, b, offset = 0) {
        const vlo = this.getSourceVariant(src);
        if (undefined === vlo) {
            const dlo = this.discriminator;
            // this.defaultLayout is not undefined when vlo is undefined
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const clo = this.defaultLayout;
            let contentOffset = 0;
            if (this.usesPrefixDiscriminator) {
                contentOffset = dlo.layout.span;
            }
            dlo.encode(src[dlo.property], b, offset);
            // clo.property is not undefined when vlo is undefined
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return contentOffset + clo.encode(src[clo.property], b, offset + contentOffset);
        }
        return vlo.encode(src, b, offset);
    }
    /** Register a new variant structure within a union.  The newly
     * created variant is returned.
     *
     * @param {Number} variant - initializer for {@link
     * VariantLayout#variant|variant}.
     *
     * @param {Layout} layout - initializer for {@link
     * VariantLayout#layout|layout}.
     *
     * @param {String} property - initializer for {@link
     * Layout#property|property}.
     *
     * @return {VariantLayout} */
    addVariant(variant, layout, property) {
        const rv = new VariantLayout(this, variant, layout, property);
        this.registry[variant] = rv;
        return rv;
    }
    /**
     * Get the layout associated with a registered variant.
     *
     * If `vb` does not produce a registered variant the function returns
     * `undefined`.
     *
     * @param {(Number|Uint8Array)} vb - either the variant number, or a
     * buffer from which the discriminator is to be read.
     *
     * @param {Number} offset - offset into `vb` for the start of the
     * union.  Used only when `vb` is an instance of {Uint8Array}.
     *
     * @return {({VariantLayout}|undefined)}
     */
    getVariant(vb, offset = 0) {
        let variant;
        if (vb instanceof Uint8Array) {
            variant = this.discriminator.decode(vb, offset);
        }
        else {
            variant = vb;
        }
        return this.registry[variant];
    }
}
exports.Union = Union;
/**
 * Represent a specific variant within a containing union.
 *
 * **NOTE** The {@link Layout#span|span} of the variant may include
 * the span of the {@link Union#discriminator|discriminator} used to
 * identify it, but values read and written using the variant strictly
 * conform to the content of {@link VariantLayout#layout|layout}.
 *
 * **NOTE** User code should not invoke this constructor directly.  Use
 * the union {@link Union#addVariant|addVariant} helper method.
 *
 * @param {Union} union - initializer for {@link
 * VariantLayout#union|union}.
 *
 * @param {Number} variant - initializer for {@link
 * VariantLayout#variant|variant}.
 *
 * @param {Layout} [layout] - initializer for {@link
 * VariantLayout#layout|layout}.  If absent the variant carries no
 * data.
 *
 * @param {String} [property] - initializer for {@link
 * Layout#property|property}.  Unlike many other layouts, variant
 * layouts normally include a property name so they can be identified
 * within their containing {@link Union}.  The property identifier may
 * be absent only if `layout` is is absent.
 *
 * @augments {Layout}
 */
class VariantLayout extends Layout {
    constructor(union, variant, layout, property) {
        if (!(union instanceof Union)) {
            throw new TypeError('union must be a Union');
        }
        if ((!Number.isInteger(variant)) || (0 > variant)) {
            throw new TypeError('variant must be a (non-negative) integer');
        }
        if (('string' === typeof layout)
            && (undefined === property)) {
            property = layout;
            layout = null;
        }
        if (layout) {
            if (!(layout instanceof Layout)) {
                throw new TypeError('layout must be a Layout');
            }
            if ((null !== union.defaultLayout)
                && (0 <= layout.span)
                && (layout.span > union.defaultLayout.span)) {
                throw new Error('variant span exceeds span of containing union');
            }
            if ('string' !== typeof property) {
                throw new TypeError('variant must have a String property');
            }
        }
        let span = union.span;
        if (0 > union.span) {
            span = layout ? layout.span : 0;
            if ((0 <= span) && union.usesPrefixDiscriminator) {
                span += union.discriminator.layout.span;
            }
        }
        super(span, property);
        /** The {@link Union} to which this variant belongs. */
        this.union = union;
        /** The unsigned integral value identifying this variant within
         * the {@link Union#discriminator|discriminator} of the containing
         * union. */
        this.variant = variant;
        /** The {@link Layout} to be used when reading/writing the
         * non-discriminator part of the {@link
         * VariantLayout#union|union}.  If `null` the variant carries no
         * data. */
        this.layout = layout || null;
    }
    /** @override */
    getSpan(b, offset = 0) {
        if (0 <= this.span) {
            /* Will be equal to the containing union span if that is not
             * variable. */
            return this.span;
        }
        let contentOffset = 0;
        if (this.union.usesPrefixDiscriminator) {
            contentOffset = this.union.discriminator.layout.span;
        }
        /* Span is defined solely by the variant (and prefix discriminator) */
        let span = 0;
        if (this.layout) {
            span = this.layout.getSpan(b, offset + contentOffset);
        }
        return contentOffset + span;
    }
    /** @override */
    decode(b, offset = 0) {
        const dest = this.makeDestinationObject();
        if (this !== this.union.getVariant(b, offset)) {
            throw new Error('variant mismatch');
        }
        let contentOffset = 0;
        if (this.union.usesPrefixDiscriminator) {
            contentOffset = this.union.discriminator.layout.span;
        }
        if (this.layout) {
            dest[this.property] = this.layout.decode(b, offset + contentOffset);
        }
        else if (this.property) {
            dest[this.property] = true;
        }
        else if (this.union.usesPrefixDiscriminator) {
            dest[this.union.discriminator.property] = this.variant;
        }
        return dest;
    }
    /** @override */
    encode(src, b, offset = 0) {
        let contentOffset = 0;
        if (this.union.usesPrefixDiscriminator) {
            contentOffset = this.union.discriminator.layout.span;
        }
        if (this.layout
            && (!Object.prototype.hasOwnProperty.call(src, this.property))) {
            throw new TypeError('variant lacks property ' + this.property);
        }
        this.union.discriminator.encode(this.variant, b, offset);
        let span = contentOffset;
        if (this.layout) {
            this.layout.encode(src[this.property], b, offset + contentOffset);
            span += this.layout.getSpan(b, offset + contentOffset);
            if ((0 <= this.union.span)
                && (span > this.union.span)) {
                throw new Error('encoded variant overruns containing union');
            }
        }
        return span;
    }
    /** Delegate {@link Layout#fromArray|fromArray} to {@link
     * VariantLayout#layout|layout}. */
    fromArray(values) {
        if (this.layout) {
            return this.layout.fromArray(values);
        }
        return undefined;
    }
}
exports.VariantLayout = VariantLayout;
/** JavaScript chose to define bitwise operations as operating on
 * signed 32-bit values in 2's complement form, meaning any integer
 * with bit 31 set is going to look negative.  For right shifts that's
 * not a problem, because `>>>` is a logical shift, but for every
 * other bitwise operator we have to compensate for possible negative
 * results. */
function fixBitwiseResult(v) {
    if (0 > v) {
        v += 0x100000000;
    }
    return v;
}
/**
 * Contain a sequence of bit fields as an unsigned integer.
 *
 * *Factory*: {@link module:Layout.bits|bits}
 *
 * This is a container element; within it there are {@link BitField}
 * instances that provide the extracted properties.  The container
 * simply defines the aggregate representation and its bit ordering.
 * The representation is an object containing properties with numeric
 * or {@link Boolean} values.
 *
 * {@link BitField}s are added with the {@link
 * BitStructure#addField|addField} and {@link
 * BitStructure#addBoolean|addBoolean} methods.

 * @param {Layout} word - initializer for {@link
 * BitStructure#word|word}.  The parameter must be an instance of
 * {@link UInt} (or {@link UIntBE}) that is no more than 4 bytes wide.
 *
 * @param {bool} [msb] - `true` if the bit numbering starts at the
 * most significant bit of the containing word; `false` (default) if
 * it starts at the least significant bit of the containing word.  If
 * the parameter at this position is a string and `property` is
 * `undefined` the value of this argument will instead be used as the
 * value of `property`.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class BitStructure extends Layout {
    constructor(word, msb, property) {
        if (!((word instanceof UInt)
            || (word instanceof UIntBE))) {
            throw new TypeError('word must be a UInt or UIntBE layout');
        }
        if (('string' === typeof msb)
            && (undefined === property)) {
            property = msb;
            msb = false;
        }
        if (4 < word.span) {
            throw new RangeError('word cannot exceed 32 bits');
        }
        super(word.span, property);
        /** The layout used for the packed value.  {@link BitField}
         * instances are packed sequentially depending on {@link
         * BitStructure#msb|msb}. */
        this.word = word;
        /** Whether the bit sequences are packed starting at the most
         * significant bit growing down (`true`), or the least significant
         * bit growing up (`false`).
         *
         * **NOTE** Regardless of this value, the least significant bit of
         * any {@link BitField} value is the least significant bit of the
         * corresponding section of the packed value. */
        this.msb = !!msb;
        /** The sequence of {@link BitField} layouts that comprise the
         * packed structure.
         *
         * **NOTE** The array remains mutable to allow fields to be {@link
         * BitStructure#addField|added} after construction.  Users should
         * not manipulate the content of this property.*/
        this.fields = [];
        /* Storage for the value.  Capture a variable instead of using an
         * instance property because we don't want anything to change the
         * value without going through the mutator. */
        let value = 0;
        this._packedSetValue = function (v) {
            value = fixBitwiseResult(v);
            return this;
        };
        this._packedGetValue = function () {
            return value;
        };
    }
    /** @override */
    decode(b, offset = 0) {
        const dest = this.makeDestinationObject();
        const value = this.word.decode(b, offset);
        this._packedSetValue(value);
        for (const fd of this.fields) {
            if (undefined !== fd.property) {
                dest[fd.property] = fd.decode(b);
            }
        }
        return dest;
    }
    /** Implement {@link Layout#encode|encode} for {@link BitStructure}.
     *
     * If `src` is missing a property for a member with a defined {@link
     * Layout#property|property} the corresponding region of the packed
     * value is left unmodified.  Unused bits are also left unmodified. */
    encode(src, b, offset = 0) {
        const value = this.word.decode(b, offset);
        this._packedSetValue(value);
        for (const fd of this.fields) {
            if (undefined !== fd.property) {
                const fv = src[fd.property];
                if (undefined !== fv) {
                    fd.encode(fv);
                }
            }
        }
        return this.word.encode(this._packedGetValue(), b, offset);
    }
    /** Register a new bitfield with a containing bit structure.  The
     * resulting bitfield is returned.
     *
     * @param {Number} bits - initializer for {@link BitField#bits|bits}.
     *
     * @param {string} property - initializer for {@link
     * Layout#property|property}.
     *
     * @return {BitField} */
    addField(bits, property) {
        const bf = new BitField(this, bits, property);
        this.fields.push(bf);
        return bf;
    }
    /** As with {@link BitStructure#addField|addField} for single-bit
     * fields with `boolean` value representation.
     *
     * @param {string} property - initializer for {@link
     * Layout#property|property}.
     *
     * @return {Boolean} */
    // `Boolean` conflicts with the native primitive type
    // eslint-disable-next-line @typescript-eslint/ban-types
    addBoolean(property) {
        // This is my Boolean, not the Javascript one.
        const bf = new Boolean(this, property);
        this.fields.push(bf);
        return bf;
    }
    /**
     * Get access to the bit field for a given property.
     *
     * @param {String} property - the bit field of interest.
     *
     * @return {BitField} - the field associated with `property`, or
     * undefined if there is no such property.
     */
    fieldFor(property) {
        if ('string' !== typeof property) {
            throw new TypeError('property must be string');
        }
        for (const fd of this.fields) {
            if (fd.property === property) {
                return fd;
            }
        }
        return undefined;
    }
}
exports.BitStructure = BitStructure;
/**
 * Represent a sequence of bits within a {@link BitStructure}.
 *
 * All bit field values are represented as unsigned integers.
 *
 * **NOTE** User code should not invoke this constructor directly.
 * Use the container {@link BitStructure#addField|addField} helper
 * method.
 *
 * **NOTE** BitField instances are not instances of {@link Layout}
 * since {@link Layout#span|span} measures 8-bit units.
 *
 * @param {BitStructure} container - initializer for {@link
 * BitField#container|container}.
 *
 * @param {Number} bits - initializer for {@link BitField#bits|bits}.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 */
class BitField {
    constructor(container, bits, property) {
        if (!(container instanceof BitStructure)) {
            throw new TypeError('container must be a BitStructure');
        }
        if ((!Number.isInteger(bits)) || (0 >= bits)) {
            throw new TypeError('bits must be positive integer');
        }
        const totalBits = 8 * container.span;
        const usedBits = container.fields.reduce((sum, fd) => sum + fd.bits, 0);
        if ((bits + usedBits) > totalBits) {
            throw new Error('bits too long for span remainder ('
                + (totalBits - usedBits) + ' of '
                + totalBits + ' remain)');
        }
        /** The {@link BitStructure} instance to which this bit field
         * belongs. */
        this.container = container;
        /** The span of this value in bits. */
        this.bits = bits;
        /** A mask of {@link BitField#bits|bits} bits isolating value bits
         * that fit within the field.
         *
         * That is, it masks a value that has not yet been shifted into
         * position within its containing packed integer. */
        this.valueMask = (1 << bits) - 1;
        if (32 === bits) { // shifted value out of range
            this.valueMask = 0xFFFFFFFF;
        }
        /** The offset of the value within the containing packed unsigned
         * integer.  The least significant bit of the packed value is at
         * offset zero, regardless of bit ordering used. */
        this.start = usedBits;
        if (this.container.msb) {
            this.start = totalBits - usedBits - bits;
        }
        /** A mask of {@link BitField#bits|bits} isolating the field value
         * within the containing packed unsigned integer. */
        this.wordMask = fixBitwiseResult(this.valueMask << this.start);
        /** The property name used when this bitfield is represented in an
         * Object.
         *
         * Intended to be functionally equivalent to {@link
         * Layout#property}.
         *
         * If left undefined the corresponding span of bits will be
         * treated as padding: it will not be mutated by {@link
         * Layout#encode|encode} nor represented as a property in the
         * decoded Object. */
        this.property = property;
    }
    /** Store a value into the corresponding subsequence of the containing
     * bit field. */
    decode(b, offset) {
        const word = this.container._packedGetValue();
        const wordValue = fixBitwiseResult(word & this.wordMask);
        const value = wordValue >>> this.start;
        return value;
    }
    /** Store a value into the corresponding subsequence of the containing
     * bit field.
     *
     * **NOTE** This is not a specialization of {@link
     * Layout#encode|Layout.encode} and there is no return value. */
    encode(value) {
        if ('number' !== typeof value
            || !Number.isInteger(value)
            || (value !== fixBitwiseResult(value & this.valueMask))) {
            throw new TypeError(nameWithProperty('BitField.encode', this)
                + ' value must be integer not exceeding ' + this.valueMask);
        }
        const word = this.container._packedGetValue();
        const wordValue = fixBitwiseResult(value << this.start);
        this.container._packedSetValue(fixBitwiseResult(word & ~this.wordMask)
            | wordValue);
    }
}
exports.BitField = BitField;
/**
 * Represent a single bit within a {@link BitStructure} as a
 * JavaScript boolean.
 *
 * **NOTE** User code should not invoke this constructor directly.
 * Use the container {@link BitStructure#addBoolean|addBoolean} helper
 * method.
 *
 * @param {BitStructure} container - initializer for {@link
 * BitField#container|container}.
 *
 * @param {string} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {BitField}
 */
/* eslint-disable no-extend-native */
class Boolean extends BitField {
    constructor(container, property) {
        super(container, 1, property);
    }
    /** Override {@link BitField#decode|decode} for {@link Boolean|Boolean}.
     *
     * @returns {boolean} */
    decode(b, offset) {
        return !!super.decode(b, offset);
    }
    /** @override */
    encode(value) {
        if ('boolean' === typeof value) {
            // BitField requires integer values
            value = +value;
        }
        super.encode(value);
    }
}
exports.Boolean = Boolean;
/* eslint-enable no-extend-native */
/**
 * Contain a fixed-length block of arbitrary data, represented as a
 * Uint8Array.
 *
 * *Factory*: {@link module:Layout.blob|blob}
 *
 * @param {(Number|ExternalLayout)} length - initializes {@link
 * Blob#length|length}.
 *
 * @param {String} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class Blob extends Layout {
    constructor(length, property) {
        if (!(((length instanceof ExternalLayout) && length.isCount())
            || (Number.isInteger(length) && (0 <= length)))) {
            throw new TypeError('length must be positive integer '
                + 'or an unsigned integer ExternalLayout');
        }
        let span = -1;
        if (!(length instanceof ExternalLayout)) {
            span = length;
        }
        super(span, property);
        /** The number of bytes in the blob.
         *
         * This may be a non-negative integer, or an instance of {@link
         * ExternalLayout} that satisfies {@link
         * ExternalLayout#isCount|isCount()}. */
        this.length = length;
    }
    /** @override */
    getSpan(b, offset) {
        let span = this.span;
        if (0 > span) {
            span = this.length.decode(b, offset);
        }
        return span;
    }
    /** @override */
    decode(b, offset = 0) {
        let span = this.span;
        if (0 > span) {
            span = this.length.decode(b, offset);
        }
        return uint8ArrayToBuffer(b).slice(offset, offset + span);
    }
    /** Implement {@link Layout#encode|encode} for {@link Blob}.
     *
     * **NOTE** If {@link Layout#count|count} is an instance of {@link
     * ExternalLayout} then the length of `src` will be encoded as the
     * count after `src` is encoded. */
    encode(src, b, offset) {
        let span = this.length;
        if (this.length instanceof ExternalLayout) {
            span = src.length;
        }
        if (!(src instanceof Uint8Array && span === src.length)) {
            throw new TypeError(nameWithProperty('Blob.encode', this)
                + ' requires (length ' + span + ') Uint8Array as src');
        }
        if ((offset + span) > b.length) {
            throw new RangeError('encoding overruns Uint8Array');
        }
        const srcBuffer = uint8ArrayToBuffer(src);
        uint8ArrayToBuffer(b).write(srcBuffer.toString('hex'), offset, span, 'hex');
        if (this.length instanceof ExternalLayout) {
            this.length.encode(span, b, offset);
        }
        return span;
    }
}
exports.Blob = Blob;
/**
 * Contain a `NUL`-terminated UTF8 string.
 *
 * *Factory*: {@link module:Layout.cstr|cstr}
 *
 * **NOTE** Any UTF8 string that incorporates a zero-valued byte will
 * not be correctly decoded by this layout.
 *
 * @param {String} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class CString extends Layout {
    constructor(property) {
        super(-1, property);
    }
    /** @override */
    getSpan(b, offset = 0) {
        checkUint8Array(b);
        let idx = offset;
        while ((idx < b.length) && (0 !== b[idx])) {
            idx += 1;
        }
        return 1 + idx - offset;
    }
    /** @override */
    decode(b, offset = 0) {
        const span = this.getSpan(b, offset);
        return uint8ArrayToBuffer(b).slice(offset, offset + span - 1).toString('utf-8');
    }
    /** @override */
    encode(src, b, offset = 0) {
        /* Must force this to a string, lest it be a number and the
         * "utf8-encoding" below actually allocate a buffer of length
         * src */
        if ('string' !== typeof src) {
            src = String(src);
        }
        const srcb = buffer_1.Buffer.from(src, 'utf8');
        const span = srcb.length;
        if ((offset + span) > b.length) {
            throw new RangeError('encoding overruns Buffer');
        }
        const buffer = uint8ArrayToBuffer(b);
        srcb.copy(buffer, offset);
        buffer[offset + span] = 0;
        return span + 1;
    }
}
exports.CString = CString;
/**
 * Contain a UTF8 string with implicit length.
 *
 * *Factory*: {@link module:Layout.utf8|utf8}
 *
 * **NOTE** Because the length is implicit in the size of the buffer
 * this layout should be used only in isolation, or in a situation
 * where the length can be expressed by operating on a slice of the
 * containing buffer.
 *
 * @param {Number} [maxSpan] - the maximum length allowed for encoded
 * string content.  If not provided there is no bound on the allowed
 * content.
 *
 * @param {String} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class UTF8 extends Layout {
    constructor(maxSpan, property) {
        if (('string' === typeof maxSpan) && (undefined === property)) {
            property = maxSpan;
            maxSpan = undefined;
        }
        if (undefined === maxSpan) {
            maxSpan = -1;
        }
        else if (!Number.isInteger(maxSpan)) {
            throw new TypeError('maxSpan must be an integer');
        }
        super(-1, property);
        /** The maximum span of the layout in bytes.
         *
         * Positive values are generally expected.  Zero is abnormal.
         * Attempts to encode or decode a value that exceeds this length
         * will throw a `RangeError`.
         *
         * A negative value indicates that there is no bound on the length
         * of the content. */
        this.maxSpan = maxSpan;
    }
    /** @override */
    getSpan(b, offset = 0) {
        checkUint8Array(b);
        return b.length - offset;
    }
    /** @override */
    decode(b, offset = 0) {
        const span = this.getSpan(b, offset);
        if ((0 <= this.maxSpan)
            && (this.maxSpan < span)) {
            throw new RangeError('text length exceeds maxSpan');
        }
        return uint8ArrayToBuffer(b).slice(offset, offset + span).toString('utf-8');
    }
    /** @override */
    encode(src, b, offset = 0) {
        /* Must force this to a string, lest it be a number and the
         * "utf8-encoding" below actually allocate a buffer of length
         * src */
        if ('string' !== typeof src) {
            src = String(src);
        }
        const srcb = buffer_1.Buffer.from(src, 'utf8');
        const span = srcb.length;
        if ((0 <= this.maxSpan)
            && (this.maxSpan < span)) {
            throw new RangeError('text length exceeds maxSpan');
        }
        if ((offset + span) > b.length) {
            throw new RangeError('encoding overruns Buffer');
        }
        srcb.copy(uint8ArrayToBuffer(b), offset);
        return span;
    }
}
exports.UTF8 = UTF8;
/**
 * Contain a constant value.
 *
 * This layout may be used in cases where a JavaScript value can be
 * inferred without an expression in the binary encoding.  An example
 * would be a {@link VariantLayout|variant layout} where the content
 * is implied by the union {@link Union#discriminator|discriminator}.
 *
 * @param {Object|Number|String} value - initializer for {@link
 * Constant#value|value}.  If the value is an object (or array) and
 * the application intends the object to remain unchanged regardless
 * of what is done to values decoded by this layout, the value should
 * be frozen prior passing it to this constructor.
 *
 * @param {String} [property] - initializer for {@link
 * Layout#property|property}.
 *
 * @augments {Layout}
 */
class Constant extends Layout {
    constructor(value, property) {
        super(0, property);
        /** The value produced by this constant when the layout is {@link
         * Constant#decode|decoded}.
         *
         * Any JavaScript value including `null` and `undefined` is
         * permitted.
         *
         * **WARNING** If `value` passed in the constructor was not
         * frozen, it is possible for users of decoded values to change
         * the content of the value. */
        this.value = value;
    }
    /** @override */
    decode(b, offset) {
        return this.value;
    }
    /** @override */
    encode(src, b, offset) {
        /* Constants take no space */
        return 0;
    }
}
exports.Constant = Constant;
/** Factory for {@link GreedyCount}. */
exports.greedy = ((elementSpan, property) => new GreedyCount(elementSpan, property));
/** Factory for {@link OffsetLayout}. */
exports.offset = ((layout, offset, property) => new OffsetLayout(layout, offset, property));
/** Factory for {@link UInt|unsigned int layouts} spanning one
 * byte. */
exports.u8 = ((property) => new UInt(1, property));
/** Factory for {@link UInt|little-endian unsigned int layouts}
 * spanning two bytes. */
exports.u16 = ((property) => new UInt(2, property));
/** Factory for {@link UInt|little-endian unsigned int layouts}
 * spanning three bytes. */
exports.u24 = ((property) => new UInt(3, property));
/** Factory for {@link UInt|little-endian unsigned int layouts}
 * spanning four bytes. */
exports.u32 = ((property) => new UInt(4, property));
/** Factory for {@link UInt|little-endian unsigned int layouts}
 * spanning five bytes. */
exports.u40 = ((property) => new UInt(5, property));
/** Factory for {@link UInt|little-endian unsigned int layouts}
 * spanning six bytes. */
exports.u48 = ((property) => new UInt(6, property));
/** Factory for {@link NearUInt64|little-endian unsigned int
 * layouts} interpreted as Numbers. */
exports.nu64 = ((property) => new NearUInt64(property));
/** Factory for {@link UInt|big-endian unsigned int layouts}
 * spanning two bytes. */
exports.u16be = ((property) => new UIntBE(2, property));
/** Factory for {@link UInt|big-endian unsigned int layouts}
 * spanning three bytes. */
exports.u24be = ((property) => new UIntBE(3, property));
/** Factory for {@link UInt|big-endian unsigned int layouts}
 * spanning four bytes. */
exports.u32be = ((property) => new UIntBE(4, property));
/** Factory for {@link UInt|big-endian unsigned int layouts}
 * spanning five bytes. */
exports.u40be = ((property) => new UIntBE(5, property));
/** Factory for {@link UInt|big-endian unsigned int layouts}
 * spanning six bytes. */
exports.u48be = ((property) => new UIntBE(6, property));
/** Factory for {@link NearUInt64BE|big-endian unsigned int
 * layouts} interpreted as Numbers. */
exports.nu64be = ((property) => new NearUInt64BE(property));
/** Factory for {@link Int|signed int layouts} spanning one
 * byte. */
exports.s8 = ((property) => new Int(1, property));
/** Factory for {@link Int|little-endian signed int layouts}
 * spanning two bytes. */
exports.s16 = ((property) => new Int(2, property));
/** Factory for {@link Int|little-endian signed int layouts}
 * spanning three bytes. */
exports.s24 = ((property) => new Int(3, property));
/** Factory for {@link Int|little-endian signed int layouts}
 * spanning four bytes. */
exports.s32 = ((property) => new Int(4, property));
/** Factory for {@link Int|little-endian signed int layouts}
 * spanning five bytes. */
exports.s40 = ((property) => new Int(5, property));
/** Factory for {@link Int|little-endian signed int layouts}
 * spanning six bytes. */
exports.s48 = ((property) => new Int(6, property));
/** Factory for {@link NearInt64|little-endian signed int layouts}
 * interpreted as Numbers. */
exports.ns64 = ((property) => new NearInt64(property));
/** Factory for {@link Int|big-endian signed int layouts}
 * spanning two bytes. */
exports.s16be = ((property) => new IntBE(2, property));
/** Factory for {@link Int|big-endian signed int layouts}
 * spanning three bytes. */
exports.s24be = ((property) => new IntBE(3, property));
/** Factory for {@link Int|big-endian signed int layouts}
 * spanning four bytes. */
exports.s32be = ((property) => new IntBE(4, property));
/** Factory for {@link Int|big-endian signed int layouts}
 * spanning five bytes. */
exports.s40be = ((property) => new IntBE(5, property));
/** Factory for {@link Int|big-endian signed int layouts}
 * spanning six bytes. */
exports.s48be = ((property) => new IntBE(6, property));
/** Factory for {@link NearInt64BE|big-endian signed int layouts}
 * interpreted as Numbers. */
exports.ns64be = ((property) => new NearInt64BE(property));
/** Factory for {@link Float|little-endian 32-bit floating point} values. */
exports.f32 = ((property) => new Float(property));
/** Factory for {@link FloatBE|big-endian 32-bit floating point} values. */
exports.f32be = ((property) => new FloatBE(property));
/** Factory for {@link Double|little-endian 64-bit floating point} values. */
exports.f64 = ((property) => new Double(property));
/** Factory for {@link DoubleBE|big-endian 64-bit floating point} values. */
exports.f64be = ((property) => new DoubleBE(property));
/** Factory for {@link Structure} values. */
exports.struct = ((fields, property, decodePrefixes) => new Structure(fields, property, decodePrefixes));
/** Factory for {@link BitStructure} values. */
exports.bits = ((word, msb, property) => new BitStructure(word, msb, property));
/** Factory for {@link Sequence} values. */
exports.seq = ((elementLayout, count, property) => new Sequence(elementLayout, count, property));
/** Factory for {@link Union} values. */
exports.union = ((discr, defaultLayout, property) => new Union(discr, defaultLayout, property));
/** Factory for {@link UnionLayoutDiscriminator} values. */
exports.unionLayoutDiscriminator = ((layout, property) => new UnionLayoutDiscriminator(layout, property));
/** Factory for {@link Blob} values. */
exports.blob = ((length, property) => new Blob(length, property));
/** Factory for {@link CString} values. */
exports.cstr = ((property) => new CString(property));
/** Factory for {@link UTF8} values. */
exports.utf8 = ((maxSpan, property) => new UTF8(maxSpan, property));
/** Factory for {@link Constant} values. */
exports.constant = ((value, property) => new Constant(value, property));

},{"buffer":2}],25:[function(require,module,exports){
'use strict'
// base-x encoding / decoding
// Copyright (c) 2018 base-x contributors
// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
// @ts-ignore
var _Buffer = require('safe-buffer').Buffer
function base (ALPHABET) {
  if (ALPHABET.length >= 255) { throw new TypeError('Alphabet too long') }
  var BASE_MAP = new Uint8Array(256)
  for (var j = 0; j < BASE_MAP.length; j++) {
    BASE_MAP[j] = 255
  }
  for (var i = 0; i < ALPHABET.length; i++) {
    var x = ALPHABET.charAt(i)
    var xc = x.charCodeAt(0)
    if (BASE_MAP[xc] !== 255) { throw new TypeError(x + ' is ambiguous') }
    BASE_MAP[xc] = i
  }
  var BASE = ALPHABET.length
  var LEADER = ALPHABET.charAt(0)
  var FACTOR = Math.log(BASE) / Math.log(256) // log(BASE) / log(256), rounded up
  var iFACTOR = Math.log(256) / Math.log(BASE) // log(256) / log(BASE), rounded up
  function encode (source) {
    if (Array.isArray(source) || source instanceof Uint8Array) { source = _Buffer.from(source) }
    if (!_Buffer.isBuffer(source)) { throw new TypeError('Expected Buffer') }
    if (source.length === 0) { return '' }
        // Skip & count leading zeroes.
    var zeroes = 0
    var length = 0
    var pbegin = 0
    var pend = source.length
    while (pbegin !== pend && source[pbegin] === 0) {
      pbegin++
      zeroes++
    }
        // Allocate enough space in big-endian base58 representation.
    var size = ((pend - pbegin) * iFACTOR + 1) >>> 0
    var b58 = new Uint8Array(size)
        // Process the bytes.
    while (pbegin !== pend) {
      var carry = source[pbegin]
            // Apply "b58 = b58 * 256 + ch".
      var i = 0
      for (var it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
        carry += (256 * b58[it1]) >>> 0
        b58[it1] = (carry % BASE) >>> 0
        carry = (carry / BASE) >>> 0
      }
      if (carry !== 0) { throw new Error('Non-zero carry') }
      length = i
      pbegin++
    }
        // Skip leading zeroes in base58 result.
    var it2 = size - length
    while (it2 !== size && b58[it2] === 0) {
      it2++
    }
        // Translate the result into a string.
    var str = LEADER.repeat(zeroes)
    for (; it2 < size; ++it2) { str += ALPHABET.charAt(b58[it2]) }
    return str
  }
  function decodeUnsafe (source) {
    if (typeof source !== 'string') { throw new TypeError('Expected String') }
    if (source.length === 0) { return _Buffer.alloc(0) }
    var psz = 0
        // Skip and count leading '1's.
    var zeroes = 0
    var length = 0
    while (source[psz] === LEADER) {
      zeroes++
      psz++
    }
        // Allocate enough space in big-endian base256 representation.
    var size = (((source.length - psz) * FACTOR) + 1) >>> 0 // log(58) / log(256), rounded up.
    var b256 = new Uint8Array(size)
        // Process the characters.
    while (psz < source.length) {
            // Find code of next character
      var charCode = source.charCodeAt(psz)
            // Base map can not be indexed using char code
      if (charCode > 255) { return }
            // Decode character
      var carry = BASE_MAP[charCode]
            // Invalid character
      if (carry === 255) { return }
      var i = 0
      for (var it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
        carry += (BASE * b256[it3]) >>> 0
        b256[it3] = (carry % 256) >>> 0
        carry = (carry / 256) >>> 0
      }
      if (carry !== 0) { throw new Error('Non-zero carry') }
      length = i
      psz++
    }
        // Skip leading zeroes in b256.
    var it4 = size - length
    while (it4 !== size && b256[it4] === 0) {
      it4++
    }
    var vch = _Buffer.allocUnsafe(zeroes + (size - it4))
    vch.fill(0x00, 0, zeroes)
    var j = zeroes
    while (it4 !== size) {
      vch[j++] = b256[it4++]
    }
    return vch
  }
  function decode (string) {
    var buffer = decodeUnsafe(string)
    if (buffer) { return buffer }
    throw new Error('Non-base' + BASE + ' character')
  }
  return {
    encode: encode,
    decodeUnsafe: decodeUnsafe,
    decode: decode
  }
}
module.exports = base

},{"safe-buffer":35}],26:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

Object.defineProperty(exports, "__esModule", { value: true });
let converter;
/**
 * Convert a little-endian buffer into a BigInt.
 * @param buf The little-endian buffer to convert
 * @returns A BigInt with the little-endian representation of buf.
 */
function toBigIntLE(buf) {
    {
        const reversed = Buffer.from(buf);
        reversed.reverse();
        const hex = reversed.toString('hex');
        if (hex.length === 0) {
            return BigInt(0);
        }
        return BigInt(`0x${hex}`);
    }
    return converter.toBigInt(buf, false);
}
exports.toBigIntLE = toBigIntLE;
/**
 * Convert a big-endian buffer into a BigInt
 * @param buf The big-endian buffer to convert.
 * @returns A BigInt with the big-endian representation of buf.
 */
function toBigIntBE(buf) {
    {
        const hex = buf.toString('hex');
        if (hex.length === 0) {
            return BigInt(0);
        }
        return BigInt(`0x${hex}`);
    }
    return converter.toBigInt(buf, true);
}
exports.toBigIntBE = toBigIntBE;
/**
 * Convert a BigInt to a little-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A little-endian buffer representation of num.
 */
function toBufferLE(num, width) {
    {
        const hex = num.toString(16);
        const buffer = Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
        buffer.reverse();
        return buffer;
    }
    // Allocation is done here, since it is slower using napi in C
    return converter.fromBigInt(num, Buffer.allocUnsafe(width), false);
}
exports.toBufferLE = toBufferLE;
/**
 * Convert a BigInt to a big-endian buffer.
 * @param num   The BigInt to convert.
 * @param width The number of bytes that the resulting buffer should be.
 * @returns A big-endian buffer representation of num.
 */
function toBufferBE(num, width) {
    {
        const hex = num.toString(16);
        return Buffer.from(hex.padStart(width * 2, '0').slice(0, width * 2), 'hex');
    }
    return converter.fromBigInt(num, Buffer.allocUnsafe(width), true);
}
exports.toBufferBE = toBufferBE;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2}],27:[function(require,module,exports){
(function (module, exports) {
  'use strict';

  // Utils
  function assert (val, msg) {
    if (!val) throw new Error(msg || 'Assertion failed');
  }

  // Could use `inherits` module, but don't want to move from single file
  // architecture yet.
  function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  }

  // BN

  function BN (number, base, endian) {
    if (BN.isBN(number)) {
      return number;
    }

    this.negative = 0;
    this.words = null;
    this.length = 0;

    // Reduction context
    this.red = null;

    if (number !== null) {
      if (base === 'le' || base === 'be') {
        endian = base;
        base = 10;
      }

      this._init(number || 0, base || 10, endian || 'be');
    }
  }
  if (typeof module === 'object') {
    module.exports = BN;
  } else {
    exports.BN = BN;
  }

  BN.BN = BN;
  BN.wordSize = 26;

  var Buffer;
  try {
    if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
      Buffer = window.Buffer;
    } else {
      Buffer = require('buffer').Buffer;
    }
  } catch (e) {
  }

  BN.isBN = function isBN (num) {
    if (num instanceof BN) {
      return true;
    }

    return num !== null && typeof num === 'object' &&
      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
  };

  BN.max = function max (left, right) {
    if (left.cmp(right) > 0) return left;
    return right;
  };

  BN.min = function min (left, right) {
    if (left.cmp(right) < 0) return left;
    return right;
  };

  BN.prototype._init = function init (number, base, endian) {
    if (typeof number === 'number') {
      return this._initNumber(number, base, endian);
    }

    if (typeof number === 'object') {
      return this._initArray(number, base, endian);
    }

    if (base === 'hex') {
      base = 16;
    }
    assert(base === (base | 0) && base >= 2 && base <= 36);

    number = number.toString().replace(/\s+/g, '');
    var start = 0;
    if (number[0] === '-') {
      start++;
      this.negative = 1;
    }

    if (start < number.length) {
      if (base === 16) {
        this._parseHex(number, start, endian);
      } else {
        this._parseBase(number, base, start);
        if (endian === 'le') {
          this._initArray(this.toArray(), base, endian);
        }
      }
    }
  };

  BN.prototype._initNumber = function _initNumber (number, base, endian) {
    if (number < 0) {
      this.negative = 1;
      number = -number;
    }
    if (number < 0x4000000) {
      this.words = [number & 0x3ffffff];
      this.length = 1;
    } else if (number < 0x10000000000000) {
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff
      ];
      this.length = 2;
    } else {
      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff,
        1
      ];
      this.length = 3;
    }

    if (endian !== 'le') return;

    // Reverse the bytes
    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initArray = function _initArray (number, base, endian) {
    // Perhaps a Uint8Array
    assert(typeof number.length === 'number');
    if (number.length <= 0) {
      this.words = [0];
      this.length = 1;
      return this;
    }

    this.length = Math.ceil(number.length / 3);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    var off = 0;
    if (endian === 'be') {
      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    } else if (endian === 'le') {
      for (i = 0, j = 0; i < number.length; i += 3) {
        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    }
    return this._strip();
  };

  function parseHex4Bits (string, index) {
    var c = string.charCodeAt(index);
    // '0' - '9'
    if (c >= 48 && c <= 57) {
      return c - 48;
    // 'A' - 'F'
    } else if (c >= 65 && c <= 70) {
      return c - 55;
    // 'a' - 'f'
    } else if (c >= 97 && c <= 102) {
      return c - 87;
    } else {
      assert(false, 'Invalid character in ' + string);
    }
  }

  function parseHexByte (string, lowerBound, index) {
    var r = parseHex4Bits(string, index);
    if (index - 1 >= lowerBound) {
      r |= parseHex4Bits(string, index - 1) << 4;
    }
    return r;
  }

  BN.prototype._parseHex = function _parseHex (number, start, endian) {
    // Create possibly bigger array to ensure that it fits the number
    this.length = Math.ceil((number.length - start) / 6);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    // 24-bits chunks
    var off = 0;
    var j = 0;

    var w;
    if (endian === 'be') {
      for (i = number.length - 1; i >= start; i -= 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    } else {
      var parseLength = number.length - start;
      for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    }

    this._strip();
  };

  function parseBase (str, start, end, mul) {
    var r = 0;
    var b = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r *= mul;

      // 'a'
      if (c >= 49) {
        b = c - 49 + 0xa;

      // 'A'
      } else if (c >= 17) {
        b = c - 17 + 0xa;

      // '0' - '9'
      } else {
        b = c;
      }
      assert(c >= 0 && b < mul, 'Invalid character');
      r += b;
    }
    return r;
  }

  BN.prototype._parseBase = function _parseBase (number, base, start) {
    // Initialize as zero
    this.words = [0];
    this.length = 1;

    // Find length of limb in base
    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
      limbLen++;
    }
    limbLen--;
    limbPow = (limbPow / base) | 0;

    var total = number.length - start;
    var mod = total % limbLen;
    var end = Math.min(total, total - mod) + start;

    var word = 0;
    for (var i = start; i < end; i += limbLen) {
      word = parseBase(number, i, i + limbLen, base);

      this.imuln(limbPow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    if (mod !== 0) {
      var pow = 1;
      word = parseBase(number, i, number.length, base);

      for (i = 0; i < mod; i++) {
        pow *= base;
      }

      this.imuln(pow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    this._strip();
  };

  BN.prototype.copy = function copy (dest) {
    dest.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      dest.words[i] = this.words[i];
    }
    dest.length = this.length;
    dest.negative = this.negative;
    dest.red = this.red;
  };

  function move (dest, src) {
    dest.words = src.words;
    dest.length = src.length;
    dest.negative = src.negative;
    dest.red = src.red;
  }

  BN.prototype._move = function _move (dest) {
    move(dest, this);
  };

  BN.prototype.clone = function clone () {
    var r = new BN(null);
    this.copy(r);
    return r;
  };

  BN.prototype._expand = function _expand (size) {
    while (this.length < size) {
      this.words[this.length++] = 0;
    }
    return this;
  };

  // Remove leading `0` from `this`
  BN.prototype._strip = function strip () {
    while (this.length > 1 && this.words[this.length - 1] === 0) {
      this.length--;
    }
    return this._normSign();
  };

  BN.prototype._normSign = function _normSign () {
    // -0 = 0
    if (this.length === 1 && this.words[0] === 0) {
      this.negative = 0;
    }
    return this;
  };

  // Check Symbol.for because not everywhere where Symbol defined
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Browser_compatibility
  if (typeof Symbol !== 'undefined' && typeof Symbol.for === 'function') {
    try {
      BN.prototype[Symbol.for('nodejs.util.inspect.custom')] = inspect;
    } catch (e) {
      BN.prototype.inspect = inspect;
    }
  } else {
    BN.prototype.inspect = inspect;
  }

  function inspect () {
    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
  }

  /*

  var zeros = [];
  var groupSizes = [];
  var groupBases = [];

  var s = '';
  var i = -1;
  while (++i < BN.wordSize) {
    zeros[i] = s;
    s += '0';
  }
  groupSizes[0] = 0;
  groupSizes[1] = 0;
  groupBases[0] = 0;
  groupBases[1] = 0;
  var base = 2 - 1;
  while (++base < 36 + 1) {
    var groupSize = 0;
    var groupBase = 1;
    while (groupBase < (1 << BN.wordSize) / base) {
      groupBase *= base;
      groupSize += 1;
    }
    groupSizes[base] = groupSize;
    groupBases[base] = groupBase;
  }

  */

  var zeros = [
    '',
    '0',
    '00',
    '000',
    '0000',
    '00000',
    '000000',
    '0000000',
    '00000000',
    '000000000',
    '0000000000',
    '00000000000',
    '000000000000',
    '0000000000000',
    '00000000000000',
    '000000000000000',
    '0000000000000000',
    '00000000000000000',
    '000000000000000000',
    '0000000000000000000',
    '00000000000000000000',
    '000000000000000000000',
    '0000000000000000000000',
    '00000000000000000000000',
    '000000000000000000000000',
    '0000000000000000000000000'
  ];

  var groupSizes = [
    0, 0,
    25, 16, 12, 11, 10, 9, 8,
    8, 7, 7, 7, 7, 6, 6,
    6, 6, 6, 6, 6, 5, 5,
    5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5
  ];

  var groupBases = [
    0, 0,
    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
  ];

  BN.prototype.toString = function toString (base, padding) {
    base = base || 10;
    padding = padding | 0 || 1;

    var out;
    if (base === 16 || base === 'hex') {
      out = '';
      var off = 0;
      var carry = 0;
      for (var i = 0; i < this.length; i++) {
        var w = this.words[i];
        var word = (((w << off) | carry) & 0xffffff).toString(16);
        carry = (w >>> (24 - off)) & 0xffffff;
        off += 2;
        if (off >= 26) {
          off -= 26;
          i--;
        }
        if (carry !== 0 || i !== this.length - 1) {
          out = zeros[6 - word.length] + word + out;
        } else {
          out = word + out;
        }
      }
      if (carry !== 0) {
        out = carry.toString(16) + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    if (base === (base | 0) && base >= 2 && base <= 36) {
      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
      var groupSize = groupSizes[base];
      // var groupBase = Math.pow(base, groupSize);
      var groupBase = groupBases[base];
      out = '';
      var c = this.clone();
      c.negative = 0;
      while (!c.isZero()) {
        var r = c.modrn(groupBase).toString(base);
        c = c.idivn(groupBase);

        if (!c.isZero()) {
          out = zeros[groupSize - r.length] + r + out;
        } else {
          out = r + out;
        }
      }
      if (this.isZero()) {
        out = '0' + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    assert(false, 'Base should be between 2 and 36');
  };

  BN.prototype.toNumber = function toNumber () {
    var ret = this.words[0];
    if (this.length === 2) {
      ret += this.words[1] * 0x4000000;
    } else if (this.length === 3 && this.words[2] === 0x01) {
      // NOTE: at this stage it is known that the top bit is set
      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
    } else if (this.length > 2) {
      assert(false, 'Number can only safely store up to 53 bits');
    }
    return (this.negative !== 0) ? -ret : ret;
  };

  BN.prototype.toJSON = function toJSON () {
    return this.toString(16, 2);
  };

  if (Buffer) {
    BN.prototype.toBuffer = function toBuffer (endian, length) {
      return this.toArrayLike(Buffer, endian, length);
    };
  }

  BN.prototype.toArray = function toArray (endian, length) {
    return this.toArrayLike(Array, endian, length);
  };

  var allocate = function allocate (ArrayType, size) {
    if (ArrayType.allocUnsafe) {
      return ArrayType.allocUnsafe(size);
    }
    return new ArrayType(size);
  };

  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
    this._strip();

    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert(byteLength <= reqLength, 'byte array longer than desired length');
    assert(reqLength > 0, 'Requested array length <= 0');

    var res = allocate(ArrayType, reqLength);
    var postfix = endian === 'le' ? 'LE' : 'BE';
    this['_toArrayLike' + postfix](res, byteLength);
    return res;
  };

  BN.prototype._toArrayLikeLE = function _toArrayLikeLE (res, byteLength) {
    var position = 0;
    var carry = 0;

    for (var i = 0, shift = 0; i < this.length; i++) {
      var word = (this.words[i] << shift) | carry;

      res[position++] = word & 0xff;
      if (position < res.length) {
        res[position++] = (word >> 8) & 0xff;
      }
      if (position < res.length) {
        res[position++] = (word >> 16) & 0xff;
      }

      if (shift === 6) {
        if (position < res.length) {
          res[position++] = (word >> 24) & 0xff;
        }
        carry = 0;
        shift = 0;
      } else {
        carry = word >>> 24;
        shift += 2;
      }
    }

    if (position < res.length) {
      res[position++] = carry;

      while (position < res.length) {
        res[position++] = 0;
      }
    }
  };

  BN.prototype._toArrayLikeBE = function _toArrayLikeBE (res, byteLength) {
    var position = res.length - 1;
    var carry = 0;

    for (var i = 0, shift = 0; i < this.length; i++) {
      var word = (this.words[i] << shift) | carry;

      res[position--] = word & 0xff;
      if (position >= 0) {
        res[position--] = (word >> 8) & 0xff;
      }
      if (position >= 0) {
        res[position--] = (word >> 16) & 0xff;
      }

      if (shift === 6) {
        if (position >= 0) {
          res[position--] = (word >> 24) & 0xff;
        }
        carry = 0;
        shift = 0;
      } else {
        carry = word >>> 24;
        shift += 2;
      }
    }

    if (position >= 0) {
      res[position--] = carry;

      while (position >= 0) {
        res[position--] = 0;
      }
    }
  };

  if (Math.clz32) {
    BN.prototype._countBits = function _countBits (w) {
      return 32 - Math.clz32(w);
    };
  } else {
    BN.prototype._countBits = function _countBits (w) {
      var t = w;
      var r = 0;
      if (t >= 0x1000) {
        r += 13;
        t >>>= 13;
      }
      if (t >= 0x40) {
        r += 7;
        t >>>= 7;
      }
      if (t >= 0x8) {
        r += 4;
        t >>>= 4;
      }
      if (t >= 0x02) {
        r += 2;
        t >>>= 2;
      }
      return r + t;
    };
  }

  BN.prototype._zeroBits = function _zeroBits (w) {
    // Short-cut
    if (w === 0) return 26;

    var t = w;
    var r = 0;
    if ((t & 0x1fff) === 0) {
      r += 13;
      t >>>= 13;
    }
    if ((t & 0x7f) === 0) {
      r += 7;
      t >>>= 7;
    }
    if ((t & 0xf) === 0) {
      r += 4;
      t >>>= 4;
    }
    if ((t & 0x3) === 0) {
      r += 2;
      t >>>= 2;
    }
    if ((t & 0x1) === 0) {
      r++;
    }
    return r;
  };

  // Return number of used bits in a BN
  BN.prototype.bitLength = function bitLength () {
    var w = this.words[this.length - 1];
    var hi = this._countBits(w);
    return (this.length - 1) * 26 + hi;
  };

  function toBitArray (num) {
    var w = new Array(num.bitLength());

    for (var bit = 0; bit < w.length; bit++) {
      var off = (bit / 26) | 0;
      var wbit = bit % 26;

      w[bit] = (num.words[off] >>> wbit) & 0x01;
    }

    return w;
  }

  // Number of trailing zero bits
  BN.prototype.zeroBits = function zeroBits () {
    if (this.isZero()) return 0;

    var r = 0;
    for (var i = 0; i < this.length; i++) {
      var b = this._zeroBits(this.words[i]);
      r += b;
      if (b !== 26) break;
    }
    return r;
  };

  BN.prototype.byteLength = function byteLength () {
    return Math.ceil(this.bitLength() / 8);
  };

  BN.prototype.toTwos = function toTwos (width) {
    if (this.negative !== 0) {
      return this.abs().inotn(width).iaddn(1);
    }
    return this.clone();
  };

  BN.prototype.fromTwos = function fromTwos (width) {
    if (this.testn(width - 1)) {
      return this.notn(width).iaddn(1).ineg();
    }
    return this.clone();
  };

  BN.prototype.isNeg = function isNeg () {
    return this.negative !== 0;
  };

  // Return negative clone of `this`
  BN.prototype.neg = function neg () {
    return this.clone().ineg();
  };

  BN.prototype.ineg = function ineg () {
    if (!this.isZero()) {
      this.negative ^= 1;
    }

    return this;
  };

  // Or `num` with `this` in-place
  BN.prototype.iuor = function iuor (num) {
    while (this.length < num.length) {
      this.words[this.length++] = 0;
    }

    for (var i = 0; i < num.length; i++) {
      this.words[i] = this.words[i] | num.words[i];
    }

    return this._strip();
  };

  BN.prototype.ior = function ior (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuor(num);
  };

  // Or `num` with `this`
  BN.prototype.or = function or (num) {
    if (this.length > num.length) return this.clone().ior(num);
    return num.clone().ior(this);
  };

  BN.prototype.uor = function uor (num) {
    if (this.length > num.length) return this.clone().iuor(num);
    return num.clone().iuor(this);
  };

  // And `num` with `this` in-place
  BN.prototype.iuand = function iuand (num) {
    // b = min-length(num, this)
    var b;
    if (this.length > num.length) {
      b = num;
    } else {
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = this.words[i] & num.words[i];
    }

    this.length = b.length;

    return this._strip();
  };

  BN.prototype.iand = function iand (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuand(num);
  };

  // And `num` with `this`
  BN.prototype.and = function and (num) {
    if (this.length > num.length) return this.clone().iand(num);
    return num.clone().iand(this);
  };

  BN.prototype.uand = function uand (num) {
    if (this.length > num.length) return this.clone().iuand(num);
    return num.clone().iuand(this);
  };

  // Xor `num` with `this` in-place
  BN.prototype.iuxor = function iuxor (num) {
    // a.length > b.length
    var a;
    var b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = a.words[i] ^ b.words[i];
    }

    if (this !== a) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = a.length;

    return this._strip();
  };

  BN.prototype.ixor = function ixor (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuxor(num);
  };

  // Xor `num` with `this`
  BN.prototype.xor = function xor (num) {
    if (this.length > num.length) return this.clone().ixor(num);
    return num.clone().ixor(this);
  };

  BN.prototype.uxor = function uxor (num) {
    if (this.length > num.length) return this.clone().iuxor(num);
    return num.clone().iuxor(this);
  };

  // Not ``this`` with ``width`` bitwidth
  BN.prototype.inotn = function inotn (width) {
    assert(typeof width === 'number' && width >= 0);

    var bytesNeeded = Math.ceil(width / 26) | 0;
    var bitsLeft = width % 26;

    // Extend the buffer with leading zeroes
    this._expand(bytesNeeded);

    if (bitsLeft > 0) {
      bytesNeeded--;
    }

    // Handle complete words
    for (var i = 0; i < bytesNeeded; i++) {
      this.words[i] = ~this.words[i] & 0x3ffffff;
    }

    // Handle the residue
    if (bitsLeft > 0) {
      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
    }

    // And remove leading zeroes
    return this._strip();
  };

  BN.prototype.notn = function notn (width) {
    return this.clone().inotn(width);
  };

  // Set `bit` of `this`
  BN.prototype.setn = function setn (bit, val) {
    assert(typeof bit === 'number' && bit >= 0);

    var off = (bit / 26) | 0;
    var wbit = bit % 26;

    this._expand(off + 1);

    if (val) {
      this.words[off] = this.words[off] | (1 << wbit);
    } else {
      this.words[off] = this.words[off] & ~(1 << wbit);
    }

    return this._strip();
  };

  // Add `num` to `this` in-place
  BN.prototype.iadd = function iadd (num) {
    var r;

    // negative + positive
    if (this.negative !== 0 && num.negative === 0) {
      this.negative = 0;
      r = this.isub(num);
      this.negative ^= 1;
      return this._normSign();

    // positive + negative
    } else if (this.negative === 0 && num.negative !== 0) {
      num.negative = 0;
      r = this.isub(num);
      num.negative = 1;
      return r._normSign();
    }

    // a.length > b.length
    var a, b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }

    this.length = a.length;
    if (carry !== 0) {
      this.words[this.length] = carry;
      this.length++;
    // Copy the rest of the words
    } else if (a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    return this;
  };

  // Add `num` to `this`
  BN.prototype.add = function add (num) {
    var res;
    if (num.negative !== 0 && this.negative === 0) {
      num.negative = 0;
      res = this.sub(num);
      num.negative ^= 1;
      return res;
    } else if (num.negative === 0 && this.negative !== 0) {
      this.negative = 0;
      res = num.sub(this);
      this.negative = 1;
      return res;
    }

    if (this.length > num.length) return this.clone().iadd(num);

    return num.clone().iadd(this);
  };

  // Subtract `num` from `this` in-place
  BN.prototype.isub = function isub (num) {
    // this - (-num) = this + num
    if (num.negative !== 0) {
      num.negative = 0;
      var r = this.iadd(num);
      num.negative = 1;
      return r._normSign();

    // -this - num = -(this + num)
    } else if (this.negative !== 0) {
      this.negative = 0;
      this.iadd(num);
      this.negative = 1;
      return this._normSign();
    }

    // At this point both numbers are positive
    var cmp = this.cmp(num);

    // Optimization - zeroify
    if (cmp === 0) {
      this.negative = 0;
      this.length = 1;
      this.words[0] = 0;
      return this;
    }

    // a > b
    var a, b;
    if (cmp > 0) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }

    // Copy rest of the words
    if (carry === 0 && i < a.length && a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = Math.max(this.length, i);

    if (a !== this) {
      this.negative = 1;
    }

    return this._strip();
  };

  // Subtract `num` from `this`
  BN.prototype.sub = function sub (num) {
    return this.clone().isub(num);
  };

  function smallMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    var len = (self.length + num.length) | 0;
    out.length = len;
    len = (len - 1) | 0;

    // Peel one iteration (compiler can't do it, because of code complexity)
    var a = self.words[0] | 0;
    var b = num.words[0] | 0;
    var r = a * b;

    var lo = r & 0x3ffffff;
    var carry = (r / 0x4000000) | 0;
    out.words[0] = lo;

    for (var k = 1; k < len; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = carry >>> 26;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = (k - j) | 0;
        a = self.words[i] | 0;
        b = num.words[j] | 0;
        r = a * b + rword;
        ncarry += (r / 0x4000000) | 0;
        rword = r & 0x3ffffff;
      }
      out.words[k] = rword | 0;
      carry = ncarry | 0;
    }
    if (carry !== 0) {
      out.words[k] = carry | 0;
    } else {
      out.length--;
    }

    return out._strip();
  }

  // TODO(indutny): it may be reasonable to omit it for users who don't need
  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
  // multiplication (like elliptic secp256k1).
  var comb10MulTo = function comb10MulTo (self, num, out) {
    var a = self.words;
    var b = num.words;
    var o = out.words;
    var c = 0;
    var lo;
    var mid;
    var hi;
    var a0 = a[0] | 0;
    var al0 = a0 & 0x1fff;
    var ah0 = a0 >>> 13;
    var a1 = a[1] | 0;
    var al1 = a1 & 0x1fff;
    var ah1 = a1 >>> 13;
    var a2 = a[2] | 0;
    var al2 = a2 & 0x1fff;
    var ah2 = a2 >>> 13;
    var a3 = a[3] | 0;
    var al3 = a3 & 0x1fff;
    var ah3 = a3 >>> 13;
    var a4 = a[4] | 0;
    var al4 = a4 & 0x1fff;
    var ah4 = a4 >>> 13;
    var a5 = a[5] | 0;
    var al5 = a5 & 0x1fff;
    var ah5 = a5 >>> 13;
    var a6 = a[6] | 0;
    var al6 = a6 & 0x1fff;
    var ah6 = a6 >>> 13;
    var a7 = a[7] | 0;
    var al7 = a7 & 0x1fff;
    var ah7 = a7 >>> 13;
    var a8 = a[8] | 0;
    var al8 = a8 & 0x1fff;
    var ah8 = a8 >>> 13;
    var a9 = a[9] | 0;
    var al9 = a9 & 0x1fff;
    var ah9 = a9 >>> 13;
    var b0 = b[0] | 0;
    var bl0 = b0 & 0x1fff;
    var bh0 = b0 >>> 13;
    var b1 = b[1] | 0;
    var bl1 = b1 & 0x1fff;
    var bh1 = b1 >>> 13;
    var b2 = b[2] | 0;
    var bl2 = b2 & 0x1fff;
    var bh2 = b2 >>> 13;
    var b3 = b[3] | 0;
    var bl3 = b3 & 0x1fff;
    var bh3 = b3 >>> 13;
    var b4 = b[4] | 0;
    var bl4 = b4 & 0x1fff;
    var bh4 = b4 >>> 13;
    var b5 = b[5] | 0;
    var bl5 = b5 & 0x1fff;
    var bh5 = b5 >>> 13;
    var b6 = b[6] | 0;
    var bl6 = b6 & 0x1fff;
    var bh6 = b6 >>> 13;
    var b7 = b[7] | 0;
    var bl7 = b7 & 0x1fff;
    var bh7 = b7 >>> 13;
    var b8 = b[8] | 0;
    var bl8 = b8 & 0x1fff;
    var bh8 = b8 >>> 13;
    var b9 = b[9] | 0;
    var bl9 = b9 & 0x1fff;
    var bh9 = b9 >>> 13;

    out.negative = self.negative ^ num.negative;
    out.length = 19;
    /* k = 0 */
    lo = Math.imul(al0, bl0);
    mid = Math.imul(al0, bh0);
    mid = (mid + Math.imul(ah0, bl0)) | 0;
    hi = Math.imul(ah0, bh0);
    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
    w0 &= 0x3ffffff;
    /* k = 1 */
    lo = Math.imul(al1, bl0);
    mid = Math.imul(al1, bh0);
    mid = (mid + Math.imul(ah1, bl0)) | 0;
    hi = Math.imul(ah1, bh0);
    lo = (lo + Math.imul(al0, bl1)) | 0;
    mid = (mid + Math.imul(al0, bh1)) | 0;
    mid = (mid + Math.imul(ah0, bl1)) | 0;
    hi = (hi + Math.imul(ah0, bh1)) | 0;
    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
    w1 &= 0x3ffffff;
    /* k = 2 */
    lo = Math.imul(al2, bl0);
    mid = Math.imul(al2, bh0);
    mid = (mid + Math.imul(ah2, bl0)) | 0;
    hi = Math.imul(ah2, bh0);
    lo = (lo + Math.imul(al1, bl1)) | 0;
    mid = (mid + Math.imul(al1, bh1)) | 0;
    mid = (mid + Math.imul(ah1, bl1)) | 0;
    hi = (hi + Math.imul(ah1, bh1)) | 0;
    lo = (lo + Math.imul(al0, bl2)) | 0;
    mid = (mid + Math.imul(al0, bh2)) | 0;
    mid = (mid + Math.imul(ah0, bl2)) | 0;
    hi = (hi + Math.imul(ah0, bh2)) | 0;
    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
    w2 &= 0x3ffffff;
    /* k = 3 */
    lo = Math.imul(al3, bl0);
    mid = Math.imul(al3, bh0);
    mid = (mid + Math.imul(ah3, bl0)) | 0;
    hi = Math.imul(ah3, bh0);
    lo = (lo + Math.imul(al2, bl1)) | 0;
    mid = (mid + Math.imul(al2, bh1)) | 0;
    mid = (mid + Math.imul(ah2, bl1)) | 0;
    hi = (hi + Math.imul(ah2, bh1)) | 0;
    lo = (lo + Math.imul(al1, bl2)) | 0;
    mid = (mid + Math.imul(al1, bh2)) | 0;
    mid = (mid + Math.imul(ah1, bl2)) | 0;
    hi = (hi + Math.imul(ah1, bh2)) | 0;
    lo = (lo + Math.imul(al0, bl3)) | 0;
    mid = (mid + Math.imul(al0, bh3)) | 0;
    mid = (mid + Math.imul(ah0, bl3)) | 0;
    hi = (hi + Math.imul(ah0, bh3)) | 0;
    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
    w3 &= 0x3ffffff;
    /* k = 4 */
    lo = Math.imul(al4, bl0);
    mid = Math.imul(al4, bh0);
    mid = (mid + Math.imul(ah4, bl0)) | 0;
    hi = Math.imul(ah4, bh0);
    lo = (lo + Math.imul(al3, bl1)) | 0;
    mid = (mid + Math.imul(al3, bh1)) | 0;
    mid = (mid + Math.imul(ah3, bl1)) | 0;
    hi = (hi + Math.imul(ah3, bh1)) | 0;
    lo = (lo + Math.imul(al2, bl2)) | 0;
    mid = (mid + Math.imul(al2, bh2)) | 0;
    mid = (mid + Math.imul(ah2, bl2)) | 0;
    hi = (hi + Math.imul(ah2, bh2)) | 0;
    lo = (lo + Math.imul(al1, bl3)) | 0;
    mid = (mid + Math.imul(al1, bh3)) | 0;
    mid = (mid + Math.imul(ah1, bl3)) | 0;
    hi = (hi + Math.imul(ah1, bh3)) | 0;
    lo = (lo + Math.imul(al0, bl4)) | 0;
    mid = (mid + Math.imul(al0, bh4)) | 0;
    mid = (mid + Math.imul(ah0, bl4)) | 0;
    hi = (hi + Math.imul(ah0, bh4)) | 0;
    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
    w4 &= 0x3ffffff;
    /* k = 5 */
    lo = Math.imul(al5, bl0);
    mid = Math.imul(al5, bh0);
    mid = (mid + Math.imul(ah5, bl0)) | 0;
    hi = Math.imul(ah5, bh0);
    lo = (lo + Math.imul(al4, bl1)) | 0;
    mid = (mid + Math.imul(al4, bh1)) | 0;
    mid = (mid + Math.imul(ah4, bl1)) | 0;
    hi = (hi + Math.imul(ah4, bh1)) | 0;
    lo = (lo + Math.imul(al3, bl2)) | 0;
    mid = (mid + Math.imul(al3, bh2)) | 0;
    mid = (mid + Math.imul(ah3, bl2)) | 0;
    hi = (hi + Math.imul(ah3, bh2)) | 0;
    lo = (lo + Math.imul(al2, bl3)) | 0;
    mid = (mid + Math.imul(al2, bh3)) | 0;
    mid = (mid + Math.imul(ah2, bl3)) | 0;
    hi = (hi + Math.imul(ah2, bh3)) | 0;
    lo = (lo + Math.imul(al1, bl4)) | 0;
    mid = (mid + Math.imul(al1, bh4)) | 0;
    mid = (mid + Math.imul(ah1, bl4)) | 0;
    hi = (hi + Math.imul(ah1, bh4)) | 0;
    lo = (lo + Math.imul(al0, bl5)) | 0;
    mid = (mid + Math.imul(al0, bh5)) | 0;
    mid = (mid + Math.imul(ah0, bl5)) | 0;
    hi = (hi + Math.imul(ah0, bh5)) | 0;
    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
    w5 &= 0x3ffffff;
    /* k = 6 */
    lo = Math.imul(al6, bl0);
    mid = Math.imul(al6, bh0);
    mid = (mid + Math.imul(ah6, bl0)) | 0;
    hi = Math.imul(ah6, bh0);
    lo = (lo + Math.imul(al5, bl1)) | 0;
    mid = (mid + Math.imul(al5, bh1)) | 0;
    mid = (mid + Math.imul(ah5, bl1)) | 0;
    hi = (hi + Math.imul(ah5, bh1)) | 0;
    lo = (lo + Math.imul(al4, bl2)) | 0;
    mid = (mid + Math.imul(al4, bh2)) | 0;
    mid = (mid + Math.imul(ah4, bl2)) | 0;
    hi = (hi + Math.imul(ah4, bh2)) | 0;
    lo = (lo + Math.imul(al3, bl3)) | 0;
    mid = (mid + Math.imul(al3, bh3)) | 0;
    mid = (mid + Math.imul(ah3, bl3)) | 0;
    hi = (hi + Math.imul(ah3, bh3)) | 0;
    lo = (lo + Math.imul(al2, bl4)) | 0;
    mid = (mid + Math.imul(al2, bh4)) | 0;
    mid = (mid + Math.imul(ah2, bl4)) | 0;
    hi = (hi + Math.imul(ah2, bh4)) | 0;
    lo = (lo + Math.imul(al1, bl5)) | 0;
    mid = (mid + Math.imul(al1, bh5)) | 0;
    mid = (mid + Math.imul(ah1, bl5)) | 0;
    hi = (hi + Math.imul(ah1, bh5)) | 0;
    lo = (lo + Math.imul(al0, bl6)) | 0;
    mid = (mid + Math.imul(al0, bh6)) | 0;
    mid = (mid + Math.imul(ah0, bl6)) | 0;
    hi = (hi + Math.imul(ah0, bh6)) | 0;
    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
    w6 &= 0x3ffffff;
    /* k = 7 */
    lo = Math.imul(al7, bl0);
    mid = Math.imul(al7, bh0);
    mid = (mid + Math.imul(ah7, bl0)) | 0;
    hi = Math.imul(ah7, bh0);
    lo = (lo + Math.imul(al6, bl1)) | 0;
    mid = (mid + Math.imul(al6, bh1)) | 0;
    mid = (mid + Math.imul(ah6, bl1)) | 0;
    hi = (hi + Math.imul(ah6, bh1)) | 0;
    lo = (lo + Math.imul(al5, bl2)) | 0;
    mid = (mid + Math.imul(al5, bh2)) | 0;
    mid = (mid + Math.imul(ah5, bl2)) | 0;
    hi = (hi + Math.imul(ah5, bh2)) | 0;
    lo = (lo + Math.imul(al4, bl3)) | 0;
    mid = (mid + Math.imul(al4, bh3)) | 0;
    mid = (mid + Math.imul(ah4, bl3)) | 0;
    hi = (hi + Math.imul(ah4, bh3)) | 0;
    lo = (lo + Math.imul(al3, bl4)) | 0;
    mid = (mid + Math.imul(al3, bh4)) | 0;
    mid = (mid + Math.imul(ah3, bl4)) | 0;
    hi = (hi + Math.imul(ah3, bh4)) | 0;
    lo = (lo + Math.imul(al2, bl5)) | 0;
    mid = (mid + Math.imul(al2, bh5)) | 0;
    mid = (mid + Math.imul(ah2, bl5)) | 0;
    hi = (hi + Math.imul(ah2, bh5)) | 0;
    lo = (lo + Math.imul(al1, bl6)) | 0;
    mid = (mid + Math.imul(al1, bh6)) | 0;
    mid = (mid + Math.imul(ah1, bl6)) | 0;
    hi = (hi + Math.imul(ah1, bh6)) | 0;
    lo = (lo + Math.imul(al0, bl7)) | 0;
    mid = (mid + Math.imul(al0, bh7)) | 0;
    mid = (mid + Math.imul(ah0, bl7)) | 0;
    hi = (hi + Math.imul(ah0, bh7)) | 0;
    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
    w7 &= 0x3ffffff;
    /* k = 8 */
    lo = Math.imul(al8, bl0);
    mid = Math.imul(al8, bh0);
    mid = (mid + Math.imul(ah8, bl0)) | 0;
    hi = Math.imul(ah8, bh0);
    lo = (lo + Math.imul(al7, bl1)) | 0;
    mid = (mid + Math.imul(al7, bh1)) | 0;
    mid = (mid + Math.imul(ah7, bl1)) | 0;
    hi = (hi + Math.imul(ah7, bh1)) | 0;
    lo = (lo + Math.imul(al6, bl2)) | 0;
    mid = (mid + Math.imul(al6, bh2)) | 0;
    mid = (mid + Math.imul(ah6, bl2)) | 0;
    hi = (hi + Math.imul(ah6, bh2)) | 0;
    lo = (lo + Math.imul(al5, bl3)) | 0;
    mid = (mid + Math.imul(al5, bh3)) | 0;
    mid = (mid + Math.imul(ah5, bl3)) | 0;
    hi = (hi + Math.imul(ah5, bh3)) | 0;
    lo = (lo + Math.imul(al4, bl4)) | 0;
    mid = (mid + Math.imul(al4, bh4)) | 0;
    mid = (mid + Math.imul(ah4, bl4)) | 0;
    hi = (hi + Math.imul(ah4, bh4)) | 0;
    lo = (lo + Math.imul(al3, bl5)) | 0;
    mid = (mid + Math.imul(al3, bh5)) | 0;
    mid = (mid + Math.imul(ah3, bl5)) | 0;
    hi = (hi + Math.imul(ah3, bh5)) | 0;
    lo = (lo + Math.imul(al2, bl6)) | 0;
    mid = (mid + Math.imul(al2, bh6)) | 0;
    mid = (mid + Math.imul(ah2, bl6)) | 0;
    hi = (hi + Math.imul(ah2, bh6)) | 0;
    lo = (lo + Math.imul(al1, bl7)) | 0;
    mid = (mid + Math.imul(al1, bh7)) | 0;
    mid = (mid + Math.imul(ah1, bl7)) | 0;
    hi = (hi + Math.imul(ah1, bh7)) | 0;
    lo = (lo + Math.imul(al0, bl8)) | 0;
    mid = (mid + Math.imul(al0, bh8)) | 0;
    mid = (mid + Math.imul(ah0, bl8)) | 0;
    hi = (hi + Math.imul(ah0, bh8)) | 0;
    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
    w8 &= 0x3ffffff;
    /* k = 9 */
    lo = Math.imul(al9, bl0);
    mid = Math.imul(al9, bh0);
    mid = (mid + Math.imul(ah9, bl0)) | 0;
    hi = Math.imul(ah9, bh0);
    lo = (lo + Math.imul(al8, bl1)) | 0;
    mid = (mid + Math.imul(al8, bh1)) | 0;
    mid = (mid + Math.imul(ah8, bl1)) | 0;
    hi = (hi + Math.imul(ah8, bh1)) | 0;
    lo = (lo + Math.imul(al7, bl2)) | 0;
    mid = (mid + Math.imul(al7, bh2)) | 0;
    mid = (mid + Math.imul(ah7, bl2)) | 0;
    hi = (hi + Math.imul(ah7, bh2)) | 0;
    lo = (lo + Math.imul(al6, bl3)) | 0;
    mid = (mid + Math.imul(al6, bh3)) | 0;
    mid = (mid + Math.imul(ah6, bl3)) | 0;
    hi = (hi + Math.imul(ah6, bh3)) | 0;
    lo = (lo + Math.imul(al5, bl4)) | 0;
    mid = (mid + Math.imul(al5, bh4)) | 0;
    mid = (mid + Math.imul(ah5, bl4)) | 0;
    hi = (hi + Math.imul(ah5, bh4)) | 0;
    lo = (lo + Math.imul(al4, bl5)) | 0;
    mid = (mid + Math.imul(al4, bh5)) | 0;
    mid = (mid + Math.imul(ah4, bl5)) | 0;
    hi = (hi + Math.imul(ah4, bh5)) | 0;
    lo = (lo + Math.imul(al3, bl6)) | 0;
    mid = (mid + Math.imul(al3, bh6)) | 0;
    mid = (mid + Math.imul(ah3, bl6)) | 0;
    hi = (hi + Math.imul(ah3, bh6)) | 0;
    lo = (lo + Math.imul(al2, bl7)) | 0;
    mid = (mid + Math.imul(al2, bh7)) | 0;
    mid = (mid + Math.imul(ah2, bl7)) | 0;
    hi = (hi + Math.imul(ah2, bh7)) | 0;
    lo = (lo + Math.imul(al1, bl8)) | 0;
    mid = (mid + Math.imul(al1, bh8)) | 0;
    mid = (mid + Math.imul(ah1, bl8)) | 0;
    hi = (hi + Math.imul(ah1, bh8)) | 0;
    lo = (lo + Math.imul(al0, bl9)) | 0;
    mid = (mid + Math.imul(al0, bh9)) | 0;
    mid = (mid + Math.imul(ah0, bl9)) | 0;
    hi = (hi + Math.imul(ah0, bh9)) | 0;
    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
    w9 &= 0x3ffffff;
    /* k = 10 */
    lo = Math.imul(al9, bl1);
    mid = Math.imul(al9, bh1);
    mid = (mid + Math.imul(ah9, bl1)) | 0;
    hi = Math.imul(ah9, bh1);
    lo = (lo + Math.imul(al8, bl2)) | 0;
    mid = (mid + Math.imul(al8, bh2)) | 0;
    mid = (mid + Math.imul(ah8, bl2)) | 0;
    hi = (hi + Math.imul(ah8, bh2)) | 0;
    lo = (lo + Math.imul(al7, bl3)) | 0;
    mid = (mid + Math.imul(al7, bh3)) | 0;
    mid = (mid + Math.imul(ah7, bl3)) | 0;
    hi = (hi + Math.imul(ah7, bh3)) | 0;
    lo = (lo + Math.imul(al6, bl4)) | 0;
    mid = (mid + Math.imul(al6, bh4)) | 0;
    mid = (mid + Math.imul(ah6, bl4)) | 0;
    hi = (hi + Math.imul(ah6, bh4)) | 0;
    lo = (lo + Math.imul(al5, bl5)) | 0;
    mid = (mid + Math.imul(al5, bh5)) | 0;
    mid = (mid + Math.imul(ah5, bl5)) | 0;
    hi = (hi + Math.imul(ah5, bh5)) | 0;
    lo = (lo + Math.imul(al4, bl6)) | 0;
    mid = (mid + Math.imul(al4, bh6)) | 0;
    mid = (mid + Math.imul(ah4, bl6)) | 0;
    hi = (hi + Math.imul(ah4, bh6)) | 0;
    lo = (lo + Math.imul(al3, bl7)) | 0;
    mid = (mid + Math.imul(al3, bh7)) | 0;
    mid = (mid + Math.imul(ah3, bl7)) | 0;
    hi = (hi + Math.imul(ah3, bh7)) | 0;
    lo = (lo + Math.imul(al2, bl8)) | 0;
    mid = (mid + Math.imul(al2, bh8)) | 0;
    mid = (mid + Math.imul(ah2, bl8)) | 0;
    hi = (hi + Math.imul(ah2, bh8)) | 0;
    lo = (lo + Math.imul(al1, bl9)) | 0;
    mid = (mid + Math.imul(al1, bh9)) | 0;
    mid = (mid + Math.imul(ah1, bl9)) | 0;
    hi = (hi + Math.imul(ah1, bh9)) | 0;
    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
    w10 &= 0x3ffffff;
    /* k = 11 */
    lo = Math.imul(al9, bl2);
    mid = Math.imul(al9, bh2);
    mid = (mid + Math.imul(ah9, bl2)) | 0;
    hi = Math.imul(ah9, bh2);
    lo = (lo + Math.imul(al8, bl3)) | 0;
    mid = (mid + Math.imul(al8, bh3)) | 0;
    mid = (mid + Math.imul(ah8, bl3)) | 0;
    hi = (hi + Math.imul(ah8, bh3)) | 0;
    lo = (lo + Math.imul(al7, bl4)) | 0;
    mid = (mid + Math.imul(al7, bh4)) | 0;
    mid = (mid + Math.imul(ah7, bl4)) | 0;
    hi = (hi + Math.imul(ah7, bh4)) | 0;
    lo = (lo + Math.imul(al6, bl5)) | 0;
    mid = (mid + Math.imul(al6, bh5)) | 0;
    mid = (mid + Math.imul(ah6, bl5)) | 0;
    hi = (hi + Math.imul(ah6, bh5)) | 0;
    lo = (lo + Math.imul(al5, bl6)) | 0;
    mid = (mid + Math.imul(al5, bh6)) | 0;
    mid = (mid + Math.imul(ah5, bl6)) | 0;
    hi = (hi + Math.imul(ah5, bh6)) | 0;
    lo = (lo + Math.imul(al4, bl7)) | 0;
    mid = (mid + Math.imul(al4, bh7)) | 0;
    mid = (mid + Math.imul(ah4, bl7)) | 0;
    hi = (hi + Math.imul(ah4, bh7)) | 0;
    lo = (lo + Math.imul(al3, bl8)) | 0;
    mid = (mid + Math.imul(al3, bh8)) | 0;
    mid = (mid + Math.imul(ah3, bl8)) | 0;
    hi = (hi + Math.imul(ah3, bh8)) | 0;
    lo = (lo + Math.imul(al2, bl9)) | 0;
    mid = (mid + Math.imul(al2, bh9)) | 0;
    mid = (mid + Math.imul(ah2, bl9)) | 0;
    hi = (hi + Math.imul(ah2, bh9)) | 0;
    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
    w11 &= 0x3ffffff;
    /* k = 12 */
    lo = Math.imul(al9, bl3);
    mid = Math.imul(al9, bh3);
    mid = (mid + Math.imul(ah9, bl3)) | 0;
    hi = Math.imul(ah9, bh3);
    lo = (lo + Math.imul(al8, bl4)) | 0;
    mid = (mid + Math.imul(al8, bh4)) | 0;
    mid = (mid + Math.imul(ah8, bl4)) | 0;
    hi = (hi + Math.imul(ah8, bh4)) | 0;
    lo = (lo + Math.imul(al7, bl5)) | 0;
    mid = (mid + Math.imul(al7, bh5)) | 0;
    mid = (mid + Math.imul(ah7, bl5)) | 0;
    hi = (hi + Math.imul(ah7, bh5)) | 0;
    lo = (lo + Math.imul(al6, bl6)) | 0;
    mid = (mid + Math.imul(al6, bh6)) | 0;
    mid = (mid + Math.imul(ah6, bl6)) | 0;
    hi = (hi + Math.imul(ah6, bh6)) | 0;
    lo = (lo + Math.imul(al5, bl7)) | 0;
    mid = (mid + Math.imul(al5, bh7)) | 0;
    mid = (mid + Math.imul(ah5, bl7)) | 0;
    hi = (hi + Math.imul(ah5, bh7)) | 0;
    lo = (lo + Math.imul(al4, bl8)) | 0;
    mid = (mid + Math.imul(al4, bh8)) | 0;
    mid = (mid + Math.imul(ah4, bl8)) | 0;
    hi = (hi + Math.imul(ah4, bh8)) | 0;
    lo = (lo + Math.imul(al3, bl9)) | 0;
    mid = (mid + Math.imul(al3, bh9)) | 0;
    mid = (mid + Math.imul(ah3, bl9)) | 0;
    hi = (hi + Math.imul(ah3, bh9)) | 0;
    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
    w12 &= 0x3ffffff;
    /* k = 13 */
    lo = Math.imul(al9, bl4);
    mid = Math.imul(al9, bh4);
    mid = (mid + Math.imul(ah9, bl4)) | 0;
    hi = Math.imul(ah9, bh4);
    lo = (lo + Math.imul(al8, bl5)) | 0;
    mid = (mid + Math.imul(al8, bh5)) | 0;
    mid = (mid + Math.imul(ah8, bl5)) | 0;
    hi = (hi + Math.imul(ah8, bh5)) | 0;
    lo = (lo + Math.imul(al7, bl6)) | 0;
    mid = (mid + Math.imul(al7, bh6)) | 0;
    mid = (mid + Math.imul(ah7, bl6)) | 0;
    hi = (hi + Math.imul(ah7, bh6)) | 0;
    lo = (lo + Math.imul(al6, bl7)) | 0;
    mid = (mid + Math.imul(al6, bh7)) | 0;
    mid = (mid + Math.imul(ah6, bl7)) | 0;
    hi = (hi + Math.imul(ah6, bh7)) | 0;
    lo = (lo + Math.imul(al5, bl8)) | 0;
    mid = (mid + Math.imul(al5, bh8)) | 0;
    mid = (mid + Math.imul(ah5, bl8)) | 0;
    hi = (hi + Math.imul(ah5, bh8)) | 0;
    lo = (lo + Math.imul(al4, bl9)) | 0;
    mid = (mid + Math.imul(al4, bh9)) | 0;
    mid = (mid + Math.imul(ah4, bl9)) | 0;
    hi = (hi + Math.imul(ah4, bh9)) | 0;
    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
    w13 &= 0x3ffffff;
    /* k = 14 */
    lo = Math.imul(al9, bl5);
    mid = Math.imul(al9, bh5);
    mid = (mid + Math.imul(ah9, bl5)) | 0;
    hi = Math.imul(ah9, bh5);
    lo = (lo + Math.imul(al8, bl6)) | 0;
    mid = (mid + Math.imul(al8, bh6)) | 0;
    mid = (mid + Math.imul(ah8, bl6)) | 0;
    hi = (hi + Math.imul(ah8, bh6)) | 0;
    lo = (lo + Math.imul(al7, bl7)) | 0;
    mid = (mid + Math.imul(al7, bh7)) | 0;
    mid = (mid + Math.imul(ah7, bl7)) | 0;
    hi = (hi + Math.imul(ah7, bh7)) | 0;
    lo = (lo + Math.imul(al6, bl8)) | 0;
    mid = (mid + Math.imul(al6, bh8)) | 0;
    mid = (mid + Math.imul(ah6, bl8)) | 0;
    hi = (hi + Math.imul(ah6, bh8)) | 0;
    lo = (lo + Math.imul(al5, bl9)) | 0;
    mid = (mid + Math.imul(al5, bh9)) | 0;
    mid = (mid + Math.imul(ah5, bl9)) | 0;
    hi = (hi + Math.imul(ah5, bh9)) | 0;
    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
    w14 &= 0x3ffffff;
    /* k = 15 */
    lo = Math.imul(al9, bl6);
    mid = Math.imul(al9, bh6);
    mid = (mid + Math.imul(ah9, bl6)) | 0;
    hi = Math.imul(ah9, bh6);
    lo = (lo + Math.imul(al8, bl7)) | 0;
    mid = (mid + Math.imul(al8, bh7)) | 0;
    mid = (mid + Math.imul(ah8, bl7)) | 0;
    hi = (hi + Math.imul(ah8, bh7)) | 0;
    lo = (lo + Math.imul(al7, bl8)) | 0;
    mid = (mid + Math.imul(al7, bh8)) | 0;
    mid = (mid + Math.imul(ah7, bl8)) | 0;
    hi = (hi + Math.imul(ah7, bh8)) | 0;
    lo = (lo + Math.imul(al6, bl9)) | 0;
    mid = (mid + Math.imul(al6, bh9)) | 0;
    mid = (mid + Math.imul(ah6, bl9)) | 0;
    hi = (hi + Math.imul(ah6, bh9)) | 0;
    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
    w15 &= 0x3ffffff;
    /* k = 16 */
    lo = Math.imul(al9, bl7);
    mid = Math.imul(al9, bh7);
    mid = (mid + Math.imul(ah9, bl7)) | 0;
    hi = Math.imul(ah9, bh7);
    lo = (lo + Math.imul(al8, bl8)) | 0;
    mid = (mid + Math.imul(al8, bh8)) | 0;
    mid = (mid + Math.imul(ah8, bl8)) | 0;
    hi = (hi + Math.imul(ah8, bh8)) | 0;
    lo = (lo + Math.imul(al7, bl9)) | 0;
    mid = (mid + Math.imul(al7, bh9)) | 0;
    mid = (mid + Math.imul(ah7, bl9)) | 0;
    hi = (hi + Math.imul(ah7, bh9)) | 0;
    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
    w16 &= 0x3ffffff;
    /* k = 17 */
    lo = Math.imul(al9, bl8);
    mid = Math.imul(al9, bh8);
    mid = (mid + Math.imul(ah9, bl8)) | 0;
    hi = Math.imul(ah9, bh8);
    lo = (lo + Math.imul(al8, bl9)) | 0;
    mid = (mid + Math.imul(al8, bh9)) | 0;
    mid = (mid + Math.imul(ah8, bl9)) | 0;
    hi = (hi + Math.imul(ah8, bh9)) | 0;
    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
    w17 &= 0x3ffffff;
    /* k = 18 */
    lo = Math.imul(al9, bl9);
    mid = Math.imul(al9, bh9);
    mid = (mid + Math.imul(ah9, bl9)) | 0;
    hi = Math.imul(ah9, bh9);
    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
    w18 &= 0x3ffffff;
    o[0] = w0;
    o[1] = w1;
    o[2] = w2;
    o[3] = w3;
    o[4] = w4;
    o[5] = w5;
    o[6] = w6;
    o[7] = w7;
    o[8] = w8;
    o[9] = w9;
    o[10] = w10;
    o[11] = w11;
    o[12] = w12;
    o[13] = w13;
    o[14] = w14;
    o[15] = w15;
    o[16] = w16;
    o[17] = w17;
    o[18] = w18;
    if (c !== 0) {
      o[19] = c;
      out.length++;
    }
    return out;
  };

  // Polyfill comb
  if (!Math.imul) {
    comb10MulTo = smallMulTo;
  }

  function bigMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    out.length = self.length + num.length;

    var carry = 0;
    var hncarry = 0;
    for (var k = 0; k < out.length - 1; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = hncarry;
      hncarry = 0;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = k - j;
        var a = self.words[i] | 0;
        var b = num.words[j] | 0;
        var r = a * b;

        var lo = r & 0x3ffffff;
        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
        lo = (lo + rword) | 0;
        rword = lo & 0x3ffffff;
        ncarry = (ncarry + (lo >>> 26)) | 0;

        hncarry += ncarry >>> 26;
        ncarry &= 0x3ffffff;
      }
      out.words[k] = rword;
      carry = ncarry;
      ncarry = hncarry;
    }
    if (carry !== 0) {
      out.words[k] = carry;
    } else {
      out.length--;
    }

    return out._strip();
  }

  function jumboMulTo (self, num, out) {
    // Temporary disable, see https://github.com/indutny/bn.js/issues/211
    // var fftm = new FFTM();
    // return fftm.mulp(self, num, out);
    return bigMulTo(self, num, out);
  }

  BN.prototype.mulTo = function mulTo (num, out) {
    var res;
    var len = this.length + num.length;
    if (this.length === 10 && num.length === 10) {
      res = comb10MulTo(this, num, out);
    } else if (len < 63) {
      res = smallMulTo(this, num, out);
    } else if (len < 1024) {
      res = bigMulTo(this, num, out);
    } else {
      res = jumboMulTo(this, num, out);
    }

    return res;
  };

  // Cooley-Tukey algorithm for FFT
  // slightly revisited to rely on looping instead of recursion

  function FFTM (x, y) {
    this.x = x;
    this.y = y;
  }

  FFTM.prototype.makeRBT = function makeRBT (N) {
    var t = new Array(N);
    var l = BN.prototype._countBits(N) - 1;
    for (var i = 0; i < N; i++) {
      t[i] = this.revBin(i, l, N);
    }

    return t;
  };

  // Returns binary-reversed representation of `x`
  FFTM.prototype.revBin = function revBin (x, l, N) {
    if (x === 0 || x === N - 1) return x;

    var rb = 0;
    for (var i = 0; i < l; i++) {
      rb |= (x & 1) << (l - i - 1);
      x >>= 1;
    }

    return rb;
  };

  // Performs "tweedling" phase, therefore 'emulating'
  // behaviour of the recursive algorithm
  FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
    for (var i = 0; i < N; i++) {
      rtws[i] = rws[rbt[i]];
      itws[i] = iws[rbt[i]];
    }
  };

  FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
    this.permute(rbt, rws, iws, rtws, itws, N);

    for (var s = 1; s < N; s <<= 1) {
      var l = s << 1;

      var rtwdf = Math.cos(2 * Math.PI / l);
      var itwdf = Math.sin(2 * Math.PI / l);

      for (var p = 0; p < N; p += l) {
        var rtwdf_ = rtwdf;
        var itwdf_ = itwdf;

        for (var j = 0; j < s; j++) {
          var re = rtws[p + j];
          var ie = itws[p + j];

          var ro = rtws[p + j + s];
          var io = itws[p + j + s];

          var rx = rtwdf_ * ro - itwdf_ * io;

          io = rtwdf_ * io + itwdf_ * ro;
          ro = rx;

          rtws[p + j] = re + ro;
          itws[p + j] = ie + io;

          rtws[p + j + s] = re - ro;
          itws[p + j + s] = ie - io;

          /* jshint maxdepth : false */
          if (j !== l) {
            rx = rtwdf * rtwdf_ - itwdf * itwdf_;

            itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
            rtwdf_ = rx;
          }
        }
      }
    }
  };

  FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
    var N = Math.max(m, n) | 1;
    var odd = N & 1;
    var i = 0;
    for (N = N / 2 | 0; N; N = N >>> 1) {
      i++;
    }

    return 1 << i + 1 + odd;
  };

  FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
    if (N <= 1) return;

    for (var i = 0; i < N / 2; i++) {
      var t = rws[i];

      rws[i] = rws[N - i - 1];
      rws[N - i - 1] = t;

      t = iws[i];

      iws[i] = -iws[N - i - 1];
      iws[N - i - 1] = -t;
    }
  };

  FFTM.prototype.normalize13b = function normalize13b (ws, N) {
    var carry = 0;
    for (var i = 0; i < N / 2; i++) {
      var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
        Math.round(ws[2 * i] / N) +
        carry;

      ws[i] = w & 0x3ffffff;

      if (w < 0x4000000) {
        carry = 0;
      } else {
        carry = w / 0x4000000 | 0;
      }
    }

    return ws;
  };

  FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
    var carry = 0;
    for (var i = 0; i < len; i++) {
      carry = carry + (ws[i] | 0);

      rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
      rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
    }

    // Pad with zeroes
    for (i = 2 * len; i < N; ++i) {
      rws[i] = 0;
    }

    assert(carry === 0);
    assert((carry & ~0x1fff) === 0);
  };

  FFTM.prototype.stub = function stub (N) {
    var ph = new Array(N);
    for (var i = 0; i < N; i++) {
      ph[i] = 0;
    }

    return ph;
  };

  FFTM.prototype.mulp = function mulp (x, y, out) {
    var N = 2 * this.guessLen13b(x.length, y.length);

    var rbt = this.makeRBT(N);

    var _ = this.stub(N);

    var rws = new Array(N);
    var rwst = new Array(N);
    var iwst = new Array(N);

    var nrws = new Array(N);
    var nrwst = new Array(N);
    var niwst = new Array(N);

    var rmws = out.words;
    rmws.length = N;

    this.convert13b(x.words, x.length, rws, N);
    this.convert13b(y.words, y.length, nrws, N);

    this.transform(rws, _, rwst, iwst, N, rbt);
    this.transform(nrws, _, nrwst, niwst, N, rbt);

    for (var i = 0; i < N; i++) {
      var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
      iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
      rwst[i] = rx;
    }

    this.conjugate(rwst, iwst, N);
    this.transform(rwst, iwst, rmws, _, N, rbt);
    this.conjugate(rmws, _, N);
    this.normalize13b(rmws, N);

    out.negative = x.negative ^ y.negative;
    out.length = x.length + y.length;
    return out._strip();
  };

  // Multiply `this` by `num`
  BN.prototype.mul = function mul (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return this.mulTo(num, out);
  };

  // Multiply employing FFT
  BN.prototype.mulf = function mulf (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return jumboMulTo(this, num, out);
  };

  // In-place Multiplication
  BN.prototype.imul = function imul (num) {
    return this.clone().mulTo(num, this);
  };

  BN.prototype.imuln = function imuln (num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;

    assert(typeof num === 'number');
    assert(num < 0x4000000);

    // Carry
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = (this.words[i] | 0) * num;
      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
      carry >>= 26;
      carry += (w / 0x4000000) | 0;
      // NOTE: lo is 27bit maximum
      carry += lo >>> 26;
      this.words[i] = lo & 0x3ffffff;
    }

    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }

    return isNegNum ? this.ineg() : this;
  };

  BN.prototype.muln = function muln (num) {
    return this.clone().imuln(num);
  };

  // `this` * `this`
  BN.prototype.sqr = function sqr () {
    return this.mul(this);
  };

  // `this` * `this` in-place
  BN.prototype.isqr = function isqr () {
    return this.imul(this.clone());
  };

  // Math.pow(`this`, `num`)
  BN.prototype.pow = function pow (num) {
    var w = toBitArray(num);
    if (w.length === 0) return new BN(1);

    // Skip leading zeroes
    var res = this;
    for (var i = 0; i < w.length; i++, res = res.sqr()) {
      if (w[i] !== 0) break;
    }

    if (++i < w.length) {
      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
        if (w[i] === 0) continue;

        res = res.mul(q);
      }
    }

    return res;
  };

  // Shift-left in-place
  BN.prototype.iushln = function iushln (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
    var i;

    if (r !== 0) {
      var carry = 0;

      for (i = 0; i < this.length; i++) {
        var newCarry = this.words[i] & carryMask;
        var c = ((this.words[i] | 0) - newCarry) << r;
        this.words[i] = c | carry;
        carry = newCarry >>> (26 - r);
      }

      if (carry) {
        this.words[i] = carry;
        this.length++;
      }
    }

    if (s !== 0) {
      for (i = this.length - 1; i >= 0; i--) {
        this.words[i + s] = this.words[i];
      }

      for (i = 0; i < s; i++) {
        this.words[i] = 0;
      }

      this.length += s;
    }

    return this._strip();
  };

  BN.prototype.ishln = function ishln (bits) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushln(bits);
  };

  // Shift-right in-place
  // NOTE: `hint` is a lowest bit before trailing zeroes
  // NOTE: if `extended` is present - it will be filled with destroyed bits
  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
    assert(typeof bits === 'number' && bits >= 0);
    var h;
    if (hint) {
      h = (hint - (hint % 26)) / 26;
    } else {
      h = 0;
    }

    var r = bits % 26;
    var s = Math.min((bits - r) / 26, this.length);
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    var maskedWords = extended;

    h -= s;
    h = Math.max(0, h);

    // Extended mode, copy masked part
    if (maskedWords) {
      for (var i = 0; i < s; i++) {
        maskedWords.words[i] = this.words[i];
      }
      maskedWords.length = s;
    }

    if (s === 0) {
      // No-op, we should not move anything at all
    } else if (this.length > s) {
      this.length -= s;
      for (i = 0; i < this.length; i++) {
        this.words[i] = this.words[i + s];
      }
    } else {
      this.words[0] = 0;
      this.length = 1;
    }

    var carry = 0;
    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
      var word = this.words[i] | 0;
      this.words[i] = (carry << (26 - r)) | (word >>> r);
      carry = word & mask;
    }

    // Push carried bits as a mask
    if (maskedWords && carry !== 0) {
      maskedWords.words[maskedWords.length++] = carry;
    }

    if (this.length === 0) {
      this.words[0] = 0;
      this.length = 1;
    }

    return this._strip();
  };

  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushrn(bits, hint, extended);
  };

  // Shift-left
  BN.prototype.shln = function shln (bits) {
    return this.clone().ishln(bits);
  };

  BN.prototype.ushln = function ushln (bits) {
    return this.clone().iushln(bits);
  };

  // Shift-right
  BN.prototype.shrn = function shrn (bits) {
    return this.clone().ishrn(bits);
  };

  BN.prototype.ushrn = function ushrn (bits) {
    return this.clone().iushrn(bits);
  };

  // Test if n bit is set
  BN.prototype.testn = function testn (bit) {
    assert(typeof bit === 'number' && bit >= 0);
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) return false;

    // Check bit and return
    var w = this.words[s];

    return !!(w & q);
  };

  // Return only lowers bits of number (in-place)
  BN.prototype.imaskn = function imaskn (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;

    assert(this.negative === 0, 'imaskn works only with positive numbers');

    if (this.length <= s) {
      return this;
    }

    if (r !== 0) {
      s++;
    }
    this.length = Math.min(s, this.length);

    if (r !== 0) {
      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
      this.words[this.length - 1] &= mask;
    }

    return this._strip();
  };

  // Return only lowers bits of number
  BN.prototype.maskn = function maskn (bits) {
    return this.clone().imaskn(bits);
  };

  // Add plain number `num` to `this`
  BN.prototype.iaddn = function iaddn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.isubn(-num);

    // Possible sign change
    if (this.negative !== 0) {
      if (this.length === 1 && (this.words[0] | 0) <= num) {
        this.words[0] = num - (this.words[0] | 0);
        this.negative = 0;
        return this;
      }

      this.negative = 0;
      this.isubn(num);
      this.negative = 1;
      return this;
    }

    // Add without checks
    return this._iaddn(num);
  };

  BN.prototype._iaddn = function _iaddn (num) {
    this.words[0] += num;

    // Carry
    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
      this.words[i] -= 0x4000000;
      if (i === this.length - 1) {
        this.words[i + 1] = 1;
      } else {
        this.words[i + 1]++;
      }
    }
    this.length = Math.max(this.length, i + 1);

    return this;
  };

  // Subtract plain number `num` from `this`
  BN.prototype.isubn = function isubn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.iaddn(-num);

    if (this.negative !== 0) {
      this.negative = 0;
      this.iaddn(num);
      this.negative = 1;
      return this;
    }

    this.words[0] -= num;

    if (this.length === 1 && this.words[0] < 0) {
      this.words[0] = -this.words[0];
      this.negative = 1;
    } else {
      // Carry
      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
        this.words[i] += 0x4000000;
        this.words[i + 1] -= 1;
      }
    }

    return this._strip();
  };

  BN.prototype.addn = function addn (num) {
    return this.clone().iaddn(num);
  };

  BN.prototype.subn = function subn (num) {
    return this.clone().isubn(num);
  };

  BN.prototype.iabs = function iabs () {
    this.negative = 0;

    return this;
  };

  BN.prototype.abs = function abs () {
    return this.clone().iabs();
  };

  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
    var len = num.length + shift;
    var i;

    this._expand(len);

    var w;
    var carry = 0;
    for (i = 0; i < num.length; i++) {
      w = (this.words[i + shift] | 0) + carry;
      var right = (num.words[i] | 0) * mul;
      w -= right & 0x3ffffff;
      carry = (w >> 26) - ((right / 0x4000000) | 0);
      this.words[i + shift] = w & 0x3ffffff;
    }
    for (; i < this.length - shift; i++) {
      w = (this.words[i + shift] | 0) + carry;
      carry = w >> 26;
      this.words[i + shift] = w & 0x3ffffff;
    }

    if (carry === 0) return this._strip();

    // Subtraction overflow
    assert(carry === -1);
    carry = 0;
    for (i = 0; i < this.length; i++) {
      w = -(this.words[i] | 0) + carry;
      carry = w >> 26;
      this.words[i] = w & 0x3ffffff;
    }
    this.negative = 1;

    return this._strip();
  };

  BN.prototype._wordDiv = function _wordDiv (num, mode) {
    var shift = this.length - num.length;

    var a = this.clone();
    var b = num;

    // Normalize
    var bhi = b.words[b.length - 1] | 0;
    var bhiBits = this._countBits(bhi);
    shift = 26 - bhiBits;
    if (shift !== 0) {
      b = b.ushln(shift);
      a.iushln(shift);
      bhi = b.words[b.length - 1] | 0;
    }

    // Initialize quotient
    var m = a.length - b.length;
    var q;

    if (mode !== 'mod') {
      q = new BN(null);
      q.length = m + 1;
      q.words = new Array(q.length);
      for (var i = 0; i < q.length; i++) {
        q.words[i] = 0;
      }
    }

    var diff = a.clone()._ishlnsubmul(b, 1, m);
    if (diff.negative === 0) {
      a = diff;
      if (q) {
        q.words[m] = 1;
      }
    }

    for (var j = m - 1; j >= 0; j--) {
      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
        (a.words[b.length + j - 1] | 0);

      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
      // (0x7ffffff)
      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

      a._ishlnsubmul(b, qj, j);
      while (a.negative !== 0) {
        qj--;
        a.negative = 0;
        a._ishlnsubmul(b, 1, j);
        if (!a.isZero()) {
          a.negative ^= 1;
        }
      }
      if (q) {
        q.words[j] = qj;
      }
    }
    if (q) {
      q._strip();
    }
    a._strip();

    // Denormalize
    if (mode !== 'div' && shift !== 0) {
      a.iushrn(shift);
    }

    return {
      div: q || null,
      mod: a
    };
  };

  // NOTE: 1) `mode` can be set to `mod` to request mod only,
  //       to `div` to request div only, or be absent to
  //       request both div & mod
  //       2) `positive` is true if unsigned mod is requested
  BN.prototype.divmod = function divmod (num, mode, positive) {
    assert(!num.isZero());

    if (this.isZero()) {
      return {
        div: new BN(0),
        mod: new BN(0)
      };
    }

    var div, mod, res;
    if (this.negative !== 0 && num.negative === 0) {
      res = this.neg().divmod(num, mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.iadd(num);
        }
      }

      return {
        div: div,
        mod: mod
      };
    }

    if (this.negative === 0 && num.negative !== 0) {
      res = this.divmod(num.neg(), mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      return {
        div: div,
        mod: res.mod
      };
    }

    if ((this.negative & num.negative) !== 0) {
      res = this.neg().divmod(num.neg(), mode);

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.isub(num);
        }
      }

      return {
        div: res.div,
        mod: mod
      };
    }

    // Both numbers are positive at this point

    // Strip both numbers to approximate shift value
    if (num.length > this.length || this.cmp(num) < 0) {
      return {
        div: new BN(0),
        mod: this
      };
    }

    // Very short reduction
    if (num.length === 1) {
      if (mode === 'div') {
        return {
          div: this.divn(num.words[0]),
          mod: null
        };
      }

      if (mode === 'mod') {
        return {
          div: null,
          mod: new BN(this.modrn(num.words[0]))
        };
      }

      return {
        div: this.divn(num.words[0]),
        mod: new BN(this.modrn(num.words[0]))
      };
    }

    return this._wordDiv(num, mode);
  };

  // Find `this` / `num`
  BN.prototype.div = function div (num) {
    return this.divmod(num, 'div', false).div;
  };

  // Find `this` % `num`
  BN.prototype.mod = function mod (num) {
    return this.divmod(num, 'mod', false).mod;
  };

  BN.prototype.umod = function umod (num) {
    return this.divmod(num, 'mod', true).mod;
  };

  // Find Round(`this` / `num`)
  BN.prototype.divRound = function divRound (num) {
    var dm = this.divmod(num);

    // Fast case - exact division
    if (dm.mod.isZero()) return dm.div;

    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

    var half = num.ushrn(1);
    var r2 = num.andln(1);
    var cmp = mod.cmp(half);

    // Round down
    if (cmp < 0 || (r2 === 1 && cmp === 0)) return dm.div;

    // Round up
    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
  };

  BN.prototype.modrn = function modrn (num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;

    assert(num <= 0x3ffffff);
    var p = (1 << 26) % num;

    var acc = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      acc = (p * acc + (this.words[i] | 0)) % num;
    }

    return isNegNum ? -acc : acc;
  };

  // WARNING: DEPRECATED
  BN.prototype.modn = function modn (num) {
    return this.modrn(num);
  };

  // In-place division by number
  BN.prototype.idivn = function idivn (num) {
    var isNegNum = num < 0;
    if (isNegNum) num = -num;

    assert(num <= 0x3ffffff);

    var carry = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var w = (this.words[i] | 0) + carry * 0x4000000;
      this.words[i] = (w / num) | 0;
      carry = w % num;
    }

    this._strip();
    return isNegNum ? this.ineg() : this;
  };

  BN.prototype.divn = function divn (num) {
    return this.clone().idivn(num);
  };

  BN.prototype.egcd = function egcd (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var x = this;
    var y = p.clone();

    if (x.negative !== 0) {
      x = x.umod(p);
    } else {
      x = x.clone();
    }

    // A * x + B * y = x
    var A = new BN(1);
    var B = new BN(0);

    // C * x + D * y = y
    var C = new BN(0);
    var D = new BN(1);

    var g = 0;

    while (x.isEven() && y.isEven()) {
      x.iushrn(1);
      y.iushrn(1);
      ++g;
    }

    var yp = y.clone();
    var xp = x.clone();

    while (!x.isZero()) {
      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        x.iushrn(i);
        while (i-- > 0) {
          if (A.isOdd() || B.isOdd()) {
            A.iadd(yp);
            B.isub(xp);
          }

          A.iushrn(1);
          B.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        y.iushrn(j);
        while (j-- > 0) {
          if (C.isOdd() || D.isOdd()) {
            C.iadd(yp);
            D.isub(xp);
          }

          C.iushrn(1);
          D.iushrn(1);
        }
      }

      if (x.cmp(y) >= 0) {
        x.isub(y);
        A.isub(C);
        B.isub(D);
      } else {
        y.isub(x);
        C.isub(A);
        D.isub(B);
      }
    }

    return {
      a: C,
      b: D,
      gcd: y.iushln(g)
    };
  };

  // This is reduced incarnation of the binary EEA
  // above, designated to invert members of the
  // _prime_ fields F(p) at a maximal speed
  BN.prototype._invmp = function _invmp (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var a = this;
    var b = p.clone();

    if (a.negative !== 0) {
      a = a.umod(p);
    } else {
      a = a.clone();
    }

    var x1 = new BN(1);
    var x2 = new BN(0);

    var delta = b.clone();

    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        a.iushrn(i);
        while (i-- > 0) {
          if (x1.isOdd()) {
            x1.iadd(delta);
          }

          x1.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        b.iushrn(j);
        while (j-- > 0) {
          if (x2.isOdd()) {
            x2.iadd(delta);
          }

          x2.iushrn(1);
        }
      }

      if (a.cmp(b) >= 0) {
        a.isub(b);
        x1.isub(x2);
      } else {
        b.isub(a);
        x2.isub(x1);
      }
    }

    var res;
    if (a.cmpn(1) === 0) {
      res = x1;
    } else {
      res = x2;
    }

    if (res.cmpn(0) < 0) {
      res.iadd(p);
    }

    return res;
  };

  BN.prototype.gcd = function gcd (num) {
    if (this.isZero()) return num.abs();
    if (num.isZero()) return this.abs();

    var a = this.clone();
    var b = num.clone();
    a.negative = 0;
    b.negative = 0;

    // Remove common factor of two
    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
      a.iushrn(1);
      b.iushrn(1);
    }

    do {
      while (a.isEven()) {
        a.iushrn(1);
      }
      while (b.isEven()) {
        b.iushrn(1);
      }

      var r = a.cmp(b);
      if (r < 0) {
        // Swap `a` and `b` to make `a` always bigger than `b`
        var t = a;
        a = b;
        b = t;
      } else if (r === 0 || b.cmpn(1) === 0) {
        break;
      }

      a.isub(b);
    } while (true);

    return b.iushln(shift);
  };

  // Invert number in the field F(num)
  BN.prototype.invm = function invm (num) {
    return this.egcd(num).a.umod(num);
  };

  BN.prototype.isEven = function isEven () {
    return (this.words[0] & 1) === 0;
  };

  BN.prototype.isOdd = function isOdd () {
    return (this.words[0] & 1) === 1;
  };

  // And first word and num
  BN.prototype.andln = function andln (num) {
    return this.words[0] & num;
  };

  // Increment at the bit position in-line
  BN.prototype.bincn = function bincn (bit) {
    assert(typeof bit === 'number');
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) {
      this._expand(s + 1);
      this.words[s] |= q;
      return this;
    }

    // Add bit and propagate, if needed
    var carry = q;
    for (var i = s; carry !== 0 && i < this.length; i++) {
      var w = this.words[i] | 0;
      w += carry;
      carry = w >>> 26;
      w &= 0x3ffffff;
      this.words[i] = w;
    }
    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }
    return this;
  };

  BN.prototype.isZero = function isZero () {
    return this.length === 1 && this.words[0] === 0;
  };

  BN.prototype.cmpn = function cmpn (num) {
    var negative = num < 0;

    if (this.negative !== 0 && !negative) return -1;
    if (this.negative === 0 && negative) return 1;

    this._strip();

    var res;
    if (this.length > 1) {
      res = 1;
    } else {
      if (negative) {
        num = -num;
      }

      assert(num <= 0x3ffffff, 'Number is too big');

      var w = this.words[0] | 0;
      res = w === num ? 0 : w < num ? -1 : 1;
    }
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Compare two numbers and return:
  // 1 - if `this` > `num`
  // 0 - if `this` == `num`
  // -1 - if `this` < `num`
  BN.prototype.cmp = function cmp (num) {
    if (this.negative !== 0 && num.negative === 0) return -1;
    if (this.negative === 0 && num.negative !== 0) return 1;

    var res = this.ucmp(num);
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Unsigned comparison
  BN.prototype.ucmp = function ucmp (num) {
    // At this point both numbers have the same sign
    if (this.length > num.length) return 1;
    if (this.length < num.length) return -1;

    var res = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var a = this.words[i] | 0;
      var b = num.words[i] | 0;

      if (a === b) continue;
      if (a < b) {
        res = -1;
      } else if (a > b) {
        res = 1;
      }
      break;
    }
    return res;
  };

  BN.prototype.gtn = function gtn (num) {
    return this.cmpn(num) === 1;
  };

  BN.prototype.gt = function gt (num) {
    return this.cmp(num) === 1;
  };

  BN.prototype.gten = function gten (num) {
    return this.cmpn(num) >= 0;
  };

  BN.prototype.gte = function gte (num) {
    return this.cmp(num) >= 0;
  };

  BN.prototype.ltn = function ltn (num) {
    return this.cmpn(num) === -1;
  };

  BN.prototype.lt = function lt (num) {
    return this.cmp(num) === -1;
  };

  BN.prototype.lten = function lten (num) {
    return this.cmpn(num) <= 0;
  };

  BN.prototype.lte = function lte (num) {
    return this.cmp(num) <= 0;
  };

  BN.prototype.eqn = function eqn (num) {
    return this.cmpn(num) === 0;
  };

  BN.prototype.eq = function eq (num) {
    return this.cmp(num) === 0;
  };

  //
  // A reduce context, could be using montgomery or something better, depending
  // on the `m` itself.
  //
  BN.red = function red (num) {
    return new Red(num);
  };

  BN.prototype.toRed = function toRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    assert(this.negative === 0, 'red works only with positives');
    return ctx.convertTo(this)._forceRed(ctx);
  };

  BN.prototype.fromRed = function fromRed () {
    assert(this.red, 'fromRed works only with numbers in reduction context');
    return this.red.convertFrom(this);
  };

  BN.prototype._forceRed = function _forceRed (ctx) {
    this.red = ctx;
    return this;
  };

  BN.prototype.forceRed = function forceRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    return this._forceRed(ctx);
  };

  BN.prototype.redAdd = function redAdd (num) {
    assert(this.red, 'redAdd works only with red numbers');
    return this.red.add(this, num);
  };

  BN.prototype.redIAdd = function redIAdd (num) {
    assert(this.red, 'redIAdd works only with red numbers');
    return this.red.iadd(this, num);
  };

  BN.prototype.redSub = function redSub (num) {
    assert(this.red, 'redSub works only with red numbers');
    return this.red.sub(this, num);
  };

  BN.prototype.redISub = function redISub (num) {
    assert(this.red, 'redISub works only with red numbers');
    return this.red.isub(this, num);
  };

  BN.prototype.redShl = function redShl (num) {
    assert(this.red, 'redShl works only with red numbers');
    return this.red.shl(this, num);
  };

  BN.prototype.redMul = function redMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.mul(this, num);
  };

  BN.prototype.redIMul = function redIMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.imul(this, num);
  };

  BN.prototype.redSqr = function redSqr () {
    assert(this.red, 'redSqr works only with red numbers');
    this.red._verify1(this);
    return this.red.sqr(this);
  };

  BN.prototype.redISqr = function redISqr () {
    assert(this.red, 'redISqr works only with red numbers');
    this.red._verify1(this);
    return this.red.isqr(this);
  };

  // Square root over p
  BN.prototype.redSqrt = function redSqrt () {
    assert(this.red, 'redSqrt works only with red numbers');
    this.red._verify1(this);
    return this.red.sqrt(this);
  };

  BN.prototype.redInvm = function redInvm () {
    assert(this.red, 'redInvm works only with red numbers');
    this.red._verify1(this);
    return this.red.invm(this);
  };

  // Return negative clone of `this` % `red modulo`
  BN.prototype.redNeg = function redNeg () {
    assert(this.red, 'redNeg works only with red numbers');
    this.red._verify1(this);
    return this.red.neg(this);
  };

  BN.prototype.redPow = function redPow (num) {
    assert(this.red && !num.red, 'redPow(normalNum)');
    this.red._verify1(this);
    return this.red.pow(this, num);
  };

  // Prime numbers with efficient reduction
  var primes = {
    k256: null,
    p224: null,
    p192: null,
    p25519: null
  };

  // Pseudo-Mersenne prime
  function MPrime (name, p) {
    // P = 2 ^ N - K
    this.name = name;
    this.p = new BN(p, 16);
    this.n = this.p.bitLength();
    this.k = new BN(1).iushln(this.n).isub(this.p);

    this.tmp = this._tmp();
  }

  MPrime.prototype._tmp = function _tmp () {
    var tmp = new BN(null);
    tmp.words = new Array(Math.ceil(this.n / 13));
    return tmp;
  };

  MPrime.prototype.ireduce = function ireduce (num) {
    // Assumes that `num` is less than `P^2`
    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
    var r = num;
    var rlen;

    do {
      this.split(r, this.tmp);
      r = this.imulK(r);
      r = r.iadd(this.tmp);
      rlen = r.bitLength();
    } while (rlen > this.n);

    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
    if (cmp === 0) {
      r.words[0] = 0;
      r.length = 1;
    } else if (cmp > 0) {
      r.isub(this.p);
    } else {
      if (r.strip !== undefined) {
        // r is a BN v4 instance
        r.strip();
      } else {
        // r is a BN v5 instance
        r._strip();
      }
    }

    return r;
  };

  MPrime.prototype.split = function split (input, out) {
    input.iushrn(this.n, 0, out);
  };

  MPrime.prototype.imulK = function imulK (num) {
    return num.imul(this.k);
  };

  function K256 () {
    MPrime.call(
      this,
      'k256',
      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
  }
  inherits(K256, MPrime);

  K256.prototype.split = function split (input, output) {
    // 256 = 9 * 26 + 22
    var mask = 0x3fffff;

    var outLen = Math.min(input.length, 9);
    for (var i = 0; i < outLen; i++) {
      output.words[i] = input.words[i];
    }
    output.length = outLen;

    if (input.length <= 9) {
      input.words[0] = 0;
      input.length = 1;
      return;
    }

    // Shift by 9 limbs
    var prev = input.words[9];
    output.words[output.length++] = prev & mask;

    for (i = 10; i < input.length; i++) {
      var next = input.words[i] | 0;
      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
      prev = next;
    }
    prev >>>= 22;
    input.words[i - 10] = prev;
    if (prev === 0 && input.length > 10) {
      input.length -= 10;
    } else {
      input.length -= 9;
    }
  };

  K256.prototype.imulK = function imulK (num) {
    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
    num.words[num.length] = 0;
    num.words[num.length + 1] = 0;
    num.length += 2;

    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
    var lo = 0;
    for (var i = 0; i < num.length; i++) {
      var w = num.words[i] | 0;
      lo += w * 0x3d1;
      num.words[i] = lo & 0x3ffffff;
      lo = w * 0x40 + ((lo / 0x4000000) | 0);
    }

    // Fast length reduction
    if (num.words[num.length - 1] === 0) {
      num.length--;
      if (num.words[num.length - 1] === 0) {
        num.length--;
      }
    }
    return num;
  };

  function P224 () {
    MPrime.call(
      this,
      'p224',
      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
  }
  inherits(P224, MPrime);

  function P192 () {
    MPrime.call(
      this,
      'p192',
      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
  }
  inherits(P192, MPrime);

  function P25519 () {
    // 2 ^ 255 - 19
    MPrime.call(
      this,
      '25519',
      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
  }
  inherits(P25519, MPrime);

  P25519.prototype.imulK = function imulK (num) {
    // K = 0x13
    var carry = 0;
    for (var i = 0; i < num.length; i++) {
      var hi = (num.words[i] | 0) * 0x13 + carry;
      var lo = hi & 0x3ffffff;
      hi >>>= 26;

      num.words[i] = lo;
      carry = hi;
    }
    if (carry !== 0) {
      num.words[num.length++] = carry;
    }
    return num;
  };

  // Exported mostly for testing purposes, use plain name instead
  BN._prime = function prime (name) {
    // Cached version of prime
    if (primes[name]) return primes[name];

    var prime;
    if (name === 'k256') {
      prime = new K256();
    } else if (name === 'p224') {
      prime = new P224();
    } else if (name === 'p192') {
      prime = new P192();
    } else if (name === 'p25519') {
      prime = new P25519();
    } else {
      throw new Error('Unknown prime ' + name);
    }
    primes[name] = prime;

    return prime;
  };

  //
  // Base reduction engine
  //
  function Red (m) {
    if (typeof m === 'string') {
      var prime = BN._prime(m);
      this.m = prime.p;
      this.prime = prime;
    } else {
      assert(m.gtn(1), 'modulus must be greater than 1');
      this.m = m;
      this.prime = null;
    }
  }

  Red.prototype._verify1 = function _verify1 (a) {
    assert(a.negative === 0, 'red works only with positives');
    assert(a.red, 'red works only with red numbers');
  };

  Red.prototype._verify2 = function _verify2 (a, b) {
    assert((a.negative | b.negative) === 0, 'red works only with positives');
    assert(a.red && a.red === b.red,
      'red works only with red numbers');
  };

  Red.prototype.imod = function imod (a) {
    if (this.prime) return this.prime.ireduce(a)._forceRed(this);

    move(a, a.umod(this.m)._forceRed(this));
    return a;
  };

  Red.prototype.neg = function neg (a) {
    if (a.isZero()) {
      return a.clone();
    }

    return this.m.sub(a)._forceRed(this);
  };

  Red.prototype.add = function add (a, b) {
    this._verify2(a, b);

    var res = a.add(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.iadd = function iadd (a, b) {
    this._verify2(a, b);

    var res = a.iadd(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res;
  };

  Red.prototype.sub = function sub (a, b) {
    this._verify2(a, b);

    var res = a.sub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.isub = function isub (a, b) {
    this._verify2(a, b);

    var res = a.isub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res;
  };

  Red.prototype.shl = function shl (a, num) {
    this._verify1(a);
    return this.imod(a.ushln(num));
  };

  Red.prototype.imul = function imul (a, b) {
    this._verify2(a, b);
    return this.imod(a.imul(b));
  };

  Red.prototype.mul = function mul (a, b) {
    this._verify2(a, b);
    return this.imod(a.mul(b));
  };

  Red.prototype.isqr = function isqr (a) {
    return this.imul(a, a.clone());
  };

  Red.prototype.sqr = function sqr (a) {
    return this.mul(a, a);
  };

  Red.prototype.sqrt = function sqrt (a) {
    if (a.isZero()) return a.clone();

    var mod3 = this.m.andln(3);
    assert(mod3 % 2 === 1);

    // Fast case
    if (mod3 === 3) {
      var pow = this.m.add(new BN(1)).iushrn(2);
      return this.pow(a, pow);
    }

    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
    //
    // Find Q and S, that Q * 2 ^ S = (P - 1)
    var q = this.m.subn(1);
    var s = 0;
    while (!q.isZero() && q.andln(1) === 0) {
      s++;
      q.iushrn(1);
    }
    assert(!q.isZero());

    var one = new BN(1).toRed(this);
    var nOne = one.redNeg();

    // Find quadratic non-residue
    // NOTE: Max is such because of generalized Riemann hypothesis.
    var lpow = this.m.subn(1).iushrn(1);
    var z = this.m.bitLength();
    z = new BN(2 * z * z).toRed(this);

    while (this.pow(z, lpow).cmp(nOne) !== 0) {
      z.redIAdd(nOne);
    }

    var c = this.pow(z, q);
    var r = this.pow(a, q.addn(1).iushrn(1));
    var t = this.pow(a, q);
    var m = s;
    while (t.cmp(one) !== 0) {
      var tmp = t;
      for (var i = 0; tmp.cmp(one) !== 0; i++) {
        tmp = tmp.redSqr();
      }
      assert(i < m);
      var b = this.pow(c, new BN(1).iushln(m - i - 1));

      r = r.redMul(b);
      c = b.redSqr();
      t = t.redMul(c);
      m = i;
    }

    return r;
  };

  Red.prototype.invm = function invm (a) {
    var inv = a._invmp(this.m);
    if (inv.negative !== 0) {
      inv.negative = 0;
      return this.imod(inv).redNeg();
    } else {
      return this.imod(inv);
    }
  };

  Red.prototype.pow = function pow (a, num) {
    if (num.isZero()) return new BN(1).toRed(this);
    if (num.cmpn(1) === 0) return a.clone();

    var windowSize = 4;
    var wnd = new Array(1 << windowSize);
    wnd[0] = new BN(1).toRed(this);
    wnd[1] = a;
    for (var i = 2; i < wnd.length; i++) {
      wnd[i] = this.mul(wnd[i - 1], a);
    }

    var res = wnd[0];
    var current = 0;
    var currentLen = 0;
    var start = num.bitLength() % 26;
    if (start === 0) {
      start = 26;
    }

    for (i = num.length - 1; i >= 0; i--) {
      var word = num.words[i];
      for (var j = start - 1; j >= 0; j--) {
        var bit = (word >> j) & 1;
        if (res !== wnd[0]) {
          res = this.sqr(res);
        }

        if (bit === 0 && current === 0) {
          currentLen = 0;
          continue;
        }

        current <<= 1;
        current |= bit;
        currentLen++;
        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

        res = this.mul(res, wnd[current]);
        currentLen = 0;
        current = 0;
      }
      start = 26;
    }

    return res;
  };

  Red.prototype.convertTo = function convertTo (num) {
    var r = num.umod(this.m);

    return r === num ? r.clone() : r;
  };

  Red.prototype.convertFrom = function convertFrom (num) {
    var res = num.clone();
    res.red = null;
    return res;
  };

  //
  // Montgomery method engine
  //

  BN.mont = function mont (num) {
    return new Mont(num);
  };

  function Mont (m) {
    Red.call(this, m);

    this.shift = this.m.bitLength();
    if (this.shift % 26 !== 0) {
      this.shift += 26 - (this.shift % 26);
    }

    this.r = new BN(1).iushln(this.shift);
    this.r2 = this.imod(this.r.sqr());
    this.rinv = this.r._invmp(this.m);

    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
    this.minv = this.minv.umod(this.r);
    this.minv = this.r.sub(this.minv);
  }
  inherits(Mont, Red);

  Mont.prototype.convertTo = function convertTo (num) {
    return this.imod(num.ushln(this.shift));
  };

  Mont.prototype.convertFrom = function convertFrom (num) {
    var r = this.imod(num.mul(this.rinv));
    r.red = null;
    return r;
  };

  Mont.prototype.imul = function imul (a, b) {
    if (a.isZero() || b.isZero()) {
      a.words[0] = 0;
      a.length = 1;
      return a;
    }

    var t = a.imul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;

    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.mul = function mul (a, b) {
    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

    var t = a.mul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.invm = function invm (a) {
    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
    var res = this.imod(a._invmp(this.m).mul(this.r2));
    return res._forceRed(this);
  };
})(typeof module === 'undefined' || module, this);

},{"buffer":29}],28:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeUnchecked = exports.deserialize = exports.serialize = exports.BinaryReader = exports.BinaryWriter = exports.BorshError = exports.baseDecode = exports.baseEncode = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const bs58_1 = __importDefault(require("bs58"));
// TODO: Make sure this polyfill not included when not required
const encoding = __importStar(require("text-encoding-utf-8"));
const ResolvedTextDecoder = typeof TextDecoder !== "function" ? encoding.TextDecoder : TextDecoder;
const textDecoder = new ResolvedTextDecoder("utf-8", { fatal: true });
function baseEncode(value) {
    if (typeof value === "string") {
        value = Buffer.from(value, "utf8");
    }
    return bs58_1.default.encode(Buffer.from(value));
}
exports.baseEncode = baseEncode;
function baseDecode(value) {
    return Buffer.from(bs58_1.default.decode(value));
}
exports.baseDecode = baseDecode;
const INITIAL_LENGTH = 1024;
class BorshError extends Error {
    constructor(message) {
        super(message);
        this.fieldPath = [];
        this.originalMessage = message;
    }
    addToFieldPath(fieldName) {
        this.fieldPath.splice(0, 0, fieldName);
        // NOTE: Modifying message directly as jest doesn't use .toString()
        this.message = this.originalMessage + ": " + this.fieldPath.join(".");
    }
}
exports.BorshError = BorshError;
/// Binary encoder.
class BinaryWriter {
    constructor() {
        this.buf = Buffer.alloc(INITIAL_LENGTH);
        this.length = 0;
    }
    maybeResize() {
        if (this.buf.length < 16 + this.length) {
            this.buf = Buffer.concat([this.buf, Buffer.alloc(INITIAL_LENGTH)]);
        }
    }
    writeU8(value) {
        this.maybeResize();
        this.buf.writeUInt8(value, this.length);
        this.length += 1;
    }
    writeU16(value) {
        this.maybeResize();
        this.buf.writeUInt16LE(value, this.length);
        this.length += 2;
    }
    writeU32(value) {
        this.maybeResize();
        this.buf.writeUInt32LE(value, this.length);
        this.length += 4;
    }
    writeU64(value) {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray("le", 8)));
    }
    writeU128(value) {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray("le", 16)));
    }
    writeU256(value) {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray("le", 32)));
    }
    writeU512(value) {
        this.maybeResize();
        this.writeBuffer(Buffer.from(new bn_js_1.default(value).toArray("le", 64)));
    }
    writeBuffer(buffer) {
        // Buffer.from is needed as this.buf.subarray can return plain Uint8Array in browser
        this.buf = Buffer.concat([
            Buffer.from(this.buf.subarray(0, this.length)),
            buffer,
            Buffer.alloc(INITIAL_LENGTH),
        ]);
        this.length += buffer.length;
    }
    writeString(str) {
        this.maybeResize();
        const b = Buffer.from(str, "utf8");
        this.writeU32(b.length);
        this.writeBuffer(b);
    }
    writeFixedArray(array) {
        this.writeBuffer(Buffer.from(array));
    }
    writeArray(array, fn) {
        this.maybeResize();
        this.writeU32(array.length);
        for (const elem of array) {
            this.maybeResize();
            fn(elem);
        }
    }
    toArray() {
        return this.buf.subarray(0, this.length);
    }
}
exports.BinaryWriter = BinaryWriter;
function handlingRangeError(target, propertyKey, propertyDescriptor) {
    const originalMethod = propertyDescriptor.value;
    propertyDescriptor.value = function (...args) {
        try {
            return originalMethod.apply(this, args);
        }
        catch (e) {
            if (e instanceof RangeError) {
                const code = e.code;
                if (["ERR_BUFFER_OUT_OF_BOUNDS", "ERR_OUT_OF_RANGE"].indexOf(code) >= 0) {
                    throw new BorshError("Reached the end of buffer when deserializing");
                }
            }
            throw e;
        }
    };
}
class BinaryReader {
    constructor(buf) {
        this.buf = buf;
        this.offset = 0;
    }
    readU8() {
        const value = this.buf.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }
    readU16() {
        const value = this.buf.readUInt16LE(this.offset);
        this.offset += 2;
        return value;
    }
    readU32() {
        const value = this.buf.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }
    readU64() {
        const buf = this.readBuffer(8);
        return new bn_js_1.default(buf, "le");
    }
    readU128() {
        const buf = this.readBuffer(16);
        return new bn_js_1.default(buf, "le");
    }
    readU256() {
        const buf = this.readBuffer(32);
        return new bn_js_1.default(buf, "le");
    }
    readU512() {
        const buf = this.readBuffer(64);
        return new bn_js_1.default(buf, "le");
    }
    readBuffer(len) {
        if (this.offset + len > this.buf.length) {
            throw new BorshError(`Expected buffer length ${len} isn't within bounds`);
        }
        const result = this.buf.slice(this.offset, this.offset + len);
        this.offset += len;
        return result;
    }
    readString() {
        const len = this.readU32();
        const buf = this.readBuffer(len);
        try {
            // NOTE: Using TextDecoder to fail on invalid UTF-8
            return textDecoder.decode(buf);
        }
        catch (e) {
            throw new BorshError(`Error decoding UTF-8 string: ${e}`);
        }
    }
    readFixedArray(len) {
        return new Uint8Array(this.readBuffer(len));
    }
    readArray(fn) {
        const len = this.readU32();
        const result = Array();
        for (let i = 0; i < len; ++i) {
            result.push(fn());
        }
        return result;
    }
}
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readU8", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readU16", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readU32", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readU64", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readU128", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readU256", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readU512", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readString", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readFixedArray", null);
__decorate([
    handlingRangeError
], BinaryReader.prototype, "readArray", null);
exports.BinaryReader = BinaryReader;
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function serializeField(schema, fieldName, value, fieldType, writer) {
    try {
        // TODO: Handle missing values properly (make sure they never result in just skipped write)
        if (typeof fieldType === "string") {
            writer[`write${capitalizeFirstLetter(fieldType)}`](value);
        }
        else if (fieldType instanceof Array) {
            if (typeof fieldType[0] === "number") {
                if (value.length !== fieldType[0]) {
                    throw new BorshError(`Expecting byte array of length ${fieldType[0]}, but got ${value.length} bytes`);
                }
                writer.writeFixedArray(value);
            }
            else if (fieldType.length === 2 && typeof fieldType[1] === "number") {
                if (value.length !== fieldType[1]) {
                    throw new BorshError(`Expecting byte array of length ${fieldType[1]}, but got ${value.length} bytes`);
                }
                for (let i = 0; i < fieldType[1]; i++) {
                    serializeField(schema, null, value[i], fieldType[0], writer);
                }
            }
            else {
                writer.writeArray(value, (item) => {
                    serializeField(schema, fieldName, item, fieldType[0], writer);
                });
            }
        }
        else if (fieldType.kind !== undefined) {
            switch (fieldType.kind) {
                case "option": {
                    if (value === null || value === undefined) {
                        writer.writeU8(0);
                    }
                    else {
                        writer.writeU8(1);
                        serializeField(schema, fieldName, value, fieldType.type, writer);
                    }
                    break;
                }
                case "map": {
                    writer.writeU32(value.size);
                    value.forEach((val, key) => {
                        serializeField(schema, fieldName, key, fieldType.key, writer);
                        serializeField(schema, fieldName, val, fieldType.value, writer);
                    });
                    break;
                }
                default:
                    throw new BorshError(`FieldType ${fieldType} unrecognized`);
            }
        }
        else {
            serializeStruct(schema, value, writer);
        }
    }
    catch (error) {
        if (error instanceof BorshError) {
            error.addToFieldPath(fieldName);
        }
        throw error;
    }
}
function serializeStruct(schema, obj, writer) {
    if (typeof obj.borshSerialize === "function") {
        obj.borshSerialize(writer);
        return;
    }
    const structSchema = schema.get(obj.constructor);
    if (!structSchema) {
        throw new BorshError(`Class ${obj.constructor.name} is missing in schema`);
    }
    if (structSchema.kind === "struct") {
        structSchema.fields.map(([fieldName, fieldType]) => {
            serializeField(schema, fieldName, obj[fieldName], fieldType, writer);
        });
    }
    else if (structSchema.kind === "enum") {
        const name = obj[structSchema.field];
        for (let idx = 0; idx < structSchema.values.length; ++idx) {
            const [fieldName, fieldType] = structSchema.values[idx];
            if (fieldName === name) {
                writer.writeU8(idx);
                serializeField(schema, fieldName, obj[fieldName], fieldType, writer);
                break;
            }
        }
    }
    else {
        throw new BorshError(`Unexpected schema kind: ${structSchema.kind} for ${obj.constructor.name}`);
    }
}
/// Serialize given object using schema of the form:
/// { class_name -> [ [field_name, field_type], .. ], .. }
function serialize(schema, obj, Writer = BinaryWriter) {
    const writer = new Writer();
    serializeStruct(schema, obj, writer);
    return writer.toArray();
}
exports.serialize = serialize;
function deserializeField(schema, fieldName, fieldType, reader) {
    try {
        if (typeof fieldType === "string") {
            return reader[`read${capitalizeFirstLetter(fieldType)}`]();
        }
        if (fieldType instanceof Array) {
            if (typeof fieldType[0] === "number") {
                return reader.readFixedArray(fieldType[0]);
            }
            else if (typeof fieldType[1] === "number") {
                const arr = [];
                for (let i = 0; i < fieldType[1]; i++) {
                    arr.push(deserializeField(schema, null, fieldType[0], reader));
                }
                return arr;
            }
            else {
                return reader.readArray(() => deserializeField(schema, fieldName, fieldType[0], reader));
            }
        }
        if (fieldType.kind === "option") {
            const option = reader.readU8();
            if (option) {
                return deserializeField(schema, fieldName, fieldType.type, reader);
            }
            return undefined;
        }
        if (fieldType.kind === "map") {
            let map = new Map();
            const length = reader.readU32();
            for (let i = 0; i < length; i++) {
                const key = deserializeField(schema, fieldName, fieldType.key, reader);
                const val = deserializeField(schema, fieldName, fieldType.value, reader);
                map.set(key, val);
            }
            return map;
        }
        return deserializeStruct(schema, fieldType, reader);
    }
    catch (error) {
        if (error instanceof BorshError) {
            error.addToFieldPath(fieldName);
        }
        throw error;
    }
}
function deserializeStruct(schema, classType, reader) {
    if (typeof classType.borshDeserialize === "function") {
        return classType.borshDeserialize(reader);
    }
    const structSchema = schema.get(classType);
    if (!structSchema) {
        throw new BorshError(`Class ${classType.name} is missing in schema`);
    }
    if (structSchema.kind === "struct") {
        const result = {};
        for (const [fieldName, fieldType] of schema.get(classType).fields) {
            result[fieldName] = deserializeField(schema, fieldName, fieldType, reader);
        }
        return new classType(result);
    }
    if (structSchema.kind === "enum") {
        const idx = reader.readU8();
        if (idx >= structSchema.values.length) {
            throw new BorshError(`Enum index: ${idx} is out of range`);
        }
        const [fieldName, fieldType] = structSchema.values[idx];
        const fieldValue = deserializeField(schema, fieldName, fieldType, reader);
        return new classType({ [fieldName]: fieldValue });
    }
    throw new BorshError(`Unexpected schema kind: ${structSchema.kind} for ${classType.constructor.name}`);
}
/// Deserializes object from bytes using schema.
function deserialize(schema, classType, buffer, Reader = BinaryReader) {
    const reader = new Reader(buffer);
    const result = deserializeStruct(schema, classType, reader);
    if (reader.offset < buffer.length) {
        throw new BorshError(`Unexpected ${buffer.length - reader.offset} bytes after deserialized data`);
    }
    return result;
}
exports.deserialize = deserialize;
/// Deserializes object from bytes using schema, without checking the length read
function deserializeUnchecked(schema, classType, buffer, Reader = BinaryReader) {
    const reader = new Reader(buffer);
    return deserializeStruct(schema, classType, reader);
}
exports.deserializeUnchecked = deserializeUnchecked;

}).call(this)}).call(this,require("buffer").Buffer)
},{"bn.js":27,"bs58":30,"buffer":2,"text-encoding-utf-8":37}],29:[function(require,module,exports){

},{}],30:[function(require,module,exports){
var basex = require('base-x')
var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

module.exports = basex(ALPHABET)

},{"base-x":25}],31:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Add a listener for a given event.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {EventEmitter}
 * @private
 */
function addListener(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') {
    throw new TypeError('The listener must be a function');
  }

  var listener = new EE(fn, context || emitter, once)
    , evt = prefix ? prefix + event : event;

  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [emitter._events[evt], listener];

  return emitter;
}

/**
 * Clear event by name.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} evt The Event name.
 * @private
 */
function clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new Events();
  else delete emitter._events[evt];
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Array} The registered listeners.
 * @public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  var evt = prefix ? prefix + event : event
    , handlers = this._events[evt];

  if (!handlers) return [];
  if (handlers.fn) return [handlers.fn];

  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
    ee[i] = handlers[i].fn;
  }

  return ee;
};

/**
 * Return the number of listeners listening to a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Number} The number of listeners.
 * @public
 */
EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = prefix ? prefix + event : event
    , listeners = this._events[evt];

  if (!listeners) return 0;
  if (listeners.fn) return 1;
  return listeners.length;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  return addListener(this, event, fn, context, false);
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  return addListener(this, event, fn, context, true);
};

/**
 * Remove the listeners of a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {*} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    clearEvent(this, evt);
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
      listeners.fn === fn &&
      (!once || listeners.once) &&
      (!context || listeners.context === context)
    ) {
      clearEvent(this, evt);
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
        listeners[i].fn !== fn ||
        (once && !listeners[i].once) ||
        (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else clearEvent(this, evt);
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {(String|Symbol)} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) clearEvent(this, evt);
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],32:[function(require,module,exports){
'use strict';

const uuid = require('uuid').v4;
const generateRequest = require('../../generateRequest');

/**
 * Constructor for a Jayson Browser Client that does not depend any node.js core libraries
 * @class ClientBrowser
 * @param {Function} callServer Method that calls the server, receives the stringified request and a regular node-style callback
 * @param {Object} [options]
 * @param {Function} [options.reviver] Reviver function for JSON
 * @param {Function} [options.replacer] Replacer function for JSON
 * @param {Number} [options.version=2] JSON-RPC version to use (1|2)
 * @param {Function} [options.generator] Function to use for generating request IDs
 *  @param {Boolean} [options.notificationIdNull=false] When true, version 2 requests will set id to null instead of omitting it
 * @return {ClientBrowser}
 */
const ClientBrowser = function(callServer, options) {
  if(!(this instanceof ClientBrowser)) {
    return new ClientBrowser(callServer, options);
  }

  if (!options) {
    options = {};
  }

  this.options = {
    reviver: typeof options.reviver !== 'undefined' ? options.reviver : null,
    replacer: typeof options.replacer !== 'undefined' ? options.replacer : null,
    generator: typeof options.generator !== 'undefined' ? options.generator : function() { return uuid(); },
    version: typeof options.version !== 'undefined' ? options.version : 2,
    notificationIdNull: typeof options.notificationIdNull === 'boolean' ? options.notificationIdNull : false,
  };

  this.callServer = callServer;
};

module.exports = ClientBrowser;

/**
 *  Creates a request and dispatches it if given a callback.
 *  @param {String|Array} method A batch request if passed an Array, or a method name if passed a String
 *  @param {Array|Object} [params] Parameters for the method
 *  @param {String|Number} [id] Optional id. If undefined an id will be generated. If null it creates a notification request
 *  @param {Function} [callback] Request callback. If specified, executes the request rather than only returning it.
 *  @throws {TypeError} Invalid parameters
 *  @return {Object} JSON-RPC 1.0 or 2.0 compatible request
 */
ClientBrowser.prototype.request = function(method, params, id, callback) {
  const self = this;
  let request = null;

  // is this a batch request?
  const isBatch = Array.isArray(method) && typeof params === 'function';

  if (this.options.version === 1 && isBatch) {
    throw new TypeError('JSON-RPC 1.0 does not support batching');
  }

  // is this a raw request?
  const isRaw = !isBatch && method && typeof method === 'object' && typeof params === 'function';

  if(isBatch || isRaw) {
    callback = params;
    request = method;
  } else {
    if(typeof id === 'function') {
      callback = id;
      // specifically undefined because "null" is a notification request
      id = undefined;
    }

    const hasCallback = typeof callback === 'function';

    try {
      request = generateRequest(method, params, id, {
        generator: this.options.generator,
        version: this.options.version,
        notificationIdNull: this.options.notificationIdNull,
      });
    } catch(err) {
      if(hasCallback) {
        return callback(err);
      }
      throw err;
    }

    // no callback means we should just return a raw request
    if(!hasCallback) {
      return request;
    }

  }

  let message;
  try {
    message = JSON.stringify(request, this.options.replacer);
  } catch(err) {
    return callback(err);
  }

  this.callServer(message, function(err, response) {
    self._parseResponse(err, response, callback);
  });

  // always return the raw request
  return request;
};

/**
 * Parses a response from a server
 * @param {Object} err Error to pass on that is unrelated to the actual response
 * @param {String} responseText JSON-RPC 1.0 or 2.0 response
 * @param {Function} callback Callback that will receive different arguments depending on the amount of parameters
 * @private
 */
ClientBrowser.prototype._parseResponse = function(err, responseText, callback) {
  if(err) {
    callback(err);
    return;
  }

  if(!responseText) {
    // empty response text, assume that is correct because it could be a
    // notification which jayson does not give any body for
    return callback();
  }

  let response;
  try {
    response = JSON.parse(responseText, this.options.reviver);
  } catch(err) {
    return callback(err);
  }

  if(callback.length === 3) {
    // if callback length is 3, we split callback arguments on error and response

    // is batch response?
    if(Array.isArray(response)) {

      // neccesary to split strictly on validity according to spec here
      const isError = function(res) {
        return typeof res.error !== 'undefined';
      };

      const isNotError = function (res) {
        return !isError(res);
      };

      return callback(null, response.filter(isError), response.filter(isNotError));
    
    } else {

      // split regardless of validity
      return callback(null, response.error, response.result);
    
    }
  
  }

  callback(null, response);
};

},{"../../generateRequest":33,"uuid":38}],33:[function(require,module,exports){
'use strict';

const uuid = require('uuid').v4;

/**
 *  Generates a JSON-RPC 1.0 or 2.0 request
 *  @param {String} method Name of method to call
 *  @param {Array|Object} params Array of parameters passed to the method as specified, or an object of parameter names and corresponding value
 *  @param {String|Number|null} [id] Request ID can be a string, number, null for explicit notification or left out for automatic generation
 *  @param {Object} [options]
 *  @param {Number} [options.version=2] JSON-RPC version to use (1 or 2)
 *  @param {Boolean} [options.notificationIdNull=false] When true, version 2 requests will set id to null instead of omitting it
 *  @param {Function} [options.generator] Passed the request, and the options object and is expected to return a request ID
 *  @throws {TypeError} If any of the parameters are invalid
 *  @return {Object} A JSON-RPC 1.0 or 2.0 request
 *  @memberOf Utils
 */
const generateRequest = function(method, params, id, options) {
  if(typeof method !== 'string') {
    throw new TypeError(method + ' must be a string');
  }

  options = options || {};

  // check valid version provided
  const version = typeof options.version === 'number' ? options.version : 2;
  if (version !== 1 && version !== 2) {
    throw new TypeError(version + ' must be 1 or 2');
  }

  const request = {
    method: method
  };

  if(version === 2) {
    request.jsonrpc = '2.0';
  }

  if(params) {
    // params given, but invalid?
    if(typeof params !== 'object' && !Array.isArray(params)) {
      throw new TypeError(params + ' must be an object, array or omitted');
    }
    request.params = params;
  }

  // if id was left out, generate one (null means explicit notification)
  if(typeof(id) === 'undefined') {
    const generator = typeof options.generator === 'function' ? options.generator : function() { return uuid(); };
    request.id = generator(request, options);
  } else if (version === 2 && id === null) {
    // we have a version 2 notification
    if (options.notificationIdNull) {
      request.id = null; // id will not be set at all unless option provided
    }
  } else {
    request.id = id;
  }

  return request;
};

module.exports = generateRequest;

},{"uuid":38}],34:[function(require,module,exports){
'use strict';

var buffer = require('buffer');
var eventemitter3 = require('eventemitter3');

// node_modules/esbuild-plugin-polyfill-node/polyfills/buffer.js
var WebSocketBrowserImpl = class extends eventemitter3.EventEmitter {
  socket;
  /** Instantiate a WebSocket class
  * @constructor
  * @param {String} address - url to a websocket server
  * @param {(Object)} options - websocket options
  * @param {(String|Array)} protocols - a list of protocols
  * @return {WebSocketBrowserImpl} - returns a WebSocket instance
  */
  constructor(address, options, protocols) {
    super();
    this.socket = new window.WebSocket(address, protocols);
    this.socket.onopen = () => this.emit("open");
    this.socket.onmessage = (event) => this.emit("message", event.data);
    this.socket.onerror = (error) => this.emit("error", error);
    this.socket.onclose = (event) => {
      this.emit("close", event.code, event.reason);
    };
  }
  /**
  * Sends data through a websocket connection
  * @method
  * @param {(String|Object)} data - data to be sent via websocket
  * @param {Object} optionsOrCallback - ws options
  * @param {Function} callback - a callback called once the data is sent
  * @return {Undefined}
  */
  send(data, optionsOrCallback, callback) {
    const cb = callback || optionsOrCallback;
    try {
      this.socket.send(data);
      cb();
    } catch (error) {
      cb(error);
    }
  }
  /**
  * Closes an underlying socket
  * @method
  * @param {Number} code - status code explaining why the connection is being closed
  * @param {String} reason - a description why the connection is closing
  * @return {Undefined}
  * @throws {Error}
  */
  close(code, reason) {
    this.socket.close(code, reason);
  }
  addEventListener(type, listener, options) {
    this.socket.addEventListener(type, listener, options);
  }
};
function WebSocket(address, options) {
  return new WebSocketBrowserImpl(address, options);
}

// src/lib/utils.ts
var DefaultDataPack = class {
  encode(value) {
    return JSON.stringify(value);
  }
  decode(value) {
    return JSON.parse(value);
  }
};

// src/lib/client.ts
var CommonClient = class extends eventemitter3.EventEmitter {
  address;
  rpc_id;
  queue;
  options;
  autoconnect;
  ready;
  reconnect;
  reconnect_timer_id;
  reconnect_interval;
  max_reconnects;
  rest_options;
  current_reconnects;
  generate_request_id;
  socket;
  webSocketFactory;
  dataPack;
  /**
  * Instantiate a Client class.
  * @constructor
  * @param {webSocketFactory} webSocketFactory - factory method for WebSocket
  * @param {String} address - url to a websocket server
  * @param {Object} options - ws options object with reconnect parameters
  * @param {Function} generate_request_id - custom generation request Id
  * @param {DataPack} dataPack - data pack contains encoder and decoder
  * @return {CommonClient}
  */
  constructor(webSocketFactory, address = "ws://localhost:8080", {
    autoconnect = true,
    reconnect = true,
    reconnect_interval = 1e3,
    max_reconnects = 5,
    ...rest_options
  } = {}, generate_request_id, dataPack) {
    super();
    this.webSocketFactory = webSocketFactory;
    this.queue = {};
    this.rpc_id = 0;
    this.address = address;
    this.autoconnect = autoconnect;
    this.ready = false;
    this.reconnect = reconnect;
    this.reconnect_timer_id = void 0;
    this.reconnect_interval = reconnect_interval;
    this.max_reconnects = max_reconnects;
    this.rest_options = rest_options;
    this.current_reconnects = 0;
    this.generate_request_id = generate_request_id || (() => typeof this.rpc_id === "number" ? ++this.rpc_id : Number(this.rpc_id) + 1);
    if (!dataPack) this.dataPack = new DefaultDataPack();
    else this.dataPack = dataPack;
    if (this.autoconnect)
      this._connect(this.address, {
        autoconnect: this.autoconnect,
        reconnect: this.reconnect,
        reconnect_interval: this.reconnect_interval,
        max_reconnects: this.max_reconnects,
        ...this.rest_options
      });
  }
  /**
  * Connects to a defined server if not connected already.
  * @method
  * @return {Undefined}
  */
  connect() {
    if (this.socket) return;
    this._connect(this.address, {
      autoconnect: this.autoconnect,
      reconnect: this.reconnect,
      reconnect_interval: this.reconnect_interval,
      max_reconnects: this.max_reconnects,
      ...this.rest_options
    });
  }
  /**
  * Calls a registered RPC method on server.
  * @method
  * @param {String} method - RPC method name
  * @param {Object|Array} params - optional method parameters
  * @param {Number} timeout - RPC reply timeout value
  * @param {Object} ws_opts - options passed to ws
  * @return {Promise}
  */
  call(method, params, timeout, ws_opts) {
    if (!ws_opts && "object" === typeof timeout) {
      ws_opts = timeout;
      timeout = null;
    }
    return new Promise((resolve, reject) => {
      if (!this.ready) return reject(new Error("socket not ready"));
      const rpc_id = this.generate_request_id(method, params);
      const message = {
        jsonrpc: "2.0",
        method,
        params: params || void 0,
        id: rpc_id
      };
      this.socket.send(this.dataPack.encode(message), ws_opts, (error) => {
        if (error) return reject(error);
        this.queue[rpc_id] = { promise: [resolve, reject] };
        if (timeout) {
          this.queue[rpc_id].timeout = setTimeout(() => {
            delete this.queue[rpc_id];
            reject(new Error("reply timeout"));
          }, timeout);
        }
      });
    });
  }
  /**
  * Logins with the other side of the connection.
  * @method
  * @param {Object} params - Login credentials object
  * @return {Promise}
  */
  async login(params) {
    const resp = await this.call("rpc.login", params);
    if (!resp) throw new Error("authentication failed");
    return resp;
  }
  /**
  * Fetches a list of client's methods registered on server.
  * @method
  * @return {Array}
  */
  async listMethods() {
    return await this.call("__listMethods");
  }
  /**
  * Sends a JSON-RPC 2.0 notification to server.
  * @method
  * @param {String} method - RPC method name
  * @param {Object} params - optional method parameters
  * @return {Promise}
  */
  notify(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.ready) return reject(new Error("socket not ready"));
      const message = {
        jsonrpc: "2.0",
        method,
        params
      };
      this.socket.send(this.dataPack.encode(message), (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
  /**
  * Subscribes for a defined event.
  * @method
  * @param {String|Array} event - event name
  * @return {Undefined}
  * @throws {Error}
  */
  async subscribe(event) {
    if (typeof event === "string") event = [event];
    const result = await this.call("rpc.on", event);
    if (typeof event === "string" && result[event] !== "ok")
      throw new Error(
        "Failed subscribing to an event '" + event + "' with: " + result[event]
      );
    return result;
  }
  /**
  * Unsubscribes from a defined event.
  * @method
  * @param {String|Array} event - event name
  * @return {Undefined}
  * @throws {Error}
  */
  async unsubscribe(event) {
    if (typeof event === "string") event = [event];
    const result = await this.call("rpc.off", event);
    if (typeof event === "string" && result[event] !== "ok")
      throw new Error("Failed unsubscribing from an event with: " + result);
    return result;
  }
  /**
  * Closes a WebSocket connection gracefully.
  * @method
  * @param {Number} code - socket close code
  * @param {String} data - optional data to be sent before closing
  * @return {Undefined}
  */
  close(code, data) {
    this.socket.close(code || 1e3, data);
  }
  /**
  * Enable / disable automatic reconnection.
  * @method
  * @param {Boolean} reconnect - enable / disable reconnection
  * @return {Undefined}
  */
  setAutoReconnect(reconnect) {
    this.reconnect = reconnect;
  }
  /**
  * Set the interval between reconnection attempts.
  * @method
  * @param {Number} interval - reconnection interval in milliseconds
  * @return {Undefined}
  */
  setReconnectInterval(interval) {
    this.reconnect_interval = interval;
  }
  /**
  * Set the maximum number of reconnection attempts.
  * @method
  * @param {Number} max_reconnects - maximum reconnection attempts
  * @return {Undefined}
  */
  setMaxReconnects(max_reconnects) {
    this.max_reconnects = max_reconnects;
  }
  /**
  * Connection/Message handler.
  * @method
  * @private
  * @param {String} address - WebSocket API address
  * @param {Object} options - ws options object
  * @return {Undefined}
  */
  _connect(address, options) {
    clearTimeout(this.reconnect_timer_id);
    this.socket = this.webSocketFactory(address, options);
    this.socket.addEventListener("open", () => {
      this.ready = true;
      this.emit("open");
      this.current_reconnects = 0;
    });
    this.socket.addEventListener("message", ({ data: message }) => {
      if (message instanceof ArrayBuffer)
        message = buffer.Buffer.from(message).toString();
      try {
        message = this.dataPack.decode(message);
      } catch (error) {
        return;
      }
      if (message.notification && this.listeners(message.notification).length) {
        if (!Object.keys(message.params).length)
          return this.emit(message.notification);
        const args = [message.notification];
        if (message.params.constructor === Object) args.push(message.params);
        else
          for (let i = 0; i < message.params.length; i++)
            args.push(message.params[i]);
        return Promise.resolve().then(() => {
          this.emit.apply(this, args);
        });
      }
      if (!this.queue[message.id]) {
        if (message.method) {
          return Promise.resolve().then(() => {
            this.emit(message.method, message?.params);
          });
        }
        return;
      }
      if ("error" in message === "result" in message)
        this.queue[message.id].promise[1](
          new Error(
            'Server response malformed. Response must include either "result" or "error", but not both.'
          )
        );
      if (this.queue[message.id].timeout)
        clearTimeout(this.queue[message.id].timeout);
      if (message.error) this.queue[message.id].promise[1](message.error);
      else this.queue[message.id].promise[0](message.result);
      delete this.queue[message.id];
    });
    this.socket.addEventListener("error", (error) => this.emit("error", error));
    this.socket.addEventListener("close", ({ code, reason }) => {
      if (this.ready)
        setTimeout(() => this.emit("close", code, reason), 0);
      this.ready = false;
      this.socket = void 0;
      if (code === 1e3) return;
      this.current_reconnects++;
      if (this.reconnect && (this.max_reconnects > this.current_reconnects || this.max_reconnects === 0))
        this.reconnect_timer_id = setTimeout(
          () => this._connect(address, options),
          this.reconnect_interval
        );
    });
  }
};

// src/index.browser.ts
var Client = class extends CommonClient {
  constructor(address = "ws://localhost:8080", {
    autoconnect = true,
    reconnect = true,
    reconnect_interval = 1e3,
    max_reconnects = 5
  } = {}, generate_request_id) {
    super(
      WebSocket,
      address,
      {
        autoconnect,
        reconnect,
        reconnect_interval,
        max_reconnects
      },
      generate_request_id
    );
  }
};

exports.Client = Client;
exports.CommonClient = CommonClient;
exports.DefaultDataPack = DefaultDataPack;
exports.WebSocket = WebSocket;


},{"buffer":2,"eventemitter3":31}],35:[function(require,module,exports){
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":2}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StructError = exports.Struct = void 0;
exports.any = any;
exports.array = array;
exports.assert = assert;
exports.assign = assign;
exports.bigint = bigint;
exports.boolean = boolean;
exports.coerce = coerce;
exports.create = create;
exports.date = date;
exports.defaulted = defaulted;
exports.define = define;
exports.deprecated = deprecated;
exports.dynamic = dynamic;
exports.empty = empty;
exports.enums = enums;
exports.func = func;
exports.instance = instance;
exports.integer = integer;
exports.intersection = intersection;
exports.is = is;
exports.lazy = lazy;
exports.literal = literal;
exports.map = map;
exports.mask = mask;
exports.max = max;
exports.min = min;
exports.never = never;
exports.nonempty = nonempty;
exports.nullable = nullable;
exports.number = number;
exports.object = object;
exports.omit = omit;
exports.optional = optional;
exports.partial = partial;
exports.pattern = pattern;
exports.pick = pick;
exports.record = record;
exports.refine = refine;
exports.regexp = regexp;
exports.set = set;
exports.size = size;
exports.string = string;
exports.struct = struct;
exports.trimmed = trimmed;
exports.tuple = tuple;
exports.type = type;
exports.union = union;
exports.unknown = unknown;
exports.validate = validate;
/**
 * A `StructFailure` represents a single specific failure in validation.
 */
/**
 * `StructError` objects are thrown (or returned) when validation fails.
 *
 * Validation logic is design to exit early for maximum performance. The error
 * represents the first error encountered during validation. For more detail,
 * the `error.failures` property is a generator function that can be run to
 * continue validation and receive all the failures in the data.
 */
class StructError extends TypeError {
  constructor(failure, failures) {
    let cached;
    const {
      message,
      explanation,
      ...rest
    } = failure;
    const {
      path
    } = failure;
    const msg = path.length === 0 ? message : `At path: ${path.join('.')} -- ${message}`;
    super(explanation ?? msg);
    if (explanation != null) this.cause = msg;
    Object.assign(this, rest);
    this.name = this.constructor.name;
    this.failures = () => {
      return cached ?? (cached = [failure, ...failures()]);
    };
  }
}

/**
 * Check if a value is an iterator.
 */
exports.StructError = StructError;
function isIterable(x) {
  return isObject(x) && typeof x[Symbol.iterator] === 'function';
}
/**
 * Check if a value is a plain object.
 */
function isObject(x) {
  return typeof x === 'object' && x != null;
}
/**
 * Check if a value is a non-array object.
 */
function isNonArrayObject(x) {
  return isObject(x) && !Array.isArray(x);
}
/**
 * Check if a value is a plain object.
 */
function isPlainObject(x) {
  if (Object.prototype.toString.call(x) !== '[object Object]') {
    return false;
  }
  const prototype = Object.getPrototypeOf(x);
  return prototype === null || prototype === Object.prototype;
}
/**
 * Return a value as a printable string.
 */
function print(value) {
  if (typeof value === 'symbol') {
    return value.toString();
  }
  return typeof value === 'string' ? JSON.stringify(value) : `${value}`;
}
/**
 * Shifts (removes and returns) the first value from the `input` iterator.
 * Like `Array.prototype.shift()` but for an `Iterator`.
 */
function shiftIterator(input) {
  const {
    done,
    value
  } = input.next();
  return done ? undefined : value;
}
/**
 * Convert a single validation result to a failure.
 */
function toFailure(result, context, struct, value) {
  if (result === true) {
    return;
  } else if (result === false) {
    result = {};
  } else if (typeof result === 'string') {
    result = {
      message: result
    };
  }
  const {
    path,
    branch
  } = context;
  const {
    type
  } = struct;
  const {
    refinement,
    message = `Expected a value of type \`${type}\`${refinement ? ` with refinement \`${refinement}\`` : ''}, but received: \`${print(value)}\``
  } = result;
  return {
    value,
    type,
    refinement,
    key: path[path.length - 1],
    path,
    branch,
    ...result,
    message
  };
}
/**
 * Convert a validation result to an iterable of failures.
 */
function* toFailures(result, context, struct, value) {
  if (!isIterable(result)) {
    result = [result];
  }
  for (const r of result) {
    const failure = toFailure(r, context, struct, value);
    if (failure) {
      yield failure;
    }
  }
}
/**
 * Check a value against a struct, traversing deeply into nested values, and
 * returning an iterator of failures or success.
 */
function* run(value, struct, options = {}) {
  const {
    path = [],
    branch = [value],
    coerce = false,
    mask = false
  } = options;
  const ctx = {
    path,
    branch,
    mask
  };
  if (coerce) {
    value = struct.coercer(value, ctx);
  }
  let status = 'valid';
  for (const failure of struct.validator(value, ctx)) {
    failure.explanation = options.message;
    status = 'not_valid';
    yield [failure, undefined];
  }
  for (let [k, v, s] of struct.entries(value, ctx)) {
    const ts = run(v, s, {
      path: k === undefined ? path : [...path, k],
      branch: k === undefined ? branch : [...branch, v],
      coerce,
      mask,
      message: options.message
    });
    for (const t of ts) {
      if (t[0]) {
        status = t[0].refinement != null ? 'not_refined' : 'not_valid';
        yield [t[0], undefined];
      } else if (coerce) {
        v = t[1];
        if (k === undefined) {
          value = v;
        } else if (value instanceof Map) {
          value.set(k, v);
        } else if (value instanceof Set) {
          value.add(v);
        } else if (isObject(value)) {
          if (v !== undefined || k in value) value[k] = v;
        }
      }
    }
  }
  if (status !== 'not_valid') {
    for (const failure of struct.refiner(value, ctx)) {
      failure.explanation = options.message;
      status = 'not_refined';
      yield [failure, undefined];
    }
  }
  if (status === 'valid') {
    yield [undefined, value];
  }
}

/**
 * `Struct` objects encapsulate the validation logic for a specific type of
 * values. Once constructed, you use the `assert`, `is` or `validate` helpers to
 * validate unknown input data against the struct.
 */
class Struct {
  constructor(props) {
    const {
      type,
      schema,
      validator,
      refiner,
      coercer = value => value,
      entries = function* () {}
    } = props;
    this.type = type;
    this.schema = schema;
    this.entries = entries;
    this.coercer = coercer;
    if (validator) {
      this.validator = (value, context) => {
        const result = validator(value, context);
        return toFailures(result, context, this, value);
      };
    } else {
      this.validator = () => [];
    }
    if (refiner) {
      this.refiner = (value, context) => {
        const result = refiner(value, context);
        return toFailures(result, context, this, value);
      };
    } else {
      this.refiner = () => [];
    }
  }
  /**
   * Assert that a value passes the struct's validation, throwing if it doesn't.
   */
  assert(value, message) {
    return assert(value, this, message);
  }
  /**
   * Create a value with the struct's coercion logic, then validate it.
   */
  create(value, message) {
    return create(value, this, message);
  }
  /**
   * Check if a value passes the struct's validation.
   */
  is(value) {
    return is(value, this);
  }
  /**
   * Mask a value, coercing and validating it, but returning only the subset of
   * properties defined by the struct's schema. Masking applies recursively to
   * props of `object` structs only.
   */
  mask(value, message) {
    return mask(value, this, message);
  }
  /**
   * Validate a value with the struct's validation logic, returning a tuple
   * representing the result.
   *
   * You may optionally pass `true` for the `coerce` argument to coerce
   * the value before attempting to validate it. If you do, the result will
   * contain the coerced result when successful. Also, `mask` will turn on
   * masking of the unknown `object` props recursively if passed.
   */
  validate(value, options = {}) {
    return validate(value, this, options);
  }
}
/**
 * Assert that a value passes a struct, throwing if it doesn't.
 */
exports.Struct = Struct;
function assert(value, struct, message) {
  const result = validate(value, struct, {
    message
  });
  if (result[0]) {
    throw result[0];
  }
}
/**
 * Create a value with the coercion logic of struct and validate it.
 */
function create(value, struct, message) {
  const result = validate(value, struct, {
    coerce: true,
    message
  });
  if (result[0]) {
    throw result[0];
  } else {
    return result[1];
  }
}
/**
 * Mask a value, returning only the subset of properties defined by a struct.
 */
function mask(value, struct, message) {
  const result = validate(value, struct, {
    coerce: true,
    mask: true,
    message
  });
  if (result[0]) {
    throw result[0];
  } else {
    return result[1];
  }
}
/**
 * Check if a value passes a struct.
 */
function is(value, struct) {
  const result = validate(value, struct);
  return !result[0];
}
/**
 * Validate a value against a struct, returning an error if invalid, or the
 * value (with potential coercion) if valid.
 */
function validate(value, struct, options = {}) {
  const tuples = run(value, struct, options);
  const tuple = shiftIterator(tuples);
  if (tuple[0]) {
    const error = new StructError(tuple[0], function* () {
      for (const t of tuples) {
        if (t[0]) {
          yield t[0];
        }
      }
    });
    return [error, undefined];
  } else {
    const v = tuple[1];
    return [undefined, v];
  }
}
function assign(...Structs) {
  const isType = Structs[0].type === 'type';
  const schemas = Structs.map(s => s.schema);
  const schema = Object.assign({}, ...schemas);
  return isType ? type(schema) : object(schema);
}
/**
 * Define a new struct type with a custom validation function.
 */
function define(name, validator) {
  return new Struct({
    type: name,
    schema: null,
    validator
  });
}
/**
 * Create a new struct based on an existing struct, but the value is allowed to
 * be `undefined`. `log` will be called if the value is not `undefined`.
 */
function deprecated(struct, log) {
  return new Struct({
    ...struct,
    refiner: (value, ctx) => value === undefined || struct.refiner(value, ctx),
    validator(value, ctx) {
      if (value === undefined) {
        return true;
      } else {
        log(value, ctx);
        return struct.validator(value, ctx);
      }
    }
  });
}
/**
 * Create a struct with dynamic validation logic.
 *
 * The callback will receive the value currently being validated, and must
 * return a struct object to validate it with. This can be useful to model
 * validation logic that changes based on its input.
 */
function dynamic(fn) {
  return new Struct({
    type: 'dynamic',
    schema: null,
    *entries(value, ctx) {
      const struct = fn(value, ctx);
      yield* struct.entries(value, ctx);
    },
    validator(value, ctx) {
      const struct = fn(value, ctx);
      return struct.validator(value, ctx);
    },
    coercer(value, ctx) {
      const struct = fn(value, ctx);
      return struct.coercer(value, ctx);
    },
    refiner(value, ctx) {
      const struct = fn(value, ctx);
      return struct.refiner(value, ctx);
    }
  });
}
/**
 * Create a struct with lazily evaluated validation logic.
 *
 * The first time validation is run with the struct, the callback will be called
 * and must return a struct object to use. This is useful for cases where you
 * want to have self-referential structs for nested data structures to avoid a
 * circular definition problem.
 */
function lazy(fn) {
  let struct;
  return new Struct({
    type: 'lazy',
    schema: null,
    *entries(value, ctx) {
      struct ?? (struct = fn());
      yield* struct.entries(value, ctx);
    },
    validator(value, ctx) {
      struct ?? (struct = fn());
      return struct.validator(value, ctx);
    },
    coercer(value, ctx) {
      struct ?? (struct = fn());
      return struct.coercer(value, ctx);
    },
    refiner(value, ctx) {
      struct ?? (struct = fn());
      return struct.refiner(value, ctx);
    }
  });
}
/**
 * Create a new struct based on an existing object struct, but excluding
 * specific properties.
 *
 * Like TypeScript's `Omit` utility.
 */
function omit(struct, keys) {
  const {
    schema
  } = struct;
  const subschema = {
    ...schema
  };
  for (const key of keys) {
    delete subschema[key];
  }
  switch (struct.type) {
    case 'type':
      return type(subschema);
    default:
      return object(subschema);
  }
}
/**
 * Create a new struct based on an existing object struct, but with all of its
 * properties allowed to be `undefined`.
 *
 * Like TypeScript's `Partial` utility.
 */
function partial(struct) {
  const isStruct = struct instanceof Struct;
  const schema = isStruct ? {
    ...struct.schema
  } : {
    ...struct
  };
  for (const key in schema) {
    schema[key] = optional(schema[key]);
  }
  if (isStruct && struct.type === 'type') {
    return type(schema);
  }
  return object(schema);
}
/**
 * Create a new struct based on an existing object struct, but only including
 * specific properties.
 *
 * Like TypeScript's `Pick` utility.
 */
function pick(struct, keys) {
  const {
    schema
  } = struct;
  const subschema = {};
  for (const key of keys) {
    subschema[key] = schema[key];
  }
  switch (struct.type) {
    case 'type':
      return type(subschema);
    default:
      return object(subschema);
  }
}
/**
 * Define a new struct type with a custom validation function.
 *
 * @deprecated This function has been renamed to `define`.
 */
function struct(name, validator) {
  console.warn('superstruct@0.11 - The `struct` helper has been renamed to `define`.');
  return define(name, validator);
}

/**
 * Ensure that any value passes validation.
 */
function any() {
  return define('any', () => true);
}
function array(Element) {
  return new Struct({
    type: 'array',
    schema: Element,
    *entries(value) {
      if (Element && Array.isArray(value)) {
        for (const [i, v] of value.entries()) {
          yield [i, v, Element];
        }
      }
    },
    coercer(value) {
      return Array.isArray(value) ? value.slice() : value;
    },
    validator(value) {
      return Array.isArray(value) || `Expected an array value, but received: ${print(value)}`;
    }
  });
}
/**
 * Ensure that a value is a bigint.
 */
function bigint() {
  return define('bigint', value => {
    return typeof value === 'bigint';
  });
}
/**
 * Ensure that a value is a boolean.
 */
function boolean() {
  return define('boolean', value => {
    return typeof value === 'boolean';
  });
}
/**
 * Ensure that a value is a valid `Date`.
 *
 * Note: this also ensures that the value is *not* an invalid `Date` object,
 * which can occur when parsing a date fails but still returns a `Date`.
 */
function date() {
  return define('date', value => {
    return value instanceof Date && !isNaN(value.getTime()) || `Expected a valid \`Date\` object, but received: ${print(value)}`;
  });
}
function enums(values) {
  const schema = {};
  const description = values.map(v => print(v)).join();
  for (const key of values) {
    schema[key] = key;
  }
  return new Struct({
    type: 'enums',
    schema,
    validator(value) {
      return values.includes(value) || `Expected one of \`${description}\`, but received: ${print(value)}`;
    }
  });
}
/**
 * Ensure that a value is a function.
 */
function func() {
  return define('func', value => {
    return typeof value === 'function' || `Expected a function, but received: ${print(value)}`;
  });
}
/**
 * Ensure that a value is an instance of a specific class.
 */
function instance(Class) {
  return define('instance', value => {
    return value instanceof Class || `Expected a \`${Class.name}\` instance, but received: ${print(value)}`;
  });
}
/**
 * Ensure that a value is an integer.
 */
function integer() {
  return define('integer', value => {
    return typeof value === 'number' && !isNaN(value) && Number.isInteger(value) || `Expected an integer, but received: ${print(value)}`;
  });
}
/**
 * Ensure that a value matches all of a set of types.
 */
function intersection(Structs) {
  return new Struct({
    type: 'intersection',
    schema: null,
    *entries(value, ctx) {
      for (const S of Structs) {
        yield* S.entries(value, ctx);
      }
    },
    *validator(value, ctx) {
      for (const S of Structs) {
        yield* S.validator(value, ctx);
      }
    },
    *refiner(value, ctx) {
      for (const S of Structs) {
        yield* S.refiner(value, ctx);
      }
    }
  });
}
function literal(constant) {
  const description = print(constant);
  const t = typeof constant;
  return new Struct({
    type: 'literal',
    schema: t === 'string' || t === 'number' || t === 'boolean' ? constant : null,
    validator(value) {
      return value === constant || `Expected the literal \`${description}\`, but received: ${print(value)}`;
    }
  });
}
function map(Key, Value) {
  return new Struct({
    type: 'map',
    schema: null,
    *entries(value) {
      if (Key && Value && value instanceof Map) {
        for (const [k, v] of value.entries()) {
          yield [k, k, Key];
          yield [k, v, Value];
        }
      }
    },
    coercer(value) {
      return value instanceof Map ? new Map(value) : value;
    },
    validator(value) {
      return value instanceof Map || `Expected a \`Map\` object, but received: ${print(value)}`;
    }
  });
}
/**
 * Ensure that no value ever passes validation.
 */
function never() {
  return define('never', () => false);
}
/**
 * Augment an existing struct to allow `null` values.
 */
function nullable(struct) {
  return new Struct({
    ...struct,
    validator: (value, ctx) => value === null || struct.validator(value, ctx),
    refiner: (value, ctx) => value === null || struct.refiner(value, ctx)
  });
}
/**
 * Ensure that a value is a number.
 */
function number() {
  return define('number', value => {
    return typeof value === 'number' && !isNaN(value) || `Expected a number, but received: ${print(value)}`;
  });
}
function object(schema) {
  const knowns = schema ? Object.keys(schema) : [];
  const Never = never();
  return new Struct({
    type: 'object',
    schema: schema ? schema : null,
    *entries(value) {
      if (schema && isObject(value)) {
        const unknowns = new Set(Object.keys(value));
        for (const key of knowns) {
          unknowns.delete(key);
          yield [key, value[key], schema[key]];
        }
        for (const key of unknowns) {
          yield [key, value[key], Never];
        }
      }
    },
    validator(value) {
      return isNonArrayObject(value) || `Expected an object, but received: ${print(value)}`;
    },
    coercer(value, ctx) {
      if (!isNonArrayObject(value)) {
        return value;
      }
      const coerced = {
        ...value
      };
      // The `object` struct has special behaviour enabled by the mask flag.
      // When masking, properties that are not in the schema are deleted from
      // the coerced object instead of eventually failing validaiton.
      if (ctx.mask && schema) {
        for (const key in coerced) {
          if (schema[key] === undefined) {
            delete coerced[key];
          }
        }
      }
      return coerced;
    }
  });
}
/**
 * Augment a struct to allow `undefined` values.
 */
function optional(struct) {
  return new Struct({
    ...struct,
    validator: (value, ctx) => value === undefined || struct.validator(value, ctx),
    refiner: (value, ctx) => value === undefined || struct.refiner(value, ctx)
  });
}
/**
 * Ensure that a value is an object with keys and values of specific types, but
 * without ensuring any specific shape of properties.
 *
 * Like TypeScript's `Record` utility.
 */
function record(Key, Value) {
  return new Struct({
    type: 'record',
    schema: null,
    *entries(value) {
      if (isObject(value)) {
        for (const k in value) {
          const v = value[k];
          yield [k, k, Key];
          yield [k, v, Value];
        }
      }
    },
    validator(value) {
      return isNonArrayObject(value) || `Expected an object, but received: ${print(value)}`;
    },
    coercer(value) {
      return isNonArrayObject(value) ? {
        ...value
      } : value;
    }
  });
}
/**
 * Ensure that a value is a `RegExp`.
 *
 * Note: this does not test the value against the regular expression! For that
 * you need to use the `pattern()` refinement.
 */
function regexp() {
  return define('regexp', value => {
    return value instanceof RegExp;
  });
}
function set(Element) {
  return new Struct({
    type: 'set',
    schema: null,
    *entries(value) {
      if (Element && value instanceof Set) {
        for (const v of value) {
          yield [v, v, Element];
        }
      }
    },
    coercer(value) {
      return value instanceof Set ? new Set(value) : value;
    },
    validator(value) {
      return value instanceof Set || `Expected a \`Set\` object, but received: ${print(value)}`;
    }
  });
}
/**
 * Ensure that a value is a string.
 */
function string() {
  return define('string', value => {
    return typeof value === 'string' || `Expected a string, but received: ${print(value)}`;
  });
}
/**
 * Ensure that a value is a tuple of a specific length, and that each of its
 * elements is of a specific type.
 */
function tuple(Structs) {
  const Never = never();
  return new Struct({
    type: 'tuple',
    schema: null,
    *entries(value) {
      if (Array.isArray(value)) {
        const length = Math.max(Structs.length, value.length);
        for (let i = 0; i < length; i++) {
          yield [i, value[i], Structs[i] || Never];
        }
      }
    },
    validator(value) {
      return Array.isArray(value) || `Expected an array, but received: ${print(value)}`;
    },
    coercer(value) {
      return Array.isArray(value) ? value.slice() : value;
    }
  });
}
/**
 * Ensure that a value has a set of known properties of specific types.
 *
 * Note: Unrecognized properties are allowed and untouched. This is similar to
 * how TypeScript's structural typing works.
 */
function type(schema) {
  const keys = Object.keys(schema);
  return new Struct({
    type: 'type',
    schema,
    *entries(value) {
      if (isObject(value)) {
        for (const k of keys) {
          yield [k, value[k], schema[k]];
        }
      }
    },
    validator(value) {
      return isNonArrayObject(value) || `Expected an object, but received: ${print(value)}`;
    },
    coercer(value) {
      return isNonArrayObject(value) ? {
        ...value
      } : value;
    }
  });
}
/**
 * Ensure that a value matches one of a set of types.
 */
function union(Structs) {
  const description = Structs.map(s => s.type).join(' | ');
  return new Struct({
    type: 'union',
    schema: null,
    coercer(value, ctx) {
      for (const S of Structs) {
        const [error, coerced] = S.validate(value, {
          coerce: true,
          mask: ctx.mask
        });
        if (!error) {
          return coerced;
        }
      }
      return value;
    },
    validator(value, ctx) {
      const failures = [];
      for (const S of Structs) {
        const [...tuples] = run(value, S, ctx);
        const [first] = tuples;
        if (!first[0]) {
          return [];
        } else {
          for (const [failure] of tuples) {
            if (failure) {
              failures.push(failure);
            }
          }
        }
      }
      return [`Expected the value to satisfy a union of \`${description}\`, but received: ${print(value)}`, ...failures];
    }
  });
}
/**
 * Ensure that any value passes validation, without widening its type to `any`.
 */
function unknown() {
  return define('unknown', () => true);
}

/**
 * Augment a `Struct` to add an additional coercion step to its input.
 *
 * This allows you to transform input data before validating it, to increase the
 * likelihood that it passes validation—for example for default values, parsing
 * different formats, etc.
 *
 * Note: You must use `create(value, Struct)` on the value to have the coercion
 * take effect! Using simply `assert()` or `is()` will not use coercion.
 */
function coerce(struct, condition, coercer) {
  return new Struct({
    ...struct,
    coercer: (value, ctx) => {
      return is(value, condition) ? struct.coercer(coercer(value, ctx), ctx) : struct.coercer(value, ctx);
    }
  });
}
/**
 * Augment a struct to replace `undefined` values with a default.
 *
 * Note: You must use `create(value, Struct)` on the value to have the coercion
 * take effect! Using simply `assert()` or `is()` will not use coercion.
 */
function defaulted(struct, fallback, options = {}) {
  return coerce(struct, unknown(), x => {
    const f = typeof fallback === 'function' ? fallback() : fallback;
    if (x === undefined) {
      return f;
    }
    if (!options.strict && isPlainObject(x) && isPlainObject(f)) {
      const ret = {
        ...x
      };
      let changed = false;
      for (const key in f) {
        if (ret[key] === undefined) {
          ret[key] = f[key];
          changed = true;
        }
      }
      if (changed) {
        return ret;
      }
    }
    return x;
  });
}
/**
 * Augment a struct to trim string inputs.
 *
 * Note: You must use `create(value, Struct)` on the value to have the coercion
 * take effect! Using simply `assert()` or `is()` will not use coercion.
 */
function trimmed(struct) {
  return coerce(struct, string(), x => x.trim());
}

/**
 * Ensure that a string, array, map, or set is empty.
 */
function empty(struct) {
  return refine(struct, 'empty', value => {
    const size = getSize(value);
    return size === 0 || `Expected an empty ${struct.type} but received one with a size of \`${size}\``;
  });
}
function getSize(value) {
  if (value instanceof Map || value instanceof Set) {
    return value.size;
  } else {
    return value.length;
  }
}
/**
 * Ensure that a number or date is below a threshold.
 */
function max(struct, threshold, options = {}) {
  const {
    exclusive
  } = options;
  return refine(struct, 'max', value => {
    return exclusive ? value < threshold : value <= threshold || `Expected a ${struct.type} less than ${exclusive ? '' : 'or equal to '}${threshold} but received \`${value}\``;
  });
}
/**
 * Ensure that a number or date is above a threshold.
 */
function min(struct, threshold, options = {}) {
  const {
    exclusive
  } = options;
  return refine(struct, 'min', value => {
    return exclusive ? value > threshold : value >= threshold || `Expected a ${struct.type} greater than ${exclusive ? '' : 'or equal to '}${threshold} but received \`${value}\``;
  });
}
/**
 * Ensure that a string, array, map or set is not empty.
 */
function nonempty(struct) {
  return refine(struct, 'nonempty', value => {
    const size = getSize(value);
    return size > 0 || `Expected a nonempty ${struct.type} but received an empty one`;
  });
}
/**
 * Ensure that a string matches a regular expression.
 */
function pattern(struct, regexp) {
  return refine(struct, 'pattern', value => {
    return regexp.test(value) || `Expected a ${struct.type} matching \`/${regexp.source}/\` but received "${value}"`;
  });
}
/**
 * Ensure that a string, array, number, date, map, or set has a size (or length, or time) between `min` and `max`.
 */
function size(struct, min, max = min) {
  const expected = `Expected a ${struct.type}`;
  const of = min === max ? `of \`${min}\`` : `between \`${min}\` and \`${max}\``;
  return refine(struct, 'size', value => {
    if (typeof value === 'number' || value instanceof Date) {
      return min <= value && value <= max || `${expected} ${of} but received \`${value}\``;
    } else if (value instanceof Map || value instanceof Set) {
      const {
        size
      } = value;
      return min <= size && size <= max || `${expected} with a size ${of} but received one with a size of \`${size}\``;
    } else {
      const {
        length
      } = value;
      return min <= length && length <= max || `${expected} with a length ${of} but received one with a length of \`${length}\``;
    }
  });
}
/**
 * Augment a `Struct` to add an additional refinement to the validation.
 *
 * The refiner function is guaranteed to receive a value of the struct's type,
 * because the struct's existing validation will already have passed. This
 * allows you to layer additional validation on top of existing structs.
 */
function refine(struct, name, refiner) {
  return new Struct({
    ...struct,
    *refiner(value, ctx) {
      yield* struct.refiner(value, ctx);
      const result = refiner(value, ctx);
      const failures = toFailures(result, ctx, struct, value);
      for (const failure of failures) {
        yield {
          ...failure,
          refinement: name
        };
      }
    }
  });
}

},{}],37:[function(require,module,exports){
'use strict';

// This is free and unencumbered software released into the public domain.
// See LICENSE.md for more information.

//
// Utilities
//

/**
 * @param {number} a The number to test.
 * @param {number} min The minimum value in the range, inclusive.
 * @param {number} max The maximum value in the range, inclusive.
 * @return {boolean} True if a >= min and a <= max.
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextDecoder = TextDecoder;
exports.TextEncoder = TextEncoder;
function inRange(a, min, max) {
  return min <= a && a <= max;
}

/**
 * @param {*} o
 * @return {Object}
 */
function ToDictionary(o) {
  if (o === undefined) return {};
  if (o === Object(o)) return o;
  throw TypeError('Could not convert argument to dictionary');
}

/**
 * @param {string} string Input string of UTF-16 code units.
 * @return {!Array.<number>} Code points.
 */
function stringToCodePoints(string) {
  // https://heycam.github.io/webidl/#dfn-obtain-unicode

  // 1. Let S be the DOMString value.
  var s = String(string);

  // 2. Let n be the length of S.
  var n = s.length;

  // 3. Initialize i to 0.
  var i = 0;

  // 4. Initialize U to be an empty sequence of Unicode characters.
  var u = [];

  // 5. While i < n:
  while (i < n) {
    // 1. Let c be the code unit in S at index i.
    var c = s.charCodeAt(i);

    // 2. Depending on the value of c:

    // c < 0xD800 or c > 0xDFFF
    if (c < 0xD800 || c > 0xDFFF) {
      // Append to U the Unicode character with code point c.
      u.push(c);
    }

    // 0xDC00 ≤ c ≤ 0xDFFF
    else if (0xDC00 <= c && c <= 0xDFFF) {
      // Append to U a U+FFFD REPLACEMENT CHARACTER.
      u.push(0xFFFD);
    }

    // 0xD800 ≤ c ≤ 0xDBFF
    else if (0xD800 <= c && c <= 0xDBFF) {
      // 1. If i = n−1, then append to U a U+FFFD REPLACEMENT
      // CHARACTER.
      if (i === n - 1) {
        u.push(0xFFFD);
      }
      // 2. Otherwise, i < n−1:
      else {
        // 1. Let d be the code unit in S at index i+1.
        var d = string.charCodeAt(i + 1);

        // 2. If 0xDC00 ≤ d ≤ 0xDFFF, then:
        if (0xDC00 <= d && d <= 0xDFFF) {
          // 1. Let a be c & 0x3FF.
          var a = c & 0x3FF;

          // 2. Let b be d & 0x3FF.
          var b = d & 0x3FF;

          // 3. Append to U the Unicode character with code point
          // 2^16+2^10*a+b.
          u.push(0x10000 + (a << 10) + b);

          // 4. Set i to i+1.
          i += 1;
        }

        // 3. Otherwise, d < 0xDC00 or d > 0xDFFF. Append to U a
        // U+FFFD REPLACEMENT CHARACTER.
        else {
          u.push(0xFFFD);
        }
      }
    }

    // 3. Set i to i+1.
    i += 1;
  }

  // 6. Return U.
  return u;
}

/**
 * @param {!Array.<number>} code_points Array of code points.
 * @return {string} string String of UTF-16 code units.
 */
function codePointsToString(code_points) {
  var s = '';
  for (var i = 0; i < code_points.length; ++i) {
    var cp = code_points[i];
    if (cp <= 0xFFFF) {
      s += String.fromCharCode(cp);
    } else {
      cp -= 0x10000;
      s += String.fromCharCode((cp >> 10) + 0xD800, (cp & 0x3FF) + 0xDC00);
    }
  }
  return s;
}

//
// Implementation of Encoding specification
// https://encoding.spec.whatwg.org/
//

//
// 3. Terminology
//

/**
 * End-of-stream is a special token that signifies no more tokens
 * are in the stream.
 * @const
 */
var end_of_stream = -1;

/**
 * A stream represents an ordered sequence of tokens.
 *
 * @constructor
 * @param {!(Array.<number>|Uint8Array)} tokens Array of tokens that provide the
 * stream.
 */
function Stream(tokens) {
  /** @type {!Array.<number>} */
  this.tokens = [].slice.call(tokens);
}
Stream.prototype = {
  /**
   * @return {boolean} True if end-of-stream has been hit.
   */
  endOfStream: function () {
    return !this.tokens.length;
  },
  /**
   * When a token is read from a stream, the first token in the
   * stream must be returned and subsequently removed, and
   * end-of-stream must be returned otherwise.
   *
   * @return {number} Get the next token from the stream, or
   * end_of_stream.
   */
  read: function () {
    if (!this.tokens.length) return end_of_stream;
    return this.tokens.shift();
  },
  /**
   * When one or more tokens are prepended to a stream, those tokens
   * must be inserted, in given order, before the first token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The token(s) to prepend to the stream.
   */
  prepend: function (token) {
    if (Array.isArray(token)) {
      var tokens = /**@type {!Array.<number>}*/token;
      while (tokens.length) this.tokens.unshift(tokens.pop());
    } else {
      this.tokens.unshift(token);
    }
  },
  /**
   * When one or more tokens are pushed to a stream, those tokens
   * must be inserted, in given order, after the last token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The tokens(s) to prepend to the stream.
   */
  push: function (token) {
    if (Array.isArray(token)) {
      var tokens = /**@type {!Array.<number>}*/token;
      while (tokens.length) this.tokens.push(tokens.shift());
    } else {
      this.tokens.push(token);
    }
  }
};

//
// 4. Encodings
//

// 4.1 Encoders and decoders

/** @const */
var finished = -1;

/**
 * @param {boolean} fatal If true, decoding errors raise an exception.
 * @param {number=} opt_code_point Override the standard fallback code point.
 * @return {number} The code point to insert on a decoding error.
 */
function decoderError(fatal, opt_code_point) {
  if (fatal) throw TypeError('Decoder error');
  return opt_code_point || 0xFFFD;
}

/** @interface */
function Decoder() {}
Decoder.prototype = {
  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point, or |finished|.
   */
  handler: function (stream, bite) {}
};

/** @interface */
function Encoder() {}
Encoder.prototype = {
  /**
   * @param {Stream} stream The stream of code points being encoded.
   * @param {number} code_point Next code point read from the stream.
   * @return {(number|!Array.<number>)} Byte(s) to emit, or |finished|.
   */
  handler: function (stream, code_point) {}
};

//
// 7. API
//

/** @const */
var DEFAULT_ENCODING = 'utf-8';

// 7.1 Interface TextDecoder

/**
 * @constructor
 * @param {string=} encoding The label of the encoding;
 *     defaults to 'utf-8'.
 * @param {Object=} options
 */
function TextDecoder(encoding, options) {
  if (!(this instanceof TextDecoder)) {
    return new TextDecoder(encoding, options);
  }
  encoding = encoding !== undefined ? String(encoding).toLowerCase() : DEFAULT_ENCODING;
  if (encoding !== DEFAULT_ENCODING) {
    throw new Error('Encoding not supported. Only utf-8 is supported');
  }
  options = ToDictionary(options);

  /** @private @type {boolean} */
  this._streaming = false;
  /** @private @type {boolean} */
  this._BOMseen = false;
  /** @private @type {?Decoder} */
  this._decoder = null;
  /** @private @type {boolean} */
  this._fatal = Boolean(options['fatal']);
  /** @private @type {boolean} */
  this._ignoreBOM = Boolean(options['ignoreBOM']);
  Object.defineProperty(this, 'encoding', {
    value: 'utf-8'
  });
  Object.defineProperty(this, 'fatal', {
    value: this._fatal
  });
  Object.defineProperty(this, 'ignoreBOM', {
    value: this._ignoreBOM
  });
}
TextDecoder.prototype = {
  /**
   * @param {ArrayBufferView=} input The buffer of bytes to decode.
   * @param {Object=} options
   * @return {string} The decoded string.
   */
  decode: function decode(input, options) {
    var bytes;
    if (typeof input === 'object' && input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else if (typeof input === 'object' && 'buffer' in input && input.buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else {
      bytes = new Uint8Array(0);
    }
    options = ToDictionary(options);
    if (!this._streaming) {
      this._decoder = new UTF8Decoder({
        fatal: this._fatal
      });
      this._BOMseen = false;
    }
    this._streaming = Boolean(options['stream']);
    var input_stream = new Stream(bytes);
    var code_points = [];

    /** @type {?(number|!Array.<number>)} */
    var result;
    while (!input_stream.endOfStream()) {
      result = this._decoder.handler(input_stream, input_stream.read());
      if (result === finished) break;
      if (result === null) continue;
      if (Array.isArray(result)) code_points.push.apply(code_points, /**@type {!Array.<number>}*/result);else code_points.push(result);
    }
    if (!this._streaming) {
      do {
        result = this._decoder.handler(input_stream, input_stream.read());
        if (result === finished) break;
        if (result === null) continue;
        if (Array.isArray(result)) code_points.push.apply(code_points, /**@type {!Array.<number>}*/result);else code_points.push(result);
      } while (!input_stream.endOfStream());
      this._decoder = null;
    }
    if (code_points.length) {
      // If encoding is one of utf-8, utf-16be, and utf-16le, and
      // ignore BOM flag and BOM seen flag are unset, run these
      // subsubsteps:
      if (['utf-8'].indexOf(this.encoding) !== -1 && !this._ignoreBOM && !this._BOMseen) {
        // If token is U+FEFF, set BOM seen flag.
        if (code_points[0] === 0xFEFF) {
          this._BOMseen = true;
          code_points.shift();
        } else {
          // Otherwise, if token is not end-of-stream, set BOM seen
          // flag and append token to output.
          this._BOMseen = true;
        }
      }
    }
    return codePointsToString(code_points);
  }
};

// 7.2 Interface TextEncoder

/**
 * @constructor
 * @param {string=} encoding The label of the encoding;
 *     defaults to 'utf-8'.
 * @param {Object=} options
 */
function TextEncoder(encoding, options) {
  if (!(this instanceof TextEncoder)) return new TextEncoder(encoding, options);
  encoding = encoding !== undefined ? String(encoding).toLowerCase() : DEFAULT_ENCODING;
  if (encoding !== DEFAULT_ENCODING) {
    throw new Error('Encoding not supported. Only utf-8 is supported');
  }
  options = ToDictionary(options);

  /** @private @type {boolean} */
  this._streaming = false;
  /** @private @type {?Encoder} */
  this._encoder = null;
  /** @private @type {{fatal: boolean}} */
  this._options = {
    fatal: Boolean(options['fatal'])
  };
  Object.defineProperty(this, 'encoding', {
    value: 'utf-8'
  });
}
TextEncoder.prototype = {
  /**
   * @param {string=} opt_string The string to encode.
   * @param {Object=} options
   * @return {Uint8Array} Encoded bytes, as a Uint8Array.
   */
  encode: function encode(opt_string, options) {
    opt_string = opt_string ? String(opt_string) : '';
    options = ToDictionary(options);

    // NOTE: This option is nonstandard. None of the encodings
    // permitted for encoding (i.e. UTF-8, UTF-16) are stateful,
    // so streaming is not necessary.
    if (!this._streaming) this._encoder = new UTF8Encoder(this._options);
    this._streaming = Boolean(options['stream']);
    var bytes = [];
    var input_stream = new Stream(stringToCodePoints(opt_string));
    /** @type {?(number|!Array.<number>)} */
    var result;
    while (!input_stream.endOfStream()) {
      result = this._encoder.handler(input_stream, input_stream.read());
      if (result === finished) break;
      if (Array.isArray(result)) bytes.push.apply(bytes, /**@type {!Array.<number>}*/result);else bytes.push(result);
    }
    if (!this._streaming) {
      while (true) {
        result = this._encoder.handler(input_stream, input_stream.read());
        if (result === finished) break;
        if (Array.isArray(result)) bytes.push.apply(bytes, /**@type {!Array.<number>}*/result);else bytes.push(result);
      }
      this._encoder = null;
    }
    return new Uint8Array(bytes);
  }
};

//
// 8. The encoding
//

// 8.1 utf-8

/**
 * @constructor
 * @implements {Decoder}
 * @param {{fatal: boolean}} options
 */
function UTF8Decoder(options) {
  var fatal = options.fatal;

  // utf-8's decoder's has an associated utf-8 code point, utf-8
  // bytes seen, and utf-8 bytes needed (all initially 0), a utf-8
  // lower boundary (initially 0x80), and a utf-8 upper boundary
  // (initially 0xBF).
  var /** @type {number} */utf8_code_point = 0,
    /** @type {number} */utf8_bytes_seen = 0,
    /** @type {number} */utf8_bytes_needed = 0,
    /** @type {number} */utf8_lower_boundary = 0x80,
    /** @type {number} */utf8_upper_boundary = 0xBF;

  /**
   * @param {Stream} stream The stream of bytes being decoded.
   * @param {number} bite The next byte read from the stream.
   * @return {?(number|!Array.<number>)} The next code point(s)
   *     decoded, or null if not enough data exists in the input
   *     stream to decode a complete code point.
   */
  this.handler = function (stream, bite) {
    // 1. If byte is end-of-stream and utf-8 bytes needed is not 0,
    // set utf-8 bytes needed to 0 and return error.
    if (bite === end_of_stream && utf8_bytes_needed !== 0) {
      utf8_bytes_needed = 0;
      return decoderError(fatal);
    }

    // 2. If byte is end-of-stream, return finished.
    if (bite === end_of_stream) return finished;

    // 3. If utf-8 bytes needed is 0, based on byte:
    if (utf8_bytes_needed === 0) {
      // 0x00 to 0x7F
      if (inRange(bite, 0x00, 0x7F)) {
        // Return a code point whose value is byte.
        return bite;
      }

      // 0xC2 to 0xDF
      if (inRange(bite, 0xC2, 0xDF)) {
        // Set utf-8 bytes needed to 1 and utf-8 code point to byte
        // − 0xC0.
        utf8_bytes_needed = 1;
        utf8_code_point = bite - 0xC0;
      }

      // 0xE0 to 0xEF
      else if (inRange(bite, 0xE0, 0xEF)) {
        // 1. If byte is 0xE0, set utf-8 lower boundary to 0xA0.
        if (bite === 0xE0) utf8_lower_boundary = 0xA0;
        // 2. If byte is 0xED, set utf-8 upper boundary to 0x9F.
        if (bite === 0xED) utf8_upper_boundary = 0x9F;
        // 3. Set utf-8 bytes needed to 2 and utf-8 code point to
        // byte − 0xE0.
        utf8_bytes_needed = 2;
        utf8_code_point = bite - 0xE0;
      }

      // 0xF0 to 0xF4
      else if (inRange(bite, 0xF0, 0xF4)) {
        // 1. If byte is 0xF0, set utf-8 lower boundary to 0x90.
        if (bite === 0xF0) utf8_lower_boundary = 0x90;
        // 2. If byte is 0xF4, set utf-8 upper boundary to 0x8F.
        if (bite === 0xF4) utf8_upper_boundary = 0x8F;
        // 3. Set utf-8 bytes needed to 3 and utf-8 code point to
        // byte − 0xF0.
        utf8_bytes_needed = 3;
        utf8_code_point = bite - 0xF0;
      }

      // Otherwise
      else {
        // Return error.
        return decoderError(fatal);
      }

      // Then (byte is in the range 0xC2 to 0xF4) set utf-8 code
      // point to utf-8 code point << (6 × utf-8 bytes needed) and
      // return continue.
      utf8_code_point = utf8_code_point << 6 * utf8_bytes_needed;
      return null;
    }

    // 4. If byte is not in the range utf-8 lower boundary to utf-8
    // upper boundary, run these substeps:
    if (!inRange(bite, utf8_lower_boundary, utf8_upper_boundary)) {
      // 1. Set utf-8 code point, utf-8 bytes needed, and utf-8
      // bytes seen to 0, set utf-8 lower boundary to 0x80, and set
      // utf-8 upper boundary to 0xBF.
      utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;
      utf8_lower_boundary = 0x80;
      utf8_upper_boundary = 0xBF;

      // 2. Prepend byte to stream.
      stream.prepend(bite);

      // 3. Return error.
      return decoderError(fatal);
    }

    // 5. Set utf-8 lower boundary to 0x80 and utf-8 upper boundary
    // to 0xBF.
    utf8_lower_boundary = 0x80;
    utf8_upper_boundary = 0xBF;

    // 6. Increase utf-8 bytes seen by one and set utf-8 code point
    // to utf-8 code point + (byte − 0x80) << (6 × (utf-8 bytes
    // needed − utf-8 bytes seen)).
    utf8_bytes_seen += 1;
    utf8_code_point += bite - 0x80 << 6 * (utf8_bytes_needed - utf8_bytes_seen);

    // 7. If utf-8 bytes seen is not equal to utf-8 bytes needed,
    // continue.
    if (utf8_bytes_seen !== utf8_bytes_needed) return null;

    // 8. Let code point be utf-8 code point.
    var code_point = utf8_code_point;

    // 9. Set utf-8 code point, utf-8 bytes needed, and utf-8 bytes
    // seen to 0.
    utf8_code_point = utf8_bytes_needed = utf8_bytes_seen = 0;

    // 10. Return a code point whose value is code point.
    return code_point;
  };
}

/**
 * @constructor
 * @implements {Encoder}
 * @param {{fatal: boolean}} options
 */
function UTF8Encoder(options) {
  var fatal = options.fatal;
  /**
   * @param {Stream} stream Input stream.
   * @param {number} code_point Next code point read from the stream.
   * @return {(number|!Array.<number>)} Byte(s) to emit.
   */
  this.handler = function (stream, code_point) {
    // 1. If code point is end-of-stream, return finished.
    if (code_point === end_of_stream) return finished;

    // 2. If code point is in the range U+0000 to U+007F, return a
    // byte whose value is code point.
    if (inRange(code_point, 0x0000, 0x007f)) return code_point;

    // 3. Set count and offset based on the range code point is in:
    var count, offset;
    // U+0080 to U+07FF:    1 and 0xC0
    if (inRange(code_point, 0x0080, 0x07FF)) {
      count = 1;
      offset = 0xC0;
    }
    // U+0800 to U+FFFF:    2 and 0xE0
    else if (inRange(code_point, 0x0800, 0xFFFF)) {
      count = 2;
      offset = 0xE0;
    }
    // U+10000 to U+10FFFF: 3 and 0xF0
    else if (inRange(code_point, 0x10000, 0x10FFFF)) {
      count = 3;
      offset = 0xF0;
    }

    // 4.Let bytes be a byte sequence whose first byte is (code
    // point >> (6 × count)) + offset.
    var bytes = [(code_point >> 6 * count) + offset];

    // 5. Run these substeps while count is greater than 0:
    while (count > 0) {
      // 1. Set temp to code point >> (6 × (count − 1)).
      var temp = code_point >> 6 * (count - 1);

      // 2. Append to bytes 0x80 | (temp & 0x3F).
      bytes.push(0x80 | temp & 0x3F);

      // 3. Decrease count by one.
      count -= 1;
    }

    // 6. Return bytes bytes, in order.
    return bytes;
  };
}

},{}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "v1", {
  enumerable: true,
  get: function () {
    return _v.default;
  }
});
Object.defineProperty(exports, "v3", {
  enumerable: true,
  get: function () {
    return _v2.default;
  }
});
Object.defineProperty(exports, "v4", {
  enumerable: true,
  get: function () {
    return _v3.default;
  }
});
Object.defineProperty(exports, "v5", {
  enumerable: true,
  get: function () {
    return _v4.default;
  }
});
Object.defineProperty(exports, "NIL", {
  enumerable: true,
  get: function () {
    return _nil.default;
  }
});
Object.defineProperty(exports, "version", {
  enumerable: true,
  get: function () {
    return _version.default;
  }
});
Object.defineProperty(exports, "validate", {
  enumerable: true,
  get: function () {
    return _validate.default;
  }
});
Object.defineProperty(exports, "stringify", {
  enumerable: true,
  get: function () {
    return _stringify.default;
  }
});
Object.defineProperty(exports, "parse", {
  enumerable: true,
  get: function () {
    return _parse.default;
  }
});

var _v = _interopRequireDefault(require("./v1.js"));

var _v2 = _interopRequireDefault(require("./v3.js"));

var _v3 = _interopRequireDefault(require("./v4.js"));

var _v4 = _interopRequireDefault(require("./v5.js"));

var _nil = _interopRequireDefault(require("./nil.js"));

var _version = _interopRequireDefault(require("./version.js"));

var _validate = _interopRequireDefault(require("./validate.js"));

var _stringify = _interopRequireDefault(require("./stringify.js"));

var _parse = _interopRequireDefault(require("./parse.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
},{"./nil.js":40,"./parse.js":41,"./stringify.js":45,"./v1.js":46,"./v3.js":47,"./v4.js":49,"./v5.js":50,"./validate.js":51,"./version.js":52}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/*
 * Browser-compatible JavaScript MD5
 *
 * Modification of JavaScript MD5
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */
function md5(bytes) {
  if (typeof bytes === 'string') {
    const msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = new Uint8Array(msg.length);

    for (let i = 0; i < msg.length; ++i) {
      bytes[i] = msg.charCodeAt(i);
    }
  }

  return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
}
/*
 * Convert an array of little-endian words to an array of bytes
 */


function md5ToHexEncodedArray(input) {
  const output = [];
  const length32 = input.length * 32;
  const hexTab = '0123456789abcdef';

  for (let i = 0; i < length32; i += 8) {
    const x = input[i >> 5] >>> i % 32 & 0xff;
    const hex = parseInt(hexTab.charAt(x >>> 4 & 0x0f) + hexTab.charAt(x & 0x0f), 16);
    output.push(hex);
  }

  return output;
}
/**
 * Calculate output length with padding and bit length
 */


function getOutputLength(inputLength8) {
  return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
}
/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */


function wordsToMd5(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << len % 32;
  x[getOutputLength(len) - 1] = len;
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;
    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, x[i], 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  return [a, b, c, d];
}
/*
 * Convert an array bytes to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */


function bytesToWords(input) {
  if (input.length === 0) {
    return [];
  }

  const length8 = input.length * 8;
  const output = new Uint32Array(getOutputLength(length8));

  for (let i = 0; i < length8; i += 8) {
    output[i >> 5] |= (input[i / 8] & 0xff) << i % 32;
  }

  return output;
}
/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */


function safeAdd(x, y) {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return msw << 16 | lsw & 0xffff;
}
/*
 * Bitwise rotate a 32-bit number to the left.
 */


function bitRotateLeft(num, cnt) {
  return num << cnt | num >>> 32 - cnt;
}
/*
 * These functions implement the four basic operations the algorithm uses.
 */


function md5cmn(q, a, b, x, s, t) {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5ff(a, b, c, d, x, s, t) {
  return md5cmn(b & c | ~b & d, a, b, x, s, t);
}

function md5gg(a, b, c, d, x, s, t) {
  return md5cmn(b & d | c & ~d, a, b, x, s, t);
}

function md5hh(a, b, c, d, x, s, t) {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5ii(a, b, c, d, x, s, t) {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

var _default = md5;
exports.default = _default;
},{}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = '00000000-0000-0000-0000-000000000000';
exports.default = _default;
},{}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _validate = _interopRequireDefault(require("./validate.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parse(uuid) {
  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Invalid UUID');
  }

  let v;
  const arr = new Uint8Array(16); // Parse ########-....-....-....-............

  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  arr[1] = v >>> 16 & 0xff;
  arr[2] = v >>> 8 & 0xff;
  arr[3] = v & 0xff; // Parse ........-####-....-....-............

  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  arr[5] = v & 0xff; // Parse ........-....-####-....-............

  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  arr[7] = v & 0xff; // Parse ........-....-....-####-............

  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  arr[9] = v & 0xff; // Parse ........-....-....-....-############
  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
  arr[11] = v / 0x100000000 & 0xff;
  arr[12] = v >>> 24 & 0xff;
  arr[13] = v >>> 16 & 0xff;
  arr[14] = v >>> 8 & 0xff;
  arr[15] = v & 0xff;
  return arr;
}

var _default = parse;
exports.default = _default;
},{"./validate.js":51}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
exports.default = _default;
},{}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rng;
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).
let getRandomValues;
const rnds8 = new Uint8Array(16);

function rng() {
  // lazy load so that environments that need to polyfill have a chance to do so
  if (!getRandomValues) {
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
    // find the complete implementation of crypto (msCrypto) on IE11.
    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

    if (!getRandomValues) {
      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
    }
  }

  return getRandomValues(rnds8);
}
},{}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

// Adapted from Chris Veness' SHA1 code at
// http://www.movable-type.co.uk/scripts/sha1.html
function f(s, x, y, z) {
  switch (s) {
    case 0:
      return x & y ^ ~x & z;

    case 1:
      return x ^ y ^ z;

    case 2:
      return x & y ^ x & z ^ y & z;

    case 3:
      return x ^ y ^ z;
  }
}

function ROTL(x, n) {
  return x << n | x >>> 32 - n;
}

function sha1(bytes) {
  const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

  if (typeof bytes === 'string') {
    const msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = [];

    for (let i = 0; i < msg.length; ++i) {
      bytes.push(msg.charCodeAt(i));
    }
  } else if (!Array.isArray(bytes)) {
    // Convert Array-like to Array
    bytes = Array.prototype.slice.call(bytes);
  }

  bytes.push(0x80);
  const l = bytes.length / 4 + 2;
  const N = Math.ceil(l / 16);
  const M = new Array(N);

  for (let i = 0; i < N; ++i) {
    const arr = new Uint32Array(16);

    for (let j = 0; j < 16; ++j) {
      arr[j] = bytes[i * 64 + j * 4] << 24 | bytes[i * 64 + j * 4 + 1] << 16 | bytes[i * 64 + j * 4 + 2] << 8 | bytes[i * 64 + j * 4 + 3];
    }

    M[i] = arr;
  }

  M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
  M[N - 1][14] = Math.floor(M[N - 1][14]);
  M[N - 1][15] = (bytes.length - 1) * 8 & 0xffffffff;

  for (let i = 0; i < N; ++i) {
    const W = new Uint32Array(80);

    for (let t = 0; t < 16; ++t) {
      W[t] = M[i][t];
    }

    for (let t = 16; t < 80; ++t) {
      W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }

    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];

    for (let t = 0; t < 80; ++t) {
      const s = Math.floor(t / 20);
      const T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
      e = d;
      d = c;
      c = ROTL(b, 30) >>> 0;
      b = a;
      a = T;
    }

    H[0] = H[0] + a >>> 0;
    H[1] = H[1] + b >>> 0;
    H[2] = H[2] + c >>> 0;
    H[3] = H[3] + d >>> 0;
    H[4] = H[4] + e >>> 0;
  }

  return [H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff, H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff, H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff, H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff, H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff];
}

var _default = sha1;
exports.default = _default;
},{}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _validate = _interopRequireDefault(require("./validate.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

function stringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

var _default = stringify;
exports.default = _default;
},{"./validate.js":51}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _rng = _interopRequireDefault(require("./rng.js"));

var _stringify = _interopRequireDefault(require("./stringify.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html
let _nodeId;

let _clockseq; // Previous uuid creation time


let _lastMSecs = 0;
let _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

function v1(options, buf, offset) {
  let i = buf && offset || 0;
  const b = buf || new Array(16);
  options = options || {};
  let node = options.node || _nodeId;
  let clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    const seedBytes = options.random || (options.rng || _rng.default)();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  let msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  let nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  const tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (let n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf || (0, _stringify.default)(b);
}

var _default = v1;
exports.default = _default;
},{"./rng.js":43,"./stringify.js":45}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _v = _interopRequireDefault(require("./v35.js"));

var _md = _interopRequireDefault(require("./md5.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const v3 = (0, _v.default)('v3', 0x30, _md.default);
var _default = v3;
exports.default = _default;
},{"./md5.js":39,"./v35.js":48}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
exports.URL = exports.DNS = void 0;
var _stringify = _interopRequireDefault(require("./stringify.js"));
var _parse = _interopRequireDefault(require("./parse.js"));
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    default: obj
  };
}
function stringToBytes(str) {
  str = unescape(encodeURIComponent(str)); // UTF8 escape

  const bytes = [];
  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}
const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
exports.DNS = DNS;
const URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
exports.URL = URL;
function _default(name, version, hashfunc) {
  function generateUUID(value, namespace, buf, offset) {
    if (typeof value === 'string') {
      value = stringToBytes(value);
    }
    if (typeof namespace === 'string') {
      namespace = (0, _parse.default)(namespace);
    }
    if (namespace.length !== 16) {
      throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
    } // Compute hash of namespace and value, Per 4.3
    // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
    // hashfunc([...namespace, ... value])`

    let bytes = new Uint8Array(16 + value.length);
    bytes.set(namespace);
    bytes.set(value, namespace.length);
    bytes = hashfunc(bytes);
    bytes[6] = bytes[6] & 0x0f | version;
    bytes[8] = bytes[8] & 0x3f | 0x80;
    if (buf) {
      offset = offset || 0;
      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = bytes[i];
      }
      return buf;
    }
    return (0, _stringify.default)(bytes);
  } // Function#name is not settable on some platforms (#270)

  try {
    generateUUID.name = name; // eslint-disable-next-line no-empty
  } catch (err) {} // For CommonJS default export support

  generateUUID.DNS = DNS;
  generateUUID.URL = URL;
  return generateUUID;
}

},{"./parse.js":41,"./stringify.js":45}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _rng = _interopRequireDefault(require("./rng.js"));

var _stringify = _interopRequireDefault(require("./stringify.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function v4(options, buf, offset) {
  options = options || {};

  const rnds = options.random || (options.rng || _rng.default)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`


  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return (0, _stringify.default)(rnds);
}

var _default = v4;
exports.default = _default;
},{"./rng.js":43,"./stringify.js":45}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _v = _interopRequireDefault(require("./v35.js"));

var _sha = _interopRequireDefault(require("./sha1.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const v5 = (0, _v.default)('v5', 0x50, _sha.default);
var _default = v5;
exports.default = _default;
},{"./sha1.js":44,"./v35.js":48}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _regex = _interopRequireDefault(require("./regex.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function validate(uuid) {
  return typeof uuid === 'string' && _regex.default.test(uuid);
}

var _default = validate;
exports.default = _default;
},{"./regex.js":42}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _validate = _interopRequireDefault(require("./validate.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function version(uuid) {
  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Invalid UUID');
  }

  return parseInt(uuid.substr(14, 1), 16);
}

var _default = version;
exports.default = _default;
},{"./validate.js":51}],53:[function(require,module,exports){
'use strict';var _excluded=["commitment"],_excluded2=["encoding"],_excluded3=["commitment"],_excluded4=["commitment"];function _objectWithoutProperties(e,t){if(null==e)return{};var o,r,i=_objectWithoutPropertiesLoose(e,t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);for(r=0;r<n.length;r++)o=n[r],-1===t.indexOf(o)&&{}.propertyIsEnumerable.call(e,o)&&(i[o]=e[o]);}return i;}function _objectWithoutPropertiesLoose(r,e){if(null==r)return{};var t={};for(var n in r)if({}.hasOwnProperty.call(r,n)){if(-1!==e.indexOf(n))continue;t[n]=r[n];}return t;}function _superPropGet(t,o,e,r){var p=_get(_getPrototypeOf(1&r?t.prototype:t),o,e);return 2&r&&"function"==typeof p?function(t){return p.apply(e,t);}:p;}function _get(){return _get="undefined"!=typeof Reflect&&Reflect.get?Reflect.get.bind():function(e,t,r){var p=_superPropBase(e,t);if(p){var n=Object.getOwnPropertyDescriptor(p,t);return n.get?n.get.call(arguments.length<3?e:r):n.value;}},_get.apply(null,arguments);}function _superPropBase(t,o){for(;!{}.hasOwnProperty.call(t,o)&&null!==(t=_getPrototypeOf(t)););return t;}function ownKeys(e,r){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);r&&(o=o.filter(function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable;})),t.push.apply(t,o);}return t;}function _objectSpread(e){for(var r=1;r<arguments.length;r++){var t=null!=arguments[r]?arguments[r]:{};r%2?ownKeys(Object(t),!0).forEach(function(r){_defineProperty(e,r,t[r]);}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):ownKeys(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r));});}return e;}function _defineProperty(e,r,t){return(r=_toPropertyKey(r))in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t,e;}function _slicedToArray(r,e){return _arrayWithHoles(r)||_iterableToArrayLimit(r,e)||_unsupportedIterableToArray(r,e)||_nonIterableRest();}function _nonIterableRest(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");}function _iterableToArrayLimit(r,l){var t=null==r?null:"undefined"!=typeof Symbol&&r[Symbol.iterator]||r["@@iterator"];if(null!=t){var e,n,i,u,a=[],f=!0,o=!1;try{if(i=(t=t.call(r)).next,0===l){if(Object(t)!==t)return;f=!1;}else for(;!(f=(e=i.call(t)).done)&&(a.push(e.value),a.length!==l);f=!0);}catch(r){o=!0,n=r;}finally{try{if(!f&&null!=t["return"]&&(u=t["return"](),Object(u)!==u))return;}finally{if(o)throw n;}}return a;}}function _arrayWithHoles(r){if(Array.isArray(r))return r;}function _toConsumableArray(r){return _arrayWithoutHoles(r)||_iterableToArray(r)||_unsupportedIterableToArray(r)||_nonIterableSpread();}function _nonIterableSpread(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");}function _iterableToArray(r){if("undefined"!=typeof Symbol&&null!=r[Symbol.iterator]||null!=r["@@iterator"])return Array.from(r);}function _arrayWithoutHoles(r){if(Array.isArray(r))return _arrayLikeToArray(r);}function _createForOfIteratorHelper(r,e){var t="undefined"!=typeof Symbol&&r[Symbol.iterator]||r["@@iterator"];if(!t){if(Array.isArray(r)||(t=_unsupportedIterableToArray(r))||e&&r&&"number"==typeof r.length){t&&(r=t);var _n=0,F=function F(){};return{s:F,n:function n(){return _n>=r.length?{done:!0}:{done:!1,value:r[_n++]};},e:function e(r){throw r;},f:F};}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");}var o,a=!0,u=!1;return{s:function s(){t=t.call(r);},n:function n(){var r=t.next();return a=r.done,r;},e:function e(r){u=!0,o=r;},f:function f(){try{a||null==t["return"]||t["return"]();}finally{if(u)throw o;}}};}function _unsupportedIterableToArray(r,a){if(r){if("string"==typeof r)return _arrayLikeToArray(r,a);var t={}.toString.call(r).slice(8,-1);return"Object"===t&&r.constructor&&(t=r.constructor.name),"Map"===t||"Set"===t?Array.from(r):"Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?_arrayLikeToArray(r,a):void 0;}}function _arrayLikeToArray(r,a){(null==a||a>r.length)&&(a=r.length);for(var e=0,n=Array(a);e<a;e++)n[e]=r[e];return n;}function _readOnlyError(r){throw new TypeError('"'+r+'" is read-only');}function _wrapNativeSuper(t){var r="function"==typeof Map?new Map():void 0;return _wrapNativeSuper=function _wrapNativeSuper(t){if(null===t||!_isNativeFunction(t))return t;if("function"!=typeof t)throw new TypeError("Super expression must either be null or a function");if(void 0!==r){if(r.has(t))return r.get(t);r.set(t,Wrapper);}function Wrapper(){return _construct(t,arguments,_getPrototypeOf(this).constructor);}return Wrapper.prototype=Object.create(t.prototype,{constructor:{value:Wrapper,enumerable:!1,writable:!0,configurable:!0}}),_setPrototypeOf(Wrapper,t);},_wrapNativeSuper(t);}function _construct(t,e,r){if(_isNativeReflectConstruct())return Reflect.construct.apply(null,arguments);var o=[null];o.push.apply(o,e);var p=new(t.bind.apply(t,o))();return r&&_setPrototypeOf(p,r.prototype),p;}function _isNativeFunction(t){try{return-1!==Function.toString.call(t).indexOf("[native code]");}catch(n){return"function"==typeof t;}}function _regeneratorRuntime(){"use strict";/*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */_regeneratorRuntime=function _regeneratorRuntime(){return e;};var t,e={},r=Object.prototype,n=r.hasOwnProperty,o=Object.defineProperty||function(t,e,r){t[e]=r.value;},i="function"==typeof Symbol?Symbol:{},a=i.iterator||"@@iterator",c=i.asyncIterator||"@@asyncIterator",u=i.toStringTag||"@@toStringTag";function define(t,e,r){return Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}),t[e];}try{define({},"");}catch(t){define=function define(t,e,r){return t[e]=r;};}function wrap(t,e,r,n){var i=e&&e.prototype instanceof Generator?e:Generator,a=Object.create(i.prototype),c=new Context(n||[]);return o(a,"_invoke",{value:makeInvokeMethod(t,r,c)}),a;}function tryCatch(t,e,r){try{return{type:"normal",arg:t.call(e,r)};}catch(t){return{type:"throw",arg:t};}}e.wrap=wrap;var h="suspendedStart",l="suspendedYield",f="executing",s="completed",y={};function Generator(){}function GeneratorFunction(){}function GeneratorFunctionPrototype(){}var p={};define(p,a,function(){return this;});var d=Object.getPrototypeOf,v=d&&d(d(values([])));v&&v!==r&&n.call(v,a)&&(p=v);var g=GeneratorFunctionPrototype.prototype=Generator.prototype=Object.create(p);function defineIteratorMethods(t){["next","throw","return"].forEach(function(e){define(t,e,function(t){return this._invoke(e,t);});});}function AsyncIterator(t,e){function invoke(r,o,i,a){var c=tryCatch(t[r],t,o);if("throw"!==c.type){var u=c.arg,h=u.value;return h&&"object"==_typeof(h)&&n.call(h,"__await")?e.resolve(h.__await).then(function(t){invoke("next",t,i,a);},function(t){invoke("throw",t,i,a);}):e.resolve(h).then(function(t){u.value=t,i(u);},function(t){return invoke("throw",t,i,a);});}a(c.arg);}var r;o(this,"_invoke",{value:function value(t,n){function callInvokeWithMethodAndArg(){return new e(function(e,r){invoke(t,n,e,r);});}return r=r?r.then(callInvokeWithMethodAndArg,callInvokeWithMethodAndArg):callInvokeWithMethodAndArg();}});}function makeInvokeMethod(e,r,n){var o=h;return function(i,a){if(o===f)throw Error("Generator is already running");if(o===s){if("throw"===i)throw a;return{value:t,done:!0};}for(n.method=i,n.arg=a;;){var c=n.delegate;if(c){var u=maybeInvokeDelegate(c,n);if(u){if(u===y)continue;return u;}}if("next"===n.method)n.sent=n._sent=n.arg;else if("throw"===n.method){if(o===h)throw o=s,n.arg;n.dispatchException(n.arg);}else"return"===n.method&&n.abrupt("return",n.arg);o=f;var p=tryCatch(e,r,n);if("normal"===p.type){if(o=n.done?s:l,p.arg===y)continue;return{value:p.arg,done:n.done};}"throw"===p.type&&(o=s,n.method="throw",n.arg=p.arg);}};}function maybeInvokeDelegate(e,r){var n=r.method,o=e.iterator[n];if(o===t)return r.delegate=null,"throw"===n&&e.iterator["return"]&&(r.method="return",r.arg=t,maybeInvokeDelegate(e,r),"throw"===r.method)||"return"!==n&&(r.method="throw",r.arg=new TypeError("The iterator does not provide a '"+n+"' method")),y;var i=tryCatch(o,e.iterator,r.arg);if("throw"===i.type)return r.method="throw",r.arg=i.arg,r.delegate=null,y;var a=i.arg;return a?a.done?(r[e.resultName]=a.value,r.next=e.nextLoc,"return"!==r.method&&(r.method="next",r.arg=t),r.delegate=null,y):a:(r.method="throw",r.arg=new TypeError("iterator result is not an object"),r.delegate=null,y);}function pushTryEntry(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e);}function resetTryEntry(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e;}function Context(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(pushTryEntry,this),this.reset(!0);}function values(e){if(e||""===e){var r=e[a];if(r)return r.call(e);if("function"==typeof e.next)return e;if(!isNaN(e.length)){var o=-1,i=function next(){for(;++o<e.length;)if(n.call(e,o))return next.value=e[o],next.done=!1,next;return next.value=t,next.done=!0,next;};return i.next=i;}}throw new TypeError(_typeof(e)+" is not iterable");}return GeneratorFunction.prototype=GeneratorFunctionPrototype,o(g,"constructor",{value:GeneratorFunctionPrototype,configurable:!0}),o(GeneratorFunctionPrototype,"constructor",{value:GeneratorFunction,configurable:!0}),GeneratorFunction.displayName=define(GeneratorFunctionPrototype,u,"GeneratorFunction"),e.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return!!e&&(e===GeneratorFunction||"GeneratorFunction"===(e.displayName||e.name));},e.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,GeneratorFunctionPrototype):(t.__proto__=GeneratorFunctionPrototype,define(t,u,"GeneratorFunction")),t.prototype=Object.create(g),t;},e.awrap=function(t){return{__await:t};},defineIteratorMethods(AsyncIterator.prototype),define(AsyncIterator.prototype,c,function(){return this;}),e.AsyncIterator=AsyncIterator,e.async=function(t,r,n,o,i){void 0===i&&(i=Promise);var a=new AsyncIterator(wrap(t,r,n,o),i);return e.isGeneratorFunction(r)?a:a.next().then(function(t){return t.done?t.value:a.next();});},defineIteratorMethods(g),define(g,u,"Generator"),define(g,a,function(){return this;}),define(g,"toString",function(){return"[object Generator]";}),e.keys=function(t){var e=Object(t),r=[];for(var n in e)r.push(n);return r.reverse(),function next(){for(;r.length;){var t=r.pop();if(t in e)return next.value=t,next.done=!1,next;}return next.done=!0,next;};},e.values=values,Context.prototype={constructor:Context,reset:function reset(e){if(this.prev=0,this.next=0,this.sent=this._sent=t,this.done=!1,this.delegate=null,this.method="next",this.arg=t,this.tryEntries.forEach(resetTryEntry),!e)for(var r in this)"t"===r.charAt(0)&&n.call(this,r)&&!isNaN(+r.slice(1))&&(this[r]=t);},stop:function stop(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval;},dispatchException:function dispatchException(e){if(this.done)throw e;var r=this;function handle(n,o){return a.type="throw",a.arg=e,r.next=n,o&&(r.method="next",r.arg=t),!!o;}for(var o=this.tryEntries.length-1;o>=0;--o){var i=this.tryEntries[o],a=i.completion;if("root"===i.tryLoc)return handle("end");if(i.tryLoc<=this.prev){var c=n.call(i,"catchLoc"),u=n.call(i,"finallyLoc");if(c&&u){if(this.prev<i.catchLoc)return handle(i.catchLoc,!0);if(this.prev<i.finallyLoc)return handle(i.finallyLoc);}else if(c){if(this.prev<i.catchLoc)return handle(i.catchLoc,!0);}else{if(!u)throw Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return handle(i.finallyLoc);}}}},abrupt:function abrupt(t,e){for(var r=this.tryEntries.length-1;r>=0;--r){var o=this.tryEntries[r];if(o.tryLoc<=this.prev&&n.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var i=o;break;}}i&&("break"===t||"continue"===t)&&i.tryLoc<=e&&e<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=t,a.arg=e,i?(this.method="next",this.next=i.finallyLoc,y):this.complete(a);},complete:function complete(t,e){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),y;},finish:function finish(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.finallyLoc===t)return this.complete(r.completion,r.afterLoc),resetTryEntry(r),y;}},"catch":function _catch(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.tryLoc===t){var n=r.completion;if("throw"===n.type){var o=n.arg;resetTryEntry(r);}return o;}}throw Error("illegal catch attempt");},delegateYield:function delegateYield(e,r,n){return this.delegate={iterator:values(e),resultName:r,nextLoc:n},"next"===this.method&&(this.arg=t),y;}},e;}function asyncGeneratorStep(n,t,e,r,o,a,c){try{var i=n[a](c),u=i.value;}catch(n){return void e(n);}i.done?t(u):Promise.resolve(u).then(r,o);}function _asyncToGenerator(n){return function(){var t=this,e=arguments;return new Promise(function(r,o){var a=n.apply(t,e);function _next(n){asyncGeneratorStep(a,r,o,_next,_throw,"next",n);}function _throw(n){asyncGeneratorStep(a,r,o,_next,_throw,"throw",n);}_next(void 0);});};}function _callSuper(t,o,e){return o=_getPrototypeOf(o),_possibleConstructorReturn(t,_isNativeReflectConstruct()?Reflect.construct(o,e||[],_getPrototypeOf(t).constructor):o.apply(t,e));}function _possibleConstructorReturn(t,e){if(e&&("object"==_typeof(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return _assertThisInitialized(t);}function _assertThisInitialized(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e;}function _isNativeReflectConstruct(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}));}catch(t){}return(_isNativeReflectConstruct=function _isNativeReflectConstruct(){return!!t;})();}function _getPrototypeOf(t){return _getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t);},_getPrototypeOf(t);}function _inherits(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&_setPrototypeOf(t,e);}function _setPrototypeOf(t,e){return _setPrototypeOf=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t;},_setPrototypeOf(t,e);}function _classCallCheck(a,n){if(!(a instanceof n))throw new TypeError("Cannot call a class as a function");}function _defineProperties(e,r){for(var t=0;t<r.length;t++){var o=r[t];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,_toPropertyKey(o.key),o);}}function _createClass(e,r,t){return r&&_defineProperties(e.prototype,r),t&&_defineProperties(e,t),Object.defineProperty(e,"prototype",{writable:!1}),e;}function _toPropertyKey(t){var i=_toPrimitive(t,"string");return"symbol"==_typeof(i)?i:i+"";}function _toPrimitive(t,r){if("object"!=_typeof(t)||!t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var i=e.call(t,r||"default");if("object"!=_typeof(i))return i;throw new TypeError("@@toPrimitive must return a primitive value.");}return("string"===r?String:Number)(t);}function _typeof(o){"@babel/helpers - typeof";return _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(o){return typeof o;}:function(o){return o&&"function"==typeof Symbol&&o.constructor===Symbol&&o!==Symbol.prototype?"symbol":typeof o;},_typeof(o);}var buffer=require('buffer');var ed25519=require('@noble/curves/ed25519');var BN=require('bn.js');var bs58=require('bs58');var sha256=require('@noble/hashes/sha256');var borsh=require('borsh');var BufferLayout=require('@solana/buffer-layout');var bigintBuffer=require('bigint-buffer');var superstruct=require('superstruct');var RpcClient=require('jayson/lib/client/browser');var rpcWebsockets=require('rpc-websockets');var sha3=require('@noble/hashes/sha3');var secp256k1=require('@noble/curves/secp256k1');function _interopDefaultCompat(e){return e&&_typeof(e)==='object'&&'default'in e?e:{"default":e};}function _interopNamespaceCompat(e){if(e&&_typeof(e)==='object'&&'default'in e)return e;var n=Object.create(null);if(e){Object.keys(e).forEach(function(k){if(k!=='default'){var d=Object.getOwnPropertyDescriptor(e,k);Object.defineProperty(n,k,d.get?d:{enumerable:true,get:function get(){return e[k];}});}});}n["default"]=e;return Object.freeze(n);}var BN__default=/*#__PURE__*/_interopDefaultCompat(BN);var bs58__default=/*#__PURE__*/_interopDefaultCompat(bs58);var BufferLayout__namespace=/*#__PURE__*/_interopNamespaceCompat(BufferLayout);var RpcClient__default=/*#__PURE__*/_interopDefaultCompat(RpcClient);/**
 * A 64 byte secret key, the first 32 bytes of which is the
 * private scalar and the last 32 bytes is the public key.
 * Read more: https://blog.mozilla.org/warner/2011/11/29/ed25519-keys/
 *//**
 * Ed25519 Keypair
 */var generatePrivateKey=ed25519.ed25519.utils.randomPrivateKey;var generateKeypair=function generateKeypair(){var privateScalar=ed25519.ed25519.utils.randomPrivateKey();var publicKey=getPublicKey(privateScalar);var secretKey=new Uint8Array(64);secretKey.set(privateScalar);secretKey.set(publicKey,32);return{publicKey:publicKey,secretKey:secretKey};};var getPublicKey=ed25519.ed25519.getPublicKey;function _isOnCurve(publicKey){try{ed25519.ed25519.ExtendedPoint.fromHex(publicKey);return true;}catch(_unused){return false;}}var _sign=function sign(message,secretKey){return ed25519.ed25519.sign(message,secretKey.slice(0,32));};var verify=ed25519.ed25519.verify;var toBuffer=function toBuffer(arr){if(buffer.Buffer.isBuffer(arr)){return arr;}else if(arr instanceof Uint8Array){return buffer.Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength);}else{return buffer.Buffer.from(arr);}};// Class wrapping a plain object
var Struct=/*#__PURE__*/function(){function Struct(properties){_classCallCheck(this,Struct);Object.assign(this,properties);}return _createClass(Struct,[{key:"encode",value:function encode(){return buffer.Buffer.from(borsh.serialize(SOLANA_SCHEMA,this));}}],[{key:"decode",value:function decode(data){return borsh.deserialize(SOLANA_SCHEMA,this,data);}},{key:"decodeUnchecked",value:function decodeUnchecked(data){return borsh.deserializeUnchecked(SOLANA_SCHEMA,this,data);}}]);}();// Class representing a Rust-compatible enum, since enums are only strings or
// numbers in pure JS
var Enum=/*#__PURE__*/function(_Struct){function Enum(properties){var _this;_classCallCheck(this,Enum);_this=_callSuper(this,Enum,[properties]);_this["enum"]='';if(Object.keys(properties).length!==1){throw new Error('Enum can only take single value');}Object.keys(properties).map(function(key){_this["enum"]=key;});return _this;}_inherits(Enum,_Struct);return _createClass(Enum);}(Struct);var SOLANA_SCHEMA=new Map();var _PublicKey;/**
 * Maximum length of derived pubkey seed
 */var MAX_SEED_LENGTH=32;/**
 * Size of public key in bytes
 */var PUBLIC_KEY_LENGTH=32;/**
 * Value to be converted into public key
 *//**
 * JSON object representation of PublicKey class
 */function isPublicKeyData(value){return value._bn!==undefined;}// local counter used by PublicKey.unique()
var uniquePublicKeyCounter=1;/**
 * A public key
 */var PublicKey=/*#__PURE__*/function(_Struct2){/**
   * Create a new PublicKey object
   * @param value ed25519 public key as buffer or base-58 encoded string
   */function PublicKey(value){var _this2;_classCallCheck(this,PublicKey);_this2=_callSuper(this,PublicKey,[{}]);/** @internal */_this2._bn=void 0;if(isPublicKeyData(value)){_this2._bn=value._bn;}else{if(typeof value==='string'){// assume base 58 encoding by default
var decoded=bs58__default["default"].decode(value);if(decoded.length!=PUBLIC_KEY_LENGTH){throw new Error("Invalid public key input");}_this2._bn=new BN__default["default"](decoded);}else{_this2._bn=new BN__default["default"](value);}if(_this2._bn.byteLength()>PUBLIC_KEY_LENGTH){throw new Error("Invalid public key input");}}return _this2;}/**
   * Returns a unique PublicKey for tests and benchmarks using a counter
   */_inherits(PublicKey,_Struct2);return _createClass(PublicKey,[{key:"equals",value:/**
     * Default public key value. The base58-encoded string representation is all ones (as seen below)
     * The underlying BN number is 32 bytes that are all zeros
     *//**
     * Checks if two publicKeys are equal
     */function equals(publicKey){return this._bn.eq(publicKey._bn);}/**
     * Return the base-58 representation of the public key
     */},{key:"toBase58",value:function toBase58(){return bs58__default["default"].encode(this.toBytes());}},{key:"toJSON",value:function toJSON(){return this.toBase58();}/**
     * Return the byte array representation of the public key in big endian
     */},{key:"toBytes",value:function toBytes(){var buf=this.toBuffer();return new Uint8Array(buf.buffer,buf.byteOffset,buf.byteLength);}/**
     * Return the Buffer representation of the public key in big endian
     */},{key:"toBuffer",value:function toBuffer(){var b=this._bn.toArrayLike(buffer.Buffer);if(b.length===PUBLIC_KEY_LENGTH){return b;}var zeroPad=buffer.Buffer.alloc(32);b.copy(zeroPad,32-b.length);return zeroPad;}},{key:Symbol.toStringTag,get:function get(){return"PublicKey(".concat(this.toString(),")");}/**
     * Return the base-58 representation of the public key
     */},{key:"toString",value:function toString(){return this.toBase58();}/**
     * Derive a public key from another key, a seed, and a program ID.
     * The program ID will also serve as the owner of the public key, giving
     * it permission to write data to the account.
     *//* eslint-disable require-await */}],[{key:"unique",value:function unique(){var key=new PublicKey(uniquePublicKeyCounter);uniquePublicKeyCounter+=1;return new PublicKey(key.toBuffer());}},{key:"createWithSeed",value:function(){var _createWithSeed=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(fromPublicKey,seed,programId){var buffer$1,publicKeyBytes;return _regeneratorRuntime().wrap(function _callee$(_context){while(1)switch(_context.prev=_context.next){case 0:buffer$1=buffer.Buffer.concat([fromPublicKey.toBuffer(),buffer.Buffer.from(seed),programId.toBuffer()]);publicKeyBytes=sha256.sha256(buffer$1);return _context.abrupt("return",new PublicKey(publicKeyBytes));case 3:case"end":return _context.stop();}},_callee);}));function createWithSeed(_x,_x2,_x3){return _createWithSeed.apply(this,arguments);}return createWithSeed;}()/**
     * Derive a program address from seeds and a program ID.
     *//* eslint-disable require-await */},{key:"createProgramAddressSync",value:function createProgramAddressSync(seeds,programId){var buffer$1=buffer.Buffer.alloc(0);seeds.forEach(function(seed){if(seed.length>MAX_SEED_LENGTH){throw new TypeError("Max seed length exceeded");}buffer$1=buffer.Buffer.concat([buffer$1,toBuffer(seed)]);});buffer$1=buffer.Buffer.concat([buffer$1,programId.toBuffer(),buffer.Buffer.from('ProgramDerivedAddress')]);var publicKeyBytes=sha256.sha256(buffer$1);if(_isOnCurve(publicKeyBytes)){throw new Error("Invalid seeds, address must fall off the curve");}return new PublicKey(publicKeyBytes);}/**
     * Async version of createProgramAddressSync
     * For backwards compatibility
     *
     * @deprecated Use {@link createProgramAddressSync} instead
     *//* eslint-disable require-await */},{key:"createProgramAddress",value:function(){var _createProgramAddress=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2(seeds,programId){return _regeneratorRuntime().wrap(function _callee2$(_context2){while(1)switch(_context2.prev=_context2.next){case 0:return _context2.abrupt("return",this.createProgramAddressSync(seeds,programId));case 1:case"end":return _context2.stop();}},_callee2,this);}));function createProgramAddress(_x4,_x5){return _createProgramAddress.apply(this,arguments);}return createProgramAddress;}()/**
     * Find a valid program address
     *
     * Valid program addresses must fall off the ed25519 curve.  This function
     * iterates a nonce until it finds one that when combined with the seeds
     * results in a valid program address.
     */},{key:"findProgramAddressSync",value:function findProgramAddressSync(seeds,programId){var nonce=255;var address;while(nonce!=0){try{var seedsWithNonce=seeds.concat(buffer.Buffer.from([nonce]));address=this.createProgramAddressSync(seedsWithNonce,programId);}catch(err){if(err instanceof TypeError){throw err;}nonce--;continue;}return[address,nonce];}throw new Error("Unable to find a viable program address nonce");}/**
     * Async version of findProgramAddressSync
     * For backwards compatibility
     *
     * @deprecated Use {@link findProgramAddressSync} instead
     */},{key:"findProgramAddress",value:function(){var _findProgramAddress=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3(seeds,programId){return _regeneratorRuntime().wrap(function _callee3$(_context3){while(1)switch(_context3.prev=_context3.next){case 0:return _context3.abrupt("return",this.findProgramAddressSync(seeds,programId));case 1:case"end":return _context3.stop();}},_callee3,this);}));function findProgramAddress(_x6,_x7){return _findProgramAddress.apply(this,arguments);}return findProgramAddress;}()/**
     * Check that a pubkey is on the ed25519 curve.
     */},{key:"isOnCurve",value:function isOnCurve(pubkeyData){var pubkey=new PublicKey(pubkeyData);return _isOnCurve(pubkey.toBytes());}}]);}(Struct);_PublicKey=PublicKey;PublicKey["default"]=new _PublicKey('11111111111111111111111111111111');SOLANA_SCHEMA.set(PublicKey,{kind:'struct',fields:[['_bn','u256']]});/**
 * An account key pair (public and secret keys).
 *
 * @deprecated since v1.10.0, please use {@link Keypair} instead.
 */var Account=/*#__PURE__*/function(){/**
   * Create a new Account object
   *
   * If the secretKey parameter is not provided a new key pair is randomly
   * created for the account
   *
   * @param secretKey Secret key for the account
   */function Account(secretKey){_classCallCheck(this,Account);/** @internal */this._publicKey=void 0;/** @internal */this._secretKey=void 0;if(secretKey){var secretKeyBuffer=toBuffer(secretKey);if(secretKey.length!==64){throw new Error('bad secret key size');}this._publicKey=secretKeyBuffer.slice(32,64);this._secretKey=secretKeyBuffer.slice(0,32);}else{this._secretKey=toBuffer(generatePrivateKey());this._publicKey=toBuffer(getPublicKey(this._secretKey));}}/**
   * The public key for this account
   */return _createClass(Account,[{key:"publicKey",get:function get(){return new PublicKey(this._publicKey);}/**
     * The **unencrypted** secret key for this account. The first 32 bytes
     * is the private scalar and the last 32 bytes is the public key.
     * Read more: https://blog.mozilla.org/warner/2011/11/29/ed25519-keys/
     */},{key:"secretKey",get:function get(){return buffer.Buffer.concat([this._secretKey,this._publicKey],64);}}]);}();var BPF_LOADER_DEPRECATED_PROGRAM_ID=new PublicKey('BPFLoader1111111111111111111111111111111111');/**
 * Maximum over-the-wire size of a Transaction
 *
 * 1280 is IPv6 minimum MTU
 * 40 bytes is the size of the IPv6 header
 * 8 bytes is the size of the fragment header
 */var PACKET_DATA_SIZE=1280-40-8;var VERSION_PREFIX_MASK=0x7f;var SIGNATURE_LENGTH_IN_BYTES=64;var TransactionExpiredBlockheightExceededError=/*#__PURE__*/function(_Error){function TransactionExpiredBlockheightExceededError(signature){var _this3;_classCallCheck(this,TransactionExpiredBlockheightExceededError);_this3=_callSuper(this,TransactionExpiredBlockheightExceededError,["Signature ".concat(signature," has expired: block height exceeded.")]);_this3.signature=void 0;_this3.signature=signature;return _this3;}_inherits(TransactionExpiredBlockheightExceededError,_Error);return _createClass(TransactionExpiredBlockheightExceededError);}(/*#__PURE__*/_wrapNativeSuper(Error));Object.defineProperty(TransactionExpiredBlockheightExceededError.prototype,'name',{value:'TransactionExpiredBlockheightExceededError'});var TransactionExpiredTimeoutError=/*#__PURE__*/function(_Error2){function TransactionExpiredTimeoutError(signature,timeoutSeconds){var _this4;_classCallCheck(this,TransactionExpiredTimeoutError);_this4=_callSuper(this,TransactionExpiredTimeoutError,["Transaction was not confirmed in ".concat(timeoutSeconds.toFixed(2)," seconds. It is ")+'unknown if it succeeded or failed. Check signature '+"".concat(signature," using the Solana Explorer or CLI tools.")]);_this4.signature=void 0;_this4.signature=signature;return _this4;}_inherits(TransactionExpiredTimeoutError,_Error2);return _createClass(TransactionExpiredTimeoutError);}(/*#__PURE__*/_wrapNativeSuper(Error));Object.defineProperty(TransactionExpiredTimeoutError.prototype,'name',{value:'TransactionExpiredTimeoutError'});var TransactionExpiredNonceInvalidError=/*#__PURE__*/function(_Error3){function TransactionExpiredNonceInvalidError(signature){var _this5;_classCallCheck(this,TransactionExpiredNonceInvalidError);_this5=_callSuper(this,TransactionExpiredNonceInvalidError,["Signature ".concat(signature," has expired: the nonce is no longer valid.")]);_this5.signature=void 0;_this5.signature=signature;return _this5;}_inherits(TransactionExpiredNonceInvalidError,_Error3);return _createClass(TransactionExpiredNonceInvalidError);}(/*#__PURE__*/_wrapNativeSuper(Error));Object.defineProperty(TransactionExpiredNonceInvalidError.prototype,'name',{value:'TransactionExpiredNonceInvalidError'});var MessageAccountKeys=/*#__PURE__*/function(){function MessageAccountKeys(staticAccountKeys,accountKeysFromLookups){_classCallCheck(this,MessageAccountKeys);this.staticAccountKeys=void 0;this.accountKeysFromLookups=void 0;this.staticAccountKeys=staticAccountKeys;this.accountKeysFromLookups=accountKeysFromLookups;}return _createClass(MessageAccountKeys,[{key:"keySegments",value:function keySegments(){var keySegments=[this.staticAccountKeys];if(this.accountKeysFromLookups){keySegments.push(this.accountKeysFromLookups.writable);keySegments.push(this.accountKeysFromLookups.readonly);}return keySegments;}},{key:"get",value:function get(index){var _iterator=_createForOfIteratorHelper(this.keySegments()),_step;try{for(_iterator.s();!(_step=_iterator.n()).done;){var keySegment=_step.value;if(index<keySegment.length){return keySegment[index];}else{index-=keySegment.length;}}}catch(err){_iterator.e(err);}finally{_iterator.f();}return;}},{key:"length",get:function get(){return this.keySegments().flat().length;}},{key:"compileInstructions",value:function compileInstructions(instructions){// Bail early if any account indexes would overflow a u8
var U8_MAX=255;if(this.length>U8_MAX+1){throw new Error('Account index overflow encountered during compilation');}var keyIndexMap=new Map();this.keySegments().flat().forEach(function(key,index){keyIndexMap.set(key.toBase58(),index);});var findKeyIndex=function findKeyIndex(key){var keyIndex=keyIndexMap.get(key.toBase58());if(keyIndex===undefined)throw new Error('Encountered an unknown instruction account key during compilation');return keyIndex;};return instructions.map(function(instruction){return{programIdIndex:findKeyIndex(instruction.programId),accountKeyIndexes:instruction.keys.map(function(meta){return findKeyIndex(meta.pubkey);}),data:instruction.data};});}}]);}();/**
 * Layout for a public key
 */var publicKey=function publicKey(){var property=arguments.length>0&&arguments[0]!==undefined?arguments[0]:'publicKey';return BufferLayout__namespace.blob(32,property);};/**
 * Layout for a signature
 */var signature=function signature(){var property=arguments.length>0&&arguments[0]!==undefined?arguments[0]:'signature';return BufferLayout__namespace.blob(64,property);};/**
 * Layout for a Rust String type
 */var rustString=function rustString(){var property=arguments.length>0&&arguments[0]!==undefined?arguments[0]:'string';var rsl=BufferLayout__namespace.struct([BufferLayout__namespace.u32('length'),BufferLayout__namespace.u32('lengthPadding'),BufferLayout__namespace.blob(BufferLayout__namespace.offset(BufferLayout__namespace.u32(),-8),'chars')],property);var _decode=rsl.decode.bind(rsl);var _encode=rsl.encode.bind(rsl);var rslShim=rsl;rslShim.decode=function(b,offset){var data=_decode(b,offset);return data['chars'].toString();};rslShim.encode=function(str,b,offset){var data={chars:buffer.Buffer.from(str,'utf8')};return _encode(data,b,offset);};rslShim.alloc=function(str){return BufferLayout__namespace.u32().span+BufferLayout__namespace.u32().span+buffer.Buffer.from(str,'utf8').length;};return rslShim;};/**
 * Layout for an Authorized object
 */var authorized=function authorized(){var property=arguments.length>0&&arguments[0]!==undefined?arguments[0]:'authorized';return BufferLayout__namespace.struct([publicKey('staker'),publicKey('withdrawer')],property);};/**
 * Layout for a Lockup object
 */var lockup=function lockup(){var property=arguments.length>0&&arguments[0]!==undefined?arguments[0]:'lockup';return BufferLayout__namespace.struct([BufferLayout__namespace.ns64('unixTimestamp'),BufferLayout__namespace.ns64('epoch'),publicKey('custodian')],property);};/**
 *  Layout for a VoteInit object
 */var voteInit=function voteInit(){var property=arguments.length>0&&arguments[0]!==undefined?arguments[0]:'voteInit';return BufferLayout__namespace.struct([publicKey('nodePubkey'),publicKey('authorizedVoter'),publicKey('authorizedWithdrawer'),BufferLayout__namespace.u8('commission')],property);};/**
 *  Layout for a VoteAuthorizeWithSeedArgs object
 */var voteAuthorizeWithSeedArgs=function voteAuthorizeWithSeedArgs(){var property=arguments.length>0&&arguments[0]!==undefined?arguments[0]:'voteAuthorizeWithSeedArgs';return BufferLayout__namespace.struct([BufferLayout__namespace.u32('voteAuthorizationType'),publicKey('currentAuthorityDerivedKeyOwnerPubkey'),rustString('currentAuthorityDerivedKeySeed'),publicKey('newAuthorized')],property);};function getAlloc(type,fields){var _getItemAlloc=function getItemAlloc(item){if(item.span>=0){return item.span;}else if(typeof item.alloc==='function'){return item.alloc(fields[item.property]);}else if('count'in item&&'elementLayout'in item){var field=fields[item.property];if(Array.isArray(field)){return field.length*_getItemAlloc(item.elementLayout);}}else if('fields'in item){// This is a `Structure` whose size needs to be recursively measured.
return getAlloc({layout:item},fields[item.property]);}// Couldn't determine allocated size of layout
return 0;};var alloc=0;type.layout.fields.forEach(function(item){alloc+=_getItemAlloc(item);});return alloc;}function decodeLength(bytes){var len=0;var size=0;for(;;){var elem=bytes.shift();len|=(elem&0x7f)<<size*7;size+=1;if((elem&0x80)===0){break;}}return len;}function encodeLength(bytes,len){var rem_len=len;for(;;){var elem=rem_len&0x7f;rem_len>>=7;if(rem_len==0){bytes.push(elem);break;}else{elem|=0x80;bytes.push(elem);}}}function assert(condition,message){if(!condition){throw new Error(message||'Assertion failed');}}var CompiledKeys=/*#__PURE__*/function(){function CompiledKeys(payer,keyMetaMap){_classCallCheck(this,CompiledKeys);this.payer=void 0;this.keyMetaMap=void 0;this.payer=payer;this.keyMetaMap=keyMetaMap;}return _createClass(CompiledKeys,[{key:"getMessageComponents",value:function getMessageComponents(){var mapEntries=_toConsumableArray(this.keyMetaMap.entries());assert(mapEntries.length<=256,'Max static account keys length exceeded');var writableSigners=mapEntries.filter(function(_ref){var _ref2=_slicedToArray(_ref,2),meta=_ref2[1];return meta.isSigner&&meta.isWritable;});var readonlySigners=mapEntries.filter(function(_ref3){var _ref4=_slicedToArray(_ref3,2),meta=_ref4[1];return meta.isSigner&&!meta.isWritable;});var writableNonSigners=mapEntries.filter(function(_ref5){var _ref6=_slicedToArray(_ref5,2),meta=_ref6[1];return!meta.isSigner&&meta.isWritable;});var readonlyNonSigners=mapEntries.filter(function(_ref7){var _ref8=_slicedToArray(_ref7,2),meta=_ref8[1];return!meta.isSigner&&!meta.isWritable;});var header={numRequiredSignatures:writableSigners.length+readonlySigners.length,numReadonlySignedAccounts:readonlySigners.length,numReadonlyUnsignedAccounts:readonlyNonSigners.length};// sanity checks
{assert(writableSigners.length>0,'Expected at least one writable signer key');var _writableSigners$=_slicedToArray(writableSigners[0],1),payerAddress=_writableSigners$[0];assert(payerAddress===this.payer.toBase58(),'Expected first writable signer key to be the fee payer');}var staticAccountKeys=[].concat(_toConsumableArray(writableSigners.map(function(_ref9){var _ref10=_slicedToArray(_ref9,1),address=_ref10[0];return new PublicKey(address);})),_toConsumableArray(readonlySigners.map(function(_ref11){var _ref12=_slicedToArray(_ref11,1),address=_ref12[0];return new PublicKey(address);})),_toConsumableArray(writableNonSigners.map(function(_ref13){var _ref14=_slicedToArray(_ref13,1),address=_ref14[0];return new PublicKey(address);})),_toConsumableArray(readonlyNonSigners.map(function(_ref15){var _ref16=_slicedToArray(_ref15,1),address=_ref16[0];return new PublicKey(address);})));return[header,staticAccountKeys];}},{key:"extractTableLookup",value:function extractTableLookup(lookupTable){var _this$drainKeysFoundI=this.drainKeysFoundInLookupTable(lookupTable.state.addresses,function(keyMeta){return!keyMeta.isSigner&&!keyMeta.isInvoked&&keyMeta.isWritable;}),_this$drainKeysFoundI2=_slicedToArray(_this$drainKeysFoundI,2),writableIndexes=_this$drainKeysFoundI2[0],drainedWritableKeys=_this$drainKeysFoundI2[1];var _this$drainKeysFoundI3=this.drainKeysFoundInLookupTable(lookupTable.state.addresses,function(keyMeta){return!keyMeta.isSigner&&!keyMeta.isInvoked&&!keyMeta.isWritable;}),_this$drainKeysFoundI4=_slicedToArray(_this$drainKeysFoundI3,2),readonlyIndexes=_this$drainKeysFoundI4[0],drainedReadonlyKeys=_this$drainKeysFoundI4[1];// Don't extract lookup if no keys were found
if(writableIndexes.length===0&&readonlyIndexes.length===0){return;}return[{accountKey:lookupTable.key,writableIndexes:writableIndexes,readonlyIndexes:readonlyIndexes},{writable:drainedWritableKeys,readonly:drainedReadonlyKeys}];}/** @internal */},{key:"drainKeysFoundInLookupTable",value:function drainKeysFoundInLookupTable(lookupTableEntries,keyMetaFilter){var _this6=this;var lookupTableIndexes=new Array();var drainedKeys=new Array();var _iterator2=_createForOfIteratorHelper(this.keyMetaMap.entries()),_step2;try{var _loop=function _loop(){var _step2$value=_slicedToArray(_step2.value,2),address=_step2$value[0],keyMeta=_step2$value[1];if(keyMetaFilter(keyMeta)){var key=new PublicKey(address);var lookupTableIndex=lookupTableEntries.findIndex(function(entry){return entry.equals(key);});if(lookupTableIndex>=0){assert(lookupTableIndex<256,'Max lookup table index exceeded');lookupTableIndexes.push(lookupTableIndex);drainedKeys.push(key);_this6.keyMetaMap["delete"](address);}}};for(_iterator2.s();!(_step2=_iterator2.n()).done;){_loop();}}catch(err){_iterator2.e(err);}finally{_iterator2.f();}return[lookupTableIndexes,drainedKeys];}}],[{key:"compile",value:function compile(instructions,payer){var keyMetaMap=new Map();var getOrInsertDefault=function getOrInsertDefault(pubkey){var address=pubkey.toBase58();var keyMeta=keyMetaMap.get(address);if(keyMeta===undefined){keyMeta={isSigner:false,isWritable:false,isInvoked:false};keyMetaMap.set(address,keyMeta);}return keyMeta;};var payerKeyMeta=getOrInsertDefault(payer);payerKeyMeta.isSigner=true;payerKeyMeta.isWritable=true;var _iterator3=_createForOfIteratorHelper(instructions),_step3;try{for(_iterator3.s();!(_step3=_iterator3.n()).done;){var ix=_step3.value;getOrInsertDefault(ix.programId).isInvoked=true;var _iterator4=_createForOfIteratorHelper(ix.keys),_step4;try{for(_iterator4.s();!(_step4=_iterator4.n()).done;){var accountMeta=_step4.value;var keyMeta=getOrInsertDefault(accountMeta.pubkey);keyMeta.isSigner||(keyMeta.isSigner=accountMeta.isSigner);keyMeta.isWritable||(keyMeta.isWritable=accountMeta.isWritable);}}catch(err){_iterator4.e(err);}finally{_iterator4.f();}}}catch(err){_iterator3.e(err);}finally{_iterator3.f();}return new CompiledKeys(payer,keyMetaMap);}}]);}();var END_OF_BUFFER_ERROR_MESSAGE='Reached end of buffer unexpectedly';/**
 * Delegates to `Array#shift`, but throws if the array is zero-length.
 */function guardedShift(byteArray){if(byteArray.length===0){throw new Error(END_OF_BUFFER_ERROR_MESSAGE);}return byteArray.shift();}/**
 * Delegates to `Array#splice`, but throws if the section being spliced out extends past the end of
 * the array.
 */function guardedSplice(byteArray){var _args$;for(var _len=arguments.length,args=new Array(_len>1?_len-1:0),_key=1;_key<_len;_key++){args[_key-1]=arguments[_key];}var start=args[0];if(args.length===2// Implies that `deleteCount` was supplied
?start+((_args$=args[1])!==null&&_args$!==void 0?_args$:0)>byteArray.length:start>=byteArray.length){throw new Error(END_OF_BUFFER_ERROR_MESSAGE);}return byteArray.splice.apply(byteArray,args);}/**
 * An instruction to execute by a program
 *
 * @property {number} programIdIndex
 * @property {number[]} accounts
 * @property {string} data
 *//**
 * Message constructor arguments
 *//**
 * List of instructions to be processed atomically
 */var Message=/*#__PURE__*/function(){function Message(args){var _this7=this;_classCallCheck(this,Message);this.header=void 0;this.accountKeys=void 0;this.recentBlockhash=void 0;this.instructions=void 0;this.indexToProgramIds=new Map();this.header=args.header;this.accountKeys=args.accountKeys.map(function(account){return new PublicKey(account);});this.recentBlockhash=args.recentBlockhash;this.instructions=args.instructions;this.instructions.forEach(function(ix){return _this7.indexToProgramIds.set(ix.programIdIndex,_this7.accountKeys[ix.programIdIndex]);});}return _createClass(Message,[{key:"version",get:function get(){return'legacy';}},{key:"staticAccountKeys",get:function get(){return this.accountKeys;}},{key:"compiledInstructions",get:function get(){return this.instructions.map(function(ix){return{programIdIndex:ix.programIdIndex,accountKeyIndexes:ix.accounts,data:bs58__default["default"].decode(ix.data)};});}},{key:"addressTableLookups",get:function get(){return[];}},{key:"getAccountKeys",value:function getAccountKeys(){return new MessageAccountKeys(this.staticAccountKeys);}},{key:"isAccountSigner",value:function isAccountSigner(index){return index<this.header.numRequiredSignatures;}},{key:"isAccountWritable",value:function isAccountWritable(index){var numSignedAccounts=this.header.numRequiredSignatures;if(index>=this.header.numRequiredSignatures){var unsignedAccountIndex=index-numSignedAccounts;var numUnsignedAccounts=this.accountKeys.length-numSignedAccounts;var numWritableUnsignedAccounts=numUnsignedAccounts-this.header.numReadonlyUnsignedAccounts;return unsignedAccountIndex<numWritableUnsignedAccounts;}else{var numWritableSignedAccounts=numSignedAccounts-this.header.numReadonlySignedAccounts;return index<numWritableSignedAccounts;}}},{key:"isProgramId",value:function isProgramId(index){return this.indexToProgramIds.has(index);}},{key:"programIds",value:function programIds(){return _toConsumableArray(this.indexToProgramIds.values());}},{key:"nonProgramIds",value:function nonProgramIds(){var _this8=this;return this.accountKeys.filter(function(_,index){return!_this8.isProgramId(index);});}},{key:"serialize",value:function serialize(){var numKeys=this.accountKeys.length;var keyCount=[];encodeLength(keyCount,numKeys);var instructions=this.instructions.map(function(instruction){var accounts=instruction.accounts,programIdIndex=instruction.programIdIndex;var data=Array.from(bs58__default["default"].decode(instruction.data));var keyIndicesCount=[];encodeLength(keyIndicesCount,accounts.length);var dataCount=[];encodeLength(dataCount,data.length);return{programIdIndex:programIdIndex,keyIndicesCount:buffer.Buffer.from(keyIndicesCount),keyIndices:accounts,dataLength:buffer.Buffer.from(dataCount),data:data};});var instructionCount=[];encodeLength(instructionCount,instructions.length);var instructionBuffer=buffer.Buffer.alloc(PACKET_DATA_SIZE);buffer.Buffer.from(instructionCount).copy(instructionBuffer);var instructionBufferLength=instructionCount.length;instructions.forEach(function(instruction){var instructionLayout=BufferLayout__namespace.struct([BufferLayout__namespace.u8('programIdIndex'),BufferLayout__namespace.blob(instruction.keyIndicesCount.length,'keyIndicesCount'),BufferLayout__namespace.seq(BufferLayout__namespace.u8('keyIndex'),instruction.keyIndices.length,'keyIndices'),BufferLayout__namespace.blob(instruction.dataLength.length,'dataLength'),BufferLayout__namespace.seq(BufferLayout__namespace.u8('userdatum'),instruction.data.length,'data')]);var length=instructionLayout.encode(instruction,instructionBuffer,instructionBufferLength);instructionBufferLength+=length;});instructionBuffer=instructionBuffer.slice(0,instructionBufferLength);var signDataLayout=BufferLayout__namespace.struct([BufferLayout__namespace.blob(1,'numRequiredSignatures'),BufferLayout__namespace.blob(1,'numReadonlySignedAccounts'),BufferLayout__namespace.blob(1,'numReadonlyUnsignedAccounts'),BufferLayout__namespace.blob(keyCount.length,'keyCount'),BufferLayout__namespace.seq(publicKey('key'),numKeys,'keys'),publicKey('recentBlockhash')]);var transaction={numRequiredSignatures:buffer.Buffer.from([this.header.numRequiredSignatures]),numReadonlySignedAccounts:buffer.Buffer.from([this.header.numReadonlySignedAccounts]),numReadonlyUnsignedAccounts:buffer.Buffer.from([this.header.numReadonlyUnsignedAccounts]),keyCount:buffer.Buffer.from(keyCount),keys:this.accountKeys.map(function(key){return toBuffer(key.toBytes());}),recentBlockhash:bs58__default["default"].decode(this.recentBlockhash)};var signData=buffer.Buffer.alloc(2048);var length=signDataLayout.encode(transaction,signData);instructionBuffer.copy(signData,length);return signData.slice(0,length+instructionBuffer.length);}/**
     * Decode a compiled message into a Message object.
     */}],[{key:"compile",value:function compile(args){var compiledKeys=CompiledKeys.compile(args.instructions,args.payerKey);var _compiledKeys$getMess=compiledKeys.getMessageComponents(),_compiledKeys$getMess2=_slicedToArray(_compiledKeys$getMess,2),header=_compiledKeys$getMess2[0],staticAccountKeys=_compiledKeys$getMess2[1];var accountKeys=new MessageAccountKeys(staticAccountKeys);var instructions=accountKeys.compileInstructions(args.instructions).map(function(ix){return{programIdIndex:ix.programIdIndex,accounts:ix.accountKeyIndexes,data:bs58__default["default"].encode(ix.data)};});return new Message({header:header,accountKeys:staticAccountKeys,recentBlockhash:args.recentBlockhash,instructions:instructions});}},{key:"from",value:function from(buffer$1){// Slice up wire data
var byteArray=_toConsumableArray(buffer$1);var numRequiredSignatures=guardedShift(byteArray);if(numRequiredSignatures!==(numRequiredSignatures&VERSION_PREFIX_MASK)){throw new Error('Versioned messages must be deserialized with VersionedMessage.deserialize()');}var numReadonlySignedAccounts=guardedShift(byteArray);var numReadonlyUnsignedAccounts=guardedShift(byteArray);var accountCount=decodeLength(byteArray);var accountKeys=[];for(var i=0;i<accountCount;i++){var account=guardedSplice(byteArray,0,PUBLIC_KEY_LENGTH);accountKeys.push(new PublicKey(buffer.Buffer.from(account)));}var recentBlockhash=guardedSplice(byteArray,0,PUBLIC_KEY_LENGTH);var instructionCount=decodeLength(byteArray);var instructions=[];for(var _i=0;_i<instructionCount;_i++){var programIdIndex=guardedShift(byteArray);var _accountCount=decodeLength(byteArray);var accounts=guardedSplice(byteArray,0,_accountCount);var dataLength=decodeLength(byteArray);var dataSlice=guardedSplice(byteArray,0,dataLength);var data=bs58__default["default"].encode(buffer.Buffer.from(dataSlice));instructions.push({programIdIndex:programIdIndex,accounts:accounts,data:data});}var messageArgs={header:{numRequiredSignatures:numRequiredSignatures,numReadonlySignedAccounts:numReadonlySignedAccounts,numReadonlyUnsignedAccounts:numReadonlyUnsignedAccounts},recentBlockhash:bs58__default["default"].encode(buffer.Buffer.from(recentBlockhash)),accountKeys:accountKeys,instructions:instructions};return new Message(messageArgs);}}]);}();/**
 * Message constructor arguments
 */var MessageV0=/*#__PURE__*/function(){function MessageV0(args){_classCallCheck(this,MessageV0);this.header=void 0;this.staticAccountKeys=void 0;this.recentBlockhash=void 0;this.compiledInstructions=void 0;this.addressTableLookups=void 0;this.header=args.header;this.staticAccountKeys=args.staticAccountKeys;this.recentBlockhash=args.recentBlockhash;this.compiledInstructions=args.compiledInstructions;this.addressTableLookups=args.addressTableLookups;}return _createClass(MessageV0,[{key:"version",get:function get(){return 0;}},{key:"numAccountKeysFromLookups",get:function get(){var count=0;var _iterator5=_createForOfIteratorHelper(this.addressTableLookups),_step5;try{for(_iterator5.s();!(_step5=_iterator5.n()).done;){var lookup=_step5.value;count+=lookup.readonlyIndexes.length+lookup.writableIndexes.length;}}catch(err){_iterator5.e(err);}finally{_iterator5.f();}return count;}},{key:"getAccountKeys",value:function getAccountKeys(args){var accountKeysFromLookups;if(args&&'accountKeysFromLookups'in args&&args.accountKeysFromLookups){if(this.numAccountKeysFromLookups!=args.accountKeysFromLookups.writable.length+args.accountKeysFromLookups.readonly.length){throw new Error('Failed to get account keys because of a mismatch in the number of account keys from lookups');}accountKeysFromLookups=args.accountKeysFromLookups;}else if(args&&'addressLookupTableAccounts'in args&&args.addressLookupTableAccounts){accountKeysFromLookups=this.resolveAddressTableLookups(args.addressLookupTableAccounts);}else if(this.addressTableLookups.length>0){throw new Error('Failed to get account keys because address table lookups were not resolved');}return new MessageAccountKeys(this.staticAccountKeys,accountKeysFromLookups);}},{key:"isAccountSigner",value:function isAccountSigner(index){return index<this.header.numRequiredSignatures;}},{key:"isAccountWritable",value:function isAccountWritable(index){var numSignedAccounts=this.header.numRequiredSignatures;var numStaticAccountKeys=this.staticAccountKeys.length;if(index>=numStaticAccountKeys){var lookupAccountKeysIndex=index-numStaticAccountKeys;var numWritableLookupAccountKeys=this.addressTableLookups.reduce(function(count,lookup){return count+lookup.writableIndexes.length;},0);return lookupAccountKeysIndex<numWritableLookupAccountKeys;}else if(index>=this.header.numRequiredSignatures){var unsignedAccountIndex=index-numSignedAccounts;var numUnsignedAccounts=numStaticAccountKeys-numSignedAccounts;var numWritableUnsignedAccounts=numUnsignedAccounts-this.header.numReadonlyUnsignedAccounts;return unsignedAccountIndex<numWritableUnsignedAccounts;}else{var numWritableSignedAccounts=numSignedAccounts-this.header.numReadonlySignedAccounts;return index<numWritableSignedAccounts;}}},{key:"resolveAddressTableLookups",value:function resolveAddressTableLookups(addressLookupTableAccounts){var accountKeysFromLookups={writable:[],readonly:[]};var _iterator6=_createForOfIteratorHelper(this.addressTableLookups),_step6;try{var _loop2=function _loop2(){var tableLookup=_step6.value;var tableAccount=addressLookupTableAccounts.find(function(account){return account.key.equals(tableLookup.accountKey);});if(!tableAccount){throw new Error("Failed to find address lookup table account for table key ".concat(tableLookup.accountKey.toBase58()));}var _iterator7=_createForOfIteratorHelper(tableLookup.writableIndexes),_step7;try{for(_iterator7.s();!(_step7=_iterator7.n()).done;){var index=_step7.value;if(index<tableAccount.state.addresses.length){accountKeysFromLookups.writable.push(tableAccount.state.addresses[index]);}else{throw new Error("Failed to find address for index ".concat(index," in address lookup table ").concat(tableLookup.accountKey.toBase58()));}}}catch(err){_iterator7.e(err);}finally{_iterator7.f();}var _iterator8=_createForOfIteratorHelper(tableLookup.readonlyIndexes),_step8;try{for(_iterator8.s();!(_step8=_iterator8.n()).done;){var _index=_step8.value;if(_index<tableAccount.state.addresses.length){accountKeysFromLookups.readonly.push(tableAccount.state.addresses[_index]);}else{throw new Error("Failed to find address for index ".concat(_index," in address lookup table ").concat(tableLookup.accountKey.toBase58()));}}}catch(err){_iterator8.e(err);}finally{_iterator8.f();}};for(_iterator6.s();!(_step6=_iterator6.n()).done;){_loop2();}}catch(err){_iterator6.e(err);}finally{_iterator6.f();}return accountKeysFromLookups;}},{key:"serialize",value:function serialize(){var encodedStaticAccountKeysLength=Array();encodeLength(encodedStaticAccountKeysLength,this.staticAccountKeys.length);var serializedInstructions=this.serializeInstructions();var encodedInstructionsLength=Array();encodeLength(encodedInstructionsLength,this.compiledInstructions.length);var serializedAddressTableLookups=this.serializeAddressTableLookups();var encodedAddressTableLookupsLength=Array();encodeLength(encodedAddressTableLookupsLength,this.addressTableLookups.length);var messageLayout=BufferLayout__namespace.struct([BufferLayout__namespace.u8('prefix'),BufferLayout__namespace.struct([BufferLayout__namespace.u8('numRequiredSignatures'),BufferLayout__namespace.u8('numReadonlySignedAccounts'),BufferLayout__namespace.u8('numReadonlyUnsignedAccounts')],'header'),BufferLayout__namespace.blob(encodedStaticAccountKeysLength.length,'staticAccountKeysLength'),BufferLayout__namespace.seq(publicKey(),this.staticAccountKeys.length,'staticAccountKeys'),publicKey('recentBlockhash'),BufferLayout__namespace.blob(encodedInstructionsLength.length,'instructionsLength'),BufferLayout__namespace.blob(serializedInstructions.length,'serializedInstructions'),BufferLayout__namespace.blob(encodedAddressTableLookupsLength.length,'addressTableLookupsLength'),BufferLayout__namespace.blob(serializedAddressTableLookups.length,'serializedAddressTableLookups')]);var serializedMessage=new Uint8Array(PACKET_DATA_SIZE);var MESSAGE_VERSION_0_PREFIX=1<<7;var serializedMessageLength=messageLayout.encode({prefix:MESSAGE_VERSION_0_PREFIX,header:this.header,staticAccountKeysLength:new Uint8Array(encodedStaticAccountKeysLength),staticAccountKeys:this.staticAccountKeys.map(function(key){return key.toBytes();}),recentBlockhash:bs58__default["default"].decode(this.recentBlockhash),instructionsLength:new Uint8Array(encodedInstructionsLength),serializedInstructions:serializedInstructions,addressTableLookupsLength:new Uint8Array(encodedAddressTableLookupsLength),serializedAddressTableLookups:serializedAddressTableLookups},serializedMessage);return serializedMessage.slice(0,serializedMessageLength);}},{key:"serializeInstructions",value:function serializeInstructions(){var serializedLength=0;var serializedInstructions=new Uint8Array(PACKET_DATA_SIZE);var _iterator9=_createForOfIteratorHelper(this.compiledInstructions),_step9;try{for(_iterator9.s();!(_step9=_iterator9.n()).done;){var instruction=_step9.value;var encodedAccountKeyIndexesLength=Array();encodeLength(encodedAccountKeyIndexesLength,instruction.accountKeyIndexes.length);var encodedDataLength=Array();encodeLength(encodedDataLength,instruction.data.length);var instructionLayout=BufferLayout__namespace.struct([BufferLayout__namespace.u8('programIdIndex'),BufferLayout__namespace.blob(encodedAccountKeyIndexesLength.length,'encodedAccountKeyIndexesLength'),BufferLayout__namespace.seq(BufferLayout__namespace.u8(),instruction.accountKeyIndexes.length,'accountKeyIndexes'),BufferLayout__namespace.blob(encodedDataLength.length,'encodedDataLength'),BufferLayout__namespace.blob(instruction.data.length,'data')]);serializedLength+=instructionLayout.encode({programIdIndex:instruction.programIdIndex,encodedAccountKeyIndexesLength:new Uint8Array(encodedAccountKeyIndexesLength),accountKeyIndexes:instruction.accountKeyIndexes,encodedDataLength:new Uint8Array(encodedDataLength),data:instruction.data},serializedInstructions,serializedLength);}}catch(err){_iterator9.e(err);}finally{_iterator9.f();}return serializedInstructions.slice(0,serializedLength);}},{key:"serializeAddressTableLookups",value:function serializeAddressTableLookups(){var serializedLength=0;var serializedAddressTableLookups=new Uint8Array(PACKET_DATA_SIZE);var _iterator10=_createForOfIteratorHelper(this.addressTableLookups),_step10;try{for(_iterator10.s();!(_step10=_iterator10.n()).done;){var lookup=_step10.value;var encodedWritableIndexesLength=Array();encodeLength(encodedWritableIndexesLength,lookup.writableIndexes.length);var encodedReadonlyIndexesLength=Array();encodeLength(encodedReadonlyIndexesLength,lookup.readonlyIndexes.length);var addressTableLookupLayout=BufferLayout__namespace.struct([publicKey('accountKey'),BufferLayout__namespace.blob(encodedWritableIndexesLength.length,'encodedWritableIndexesLength'),BufferLayout__namespace.seq(BufferLayout__namespace.u8(),lookup.writableIndexes.length,'writableIndexes'),BufferLayout__namespace.blob(encodedReadonlyIndexesLength.length,'encodedReadonlyIndexesLength'),BufferLayout__namespace.seq(BufferLayout__namespace.u8(),lookup.readonlyIndexes.length,'readonlyIndexes')]);serializedLength+=addressTableLookupLayout.encode({accountKey:lookup.accountKey.toBytes(),encodedWritableIndexesLength:new Uint8Array(encodedWritableIndexesLength),writableIndexes:lookup.writableIndexes,encodedReadonlyIndexesLength:new Uint8Array(encodedReadonlyIndexesLength),readonlyIndexes:lookup.readonlyIndexes},serializedAddressTableLookups,serializedLength);}}catch(err){_iterator10.e(err);}finally{_iterator10.f();}return serializedAddressTableLookups.slice(0,serializedLength);}}],[{key:"compile",value:function compile(args){var compiledKeys=CompiledKeys.compile(args.instructions,args.payerKey);var addressTableLookups=new Array();var accountKeysFromLookups={writable:new Array(),readonly:new Array()};var lookupTableAccounts=args.addressLookupTableAccounts||[];var _iterator11=_createForOfIteratorHelper(lookupTableAccounts),_step11;try{for(_iterator11.s();!(_step11=_iterator11.n()).done;){var lookupTable=_step11.value;var extractResult=compiledKeys.extractTableLookup(lookupTable);if(extractResult!==undefined){var _accountKeysFromLooku,_accountKeysFromLooku2;var _extractResult=_slicedToArray(extractResult,2),addressTableLookup=_extractResult[0],_extractResult$=_extractResult[1],writable=_extractResult$.writable,readonly=_extractResult$.readonly;addressTableLookups.push(addressTableLookup);(_accountKeysFromLooku=accountKeysFromLookups.writable).push.apply(_accountKeysFromLooku,_toConsumableArray(writable));(_accountKeysFromLooku2=accountKeysFromLookups.readonly).push.apply(_accountKeysFromLooku2,_toConsumableArray(readonly));}}}catch(err){_iterator11.e(err);}finally{_iterator11.f();}var _compiledKeys$getMess3=compiledKeys.getMessageComponents(),_compiledKeys$getMess4=_slicedToArray(_compiledKeys$getMess3,2),header=_compiledKeys$getMess4[0],staticAccountKeys=_compiledKeys$getMess4[1];var accountKeys=new MessageAccountKeys(staticAccountKeys,accountKeysFromLookups);var compiledInstructions=accountKeys.compileInstructions(args.instructions);return new MessageV0({header:header,staticAccountKeys:staticAccountKeys,recentBlockhash:args.recentBlockhash,compiledInstructions:compiledInstructions,addressTableLookups:addressTableLookups});}},{key:"deserialize",value:function deserialize(serializedMessage){var byteArray=_toConsumableArray(serializedMessage);var prefix=guardedShift(byteArray);var maskedPrefix=prefix&VERSION_PREFIX_MASK;assert(prefix!==maskedPrefix,"Expected versioned message but received legacy message");var version=maskedPrefix;assert(version===0,"Expected versioned message with version 0 but found version ".concat(version));var header={numRequiredSignatures:guardedShift(byteArray),numReadonlySignedAccounts:guardedShift(byteArray),numReadonlyUnsignedAccounts:guardedShift(byteArray)};var staticAccountKeys=[];var staticAccountKeysLength=decodeLength(byteArray);for(var i=0;i<staticAccountKeysLength;i++){staticAccountKeys.push(new PublicKey(guardedSplice(byteArray,0,PUBLIC_KEY_LENGTH)));}var recentBlockhash=bs58__default["default"].encode(guardedSplice(byteArray,0,PUBLIC_KEY_LENGTH));var instructionCount=decodeLength(byteArray);var compiledInstructions=[];for(var _i2=0;_i2<instructionCount;_i2++){var programIdIndex=guardedShift(byteArray);var accountKeyIndexesLength=decodeLength(byteArray);var accountKeyIndexes=guardedSplice(byteArray,0,accountKeyIndexesLength);var dataLength=decodeLength(byteArray);var data=new Uint8Array(guardedSplice(byteArray,0,dataLength));compiledInstructions.push({programIdIndex:programIdIndex,accountKeyIndexes:accountKeyIndexes,data:data});}var addressTableLookupsCount=decodeLength(byteArray);var addressTableLookups=[];for(var _i3=0;_i3<addressTableLookupsCount;_i3++){var accountKey=new PublicKey(guardedSplice(byteArray,0,PUBLIC_KEY_LENGTH));var writableIndexesLength=decodeLength(byteArray);var writableIndexes=guardedSplice(byteArray,0,writableIndexesLength);var readonlyIndexesLength=decodeLength(byteArray);var readonlyIndexes=guardedSplice(byteArray,0,readonlyIndexesLength);addressTableLookups.push({accountKey:accountKey,writableIndexes:writableIndexes,readonlyIndexes:readonlyIndexes});}return new MessageV0({header:header,staticAccountKeys:staticAccountKeys,recentBlockhash:recentBlockhash,compiledInstructions:compiledInstructions,addressTableLookups:addressTableLookups});}}]);}();// eslint-disable-next-line no-redeclare
var VersionedMessage={deserializeMessageVersion:function deserializeMessageVersion(serializedMessage){var prefix=serializedMessage[0];var maskedPrefix=prefix&VERSION_PREFIX_MASK;// if the highest bit of the prefix is not set, the message is not versioned
if(maskedPrefix===prefix){return'legacy';}// the lower 7 bits of the prefix indicate the message version
return maskedPrefix;},deserialize:function deserialize(serializedMessage){var version=VersionedMessage.deserializeMessageVersion(serializedMessage);if(version==='legacy'){return Message.from(serializedMessage);}if(version===0){return MessageV0.deserialize(serializedMessage);}else{throw new Error("Transaction message version ".concat(version," deserialization is not supported"));}}};/** @internal *//**
 * Transaction signature as base-58 encoded string
 */var TransactionStatus=/*#__PURE__*/function(TransactionStatus){TransactionStatus[TransactionStatus["BLOCKHEIGHT_EXCEEDED"]=0]="BLOCKHEIGHT_EXCEEDED";TransactionStatus[TransactionStatus["PROCESSED"]=1]="PROCESSED";TransactionStatus[TransactionStatus["TIMED_OUT"]=2]="TIMED_OUT";TransactionStatus[TransactionStatus["NONCE_INVALID"]=3]="NONCE_INVALID";return TransactionStatus;}({});/**
 * Default (empty) signature
 */var DEFAULT_SIGNATURE=buffer.Buffer.alloc(SIGNATURE_LENGTH_IN_BYTES).fill(0);/**
 * Account metadata used to define instructions
 *//**
 * List of TransactionInstruction object fields that may be initialized at construction
 *//**
 * Configuration object for Transaction.serialize()
 *//**
 * @internal
 *//**
 * Transaction Instruction class
 */var TransactionInstruction=/*#__PURE__*/function(){function TransactionInstruction(opts){_classCallCheck(this,TransactionInstruction);/**
     * Public keys to include in this transaction
     * Boolean represents whether this pubkey needs to sign the transaction
     */this.keys=void 0;/**
     * Program Id to execute
     */this.programId=void 0;/**
     * Program input
     */this.data=buffer.Buffer.alloc(0);this.programId=opts.programId;this.keys=opts.keys;if(opts.data){this.data=opts.data;}}/**
   * @internal
   */return _createClass(TransactionInstruction,[{key:"toJSON",value:function toJSON(){return{keys:this.keys.map(function(_ref17){var pubkey=_ref17.pubkey,isSigner=_ref17.isSigner,isWritable=_ref17.isWritable;return{pubkey:pubkey.toJSON(),isSigner:isSigner,isWritable:isWritable};}),programId:this.programId.toJSON(),data:_toConsumableArray(this.data)};}}]);}();/**
 * Pair of signature and corresponding public key
 *//**
 * List of Transaction object fields that may be initialized at construction
 */// For backward compatibility; an unfortunate consequence of being
// forced to over-export types by the documentation generator.
// See https://github.com/solana-labs/solana/pull/25820
/**
 * Blockhash-based transactions have a lifetime that are defined by
 * the blockhash they include. Any transaction whose blockhash is
 * too old will be rejected.
 *//**
 * Use these options to construct a durable nonce transaction.
 *//**
 * Nonce information to be used to build an offline Transaction.
 *//**
 * @internal
 *//**
 * Transaction class
 */var Transaction=/*#__PURE__*/function(){/**
   * The transaction fee payer
   */// Construct a transaction with a blockhash and lastValidBlockHeight
// Construct a transaction using a durable nonce
/**
   * @deprecated `TransactionCtorFields` has been deprecated and will be removed in a future version.
   * Please supply a `TransactionBlockhashCtor` instead.
   *//**
   * Construct an empty Transaction
   */function Transaction(opts){_classCallCheck(this,Transaction);/**
     * Signatures for the transaction.  Typically created by invoking the
     * `sign()` method
     */this.signatures=[];this.feePayer=void 0;/**
     * The instructions to atomically execute
     */this.instructions=[];/**
     * A recent transaction id. Must be populated by the caller
     */this.recentBlockhash=void 0;/**
     * the last block chain can advance to before tx is declared expired
     * */this.lastValidBlockHeight=void 0;/**
     * Optional Nonce information. If populated, transaction will use a durable
     * Nonce hash instead of a recentBlockhash. Must be populated by the caller
     */this.nonceInfo=void 0;/**
     * If this is a nonce transaction this represents the minimum slot from which
     * to evaluate if the nonce has advanced when attempting to confirm the
     * transaction. This protects against a case where the transaction confirmation
     * logic loads the nonce account from an old slot and assumes the mismatch in
     * nonce value implies that the nonce has been advanced.
     */this.minNonceContextSlot=void 0;/**
     * @internal
     */this._message=void 0;/**
     * @internal
     */this._json=void 0;if(!opts){return;}if(opts.feePayer){this.feePayer=opts.feePayer;}if(opts.signatures){this.signatures=opts.signatures;}if(Object.prototype.hasOwnProperty.call(opts,'nonceInfo')){var minContextSlot=opts.minContextSlot,nonceInfo=opts.nonceInfo;this.minNonceContextSlot=minContextSlot;this.nonceInfo=nonceInfo;}else if(Object.prototype.hasOwnProperty.call(opts,'lastValidBlockHeight')){var blockhash=opts.blockhash,lastValidBlockHeight=opts.lastValidBlockHeight;this.recentBlockhash=blockhash;this.lastValidBlockHeight=lastValidBlockHeight;}else{var recentBlockhash=opts.recentBlockhash,_nonceInfo=opts.nonceInfo;if(_nonceInfo){this.nonceInfo=_nonceInfo;}this.recentBlockhash=recentBlockhash;}}/**
   * @internal
   */return _createClass(Transaction,[{key:"signature",get:/**
     * The first (payer) Transaction signature
     *
     * @returns {Buffer | null} Buffer of payer's signature
     */function get(){if(this.signatures.length>0){return this.signatures[0].signature;}return null;}},{key:"toJSON",value:function toJSON(){return{recentBlockhash:this.recentBlockhash||null,feePayer:this.feePayer?this.feePayer.toJSON():null,nonceInfo:this.nonceInfo?{nonce:this.nonceInfo.nonce,nonceInstruction:this.nonceInfo.nonceInstruction.toJSON()}:null,instructions:this.instructions.map(function(instruction){return instruction.toJSON();}),signers:this.signatures.map(function(_ref18){var publicKey=_ref18.publicKey;return publicKey.toJSON();})};}/**
     * Add one or more instructions to this Transaction
     *
     * @param {Array< Transaction | TransactionInstruction | TransactionInstructionCtorFields >} items - Instructions to add to the Transaction
     */},{key:"add",value:function add(){var _this9=this;for(var _len2=arguments.length,items=new Array(_len2),_key2=0;_key2<_len2;_key2++){items[_key2]=arguments[_key2];}if(items.length===0){throw new Error('No instructions');}items.forEach(function(item){if('instructions'in item){_this9.instructions=_this9.instructions.concat(item.instructions);}else if('data'in item&&'programId'in item&&'keys'in item){_this9.instructions.push(item);}else{_this9.instructions.push(new TransactionInstruction(item));}});return this;}/**
     * Compile transaction data
     */},{key:"compileMessage",value:function compileMessage(){if(this._message&&JSON.stringify(this.toJSON())===JSON.stringify(this._json)){return this._message;}var recentBlockhash;var instructions;if(this.nonceInfo){recentBlockhash=this.nonceInfo.nonce;if(this.instructions[0]!=this.nonceInfo.nonceInstruction){instructions=[this.nonceInfo.nonceInstruction].concat(_toConsumableArray(this.instructions));}else{instructions=this.instructions;}}else{recentBlockhash=this.recentBlockhash;instructions=this.instructions;}if(!recentBlockhash){throw new Error('Transaction recentBlockhash required');}if(instructions.length<1){console.warn('No instructions provided');}var feePayer;if(this.feePayer){feePayer=this.feePayer;}else if(this.signatures.length>0&&this.signatures[0].publicKey){// Use implicit fee payer
feePayer=this.signatures[0].publicKey;}else{throw new Error('Transaction fee payer required');}for(var i=0;i<instructions.length;i++){if(instructions[i].programId===undefined){throw new Error("Transaction instruction index ".concat(i," has undefined program id"));}}var programIds=[];var accountMetas=[];instructions.forEach(function(instruction){instruction.keys.forEach(function(accountMeta){accountMetas.push(_objectSpread({},accountMeta));});var programId=instruction.programId.toString();if(!programIds.includes(programId)){programIds.push(programId);}});// Append programID account metas
programIds.forEach(function(programId){accountMetas.push({pubkey:new PublicKey(programId),isSigner:false,isWritable:false});});// Cull duplicate account metas
var uniqueMetas=[];accountMetas.forEach(function(accountMeta){var pubkeyString=accountMeta.pubkey.toString();var uniqueIndex=uniqueMetas.findIndex(function(x){return x.pubkey.toString()===pubkeyString;});if(uniqueIndex>-1){uniqueMetas[uniqueIndex].isWritable=uniqueMetas[uniqueIndex].isWritable||accountMeta.isWritable;uniqueMetas[uniqueIndex].isSigner=uniqueMetas[uniqueIndex].isSigner||accountMeta.isSigner;}else{uniqueMetas.push(accountMeta);}});// Sort. Prioritizing first by signer, then by writable
uniqueMetas.sort(function(x,y){if(x.isSigner!==y.isSigner){// Signers always come before non-signers
return x.isSigner?-1:1;}if(x.isWritable!==y.isWritable){// Writable accounts always come before read-only accounts
return x.isWritable?-1:1;}// Otherwise, sort by pubkey, stringwise.
var options={localeMatcher:'best fit',usage:'sort',sensitivity:'variant',ignorePunctuation:false,numeric:false,caseFirst:'lower'};return x.pubkey.toBase58().localeCompare(y.pubkey.toBase58(),'en',options);});// Move fee payer to the front
var feePayerIndex=uniqueMetas.findIndex(function(x){return x.pubkey.equals(feePayer);});if(feePayerIndex>-1){var _uniqueMetas$splice=uniqueMetas.splice(feePayerIndex,1),_uniqueMetas$splice2=_slicedToArray(_uniqueMetas$splice,1),payerMeta=_uniqueMetas$splice2[0];payerMeta.isSigner=true;payerMeta.isWritable=true;uniqueMetas.unshift(payerMeta);}else{uniqueMetas.unshift({pubkey:feePayer,isSigner:true,isWritable:true});}// Disallow unknown signers
var _iterator12=_createForOfIteratorHelper(this.signatures),_step12;try{var _loop3=function _loop3(){var signature=_step12.value;var uniqueIndex=uniqueMetas.findIndex(function(x){return x.pubkey.equals(signature.publicKey);});if(uniqueIndex>-1){if(!uniqueMetas[uniqueIndex].isSigner){uniqueMetas[uniqueIndex].isSigner=true;console.warn('Transaction references a signature that is unnecessary, '+'only the fee payer and instruction signer accounts should sign a transaction. '+'This behavior is deprecated and will throw an error in the next major version release.');}}else{throw new Error("unknown signer: ".concat(signature.publicKey.toString()));}};for(_iterator12.s();!(_step12=_iterator12.n()).done;){_loop3();}}catch(err){_iterator12.e(err);}finally{_iterator12.f();}var numRequiredSignatures=0;var numReadonlySignedAccounts=0;var numReadonlyUnsignedAccounts=0;// Split out signing from non-signing keys and count header values
var signedKeys=[];var unsignedKeys=[];uniqueMetas.forEach(function(_ref19){var pubkey=_ref19.pubkey,isSigner=_ref19.isSigner,isWritable=_ref19.isWritable;if(isSigner){signedKeys.push(pubkey.toString());numRequiredSignatures+=1;if(!isWritable){numReadonlySignedAccounts+=1;}}else{unsignedKeys.push(pubkey.toString());if(!isWritable){numReadonlyUnsignedAccounts+=1;}}});var accountKeys=signedKeys.concat(unsignedKeys);var compiledInstructions=instructions.map(function(instruction){var data=instruction.data,programId=instruction.programId;return{programIdIndex:accountKeys.indexOf(programId.toString()),accounts:instruction.keys.map(function(meta){return accountKeys.indexOf(meta.pubkey.toString());}),data:bs58__default["default"].encode(data)};});compiledInstructions.forEach(function(instruction){assert(instruction.programIdIndex>=0);instruction.accounts.forEach(function(keyIndex){return assert(keyIndex>=0);});});return new Message({header:{numRequiredSignatures:numRequiredSignatures,numReadonlySignedAccounts:numReadonlySignedAccounts,numReadonlyUnsignedAccounts:numReadonlyUnsignedAccounts},accountKeys:accountKeys,recentBlockhash:recentBlockhash,instructions:compiledInstructions});}/**
     * @internal
     */},{key:"_compile",value:function _compile(){var message=this.compileMessage();var signedKeys=message.accountKeys.slice(0,message.header.numRequiredSignatures);if(this.signatures.length===signedKeys.length){var valid=this.signatures.every(function(pair,index){return signedKeys[index].equals(pair.publicKey);});if(valid)return message;}this.signatures=signedKeys.map(function(publicKey){return{signature:null,publicKey:publicKey};});return message;}/**
     * Get a buffer of the Transaction data that need to be covered by signatures
     */},{key:"serializeMessage",value:function serializeMessage(){return this._compile().serialize();}/**
     * Get the estimated fee associated with a transaction
     *
     * @param {Connection} connection Connection to RPC Endpoint.
     *
     * @returns {Promise<number | null>} The estimated fee for the transaction
     */},{key:"getEstimatedFee",value:function(){var _getEstimatedFee=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee4(connection){return _regeneratorRuntime().wrap(function _callee4$(_context4){while(1)switch(_context4.prev=_context4.next){case 0:_context4.next=2;return connection.getFeeForMessage(this.compileMessage());case 2:return _context4.abrupt("return",_context4.sent.value);case 3:case"end":return _context4.stop();}},_callee4,this);}));function getEstimatedFee(_x8){return _getEstimatedFee.apply(this,arguments);}return getEstimatedFee;}()/**
     * Specify the public keys which will be used to sign the Transaction.
     * The first signer will be used as the transaction fee payer account.
     *
     * Signatures can be added with either `partialSign` or `addSignature`
     *
     * @deprecated Deprecated since v0.84.0. Only the fee payer needs to be
     * specified and it can be set in the Transaction constructor or with the
     * `feePayer` property.
     */},{key:"setSigners",value:function setSigners(){for(var _len3=arguments.length,signers=new Array(_len3),_key3=0;_key3<_len3;_key3++){signers[_key3]=arguments[_key3];}if(signers.length===0){throw new Error('No signers');}var seen=new Set();this.signatures=signers.filter(function(publicKey){var key=publicKey.toString();if(seen.has(key)){return false;}else{seen.add(key);return true;}}).map(function(publicKey){return{signature:null,publicKey:publicKey};});}/**
     * Sign the Transaction with the specified signers. Multiple signatures may
     * be applied to a Transaction. The first signature is considered "primary"
     * and is used identify and confirm transactions.
     *
     * If the Transaction `feePayer` is not set, the first signer will be used
     * as the transaction fee payer account.
     *
     * Transaction fields should not be modified after the first call to `sign`,
     * as doing so may invalidate the signature and cause the Transaction to be
     * rejected.
     *
     * The Transaction must be assigned a valid `recentBlockhash` before invoking this method
     *
     * @param {Array<Signer>} signers Array of signers that will sign the transaction
     */},{key:"sign",value:function sign(){for(var _len4=arguments.length,signers=new Array(_len4),_key4=0;_key4<_len4;_key4++){signers[_key4]=arguments[_key4];}if(signers.length===0){throw new Error('No signers');}// Dedupe signers
var seen=new Set();var uniqueSigners=[];for(var _i4=0,_signers=signers;_i4<_signers.length;_i4++){var signer=_signers[_i4];var key=signer.publicKey.toString();if(seen.has(key)){continue;}else{seen.add(key);uniqueSigners.push(signer);}}this.signatures=uniqueSigners.map(function(signer){return{signature:null,publicKey:signer.publicKey};});var message=this._compile();this._partialSign.apply(this,[message].concat(uniqueSigners));}/**
     * Partially sign a transaction with the specified accounts. All accounts must
     * correspond to either the fee payer or a signer account in the transaction
     * instructions.
     *
     * All the caveats from the `sign` method apply to `partialSign`
     *
     * @param {Array<Signer>} signers Array of signers that will sign the transaction
     */},{key:"partialSign",value:function partialSign(){for(var _len5=arguments.length,signers=new Array(_len5),_key5=0;_key5<_len5;_key5++){signers[_key5]=arguments[_key5];}if(signers.length===0){throw new Error('No signers');}// Dedupe signers
var seen=new Set();var uniqueSigners=[];for(var _i5=0,_signers2=signers;_i5<_signers2.length;_i5++){var signer=_signers2[_i5];var key=signer.publicKey.toString();if(seen.has(key)){continue;}else{seen.add(key);uniqueSigners.push(signer);}}var message=this._compile();this._partialSign.apply(this,[message].concat(uniqueSigners));}/**
     * @internal
     */},{key:"_partialSign",value:function _partialSign(message){var _this10=this;var signData=message.serialize();for(var _len6=arguments.length,signers=new Array(_len6>1?_len6-1:0),_key6=1;_key6<_len6;_key6++){signers[_key6-1]=arguments[_key6];}signers.forEach(function(signer){var signature=_sign(signData,signer.secretKey);_this10._addSignature(signer.publicKey,toBuffer(signature));});}/**
     * Add an externally created signature to a transaction. The public key
     * must correspond to either the fee payer or a signer account in the transaction
     * instructions.
     *
     * @param {PublicKey} pubkey Public key that will be added to the transaction.
     * @param {Buffer} signature An externally created signature to add to the transaction.
     */},{key:"addSignature",value:function addSignature(pubkey,signature){this._compile();// Ensure signatures array is populated
this._addSignature(pubkey,signature);}/**
     * @internal
     */},{key:"_addSignature",value:function _addSignature(pubkey,signature){assert(signature.length===64);var index=this.signatures.findIndex(function(sigpair){return pubkey.equals(sigpair.publicKey);});if(index<0){throw new Error("unknown signer: ".concat(pubkey.toString()));}this.signatures[index].signature=buffer.Buffer.from(signature);}/**
     * Verify signatures of a Transaction
     * Optional parameter specifies if we're expecting a fully signed Transaction or a partially signed one.
     * If no boolean is provided, we expect a fully signed Transaction by default.
     *
     * @param {boolean} [requireAllSignatures=true] Require a fully signed Transaction
     */},{key:"verifySignatures",value:function verifySignatures(){var requireAllSignatures=arguments.length>0&&arguments[0]!==undefined?arguments[0]:true;var signatureErrors=this._getMessageSignednessErrors(this.serializeMessage(),requireAllSignatures);return!signatureErrors;}/**
     * @internal
     */},{key:"_getMessageSignednessErrors",value:function _getMessageSignednessErrors(message,requireAllSignatures){var errors={};var _iterator13=_createForOfIteratorHelper(this.signatures),_step13;try{for(_iterator13.s();!(_step13=_iterator13.n()).done;){var _step13$value=_step13.value,_signature=_step13$value.signature,_publicKey=_step13$value.publicKey;if(_signature===null){if(requireAllSignatures){(errors.missing||(errors.missing=[])).push(_publicKey);}}else{if(!verify(_signature,message,_publicKey.toBytes())){(errors.invalid||(errors.invalid=[])).push(_publicKey);}}}}catch(err){_iterator13.e(err);}finally{_iterator13.f();}return errors.invalid||errors.missing?errors:undefined;}/**
     * Serialize the Transaction in the wire format.
     *
     * @param {Buffer} [config] Config of transaction.
     *
     * @returns {Buffer} Signature of transaction in wire format.
     */},{key:"serialize",value:function serialize(config){var _Object$assign=Object.assign({requireAllSignatures:true,verifySignatures:true},config),requireAllSignatures=_Object$assign.requireAllSignatures,verifySignatures=_Object$assign.verifySignatures;var signData=this.serializeMessage();if(verifySignatures){var sigErrors=this._getMessageSignednessErrors(signData,requireAllSignatures);if(sigErrors){var errorMessage='Signature verification failed.';if(sigErrors.invalid){errorMessage+="\nInvalid signature for public key".concat(sigErrors.invalid.length===1?'':'(s)'," [`").concat(sigErrors.invalid.map(function(p){return p.toBase58();}).join('`, `'),"`].");}if(sigErrors.missing){errorMessage+="\nMissing signature for public key".concat(sigErrors.missing.length===1?'':'(s)'," [`").concat(sigErrors.missing.map(function(p){return p.toBase58();}).join('`, `'),"`].");}throw new Error(errorMessage);}}return this._serialize(signData);}/**
     * @internal
     */},{key:"_serialize",value:function _serialize(signData){var signatures=this.signatures;var signatureCount=[];encodeLength(signatureCount,signatures.length);var transactionLength=signatureCount.length+signatures.length*64+signData.length;var wireTransaction=buffer.Buffer.alloc(transactionLength);assert(signatures.length<256);buffer.Buffer.from(signatureCount).copy(wireTransaction,0);signatures.forEach(function(_ref20,index){var signature=_ref20.signature;if(signature!==null){assert(signature.length===64,"signature has invalid length");buffer.Buffer.from(signature).copy(wireTransaction,signatureCount.length+index*64);}});signData.copy(wireTransaction,signatureCount.length+signatures.length*64);assert(wireTransaction.length<=PACKET_DATA_SIZE,"Transaction too large: ".concat(wireTransaction.length," > ").concat(PACKET_DATA_SIZE));return wireTransaction;}/**
     * Deprecated method
     * @internal
     */},{key:"keys",get:function get(){assert(this.instructions.length===1);return this.instructions[0].keys.map(function(keyObj){return keyObj.pubkey;});}/**
     * Deprecated method
     * @internal
     */},{key:"programId",get:function get(){assert(this.instructions.length===1);return this.instructions[0].programId;}/**
     * Deprecated method
     * @internal
     */},{key:"data",get:function get(){assert(this.instructions.length===1);return this.instructions[0].data;}/**
     * Parse a wire transaction into a Transaction object.
     *
     * @param {Buffer | Uint8Array | Array<number>} buffer Signature of wire Transaction
     *
     * @returns {Transaction} Transaction associated with the signature
     */}],[{key:"from",value:function from(buffer$1){// Slice up wire data
var byteArray=_toConsumableArray(buffer$1);var signatureCount=decodeLength(byteArray);var signatures=[];for(var i=0;i<signatureCount;i++){var _signature2=guardedSplice(byteArray,0,SIGNATURE_LENGTH_IN_BYTES);signatures.push(bs58__default["default"].encode(buffer.Buffer.from(_signature2)));}return Transaction.populate(Message.from(byteArray),signatures);}/**
     * Populate Transaction object from message and signatures
     *
     * @param {Message} message Message of transaction
     * @param {Array<string>} signatures List of signatures to assign to the transaction
     *
     * @returns {Transaction} The populated Transaction
     */},{key:"populate",value:function populate(message){var signatures=arguments.length>1&&arguments[1]!==undefined?arguments[1]:[];var transaction=new Transaction();transaction.recentBlockhash=message.recentBlockhash;if(message.header.numRequiredSignatures>0){transaction.feePayer=message.accountKeys[0];}signatures.forEach(function(signature,index){var sigPubkeyPair={signature:signature==bs58__default["default"].encode(DEFAULT_SIGNATURE)?null:bs58__default["default"].decode(signature),publicKey:message.accountKeys[index]};transaction.signatures.push(sigPubkeyPair);});message.instructions.forEach(function(instruction){var keys=instruction.accounts.map(function(account){var pubkey=message.accountKeys[account];return{pubkey:pubkey,isSigner:transaction.signatures.some(function(keyObj){return keyObj.publicKey.toString()===pubkey.toString();})||message.isAccountSigner(account),isWritable:message.isAccountWritable(account)};});transaction.instructions.push(new TransactionInstruction({keys:keys,programId:message.accountKeys[instruction.programIdIndex],data:bs58__default["default"].decode(instruction.data)}));});transaction._message=message;transaction._json=transaction.toJSON();return transaction;}}]);}();var TransactionMessage=/*#__PURE__*/function(){function TransactionMessage(args){_classCallCheck(this,TransactionMessage);this.payerKey=void 0;this.instructions=void 0;this.recentBlockhash=void 0;this.payerKey=args.payerKey;this.instructions=args.instructions;this.recentBlockhash=args.recentBlockhash;}return _createClass(TransactionMessage,[{key:"compileToLegacyMessage",value:function compileToLegacyMessage(){return Message.compile({payerKey:this.payerKey,recentBlockhash:this.recentBlockhash,instructions:this.instructions});}},{key:"compileToV0Message",value:function compileToV0Message(addressLookupTableAccounts){return MessageV0.compile({payerKey:this.payerKey,recentBlockhash:this.recentBlockhash,instructions:this.instructions,addressLookupTableAccounts:addressLookupTableAccounts});}}],[{key:"decompile",value:function decompile(message,args){var header=message.header,compiledInstructions=message.compiledInstructions,recentBlockhash=message.recentBlockhash;var numRequiredSignatures=header.numRequiredSignatures,numReadonlySignedAccounts=header.numReadonlySignedAccounts,numReadonlyUnsignedAccounts=header.numReadonlyUnsignedAccounts;var numWritableSignedAccounts=numRequiredSignatures-numReadonlySignedAccounts;assert(numWritableSignedAccounts>0,'Message header is invalid');var numWritableUnsignedAccounts=message.staticAccountKeys.length-numRequiredSignatures-numReadonlyUnsignedAccounts;assert(numWritableUnsignedAccounts>=0,'Message header is invalid');var accountKeys=message.getAccountKeys(args);var payerKey=accountKeys.get(0);if(payerKey===undefined){throw new Error('Failed to decompile message because no account keys were found');}var instructions=[];var _iterator14=_createForOfIteratorHelper(compiledInstructions),_step14;try{for(_iterator14.s();!(_step14=_iterator14.n()).done;){var compiledIx=_step14.value;var keys=[];var _iterator15=_createForOfIteratorHelper(compiledIx.accountKeyIndexes),_step15;try{for(_iterator15.s();!(_step15=_iterator15.n()).done;){var keyIndex=_step15.value;var pubkey=accountKeys.get(keyIndex);if(pubkey===undefined){throw new Error("Failed to find key for account key index ".concat(keyIndex));}var isSigner=keyIndex<numRequiredSignatures;var isWritable=void 0;if(isSigner){isWritable=keyIndex<numWritableSignedAccounts;}else if(keyIndex<accountKeys.staticAccountKeys.length){isWritable=keyIndex-numRequiredSignatures<numWritableUnsignedAccounts;}else{isWritable=keyIndex-accountKeys.staticAccountKeys.length<// accountKeysFromLookups cannot be undefined because we already found a pubkey for this index above
accountKeys.accountKeysFromLookups.writable.length;}keys.push({pubkey:pubkey,isSigner:keyIndex<header.numRequiredSignatures,isWritable:isWritable});}}catch(err){_iterator15.e(err);}finally{_iterator15.f();}var programId=accountKeys.get(compiledIx.programIdIndex);if(programId===undefined){throw new Error("Failed to find program id for program id index ".concat(compiledIx.programIdIndex));}instructions.push(new TransactionInstruction({programId:programId,data:toBuffer(compiledIx.data),keys:keys}));}}catch(err){_iterator14.e(err);}finally{_iterator14.f();}return new TransactionMessage({payerKey:payerKey,instructions:instructions,recentBlockhash:recentBlockhash});}}]);}();/**
 * Versioned transaction class
 */var VersionedTransaction=/*#__PURE__*/function(){function VersionedTransaction(message,signatures){_classCallCheck(this,VersionedTransaction);this.signatures=void 0;this.message=void 0;if(signatures!==undefined){assert(signatures.length===message.header.numRequiredSignatures,'Expected signatures length to be equal to the number of required signatures');this.signatures=signatures;}else{var defaultSignatures=[];for(var i=0;i<message.header.numRequiredSignatures;i++){defaultSignatures.push(new Uint8Array(SIGNATURE_LENGTH_IN_BYTES));}this.signatures=defaultSignatures;}this.message=message;}return _createClass(VersionedTransaction,[{key:"version",get:function get(){return this.message.version;}},{key:"serialize",value:function serialize(){var serializedMessage=this.message.serialize();var encodedSignaturesLength=Array();encodeLength(encodedSignaturesLength,this.signatures.length);var transactionLayout=BufferLayout__namespace.struct([BufferLayout__namespace.blob(encodedSignaturesLength.length,'encodedSignaturesLength'),BufferLayout__namespace.seq(signature(),this.signatures.length,'signatures'),BufferLayout__namespace.blob(serializedMessage.length,'serializedMessage')]);var serializedTransaction=new Uint8Array(2048);var serializedTransactionLength=transactionLayout.encode({encodedSignaturesLength:new Uint8Array(encodedSignaturesLength),signatures:this.signatures,serializedMessage:serializedMessage},serializedTransaction);return serializedTransaction.slice(0,serializedTransactionLength);}},{key:"sign",value:function sign(signers){var _this11=this;var messageData=this.message.serialize();var signerPubkeys=this.message.staticAccountKeys.slice(0,this.message.header.numRequiredSignatures);var _iterator16=_createForOfIteratorHelper(signers),_step16;try{var _loop4=function _loop4(){var signer=_step16.value;var signerIndex=signerPubkeys.findIndex(function(pubkey){return pubkey.equals(signer.publicKey);});assert(signerIndex>=0,"Cannot sign with non signer key ".concat(signer.publicKey.toBase58()));_this11.signatures[signerIndex]=_sign(messageData,signer.secretKey);};for(_iterator16.s();!(_step16=_iterator16.n()).done;){_loop4();}}catch(err){_iterator16.e(err);}finally{_iterator16.f();}}},{key:"addSignature",value:function addSignature(publicKey,signature){assert(signature.byteLength===64,'Signature must be 64 bytes long');var signerPubkeys=this.message.staticAccountKeys.slice(0,this.message.header.numRequiredSignatures);var signerIndex=signerPubkeys.findIndex(function(pubkey){return pubkey.equals(publicKey);});assert(signerIndex>=0,"Can not add signature; `".concat(publicKey.toBase58(),"` is not required to sign this transaction"));this.signatures[signerIndex]=signature;}}],[{key:"deserialize",value:function deserialize(serializedTransaction){var byteArray=_toConsumableArray(serializedTransaction);var signatures=[];var signaturesLength=decodeLength(byteArray);for(var i=0;i<signaturesLength;i++){signatures.push(new Uint8Array(guardedSplice(byteArray,0,SIGNATURE_LENGTH_IN_BYTES)));}var message=VersionedMessage.deserialize(new Uint8Array(byteArray));return new VersionedTransaction(message,signatures);}}]);}();// TODO: These constants should be removed in favor of reading them out of a
// Syscall account
/**
 * @internal
 */var NUM_TICKS_PER_SECOND=160;/**
 * @internal
 */var DEFAULT_TICKS_PER_SLOT=64;/**
 * @internal
 */var NUM_SLOTS_PER_SECOND=NUM_TICKS_PER_SECOND/DEFAULT_TICKS_PER_SLOT;/**
 * @internal
 */var MS_PER_SLOT=1000/NUM_SLOTS_PER_SECOND;var SYSVAR_CLOCK_PUBKEY=new PublicKey('SysvarC1ock11111111111111111111111111111111');var SYSVAR_EPOCH_SCHEDULE_PUBKEY=new PublicKey('SysvarEpochSchedu1e111111111111111111111111');var SYSVAR_INSTRUCTIONS_PUBKEY=new PublicKey('Sysvar1nstructions1111111111111111111111111');var SYSVAR_RECENT_BLOCKHASHES_PUBKEY=new PublicKey('SysvarRecentB1ockHashes11111111111111111111');var SYSVAR_RENT_PUBKEY=new PublicKey('SysvarRent111111111111111111111111111111111');var SYSVAR_REWARDS_PUBKEY=new PublicKey('SysvarRewards111111111111111111111111111111');var SYSVAR_SLOT_HASHES_PUBKEY=new PublicKey('SysvarS1otHashes111111111111111111111111111');var SYSVAR_SLOT_HISTORY_PUBKEY=new PublicKey('SysvarS1otHistory11111111111111111111111111');var SYSVAR_STAKE_HISTORY_PUBKEY=new PublicKey('SysvarStakeHistory1111111111111111111111111');var SendTransactionError=/*#__PURE__*/function(_Error4){function SendTransactionError(_ref21){var _this12;var action=_ref21.action,signature=_ref21.signature,transactionMessage=_ref21.transactionMessage,logs=_ref21.logs;_classCallCheck(this,SendTransactionError);var maybeLogsOutput=logs?"Logs: \n".concat(JSON.stringify(logs.slice(-10),null,2),". "):'';var guideText='\nCatch the `SendTransactionError` and call `getLogs()` on it for full details.';var message;switch(action){case'send':message="Transaction ".concat(signature," resulted in an error. \n")+"".concat(transactionMessage,". ")+maybeLogsOutput+guideText;break;case'simulate':message="Simulation failed. \nMessage: ".concat(transactionMessage,". \n")+maybeLogsOutput+guideText;break;default:{message="Unknown action '".concat(function(a){return a;}(action),"'");}}_this12=_callSuper(this,SendTransactionError,[message]);_this12.signature=void 0;_this12.transactionMessage=void 0;_this12.transactionLogs=void 0;_this12.signature=signature;_this12.transactionMessage=transactionMessage;_this12.transactionLogs=logs?logs:undefined;return _this12;}_inherits(SendTransactionError,_Error4);return _createClass(SendTransactionError,[{key:"transactionError",get:function get(){return{message:this.transactionMessage,logs:Array.isArray(this.transactionLogs)?this.transactionLogs:undefined};}/* @deprecated Use `await getLogs()` instead */},{key:"logs",get:function get(){var cachedLogs=this.transactionLogs;if(cachedLogs!=null&&_typeof(cachedLogs)==='object'&&'then'in cachedLogs){return undefined;}return cachedLogs;}},{key:"getLogs",value:function(){var _getLogs=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee5(connection){var _this13=this;return _regeneratorRuntime().wrap(function _callee5$(_context5){while(1)switch(_context5.prev=_context5.next){case 0:if(!Array.isArray(this.transactionLogs)){this.transactionLogs=new Promise(function(resolve,reject){connection.getTransaction(_this13.signature).then(function(tx){if(tx&&tx.meta&&tx.meta.logMessages){var logs=tx.meta.logMessages;_this13.transactionLogs=logs;resolve(logs);}else{reject(new Error('Log messages not found'));}})["catch"](reject);});}_context5.next=3;return this.transactionLogs;case 3:return _context5.abrupt("return",_context5.sent);case 4:case"end":return _context5.stop();}},_callee5,this);}));function getLogs(_x9){return _getLogs.apply(this,arguments);}return getLogs;}()}]);}(/*#__PURE__*/_wrapNativeSuper(Error));// Keep in sync with client/src/rpc_custom_errors.rs
// Typescript `enums` thwart tree-shaking. See https://bargsten.org/jsts/enums/
var SolanaJSONRPCErrorCode={JSON_RPC_SERVER_ERROR_BLOCK_CLEANED_UP:-32001,JSON_RPC_SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE:-32002,JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE:-32003,JSON_RPC_SERVER_ERROR_BLOCK_NOT_AVAILABLE:-32004,JSON_RPC_SERVER_ERROR_NODE_UNHEALTHY:-32005,JSON_RPC_SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE:-32006,JSON_RPC_SERVER_ERROR_SLOT_SKIPPED:-32007,JSON_RPC_SERVER_ERROR_NO_SNAPSHOT:-32008,JSON_RPC_SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED:-32009,JSON_RPC_SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX:-32010,JSON_RPC_SERVER_ERROR_TRANSACTION_HISTORY_NOT_AVAILABLE:-32011,JSON_RPC_SCAN_ERROR:-32012,JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH:-32013,JSON_RPC_SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET:-32014,JSON_RPC_SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION:-32015,JSON_RPC_SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED:-32016};var SolanaJSONRPCError=/*#__PURE__*/function(_Error5){function SolanaJSONRPCError(_ref22,customMessage){var _this14;var code=_ref22.code,message=_ref22.message,data=_ref22.data;_classCallCheck(this,SolanaJSONRPCError);_this14=_callSuper(this,SolanaJSONRPCError,[customMessage!=null?"".concat(customMessage,": ").concat(message):message]);_this14.code=void 0;_this14.data=void 0;_this14.code=code;_this14.data=data;_this14.name='SolanaJSONRPCError';return _this14;}_inherits(SolanaJSONRPCError,_Error5);return _createClass(SolanaJSONRPCError);}(/*#__PURE__*/_wrapNativeSuper(Error));/**
 * Sign, send and confirm a transaction.
 *
 * If `commitment` option is not specified, defaults to 'max' commitment.
 *
 * @param {Connection} connection
 * @param {Transaction} transaction
 * @param {Array<Signer>} signers
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 */function sendAndConfirmTransaction(_x10,_x11,_x12,_x13){return _sendAndConfirmTransaction.apply(this,arguments);}// zzz
function _sendAndConfirmTransaction(){_sendAndConfirmTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee110(connection,transaction,signers,options){var sendOptions,signature,status,nonceInstruction,nonceAccountPubkey;return _regeneratorRuntime().wrap(function _callee110$(_context110){while(1)switch(_context110.prev=_context110.next){case 0:sendOptions=options&&{skipPreflight:options.skipPreflight,preflightCommitment:options.preflightCommitment||options.commitment,maxRetries:options.maxRetries,minContextSlot:options.minContextSlot};_context110.next=3;return connection.sendTransaction(transaction,signers,sendOptions);case 3:signature=_context110.sent;if(!(transaction.recentBlockhash!=null&&transaction.lastValidBlockHeight!=null)){_context110.next=10;break;}_context110.next=7;return connection.confirmTransaction({abortSignal:options===null||options===void 0?void 0:options.abortSignal,signature:signature,blockhash:transaction.recentBlockhash,lastValidBlockHeight:transaction.lastValidBlockHeight},options&&options.commitment);case 7:status=_context110.sent.value;_context110.next=22;break;case 10:if(!(transaction.minNonceContextSlot!=null&&transaction.nonceInfo!=null)){_context110.next=18;break;}nonceInstruction=transaction.nonceInfo.nonceInstruction;nonceAccountPubkey=nonceInstruction.keys[0].pubkey;_context110.next=15;return connection.confirmTransaction({abortSignal:options===null||options===void 0?void 0:options.abortSignal,minContextSlot:transaction.minNonceContextSlot,nonceAccountPubkey:nonceAccountPubkey,nonceValue:transaction.nonceInfo.nonce,signature:signature},options&&options.commitment);case 15:status=_context110.sent.value;_context110.next=22;break;case 18:if((options===null||options===void 0?void 0:options.abortSignal)!=null){console.warn('sendAndConfirmTransaction(): A transaction with a deprecated confirmation strategy was '+'supplied along with an `abortSignal`. Only transactions having `lastValidBlockHeight` '+'or a combination of `nonceInfo` and `minNonceContextSlot` are abortable.');}_context110.next=21;return connection.confirmTransaction(signature,options&&options.commitment);case 21:status=_context110.sent.value;case 22:if(!status.err){_context110.next=26;break;}if(!(signature!=null)){_context110.next=25;break;}throw new SendTransactionError({action:'send',signature:signature,transactionMessage:"Status: (".concat(JSON.stringify(status),")")});case 25:throw new Error("Transaction ".concat(signature," failed (").concat(JSON.stringify(status),")"));case 26:return _context110.abrupt("return",signature);case 27:case"end":return _context110.stop();}},_callee110);}));return _sendAndConfirmTransaction.apply(this,arguments);}function sleep(ms){return new Promise(function(resolve){return setTimeout(resolve,ms);});}/**
 * @internal
 *//**
 * Populate a buffer of instruction data using an InstructionType
 * @internal
 */function encodeData(type,fields){var allocLength=type.layout.span>=0?type.layout.span:getAlloc(type,fields);var data=buffer.Buffer.alloc(allocLength);var layoutFields=Object.assign({instruction:type.index},fields);type.layout.encode(layoutFields,data);return data;}/**
 * Decode instruction data buffer using an InstructionType
 * @internal
 */function decodeData$1(type,buffer){var data;try{data=type.layout.decode(buffer);}catch(err){throw new Error('invalid instruction; '+err);}if(data.instruction!==type.index){throw new Error("invalid instruction; instruction index mismatch ".concat(data.instruction," != ").concat(type.index));}return data;}/**
 * https://github.com/solana-labs/solana/blob/90bedd7e067b5b8f3ddbb45da00a4e9cabb22c62/sdk/src/fee_calculator.rs#L7-L11
 *
 * @internal
 */var FeeCalculatorLayout=BufferLayout__namespace.nu64('lamportsPerSignature');/**
 * Calculator for transaction fees.
 *
 * @deprecated Deprecated since Solana v1.8.0.
 *//**
 * See https://github.com/solana-labs/solana/blob/0ea2843ec9cdc517572b8e62c959f41b55cf4453/sdk/src/nonce_state.rs#L29-L32
 *
 * @internal
 */var NonceAccountLayout=BufferLayout__namespace.struct([BufferLayout__namespace.u32('version'),BufferLayout__namespace.u32('state'),publicKey('authorizedPubkey'),publicKey('nonce'),BufferLayout__namespace.struct([FeeCalculatorLayout],'feeCalculator')]);var NONCE_ACCOUNT_LENGTH=NonceAccountLayout.span;/**
 * A durable nonce is a 32 byte value encoded as a base58 string.
 *//**
 * NonceAccount class
 */var NonceAccount=/*#__PURE__*/function(){/**
   * @internal
   */function NonceAccount(args){_classCallCheck(this,NonceAccount);this.authorizedPubkey=void 0;this.nonce=void 0;this.feeCalculator=void 0;this.authorizedPubkey=args.authorizedPubkey;this.nonce=args.nonce;this.feeCalculator=args.feeCalculator;}/**
   * Deserialize NonceAccount from the account data.
   *
   * @param buffer account data
   * @return NonceAccount
   */return _createClass(NonceAccount,null,[{key:"fromAccountData",value:function fromAccountData(buffer){var nonceAccount=NonceAccountLayout.decode(toBuffer(buffer),0);return new NonceAccount({authorizedPubkey:new PublicKey(nonceAccount.authorizedPubkey),nonce:new PublicKey(nonceAccount.nonce).toString(),feeCalculator:nonceAccount.feeCalculator});}}]);}();var encodeDecode=function encodeDecode(layout){var decode=layout.decode.bind(layout);var encode=layout.encode.bind(layout);return{decode:decode,encode:encode};};var bigInt=function bigInt(length){return function(property){var layout=BufferLayout.blob(length,property);var _encodeDecode=encodeDecode(layout),encode=_encodeDecode.encode,decode=_encodeDecode.decode;var bigIntLayout=layout;bigIntLayout.decode=function(buffer$1,offset){var src=decode(buffer$1,offset);return bigintBuffer.toBigIntLE(buffer.Buffer.from(src));};bigIntLayout.encode=function(bigInt,buffer,offset){var src=bigintBuffer.toBufferLE(bigInt,length);return encode(src,buffer,offset);};return bigIntLayout;};};var u64=bigInt(8);/**
 * Create account system transaction params
 *//**
 * Transfer system transaction params
 *//**
 * Assign system transaction params
 *//**
 * Create account with seed system transaction params
 *//**
 * Create nonce account system transaction params
 *//**
 * Create nonce account with seed system transaction params
 *//**
 * Initialize nonce account system instruction params
 *//**
 * Advance nonce account system instruction params
 *//**
 * Withdraw nonce account system transaction params
 *//**
 * Authorize nonce account system transaction params
 *//**
 * Allocate account system transaction params
 *//**
 * Allocate account with seed system transaction params
 *//**
 * Assign account with seed system transaction params
 *//**
 * Transfer with seed system transaction params
 *//** Decoded transfer system transaction instruction *//** Decoded transferWithSeed system transaction instruction *//**
 * System Instruction class
 */var SystemInstruction=/*#__PURE__*/function(){/**
   * @internal
   */function SystemInstruction(){_classCallCheck(this,SystemInstruction);}/**
   * Decode a system instruction and retrieve the instruction type.
   */return _createClass(SystemInstruction,null,[{key:"decodeInstructionType",value:function decodeInstructionType(instruction){this.checkProgramId(instruction.programId);var instructionTypeLayout=BufferLayout__namespace.u32('instruction');var typeIndex=instructionTypeLayout.decode(instruction.data);var type;for(var _i6=0,_Object$entries=Object.entries(SYSTEM_INSTRUCTION_LAYOUTS);_i6<_Object$entries.length;_i6++){var _Object$entries$_i=_slicedToArray(_Object$entries[_i6],2),ixType=_Object$entries$_i[0],layout=_Object$entries$_i[1];if(layout.index==typeIndex){type=ixType;break;}}if(!type){throw new Error('Instruction type incorrect; not a SystemInstruction');}return type;}/**
     * Decode a create account system instruction and retrieve the instruction params.
     */},{key:"decodeCreateAccount",value:function decodeCreateAccount(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,2);var _decodeData$=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.Create,instruction.data),lamports=_decodeData$.lamports,space=_decodeData$.space,programId=_decodeData$.programId;return{fromPubkey:instruction.keys[0].pubkey,newAccountPubkey:instruction.keys[1].pubkey,lamports:lamports,space:space,programId:new PublicKey(programId)};}/**
     * Decode a transfer system instruction and retrieve the instruction params.
     */},{key:"decodeTransfer",value:function decodeTransfer(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,2);var _decodeData$2=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.Transfer,instruction.data),lamports=_decodeData$2.lamports;return{fromPubkey:instruction.keys[0].pubkey,toPubkey:instruction.keys[1].pubkey,lamports:lamports};}/**
     * Decode a transfer with seed system instruction and retrieve the instruction params.
     */},{key:"decodeTransferWithSeed",value:function decodeTransferWithSeed(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);var _decodeData$3=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.TransferWithSeed,instruction.data),lamports=_decodeData$3.lamports,seed=_decodeData$3.seed,programId=_decodeData$3.programId;return{fromPubkey:instruction.keys[0].pubkey,basePubkey:instruction.keys[1].pubkey,toPubkey:instruction.keys[2].pubkey,lamports:lamports,seed:seed,programId:new PublicKey(programId)};}/**
     * Decode an allocate system instruction and retrieve the instruction params.
     */},{key:"decodeAllocate",value:function decodeAllocate(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,1);var _decodeData$4=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.Allocate,instruction.data),space=_decodeData$4.space;return{accountPubkey:instruction.keys[0].pubkey,space:space};}/**
     * Decode an allocate with seed system instruction and retrieve the instruction params.
     */},{key:"decodeAllocateWithSeed",value:function decodeAllocateWithSeed(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,1);var _decodeData$5=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.AllocateWithSeed,instruction.data),base=_decodeData$5.base,seed=_decodeData$5.seed,space=_decodeData$5.space,programId=_decodeData$5.programId;return{accountPubkey:instruction.keys[0].pubkey,basePubkey:new PublicKey(base),seed:seed,space:space,programId:new PublicKey(programId)};}/**
     * Decode an assign system instruction and retrieve the instruction params.
     */},{key:"decodeAssign",value:function decodeAssign(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,1);var _decodeData$6=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.Assign,instruction.data),programId=_decodeData$6.programId;return{accountPubkey:instruction.keys[0].pubkey,programId:new PublicKey(programId)};}/**
     * Decode an assign with seed system instruction and retrieve the instruction params.
     */},{key:"decodeAssignWithSeed",value:function decodeAssignWithSeed(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,1);var _decodeData$7=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.AssignWithSeed,instruction.data),base=_decodeData$7.base,seed=_decodeData$7.seed,programId=_decodeData$7.programId;return{accountPubkey:instruction.keys[0].pubkey,basePubkey:new PublicKey(base),seed:seed,programId:new PublicKey(programId)};}/**
     * Decode a create account with seed system instruction and retrieve the instruction params.
     */},{key:"decodeCreateWithSeed",value:function decodeCreateWithSeed(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,2);var _decodeData$8=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.CreateWithSeed,instruction.data),base=_decodeData$8.base,seed=_decodeData$8.seed,lamports=_decodeData$8.lamports,space=_decodeData$8.space,programId=_decodeData$8.programId;return{fromPubkey:instruction.keys[0].pubkey,newAccountPubkey:instruction.keys[1].pubkey,basePubkey:new PublicKey(base),seed:seed,lamports:lamports,space:space,programId:new PublicKey(programId)};}/**
     * Decode a nonce initialize system instruction and retrieve the instruction params.
     */},{key:"decodeNonceInitialize",value:function decodeNonceInitialize(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);var _decodeData$9=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.InitializeNonceAccount,instruction.data),authorized=_decodeData$9.authorized;return{noncePubkey:instruction.keys[0].pubkey,authorizedPubkey:new PublicKey(authorized)};}/**
     * Decode a nonce advance system instruction and retrieve the instruction params.
     */},{key:"decodeNonceAdvance",value:function decodeNonceAdvance(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.AdvanceNonceAccount,instruction.data);return{noncePubkey:instruction.keys[0].pubkey,authorizedPubkey:instruction.keys[2].pubkey};}/**
     * Decode a nonce withdraw system instruction and retrieve the instruction params.
     */},{key:"decodeNonceWithdraw",value:function decodeNonceWithdraw(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,5);var _decodeData$10=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.WithdrawNonceAccount,instruction.data),lamports=_decodeData$10.lamports;return{noncePubkey:instruction.keys[0].pubkey,toPubkey:instruction.keys[1].pubkey,authorizedPubkey:instruction.keys[4].pubkey,lamports:lamports};}/**
     * Decode a nonce authorize system instruction and retrieve the instruction params.
     */},{key:"decodeNonceAuthorize",value:function decodeNonceAuthorize(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,2);var _decodeData$11=decodeData$1(SYSTEM_INSTRUCTION_LAYOUTS.AuthorizeNonceAccount,instruction.data),authorized=_decodeData$11.authorized;return{noncePubkey:instruction.keys[0].pubkey,authorizedPubkey:instruction.keys[1].pubkey,newAuthorizedPubkey:new PublicKey(authorized)};}/**
     * @internal
     */},{key:"checkProgramId",value:function checkProgramId(programId){if(!programId.equals(SystemProgram.programId)){throw new Error('invalid instruction; programId is not SystemProgram');}}/**
     * @internal
     */},{key:"checkKeyLength",value:function checkKeyLength(keys,expectedLength){if(keys.length<expectedLength){throw new Error("invalid instruction; found ".concat(keys.length," keys, expected at least ").concat(expectedLength));}}}]);}();/**
 * An enumeration of valid SystemInstructionType's
 *//**
 * An enumeration of valid system InstructionType's
 * @internal
 */var SYSTEM_INSTRUCTION_LAYOUTS=Object.freeze({Create:{index:0,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),BufferLayout__namespace.ns64('lamports'),BufferLayout__namespace.ns64('space'),publicKey('programId')])},Assign:{index:1,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('programId')])},Transfer:{index:2,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),u64('lamports')])},CreateWithSeed:{index:3,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('base'),rustString('seed'),BufferLayout__namespace.ns64('lamports'),BufferLayout__namespace.ns64('space'),publicKey('programId')])},AdvanceNonceAccount:{index:4,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])},WithdrawNonceAccount:{index:5,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),BufferLayout__namespace.ns64('lamports')])},InitializeNonceAccount:{index:6,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('authorized')])},AuthorizeNonceAccount:{index:7,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('authorized')])},Allocate:{index:8,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),BufferLayout__namespace.ns64('space')])},AllocateWithSeed:{index:9,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('base'),rustString('seed'),BufferLayout__namespace.ns64('space'),publicKey('programId')])},AssignWithSeed:{index:10,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('base'),rustString('seed'),publicKey('programId')])},TransferWithSeed:{index:11,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),u64('lamports'),rustString('seed'),publicKey('programId')])},UpgradeNonceAccount:{index:12,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])}});/**
 * Factory class for transactions to interact with the System program
 */var SystemProgram=/*#__PURE__*/function(){/**
   * @internal
   */function SystemProgram(){_classCallCheck(this,SystemProgram);}/**
   * Public key that identifies the System program
   *//**
   * Generate a transaction instruction that creates a new account
   */return _createClass(SystemProgram,null,[{key:"createAccount",value:function createAccount(params){var type=SYSTEM_INSTRUCTION_LAYOUTS.Create;var data=encodeData(type,{lamports:params.lamports,space:params.space,programId:toBuffer(params.programId.toBuffer())});return new TransactionInstruction({keys:[{pubkey:params.fromPubkey,isSigner:true,isWritable:true},{pubkey:params.newAccountPubkey,isSigner:true,isWritable:true}],programId:this.programId,data:data});}/**
     * Generate a transaction instruction that transfers lamports from one account to another
     */},{key:"transfer",value:function transfer(params){var data;var keys;if('basePubkey'in params){var type=SYSTEM_INSTRUCTION_LAYOUTS.TransferWithSeed;data=encodeData(type,{lamports:BigInt(params.lamports),seed:params.seed,programId:toBuffer(params.programId.toBuffer())});keys=[{pubkey:params.fromPubkey,isSigner:false,isWritable:true},{pubkey:params.basePubkey,isSigner:true,isWritable:false},{pubkey:params.toPubkey,isSigner:false,isWritable:true}];}else{var _type=SYSTEM_INSTRUCTION_LAYOUTS.Transfer;data=encodeData(_type,{lamports:BigInt(params.lamports)});keys=[{pubkey:params.fromPubkey,isSigner:true,isWritable:true},{pubkey:params.toPubkey,isSigner:false,isWritable:true}];}return new TransactionInstruction({keys:keys,programId:this.programId,data:data});}/**
     * Generate a transaction instruction that assigns an account to a program
     */},{key:"assign",value:function assign(params){var data;var keys;if('basePubkey'in params){var type=SYSTEM_INSTRUCTION_LAYOUTS.AssignWithSeed;data=encodeData(type,{base:toBuffer(params.basePubkey.toBuffer()),seed:params.seed,programId:toBuffer(params.programId.toBuffer())});keys=[{pubkey:params.accountPubkey,isSigner:false,isWritable:true},{pubkey:params.basePubkey,isSigner:true,isWritable:false}];}else{var _type2=SYSTEM_INSTRUCTION_LAYOUTS.Assign;data=encodeData(_type2,{programId:toBuffer(params.programId.toBuffer())});keys=[{pubkey:params.accountPubkey,isSigner:true,isWritable:true}];}return new TransactionInstruction({keys:keys,programId:this.programId,data:data});}/**
     * Generate a transaction instruction that creates a new account at
     *   an address generated with `from`, a seed, and programId
     */},{key:"createAccountWithSeed",value:function createAccountWithSeed(params){var type=SYSTEM_INSTRUCTION_LAYOUTS.CreateWithSeed;var data=encodeData(type,{base:toBuffer(params.basePubkey.toBuffer()),seed:params.seed,lamports:params.lamports,space:params.space,programId:toBuffer(params.programId.toBuffer())});var keys=[{pubkey:params.fromPubkey,isSigner:true,isWritable:true},{pubkey:params.newAccountPubkey,isSigner:false,isWritable:true}];if(params.basePubkey!=params.fromPubkey){keys.push({pubkey:params.basePubkey,isSigner:true,isWritable:false});}return new TransactionInstruction({keys:keys,programId:this.programId,data:data});}/**
     * Generate a transaction that creates a new Nonce account
     */},{key:"createNonceAccount",value:function createNonceAccount(params){var transaction=new Transaction();if('basePubkey'in params&&'seed'in params){transaction.add(SystemProgram.createAccountWithSeed({fromPubkey:params.fromPubkey,newAccountPubkey:params.noncePubkey,basePubkey:params.basePubkey,seed:params.seed,lamports:params.lamports,space:NONCE_ACCOUNT_LENGTH,programId:this.programId}));}else{transaction.add(SystemProgram.createAccount({fromPubkey:params.fromPubkey,newAccountPubkey:params.noncePubkey,lamports:params.lamports,space:NONCE_ACCOUNT_LENGTH,programId:this.programId}));}var initParams={noncePubkey:params.noncePubkey,authorizedPubkey:params.authorizedPubkey};transaction.add(this.nonceInitialize(initParams));return transaction;}/**
     * Generate an instruction to initialize a Nonce account
     */},{key:"nonceInitialize",value:function nonceInitialize(params){var type=SYSTEM_INSTRUCTION_LAYOUTS.InitializeNonceAccount;var data=encodeData(type,{authorized:toBuffer(params.authorizedPubkey.toBuffer())});var instructionData={keys:[{pubkey:params.noncePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_RECENT_BLOCKHASHES_PUBKEY,isSigner:false,isWritable:false},{pubkey:SYSVAR_RENT_PUBKEY,isSigner:false,isWritable:false}],programId:this.programId,data:data};return new TransactionInstruction(instructionData);}/**
     * Generate an instruction to advance the nonce in a Nonce account
     */},{key:"nonceAdvance",value:function nonceAdvance(params){var type=SYSTEM_INSTRUCTION_LAYOUTS.AdvanceNonceAccount;var data=encodeData(type);var instructionData={keys:[{pubkey:params.noncePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_RECENT_BLOCKHASHES_PUBKEY,isSigner:false,isWritable:false},{pubkey:params.authorizedPubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data};return new TransactionInstruction(instructionData);}/**
     * Generate a transaction instruction that withdraws lamports from a Nonce account
     */},{key:"nonceWithdraw",value:function nonceWithdraw(params){var type=SYSTEM_INSTRUCTION_LAYOUTS.WithdrawNonceAccount;var data=encodeData(type,{lamports:params.lamports});return new TransactionInstruction({keys:[{pubkey:params.noncePubkey,isSigner:false,isWritable:true},{pubkey:params.toPubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_RECENT_BLOCKHASHES_PUBKEY,isSigner:false,isWritable:false},{pubkey:SYSVAR_RENT_PUBKEY,isSigner:false,isWritable:false},{pubkey:params.authorizedPubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data});}/**
     * Generate a transaction instruction that authorizes a new PublicKey as the authority
     * on a Nonce account.
     */},{key:"nonceAuthorize",value:function nonceAuthorize(params){var type=SYSTEM_INSTRUCTION_LAYOUTS.AuthorizeNonceAccount;var data=encodeData(type,{authorized:toBuffer(params.newAuthorizedPubkey.toBuffer())});return new TransactionInstruction({keys:[{pubkey:params.noncePubkey,isSigner:false,isWritable:true},{pubkey:params.authorizedPubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data});}/**
     * Generate a transaction instruction that allocates space in an account without funding
     */},{key:"allocate",value:function allocate(params){var data;var keys;if('basePubkey'in params){var type=SYSTEM_INSTRUCTION_LAYOUTS.AllocateWithSeed;data=encodeData(type,{base:toBuffer(params.basePubkey.toBuffer()),seed:params.seed,space:params.space,programId:toBuffer(params.programId.toBuffer())});keys=[{pubkey:params.accountPubkey,isSigner:false,isWritable:true},{pubkey:params.basePubkey,isSigner:true,isWritable:false}];}else{var _type3=SYSTEM_INSTRUCTION_LAYOUTS.Allocate;data=encodeData(_type3,{space:params.space});keys=[{pubkey:params.accountPubkey,isSigner:true,isWritable:true}];}return new TransactionInstruction({keys:keys,programId:this.programId,data:data});}}]);}();SystemProgram.programId=new PublicKey('11111111111111111111111111111111');// Keep program chunks under PACKET_DATA_SIZE, leaving enough room for the
// rest of the Transaction fields
//
// TODO: replace 300 with a proper constant for the size of the other
// Transaction fields
var CHUNK_SIZE=PACKET_DATA_SIZE-300;/**
 * Program loader interface
 */var Loader=/*#__PURE__*/function(){/**
   * @internal
   */function Loader(){_classCallCheck(this,Loader);}/**
   * Amount of program data placed in each load Transaction
   *//**
   * Minimum number of signatures required to load a program not including
   * retries
   *
   * Can be used to calculate transaction fees
   */return _createClass(Loader,null,[{key:"getMinNumSignatures",value:function getMinNumSignatures(dataLength){return 2*(// Every transaction requires two signatures (payer + program)
Math.ceil(dataLength/Loader.chunkSize)+1+// Add one for Create transaction
1)// Add one for Finalize transaction
;}/**
     * Loads a generic program
     *
     * @param connection The connection to use
     * @param payer System account that pays to load the program
     * @param program Account to load the program into
     * @param programId Public key that identifies the loader
     * @param data Program octets
     * @return true if program was loaded successfully, false if program was already loaded
     */},{key:"load",value:function(){var _load=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee6(connection,payer,program,programId,data){var balanceNeeded,programInfo,transaction,dataLayout,chunkSize,offset,array,transactions,bytes,_data,_transaction,REQUESTS_PER_SECOND,_dataLayout,_data2,_transaction2,deployCommitment,finalizeSignature,_yield$connection$con,context,value,currentSlot;return _regeneratorRuntime().wrap(function _callee6$(_context6){while(1)switch(_context6.prev=_context6.next){case 0:_context6.next=2;return connection.getMinimumBalanceForRentExemption(data.length);case 2:balanceNeeded=_context6.sent;_context6.next=5;return connection.getAccountInfo(program.publicKey,'confirmed');case 5:programInfo=_context6.sent;transaction=null;if(!(programInfo!==null)){_context6.next=16;break;}if(!programInfo.executable){_context6.next=11;break;}console.error('Program load failed, account is already executable');return _context6.abrupt("return",false);case 11:if(programInfo.data.length!==data.length){transaction=transaction||new Transaction();transaction.add(SystemProgram.allocate({accountPubkey:program.publicKey,space:data.length}));}if(!programInfo.owner.equals(programId)){transaction=transaction||new Transaction();transaction.add(SystemProgram.assign({accountPubkey:program.publicKey,programId:programId}));}if(programInfo.lamports<balanceNeeded){transaction=transaction||new Transaction();transaction.add(SystemProgram.transfer({fromPubkey:payer.publicKey,toPubkey:program.publicKey,lamports:balanceNeeded-programInfo.lamports}));}_context6.next=17;break;case 16:transaction=new Transaction().add(SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:program.publicKey,lamports:balanceNeeded>0?balanceNeeded:1,space:data.length,programId:programId}));case 17:if(!(transaction!==null)){_context6.next=20;break;}_context6.next=20;return sendAndConfirmTransaction(connection,transaction,[payer,program],{commitment:'confirmed'});case 20:dataLayout=BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),BufferLayout__namespace.u32('offset'),BufferLayout__namespace.u32('bytesLength'),BufferLayout__namespace.u32('bytesLengthPadding'),BufferLayout__namespace.seq(BufferLayout__namespace.u8('byte'),BufferLayout__namespace.offset(BufferLayout__namespace.u32(),-8),'bytes')]);chunkSize=Loader.chunkSize;offset=0;array=data;transactions=[];case 25:if(!(array.length>0)){_context6.next=39;break;}bytes=array.slice(0,chunkSize);_data=buffer.Buffer.alloc(chunkSize+16);dataLayout.encode({instruction:0,// Load instruction
offset:offset,bytes:bytes,bytesLength:0,bytesLengthPadding:0},_data);_transaction=new Transaction().add({keys:[{pubkey:program.publicKey,isSigner:true,isWritable:true}],programId:programId,data:_data});transactions.push(sendAndConfirmTransaction(connection,_transaction,[payer,program],{commitment:'confirmed'}));// Delay between sends in an attempt to reduce rate limit errors
if(!connection._rpcEndpoint.includes('solana.com')){_context6.next=35;break;}REQUESTS_PER_SECOND=4;_context6.next=35;return sleep(1000/REQUESTS_PER_SECOND);case 35:offset+=chunkSize;array=array.slice(chunkSize);_context6.next=25;break;case 39:_context6.next=41;return Promise.all(transactions);case 41:_dataLayout=BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')]);_data2=buffer.Buffer.alloc(_dataLayout.span);_dataLayout.encode({instruction:1// Finalize instruction
},_data2);_transaction2=new Transaction().add({keys:[{pubkey:program.publicKey,isSigner:true,isWritable:true},{pubkey:SYSVAR_RENT_PUBKEY,isSigner:false,isWritable:false}],programId:programId,data:_data2});deployCommitment='processed';_context6.next=48;return connection.sendTransaction(_transaction2,[payer,program],{preflightCommitment:deployCommitment});case 48:finalizeSignature=_context6.sent;_context6.next=51;return connection.confirmTransaction({signature:finalizeSignature,lastValidBlockHeight:_transaction2.lastValidBlockHeight,blockhash:_transaction2.recentBlockhash},deployCommitment);case 51:_yield$connection$con=_context6.sent;context=_yield$connection$con.context;value=_yield$connection$con.value;if(!value.err){_context6.next=56;break;}throw new Error("Transaction ".concat(finalizeSignature," failed (").concat(JSON.stringify(value),")"));case 56:if(!true// eslint-disable-line no-constant-condition
){_context6.next=71;break;}_context6.prev=57;_context6.next=60;return connection.getSlot({commitment:deployCommitment});case 60:currentSlot=_context6.sent;if(!(currentSlot>context.slot)){_context6.next=63;break;}return _context6.abrupt("break",71);case 63:_context6.next=67;break;case 65:_context6.prev=65;_context6.t0=_context6["catch"](57);case 67:_context6.next=69;return new Promise(function(resolve){return setTimeout(resolve,Math.round(MS_PER_SLOT/2));});case 69:_context6.next=56;break;case 71:return _context6.abrupt("return",true);case 72:case"end":return _context6.stop();}},_callee6,null,[[57,65]]);}));function load(_x14,_x15,_x16,_x17,_x18){return _load.apply(this,arguments);}return load;}()}]);}();Loader.chunkSize=CHUNK_SIZE;/**
 * @deprecated Deprecated since Solana v1.17.20.
 */var BPF_LOADER_PROGRAM_ID=new PublicKey('BPFLoader2111111111111111111111111111111111');/**
 * Factory class for transactions to interact with a program loader
 *
 * @deprecated Deprecated since Solana v1.17.20.
 */var BpfLoader=/*#__PURE__*/function(){function BpfLoader(){_classCallCheck(this,BpfLoader);}return _createClass(BpfLoader,null,[{key:"getMinNumSignatures",value:/**
     * Minimum number of signatures required to load a program not including
     * retries
     *
     * Can be used to calculate transaction fees
     */function getMinNumSignatures(dataLength){return Loader.getMinNumSignatures(dataLength);}/**
     * Load a SBF program
     *
     * @param connection The connection to use
     * @param payer Account that will pay program loading fees
     * @param program Account to load the program into
     * @param elf The entire ELF containing the SBF program
     * @param loaderProgramId The program id of the BPF loader to use
     * @return true if program was loaded successfully, false if program was already loaded
     */},{key:"load",value:function load(connection,payer,program,elf,loaderProgramId){return Loader.load(connection,payer,program,loaderProgramId,elf);}}]);}();function getDefaultExportFromCjs(x){return x&&x.__esModule&&Object.prototype.hasOwnProperty.call(x,'default')?x['default']:x;}var objToString=Object.prototype.toString;var objKeys=Object.keys||function(obj){var keys=[];for(var name in obj){keys.push(name);}return keys;};function stringify(val,isArrayProp){var i,max,str,keys,key,propVal,toStr;if(val===true){return"true";}if(val===false){return"false";}switch(_typeof(val)){case"object":if(val===null){return null;}else if(val.toJSON&&typeof val.toJSON==="function"){return stringify(val.toJSON(),isArrayProp);}else{toStr=objToString.call(val);if(toStr==="[object Array]"){str='[';max=val.length-1;for(i=0;i<max;i++){str+=stringify(val[i],true)+',';}if(max>-1){str+=stringify(val[i],true);}return str+']';}else if(toStr==="[object Object]"){// only object is left
keys=objKeys(val).sort();max=keys.length;str="";i=0;while(i<max){key=keys[i];propVal=stringify(val[key],false);if(propVal!==undefined){if(str){str+=',';}str+=JSON.stringify(key)+':'+propVal;}i++;}return'{'+str+'}';}else{return JSON.stringify(val);}}case"function":case"undefined":return isArrayProp?null:undefined;case"string":return JSON.stringify(val);default:return isFinite(val)?val:null;}}var fastStableStringify=function fastStableStringify(val){var returnVal=stringify(val,false);if(returnVal!==undefined){return''+returnVal;}};var fastStableStringify$1=/*@__PURE__*/getDefaultExportFromCjs(fastStableStringify);var MINIMUM_SLOT_PER_EPOCH=32;// Returns the number of trailing zeros in the binary representation of self.
function trailingZeros(n){var trailingZeros=0;while(n>1){n/=2;trailingZeros++;}return trailingZeros;}// Returns the smallest power of two greater than or equal to n
function nextPowerOfTwo(n){if(n===0)return 1;n--;n|=n>>1;n|=n>>2;n|=n>>4;n|=n>>8;n|=n>>16;n|=n>>32;return n+1;}/**
 * Epoch schedule
 * (see https://docs.solana.com/terminology#epoch)
 * Can be retrieved with the {@link Connection.getEpochSchedule} method
 */var EpochSchedule=/*#__PURE__*/function(){function EpochSchedule(slotsPerEpoch,leaderScheduleSlotOffset,warmup,firstNormalEpoch,firstNormalSlot){_classCallCheck(this,EpochSchedule);/** The maximum number of slots in each epoch */this.slotsPerEpoch=void 0;/** The number of slots before beginning of an epoch to calculate a leader schedule for that epoch */this.leaderScheduleSlotOffset=void 0;/** Indicates whether epochs start short and grow */this.warmup=void 0;/** The first epoch with `slotsPerEpoch` slots */this.firstNormalEpoch=void 0;/** The first slot of `firstNormalEpoch` */this.firstNormalSlot=void 0;this.slotsPerEpoch=slotsPerEpoch;this.leaderScheduleSlotOffset=leaderScheduleSlotOffset;this.warmup=warmup;this.firstNormalEpoch=firstNormalEpoch;this.firstNormalSlot=firstNormalSlot;}return _createClass(EpochSchedule,[{key:"getEpoch",value:function getEpoch(slot){return this.getEpochAndSlotIndex(slot)[0];}},{key:"getEpochAndSlotIndex",value:function getEpochAndSlotIndex(slot){if(slot<this.firstNormalSlot){var epoch=trailingZeros(nextPowerOfTwo(slot+MINIMUM_SLOT_PER_EPOCH+1))-trailingZeros(MINIMUM_SLOT_PER_EPOCH)-1;var epochLen=this.getSlotsInEpoch(epoch);var slotIndex=slot-(epochLen-MINIMUM_SLOT_PER_EPOCH);return[epoch,slotIndex];}else{var normalSlotIndex=slot-this.firstNormalSlot;var normalEpochIndex=Math.floor(normalSlotIndex/this.slotsPerEpoch);var _epoch=this.firstNormalEpoch+normalEpochIndex;var _slotIndex=normalSlotIndex%this.slotsPerEpoch;return[_epoch,_slotIndex];}}},{key:"getFirstSlotInEpoch",value:function getFirstSlotInEpoch(epoch){if(epoch<=this.firstNormalEpoch){return(Math.pow(2,epoch)-1)*MINIMUM_SLOT_PER_EPOCH;}else{return(epoch-this.firstNormalEpoch)*this.slotsPerEpoch+this.firstNormalSlot;}}},{key:"getLastSlotInEpoch",value:function getLastSlotInEpoch(epoch){return this.getFirstSlotInEpoch(epoch)+this.getSlotsInEpoch(epoch)-1;}},{key:"getSlotsInEpoch",value:function getSlotsInEpoch(epoch){if(epoch<this.firstNormalEpoch){return Math.pow(2,epoch+trailingZeros(MINIMUM_SLOT_PER_EPOCH));}else{return this.slotsPerEpoch;}}}]);}();var fetchImpl=globalThis.fetch;var RpcWebSocketClient=/*#__PURE__*/function(_rpcWebsockets$Common){function RpcWebSocketClient(address,options,generate_request_id){var _this15;_classCallCheck(this,RpcWebSocketClient);var webSocketFactory=function webSocketFactory(url){var rpc=rpcWebsockets.WebSocket(url,_objectSpread({autoconnect:true,max_reconnects:5,reconnect:true,reconnect_interval:1000},options));if('socket'in rpc){_this15.underlyingSocket=rpc.socket;}else{_this15.underlyingSocket=rpc;}return rpc;};_this15=_callSuper(this,RpcWebSocketClient,[webSocketFactory,address,options,generate_request_id]);_this15.underlyingSocket=void 0;return _this15;}_inherits(RpcWebSocketClient,_rpcWebsockets$Common);return _createClass(RpcWebSocketClient,[{key:"call",value:function call(){var _this$underlyingSocke;var readyState=(_this$underlyingSocke=this.underlyingSocket)===null||_this$underlyingSocke===void 0?void 0:_this$underlyingSocke.readyState;for(var _len7=arguments.length,args=new Array(_len7),_key7=0;_key7<_len7;_key7++){args[_key7]=arguments[_key7];}if(readyState===1/* WebSocket.OPEN */){return _superPropGet(RpcWebSocketClient,"call",this,3)(args);}return Promise.reject(new Error('Tried to call a JSON-RPC method `'+args[0]+'` but the socket was not `CONNECTING` or `OPEN` (`readyState` was '+readyState+')'));}},{key:"notify",value:function notify(){var _this$underlyingSocke2;var readyState=(_this$underlyingSocke2=this.underlyingSocket)===null||_this$underlyingSocke2===void 0?void 0:_this$underlyingSocke2.readyState;for(var _len8=arguments.length,args=new Array(_len8),_key8=0;_key8<_len8;_key8++){args[_key8]=arguments[_key8];}if(readyState===1/* WebSocket.OPEN */){return _superPropGet(RpcWebSocketClient,"notify",this,3)(args);}return Promise.reject(new Error('Tried to send a JSON-RPC notification `'+args[0]+'` but the socket was not `CONNECTING` or `OPEN` (`readyState` was '+readyState+')'));}}]);}(rpcWebsockets.CommonClient);/**
 * @internal
 *//**
 * Decode account data buffer using an AccountType
 * @internal
 */function decodeData(type,data){var decoded;try{decoded=type.layout.decode(data);}catch(err){throw new Error('invalid instruction; '+err);}if(decoded.typeIndex!==type.index){throw new Error("invalid account data; account type mismatch ".concat(decoded.typeIndex," != ").concat(type.index));}return decoded;}/// The serialized size of lookup table metadata
var LOOKUP_TABLE_META_SIZE=56;var AddressLookupTableAccount=/*#__PURE__*/function(){function AddressLookupTableAccount(args){_classCallCheck(this,AddressLookupTableAccount);this.key=void 0;this.state=void 0;this.key=args.key;this.state=args.state;}return _createClass(AddressLookupTableAccount,[{key:"isActive",value:function isActive(){var U64_MAX=BigInt('0xffffffffffffffff');return this.state.deactivationSlot===U64_MAX;}}],[{key:"deserialize",value:function deserialize(accountData){var meta=decodeData(LookupTableMetaLayout,accountData);var serializedAddressesLen=accountData.length-LOOKUP_TABLE_META_SIZE;assert(serializedAddressesLen>=0,'lookup table is invalid');assert(serializedAddressesLen%32===0,'lookup table is invalid');var numSerializedAddresses=serializedAddressesLen/32;var _BufferLayout__namesp=BufferLayout__namespace.struct([BufferLayout__namespace.seq(publicKey(),numSerializedAddresses,'addresses')]).decode(accountData.slice(LOOKUP_TABLE_META_SIZE)),addresses=_BufferLayout__namesp.addresses;return{deactivationSlot:meta.deactivationSlot,lastExtendedSlot:meta.lastExtendedSlot,lastExtendedSlotStartIndex:meta.lastExtendedStartIndex,authority:meta.authority.length!==0?new PublicKey(meta.authority[0]):undefined,addresses:addresses.map(function(address){return new PublicKey(address);})};}}]);}();var LookupTableMetaLayout={index:1,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('typeIndex'),u64('deactivationSlot'),BufferLayout__namespace.nu64('lastExtendedSlot'),BufferLayout__namespace.u8('lastExtendedStartIndex'),BufferLayout__namespace.u8(),// option
BufferLayout__namespace.seq(publicKey(),BufferLayout__namespace.offset(BufferLayout__namespace.u8(),-1),'authority')])};var URL_RE=/^[^:]+:\/\/([^:[]+|\[[^\]]+\])(:\d+)?(.*)/i;function makeWebsocketUrl(endpoint){var matches=endpoint.match(URL_RE);if(matches==null){throw TypeError("Failed to validate endpoint URL `".concat(endpoint,"`"));}var _matches=_slicedToArray(matches,4),_=_matches[0],// eslint-disable-line @typescript-eslint/no-unused-vars
hostish=_matches[1],portWithColon=_matches[2],rest=_matches[3];var protocol=endpoint.startsWith('https:')?'wss:':'ws:';var startPort=portWithColon==null?null:parseInt(portWithColon.slice(1),10);var websocketPort=// Only shift the port by +1 as a convention for ws(s) only if given endpoint
// is explicitly specifying the endpoint port (HTTP-based RPC), assuming
// we're directly trying to connect to agave-validator's ws listening port.
// When the endpoint omits the port, we're connecting to the protocol
// default ports: http(80) or https(443) and it's assumed we're behind a reverse
// proxy which manages WebSocket upgrade and backend port redirection.
startPort==null?'':":".concat(startPort+1);return"".concat(protocol,"//").concat(hostish).concat(websocketPort).concat(rest);}var PublicKeyFromString=superstruct.coerce(superstruct.instance(PublicKey),superstruct.string(),function(value){return new PublicKey(value);});var RawAccountDataResult=superstruct.tuple([superstruct.string(),superstruct.literal('base64')]);var BufferFromRawAccountData=superstruct.coerce(superstruct.instance(buffer.Buffer),RawAccountDataResult,function(value){return buffer.Buffer.from(value[0],'base64');});/**
 * Attempt to use a recent blockhash for up to 30 seconds
 * @internal
 */var BLOCKHASH_CACHE_TIMEOUT_MS=30*1000;/**
 * HACK.
 * Copied from rpc-websockets/dist/lib/client.
 * Otherwise, `yarn build` fails with:
 * https://gist.github.com/steveluscher/c057eca81d479ef705cdb53162f9971d
 *//** @internal *//** @internal *//** @internal *//** @internal *//** @internal *//**
 * @internal
 * Every subscription contains the args used to open the subscription with
 * the server, and a list of callers interested in notifications.
 *//**
 * @internal
 * A subscription may be in various states of connectedness. Only when it is
 * fully connected will it have a server subscription id associated with it.
 * This id can be returned to the server to unsubscribe the client entirely.
 *//**
 * A type that encapsulates a subscription's RPC method
 * names and notification (callback) signature.
 *//**
 * @internal
 * Utility type that keeps tagged unions intact while omitting properties.
 *//**
 * @internal
 * This type represents a single subscribable 'topic.' It's made up of:
 *
 * - The args used to open the subscription with the server,
 * - The state of the subscription, in terms of its connectedness, and
 * - The set of callbacks to call when the server publishes notifications
 *
 * This record gets indexed by `SubscriptionConfigHash` and is used to
 * set up subscriptions, fan out notifications, and track subscription state.
 *//**
 * @internal
 *//**
 * Extra contextual information for RPC responses
 *//**
 * Options for sending transactions
 *//**
 * Options for confirming transactions
 *//**
 * Options for getConfirmedSignaturesForAddress2
 *//**
 * Options for getSignaturesForAddress
 *//**
 * RPC Response with extra contextual information
 *//**
 * A strategy for confirming transactions that uses the last valid
 * block height for a given blockhash to check for transaction expiration.
 *//**
 * A strategy for confirming durable nonce transactions.
 *//**
 * Properties shared by all transaction confirmation strategies
 *//**
 * This type represents all transaction confirmation strategies
 *//* @internal */function assertEndpointUrl(putativeUrl){if(/^https?:/.test(putativeUrl)===false){throw new TypeError('Endpoint URL must start with `http:` or `https:`.');}return putativeUrl;}/** @internal */function extractCommitmentFromConfig(commitmentOrConfig){var commitment;var config;if(typeof commitmentOrConfig==='string'){commitment=commitmentOrConfig;}else if(commitmentOrConfig){var specifiedCommitment=commitmentOrConfig.commitment,specifiedConfig=_objectWithoutProperties(commitmentOrConfig,_excluded);commitment=specifiedCommitment;config=specifiedConfig;}return{commitment:commitment,config:config};}/**
 * @internal
 */function applyDefaultMemcmpEncodingToFilters(filters){return filters.map(function(filter){var _filter$memcmp$encodi;return'memcmp'in filter?_objectSpread(_objectSpread({},filter),{},{memcmp:_objectSpread(_objectSpread({},filter.memcmp),{},{encoding:(_filter$memcmp$encodi=filter.memcmp.encoding)!==null&&_filter$memcmp$encodi!==void 0?_filter$memcmp$encodi:'base58'})}):filter;});}/**
 * @internal
 */function createRpcResult(result){return superstruct.union([superstruct.type({jsonrpc:superstruct.literal('2.0'),id:superstruct.string(),result:result}),superstruct.type({jsonrpc:superstruct.literal('2.0'),id:superstruct.string(),error:superstruct.type({code:superstruct.unknown(),message:superstruct.string(),data:superstruct.optional(superstruct.any())})})]);}var UnknownRpcResult=createRpcResult(superstruct.unknown());/**
 * @internal
 */function jsonRpcResult(schema){return superstruct.coerce(createRpcResult(schema),UnknownRpcResult,function(value){if('error'in value){return value;}else{return _objectSpread(_objectSpread({},value),{},{result:superstruct.create(value.result,schema)});}});}/**
 * @internal
 */function jsonRpcResultAndContext(value){return jsonRpcResult(superstruct.type({context:superstruct.type({slot:superstruct.number()}),value:value}));}/**
 * @internal
 */function notificationResultAndContext(value){return superstruct.type({context:superstruct.type({slot:superstruct.number()}),value:value});}/**
 * @internal
 */function versionedMessageFromResponse(version,response){if(version===0){return new MessageV0({header:response.header,staticAccountKeys:response.accountKeys.map(function(accountKey){return new PublicKey(accountKey);}),recentBlockhash:response.recentBlockhash,compiledInstructions:response.instructions.map(function(ix){return{programIdIndex:ix.programIdIndex,accountKeyIndexes:ix.accounts,data:bs58__default["default"].decode(ix.data)};}),addressTableLookups:response.addressTableLookups});}else{return new Message(response);}}/**
 * The level of commitment desired when querying state
 * <pre>
 *   'processed': Query the most recent block which has reached 1 confirmation by the connected node
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 */// Deprecated as of v1.5.5
/**
 * A subset of Commitment levels, which are at least optimistically confirmed
 * <pre>
 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
 *   'finalized': Query the most recent block which has been finalized by the cluster
 * </pre>
 *//**
 * Filter for largest accounts query
 * <pre>
 *   'circulating':    Return the largest accounts that are part of the circulating supply
 *   'nonCirculating': Return the largest accounts that are not part of the circulating supply
 * </pre>
 *//**
 * Configuration object for changing `getAccountInfo` query behavior
 *//**
 * Configuration object for changing `getBalance` query behavior
 *//**
 * Configuration object for changing `getBlock` query behavior
 *//**
 * Configuration object for changing `getBlock` query behavior
 *//**
 * Configuration object for changing `getStakeMinimumDelegation` query behavior
 *//**
 * Configuration object for changing `getBlockHeight` query behavior
 *//**
 * Configuration object for changing `getEpochInfo` query behavior
 *//**
 * Configuration object for changing `getInflationReward` query behavior
 *//**
 * Configuration object for changing `getLatestBlockhash` query behavior
 *//**
 * Configuration object for changing `isBlockhashValid` query behavior
 *//**
 * Configuration object for changing `getSlot` query behavior
 *//**
 * Configuration object for changing `getSlotLeader` query behavior
 *//**
 * Configuration object for changing `getTransaction` query behavior
 *//**
 * Configuration object for changing `getTransaction` query behavior
 *//**
 * Configuration object for changing `getLargestAccounts` query behavior
 *//**
 * Configuration object for changing `getSupply` request behavior
 *//**
 * Configuration object for changing query behavior
 *//**
 * Information describing a cluster node
 *//**
 * Information describing a vote account
 *//**
 * A collection of cluster vote accounts
 *//**
 * Network Inflation
 * (see https://docs.solana.com/implemented-proposals/ed_overview)
 */var GetInflationGovernorResult=superstruct.type({foundation:superstruct.number(),foundationTerm:superstruct.number(),initial:superstruct.number(),taper:superstruct.number(),terminal:superstruct.number()});/**
 * The inflation reward for an epoch
 *//**
 * Expected JSON RPC response for the "getInflationReward" message
 */var GetInflationRewardResult=jsonRpcResult(superstruct.array(superstruct.nullable(superstruct.type({epoch:superstruct.number(),effectiveSlot:superstruct.number(),amount:superstruct.number(),postBalance:superstruct.number(),commission:superstruct.optional(superstruct.nullable(superstruct.number()))}))));/**
 * Configuration object for changing `getRecentPrioritizationFees` query behavior
 *//**
 * Expected JSON RPC response for the "getRecentPrioritizationFees" message
 */var GetRecentPrioritizationFeesResult=superstruct.array(superstruct.type({slot:superstruct.number(),prioritizationFee:superstruct.number()}));/**
 * Expected JSON RPC response for the "getInflationRate" message
 */var GetInflationRateResult=superstruct.type({total:superstruct.number(),validator:superstruct.number(),foundation:superstruct.number(),epoch:superstruct.number()});/**
 * Information about the current epoch
 */var GetEpochInfoResult=superstruct.type({epoch:superstruct.number(),slotIndex:superstruct.number(),slotsInEpoch:superstruct.number(),absoluteSlot:superstruct.number(),blockHeight:superstruct.optional(superstruct.number()),transactionCount:superstruct.optional(superstruct.number())});var GetEpochScheduleResult=superstruct.type({slotsPerEpoch:superstruct.number(),leaderScheduleSlotOffset:superstruct.number(),warmup:superstruct["boolean"](),firstNormalEpoch:superstruct.number(),firstNormalSlot:superstruct.number()});/**
 * Leader schedule
 * (see https://docs.solana.com/terminology#leader-schedule)
 */var GetLeaderScheduleResult=superstruct.record(superstruct.string(),superstruct.array(superstruct.number()));/**
 * Transaction error or null
 */var TransactionErrorResult=superstruct.nullable(superstruct.union([superstruct.type({}),superstruct.string()]));/**
 * Signature status for a transaction
 */var SignatureStatusResult=superstruct.type({err:TransactionErrorResult});/**
 * Transaction signature received notification
 */var SignatureReceivedResult=superstruct.literal('receivedSignature');/**
 * Version info for a node
 */var VersionResult=superstruct.type({'solana-core':superstruct.string(),'feature-set':superstruct.optional(superstruct.number())});var ParsedInstructionStruct=superstruct.type({program:superstruct.string(),programId:PublicKeyFromString,parsed:superstruct.unknown()});var PartiallyDecodedInstructionStruct=superstruct.type({programId:PublicKeyFromString,accounts:superstruct.array(PublicKeyFromString),data:superstruct.string()});var SimulatedTransactionResponseStruct=jsonRpcResultAndContext(superstruct.type({err:superstruct.nullable(superstruct.union([superstruct.type({}),superstruct.string()])),logs:superstruct.nullable(superstruct.array(superstruct.string())),accounts:superstruct.optional(superstruct.nullable(superstruct.array(superstruct.nullable(superstruct.type({executable:superstruct["boolean"](),owner:superstruct.string(),lamports:superstruct.number(),data:superstruct.array(superstruct.string()),rentEpoch:superstruct.optional(superstruct.number())}))))),unitsConsumed:superstruct.optional(superstruct.number()),returnData:superstruct.optional(superstruct.nullable(superstruct.type({programId:superstruct.string(),data:superstruct.tuple([superstruct.string(),superstruct.literal('base64')])}))),innerInstructions:superstruct.optional(superstruct.nullable(superstruct.array(superstruct.type({index:superstruct.number(),instructions:superstruct.array(superstruct.union([ParsedInstructionStruct,PartiallyDecodedInstructionStruct]))}))))}));/**
 * Metadata for a parsed confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionMeta} instead.
 *//**
 * Collection of addresses loaded by a transaction using address table lookups
 *//**
 * Metadata for a parsed transaction on the ledger
 *//**
 * Metadata for a confirmed transaction on the ledger
 *//**
 * A processed transaction from the RPC API
 *//**
 * A processed transaction from the RPC API
 *//**
 * A processed transaction message from the RPC API
 *//**
 * A confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 *//**
 * A partially decoded transaction instruction
 *//**
 * A parsed transaction message account
 *//**
 * A parsed transaction instruction
 *//**
 * A parsed address table lookup
 *//**
 * A parsed transaction message
 *//**
 * A parsed transaction
 *//**
 * A parsed and confirmed transaction on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionWithMeta} instead.
 *//**
 * A parsed transaction on the ledger with meta
 *//**
 * A processed block fetched from the RPC API
 *//**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 *//**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 *//**
 * A block with parsed transactions
 *//**
 * A block with parsed transactions where the `transactionDetails` mode is `accounts`
 *//**
 * A block with parsed transactions where the `transactionDetails` mode is `none`
 *//**
 * A processed block fetched from the RPC API
 *//**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
 *//**
 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
 *//**
 * A confirmed block on the ledger
 *
 * @deprecated Deprecated since RPC v1.8.0.
 *//**
 * A Block on the ledger with signatures only
 *//**
 * recent block production information
 *//**
 * Expected JSON RPC response for the "getBlockProduction" message
 */var BlockProductionResponseStruct=jsonRpcResultAndContext(superstruct.type({byIdentity:superstruct.record(superstruct.string(),superstruct.array(superstruct.number())),range:superstruct.type({firstSlot:superstruct.number(),lastSlot:superstruct.number()})}));/**
 * A performance sample
 */function createRpcClient(url,httpHeaders,customFetch,fetchMiddleware,disableRetryOnRateLimit,httpAgent){var fetch=customFetch?customFetch:fetchImpl;var agent;{if(httpAgent!=null){console.warn('You have supplied an `httpAgent` when creating a `Connection` in a browser environment.'+'It has been ignored; `httpAgent` is only used in Node environments.');}}var fetchWithMiddleware;if(fetchMiddleware){fetchWithMiddleware=/*#__PURE__*/function(){var _ref23=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee7(info,init){var modifiedFetchArgs;return _regeneratorRuntime().wrap(function _callee7$(_context7){while(1)switch(_context7.prev=_context7.next){case 0:_context7.next=2;return new Promise(function(resolve,reject){try{fetchMiddleware(info,init,function(modifiedInfo,modifiedInit){return resolve([modifiedInfo,modifiedInit]);});}catch(error){reject(error);}});case 2:modifiedFetchArgs=_context7.sent;_context7.next=5;return fetch.apply(void 0,_toConsumableArray(modifiedFetchArgs));case 5:return _context7.abrupt("return",_context7.sent);case 6:case"end":return _context7.stop();}},_callee7);}));return function fetchWithMiddleware(_x19,_x20){return _ref23.apply(this,arguments);};}();}var clientBrowser=new RpcClient__default["default"](/*#__PURE__*/function(){var _ref24=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee8(request,callback){var options,too_many_requests_retries,res,waitTime,text;return _regeneratorRuntime().wrap(function _callee8$(_context8){while(1)switch(_context8.prev=_context8.next){case 0:options={method:'POST',body:request,agent:agent,headers:Object.assign({'Content-Type':'application/json'},httpHeaders||{},COMMON_HTTP_HEADERS)};_context8.prev=1;too_many_requests_retries=5;waitTime=500;case 4:if(!fetchWithMiddleware){_context8.next=10;break;}_context8.next=7;return fetchWithMiddleware(url,options);case 7:res=_context8.sent;_context8.next=13;break;case 10:_context8.next=12;return fetch(url,options);case 12:res=_context8.sent;case 13:if(!(res.status!==429/* Too many requests */)){_context8.next=15;break;}return _context8.abrupt("break",26);case 15:if(!(disableRetryOnRateLimit===true)){_context8.next=17;break;}return _context8.abrupt("break",26);case 17:too_many_requests_retries-=1;if(!(too_many_requests_retries===0)){_context8.next=20;break;}return _context8.abrupt("break",26);case 20:console.error("Server responded with ".concat(res.status," ").concat(res.statusText,".  Retrying after ").concat(waitTime,"ms delay..."));_context8.next=23;return sleep(waitTime);case 23:waitTime*=2;case 24:_context8.next=4;break;case 26:_context8.next=28;return res.text();case 28:text=_context8.sent;if(res.ok){callback(null,text);}else{callback(new Error("".concat(res.status," ").concat(res.statusText,": ").concat(text)));}_context8.next=35;break;case 32:_context8.prev=32;_context8.t0=_context8["catch"](1);if(_context8.t0 instanceof Error)callback(_context8.t0);case 35:case"end":return _context8.stop();}},_callee8,null,[[1,32]]);}));return function(_x21,_x22){return _ref24.apply(this,arguments);};}(),{});return clientBrowser;}function createRpcRequest(client){return function(method,args){return new Promise(function(resolve,reject){client.request(method,args,function(err,response){if(err){reject(err);return;}resolve(response);});});};}function createRpcBatchRequest(client){return function(requests){return new Promise(function(resolve,reject){// Do nothing if requests is empty
if(requests.length===0)resolve([]);var batch=requests.map(function(params){return client.request(params.methodName,params.args);});client.request(batch,function(err,response){if(err){reject(err);return;}resolve(response);});});};}/**
 * Expected JSON RPC response for the "getInflationGovernor" message
 */var GetInflationGovernorRpcResult=jsonRpcResult(GetInflationGovernorResult);/**
 * Expected JSON RPC response for the "getInflationRate" message
 */var GetInflationRateRpcResult=jsonRpcResult(GetInflationRateResult);/**
 * Expected JSON RPC response for the "getRecentPrioritizationFees" message
 */var GetRecentPrioritizationFeesRpcResult=jsonRpcResult(GetRecentPrioritizationFeesResult);/**
 * Expected JSON RPC response for the "getEpochInfo" message
 */var GetEpochInfoRpcResult=jsonRpcResult(GetEpochInfoResult);/**
 * Expected JSON RPC response for the "getEpochSchedule" message
 */var GetEpochScheduleRpcResult=jsonRpcResult(GetEpochScheduleResult);/**
 * Expected JSON RPC response for the "getLeaderSchedule" message
 */var GetLeaderScheduleRpcResult=jsonRpcResult(GetLeaderScheduleResult);/**
 * Expected JSON RPC response for the "minimumLedgerSlot" and "getFirstAvailableBlock" messages
 */var SlotRpcResult=jsonRpcResult(superstruct.number());/**
 * Supply
 *//**
 * Expected JSON RPC response for the "getSupply" message
 */var GetSupplyRpcResult=jsonRpcResultAndContext(superstruct.type({total:superstruct.number(),circulating:superstruct.number(),nonCirculating:superstruct.number(),nonCirculatingAccounts:superstruct.array(PublicKeyFromString)}));/**
 * Token amount object which returns a token amount in different formats
 * for various client use cases.
 *//**
 * Expected JSON RPC structure for token amounts
 */var TokenAmountResult=superstruct.type({amount:superstruct.string(),uiAmount:superstruct.nullable(superstruct.number()),decimals:superstruct.number(),uiAmountString:superstruct.optional(superstruct.string())});/**
 * Token address and balance.
 *//**
 * Expected JSON RPC response for the "getTokenLargestAccounts" message
 */var GetTokenLargestAccountsResult=jsonRpcResultAndContext(superstruct.array(superstruct.type({address:PublicKeyFromString,amount:superstruct.string(),uiAmount:superstruct.nullable(superstruct.number()),decimals:superstruct.number(),uiAmountString:superstruct.optional(superstruct.string())})));/**
 * Expected JSON RPC response for the "getTokenAccountsByOwner" message
 */var GetTokenAccountsByOwner=jsonRpcResultAndContext(superstruct.array(superstruct.type({pubkey:PublicKeyFromString,account:superstruct.type({executable:superstruct["boolean"](),owner:PublicKeyFromString,lamports:superstruct.number(),data:BufferFromRawAccountData,rentEpoch:superstruct.number()})})));var ParsedAccountDataResult=superstruct.type({program:superstruct.string(),parsed:superstruct.unknown(),space:superstruct.number()});/**
 * Expected JSON RPC response for the "getTokenAccountsByOwner" message with parsed data
 */var GetParsedTokenAccountsByOwner=jsonRpcResultAndContext(superstruct.array(superstruct.type({pubkey:PublicKeyFromString,account:superstruct.type({executable:superstruct["boolean"](),owner:PublicKeyFromString,lamports:superstruct.number(),data:ParsedAccountDataResult,rentEpoch:superstruct.number()})})));/**
 * Pair of an account address and its balance
 *//**
 * Expected JSON RPC response for the "getLargestAccounts" message
 */var GetLargestAccountsRpcResult=jsonRpcResultAndContext(superstruct.array(superstruct.type({lamports:superstruct.number(),address:PublicKeyFromString})));/**
 * @internal
 */var AccountInfoResult=superstruct.type({executable:superstruct["boolean"](),owner:PublicKeyFromString,lamports:superstruct.number(),data:BufferFromRawAccountData,rentEpoch:superstruct.number()});/**
 * @internal
 */var KeyedAccountInfoResult=superstruct.type({pubkey:PublicKeyFromString,account:AccountInfoResult});var ParsedOrRawAccountData=superstruct.coerce(superstruct.union([superstruct.instance(buffer.Buffer),ParsedAccountDataResult]),superstruct.union([RawAccountDataResult,ParsedAccountDataResult]),function(value){if(Array.isArray(value)){return superstruct.create(value,BufferFromRawAccountData);}else{return value;}});/**
 * @internal
 */var ParsedAccountInfoResult=superstruct.type({executable:superstruct["boolean"](),owner:PublicKeyFromString,lamports:superstruct.number(),data:ParsedOrRawAccountData,rentEpoch:superstruct.number()});var KeyedParsedAccountInfoResult=superstruct.type({pubkey:PublicKeyFromString,account:ParsedAccountInfoResult});/**
 * @internal
 */var StakeActivationResult=superstruct.type({state:superstruct.union([superstruct.literal('active'),superstruct.literal('inactive'),superstruct.literal('activating'),superstruct.literal('deactivating')]),active:superstruct.number(),inactive:superstruct.number()});/**
 * Expected JSON RPC response for the "getConfirmedSignaturesForAddress2" message
 */var GetConfirmedSignaturesForAddress2RpcResult=jsonRpcResult(superstruct.array(superstruct.type({signature:superstruct.string(),slot:superstruct.number(),err:TransactionErrorResult,memo:superstruct.nullable(superstruct.string()),blockTime:superstruct.optional(superstruct.nullable(superstruct.number()))})));/**
 * Expected JSON RPC response for the "getSignaturesForAddress" message
 */var GetSignaturesForAddressRpcResult=jsonRpcResult(superstruct.array(superstruct.type({signature:superstruct.string(),slot:superstruct.number(),err:TransactionErrorResult,memo:superstruct.nullable(superstruct.string()),blockTime:superstruct.optional(superstruct.nullable(superstruct.number()))})));/***
 * Expected JSON RPC response for the "accountNotification" message
 */var AccountNotificationResult=superstruct.type({subscription:superstruct.number(),result:notificationResultAndContext(AccountInfoResult)});/**
 * @internal
 */var ProgramAccountInfoResult=superstruct.type({pubkey:PublicKeyFromString,account:AccountInfoResult});/***
 * Expected JSON RPC response for the "programNotification" message
 */var ProgramAccountNotificationResult=superstruct.type({subscription:superstruct.number(),result:notificationResultAndContext(ProgramAccountInfoResult)});/**
 * @internal
 */var SlotInfoResult=superstruct.type({parent:superstruct.number(),slot:superstruct.number(),root:superstruct.number()});/**
 * Expected JSON RPC response for the "slotNotification" message
 */var SlotNotificationResult=superstruct.type({subscription:superstruct.number(),result:SlotInfoResult});/**
 * Slot updates which can be used for tracking the live progress of a cluster.
 * - `"firstShredReceived"`: connected node received the first shred of a block.
 * Indicates that a new block that is being produced.
 * - `"completed"`: connected node has received all shreds of a block. Indicates
 * a block was recently produced.
 * - `"optimisticConfirmation"`: block was optimistically confirmed by the
 * cluster. It is not guaranteed that an optimistic confirmation notification
 * will be sent for every finalized blocks.
 * - `"root"`: the connected node rooted this block.
 * - `"createdBank"`: the connected node has started validating this block.
 * - `"frozen"`: the connected node has validated this block.
 * - `"dead"`: the connected node failed to validate this block.
 *//**
 * @internal
 */var SlotUpdateResult=superstruct.union([superstruct.type({type:superstruct.union([superstruct.literal('firstShredReceived'),superstruct.literal('completed'),superstruct.literal('optimisticConfirmation'),superstruct.literal('root')]),slot:superstruct.number(),timestamp:superstruct.number()}),superstruct.type({type:superstruct.literal('createdBank'),parent:superstruct.number(),slot:superstruct.number(),timestamp:superstruct.number()}),superstruct.type({type:superstruct.literal('frozen'),slot:superstruct.number(),timestamp:superstruct.number(),stats:superstruct.type({numTransactionEntries:superstruct.number(),numSuccessfulTransactions:superstruct.number(),numFailedTransactions:superstruct.number(),maxTransactionsPerEntry:superstruct.number()})}),superstruct.type({type:superstruct.literal('dead'),slot:superstruct.number(),timestamp:superstruct.number(),err:superstruct.string()})]);/**
 * Expected JSON RPC response for the "slotsUpdatesNotification" message
 */var SlotUpdateNotificationResult=superstruct.type({subscription:superstruct.number(),result:SlotUpdateResult});/**
 * Expected JSON RPC response for the "signatureNotification" message
 */var SignatureNotificationResult=superstruct.type({subscription:superstruct.number(),result:notificationResultAndContext(superstruct.union([SignatureStatusResult,SignatureReceivedResult]))});/**
 * Expected JSON RPC response for the "rootNotification" message
 */var RootNotificationResult=superstruct.type({subscription:superstruct.number(),result:superstruct.number()});var ContactInfoResult=superstruct.type({pubkey:superstruct.string(),gossip:superstruct.nullable(superstruct.string()),tpu:superstruct.nullable(superstruct.string()),rpc:superstruct.nullable(superstruct.string()),version:superstruct.nullable(superstruct.string())});var VoteAccountInfoResult=superstruct.type({votePubkey:superstruct.string(),nodePubkey:superstruct.string(),activatedStake:superstruct.number(),epochVoteAccount:superstruct["boolean"](),epochCredits:superstruct.array(superstruct.tuple([superstruct.number(),superstruct.number(),superstruct.number()])),commission:superstruct.number(),lastVote:superstruct.number(),rootSlot:superstruct.nullable(superstruct.number())});/**
 * Expected JSON RPC response for the "getVoteAccounts" message
 */var GetVoteAccounts=jsonRpcResult(superstruct.type({current:superstruct.array(VoteAccountInfoResult),delinquent:superstruct.array(VoteAccountInfoResult)}));var ConfirmationStatus=superstruct.union([superstruct.literal('processed'),superstruct.literal('confirmed'),superstruct.literal('finalized')]);var SignatureStatusResponse=superstruct.type({slot:superstruct.number(),confirmations:superstruct.nullable(superstruct.number()),err:TransactionErrorResult,confirmationStatus:superstruct.optional(ConfirmationStatus)});/**
 * Expected JSON RPC response for the "getSignatureStatuses" message
 */var GetSignatureStatusesRpcResult=jsonRpcResultAndContext(superstruct.array(superstruct.nullable(SignatureStatusResponse)));/**
 * Expected JSON RPC response for the "getMinimumBalanceForRentExemption" message
 */var GetMinimumBalanceForRentExemptionRpcResult=jsonRpcResult(superstruct.number());var AddressTableLookupStruct=superstruct.type({accountKey:PublicKeyFromString,writableIndexes:superstruct.array(superstruct.number()),readonlyIndexes:superstruct.array(superstruct.number())});var ConfirmedTransactionResult=superstruct.type({signatures:superstruct.array(superstruct.string()),message:superstruct.type({accountKeys:superstruct.array(superstruct.string()),header:superstruct.type({numRequiredSignatures:superstruct.number(),numReadonlySignedAccounts:superstruct.number(),numReadonlyUnsignedAccounts:superstruct.number()}),instructions:superstruct.array(superstruct.type({accounts:superstruct.array(superstruct.number()),data:superstruct.string(),programIdIndex:superstruct.number()})),recentBlockhash:superstruct.string(),addressTableLookups:superstruct.optional(superstruct.array(AddressTableLookupStruct))})});var AnnotatedAccountKey=superstruct.type({pubkey:PublicKeyFromString,signer:superstruct["boolean"](),writable:superstruct["boolean"](),source:superstruct.optional(superstruct.union([superstruct.literal('transaction'),superstruct.literal('lookupTable')]))});var ConfirmedTransactionAccountsModeResult=superstruct.type({accountKeys:superstruct.array(AnnotatedAccountKey),signatures:superstruct.array(superstruct.string())});var ParsedInstructionResult=superstruct.type({parsed:superstruct.unknown(),program:superstruct.string(),programId:PublicKeyFromString});var RawInstructionResult=superstruct.type({accounts:superstruct.array(PublicKeyFromString),data:superstruct.string(),programId:PublicKeyFromString});var InstructionResult=superstruct.union([RawInstructionResult,ParsedInstructionResult]);var UnknownInstructionResult=superstruct.union([superstruct.type({parsed:superstruct.unknown(),program:superstruct.string(),programId:superstruct.string()}),superstruct.type({accounts:superstruct.array(superstruct.string()),data:superstruct.string(),programId:superstruct.string()})]);var ParsedOrRawInstruction=superstruct.coerce(InstructionResult,UnknownInstructionResult,function(value){if('accounts'in value){return superstruct.create(value,RawInstructionResult);}else{return superstruct.create(value,ParsedInstructionResult);}});/**
 * @internal
 */var ParsedConfirmedTransactionResult=superstruct.type({signatures:superstruct.array(superstruct.string()),message:superstruct.type({accountKeys:superstruct.array(AnnotatedAccountKey),instructions:superstruct.array(ParsedOrRawInstruction),recentBlockhash:superstruct.string(),addressTableLookups:superstruct.optional(superstruct.nullable(superstruct.array(AddressTableLookupStruct)))})});var TokenBalanceResult=superstruct.type({accountIndex:superstruct.number(),mint:superstruct.string(),owner:superstruct.optional(superstruct.string()),uiTokenAmount:TokenAmountResult});var LoadedAddressesResult=superstruct.type({writable:superstruct.array(PublicKeyFromString),readonly:superstruct.array(PublicKeyFromString)});/**
 * @internal
 */var ConfirmedTransactionMetaResult=superstruct.type({err:TransactionErrorResult,fee:superstruct.number(),innerInstructions:superstruct.optional(superstruct.nullable(superstruct.array(superstruct.type({index:superstruct.number(),instructions:superstruct.array(superstruct.type({accounts:superstruct.array(superstruct.number()),data:superstruct.string(),programIdIndex:superstruct.number()}))})))),preBalances:superstruct.array(superstruct.number()),postBalances:superstruct.array(superstruct.number()),logMessages:superstruct.optional(superstruct.nullable(superstruct.array(superstruct.string()))),preTokenBalances:superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),postTokenBalances:superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),loadedAddresses:superstruct.optional(LoadedAddressesResult),computeUnitsConsumed:superstruct.optional(superstruct.number())});/**
 * @internal
 */var ParsedConfirmedTransactionMetaResult=superstruct.type({err:TransactionErrorResult,fee:superstruct.number(),innerInstructions:superstruct.optional(superstruct.nullable(superstruct.array(superstruct.type({index:superstruct.number(),instructions:superstruct.array(ParsedOrRawInstruction)})))),preBalances:superstruct.array(superstruct.number()),postBalances:superstruct.array(superstruct.number()),logMessages:superstruct.optional(superstruct.nullable(superstruct.array(superstruct.string()))),preTokenBalances:superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),postTokenBalances:superstruct.optional(superstruct.nullable(superstruct.array(TokenBalanceResult))),loadedAddresses:superstruct.optional(LoadedAddressesResult),computeUnitsConsumed:superstruct.optional(superstruct.number())});var TransactionVersionStruct=superstruct.union([superstruct.literal(0),superstruct.literal('legacy')]);/** @internal */var RewardsResult=superstruct.type({pubkey:superstruct.string(),lamports:superstruct.number(),postBalance:superstruct.nullable(superstruct.number()),rewardType:superstruct.nullable(superstruct.string()),commission:superstruct.optional(superstruct.nullable(superstruct.number()))});/**
 * Expected JSON RPC response for the "getBlock" message
 */var GetBlockRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),transactions:superstruct.array(superstruct.type({transaction:ConfirmedTransactionResult,meta:superstruct.nullable(ConfirmedTransactionMetaResult),version:superstruct.optional(TransactionVersionStruct)})),rewards:superstruct.optional(superstruct.array(RewardsResult)),blockTime:superstruct.nullable(superstruct.number()),blockHeight:superstruct.nullable(superstruct.number())})));/**
 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `none`
 */var GetNoneModeBlockRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),rewards:superstruct.optional(superstruct.array(RewardsResult)),blockTime:superstruct.nullable(superstruct.number()),blockHeight:superstruct.nullable(superstruct.number())})));/**
 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `accounts`
 */var GetAccountsModeBlockRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),transactions:superstruct.array(superstruct.type({transaction:ConfirmedTransactionAccountsModeResult,meta:superstruct.nullable(ConfirmedTransactionMetaResult),version:superstruct.optional(TransactionVersionStruct)})),rewards:superstruct.optional(superstruct.array(RewardsResult)),blockTime:superstruct.nullable(superstruct.number()),blockHeight:superstruct.nullable(superstruct.number())})));/**
 * Expected parsed JSON RPC response for the "getBlock" message
 */var GetParsedBlockRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),transactions:superstruct.array(superstruct.type({transaction:ParsedConfirmedTransactionResult,meta:superstruct.nullable(ParsedConfirmedTransactionMetaResult),version:superstruct.optional(TransactionVersionStruct)})),rewards:superstruct.optional(superstruct.array(RewardsResult)),blockTime:superstruct.nullable(superstruct.number()),blockHeight:superstruct.nullable(superstruct.number())})));/**
 * Expected parsed JSON RPC response for the "getBlock" message  when `transactionDetails` is `accounts`
 */var GetParsedAccountsModeBlockRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),transactions:superstruct.array(superstruct.type({transaction:ConfirmedTransactionAccountsModeResult,meta:superstruct.nullable(ParsedConfirmedTransactionMetaResult),version:superstruct.optional(TransactionVersionStruct)})),rewards:superstruct.optional(superstruct.array(RewardsResult)),blockTime:superstruct.nullable(superstruct.number()),blockHeight:superstruct.nullable(superstruct.number())})));/**
 * Expected parsed JSON RPC response for the "getBlock" message  when `transactionDetails` is `none`
 */var GetParsedNoneModeBlockRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),rewards:superstruct.optional(superstruct.array(RewardsResult)),blockTime:superstruct.nullable(superstruct.number()),blockHeight:superstruct.nullable(superstruct.number())})));/**
 * Expected JSON RPC response for the "getConfirmedBlock" message
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link GetBlockRpcResult} instead.
 */var GetConfirmedBlockRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),transactions:superstruct.array(superstruct.type({transaction:ConfirmedTransactionResult,meta:superstruct.nullable(ConfirmedTransactionMetaResult)})),rewards:superstruct.optional(superstruct.array(RewardsResult)),blockTime:superstruct.nullable(superstruct.number())})));/**
 * Expected JSON RPC response for the "getBlock" message
 */var GetBlockSignaturesRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({blockhash:superstruct.string(),previousBlockhash:superstruct.string(),parentSlot:superstruct.number(),signatures:superstruct.array(superstruct.string()),blockTime:superstruct.nullable(superstruct.number())})));/**
 * Expected JSON RPC response for the "getTransaction" message
 */var GetTransactionRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({slot:superstruct.number(),meta:superstruct.nullable(ConfirmedTransactionMetaResult),blockTime:superstruct.optional(superstruct.nullable(superstruct.number())),transaction:ConfirmedTransactionResult,version:superstruct.optional(TransactionVersionStruct)})));/**
 * Expected parsed JSON RPC response for the "getTransaction" message
 */var GetParsedTransactionRpcResult=jsonRpcResult(superstruct.nullable(superstruct.type({slot:superstruct.number(),transaction:ParsedConfirmedTransactionResult,meta:superstruct.nullable(ParsedConfirmedTransactionMetaResult),blockTime:superstruct.optional(superstruct.nullable(superstruct.number())),version:superstruct.optional(TransactionVersionStruct)})));/**
 * Expected JSON RPC response for the "getRecentBlockhash" message
 *
 * @deprecated Deprecated since RPC v1.8.0. Please use {@link GetLatestBlockhashRpcResult} instead.
 */var GetRecentBlockhashAndContextRpcResult=jsonRpcResultAndContext(superstruct.type({blockhash:superstruct.string(),feeCalculator:superstruct.type({lamportsPerSignature:superstruct.number()})}));/**
 * Expected JSON RPC response for the "getLatestBlockhash" message
 */var GetLatestBlockhashRpcResult=jsonRpcResultAndContext(superstruct.type({blockhash:superstruct.string(),lastValidBlockHeight:superstruct.number()}));/**
 * Expected JSON RPC response for the "isBlockhashValid" message
 */var IsBlockhashValidRpcResult=jsonRpcResultAndContext(superstruct["boolean"]());var PerfSampleResult=superstruct.type({slot:superstruct.number(),numTransactions:superstruct.number(),numSlots:superstruct.number(),samplePeriodSecs:superstruct.number()});/*
 * Expected JSON RPC response for "getRecentPerformanceSamples" message
 */var GetRecentPerformanceSamplesRpcResult=jsonRpcResult(superstruct.array(PerfSampleResult));/**
 * Expected JSON RPC response for the "getFeeCalculatorForBlockhash" message
 */var GetFeeCalculatorRpcResult=jsonRpcResultAndContext(superstruct.nullable(superstruct.type({feeCalculator:superstruct.type({lamportsPerSignature:superstruct.number()})})));/**
 * Expected JSON RPC response for the "requestAirdrop" message
 */var RequestAirdropRpcResult=jsonRpcResult(superstruct.string());/**
 * Expected JSON RPC response for the "sendTransaction" message
 */var SendTransactionRpcResult=jsonRpcResult(superstruct.string());/**
 * Information about the latest slot being processed by a node
 *//**
 * Parsed account data
 *//**
 * Stake Activation data
 *//**
 * Data slice argument for getProgramAccounts
 *//**
 * Memory comparison filter for getProgramAccounts
 *//**
 * Data size comparison filter for getProgramAccounts
 *//**
 * A filter object for getProgramAccounts
 *//**
 * Configuration object for getProgramAccounts requests
 *//**
 * Configuration object for getParsedProgramAccounts
 *//**
 * Configuration object for getMultipleAccounts
 *//**
 * Configuration object for `getStakeActivation`
 *//**
 * Configuration object for `getStakeActivation`
 *//**
 * Configuration object for `getStakeActivation`
 *//**
 * Configuration object for `getNonce`
 *//**
 * Configuration object for `getNonceAndContext`
 *//**
 * Information describing an account
 *//**
 * Account information identified by pubkey
 *//**
 * Callback function for account change notifications
 *//**
 * Callback function for program account change notifications
 *//**
 * Callback function for slot change notifications
 *//**
 * Callback function for slot update notifications
 *//**
 * Callback function for signature status notifications
 *//**
 * Signature status notification with transaction result
 *//**
 * Signature received notification
 *//**
 * Callback function for signature notifications
 *//**
 * Signature subscription options
 *//**
 * Callback function for root change notifications
 *//**
 * @internal
 */var LogsResult=superstruct.type({err:TransactionErrorResult,logs:superstruct.array(superstruct.string()),signature:superstruct.string()});/**
 * Logs result.
 *//**
 * Expected JSON RPC response for the "logsNotification" message.
 */var LogsNotificationResult=superstruct.type({result:notificationResultAndContext(LogsResult),subscription:superstruct.number()});/**
 * Filter for log subscriptions.
 *//**
 * Callback function for log notifications.
 *//**
 * Signature result
 *//**
 * Transaction error
 *//**
 * Transaction confirmation status
 * <pre>
 *   'processed': Transaction landed in a block which has reached 1 confirmation by the connected node
 *   'confirmed': Transaction landed in a block which has reached 1 confirmation by the cluster
 *   'finalized': Transaction landed in a block which has been finalized by the cluster
 * </pre>
 *//**
 * Signature status
 *//**
 * A confirmed signature with its status
 *//**
 * An object defining headers to be passed to the RPC server
 *//**
 * The type of the JavaScript `fetch()` API
 *//**
 * A callback used to augment the outgoing HTTP request
 *//**
 * Configuration for instantiating a Connection
 *//** @internal */var COMMON_HTTP_HEADERS={'solana-client':"js/".concat("0.0.0-development")};/**
 * A connection to a fullnode JSON RPC endpoint
 */var Connection=/*#__PURE__*/function(){/**
   * Establish a JSON RPC connection
   *
   * @param endpoint URL to the fullnode JSON RPC endpoint
   * @param commitmentOrConfig optional default commitment level or optional ConnectionConfig configuration object
   */function Connection(endpoint,_commitmentOrConfig){var _this16=this;_classCallCheck(this,Connection);/** @internal */this._commitment=void 0;/** @internal */this._confirmTransactionInitialTimeout=void 0;/** @internal */this._rpcEndpoint=void 0;/** @internal */this._rpcWsEndpoint=void 0;/** @internal */this._rpcClient=void 0;/** @internal */this._rpcRequest=void 0;/** @internal */this._rpcBatchRequest=void 0;/** @internal */this._rpcWebSocket=void 0;/** @internal */this._rpcWebSocketConnected=false;/** @internal */this._rpcWebSocketHeartbeat=null;/** @internal */this._rpcWebSocketIdleTimeout=null;/** @internal
     * A number that we increment every time an active connection closes.
     * Used to determine whether the same socket connection that was open
     * when an async operation started is the same one that's active when
     * its continuation fires.
     *
     */this._rpcWebSocketGeneration=0;/** @internal */this._disableBlockhashCaching=false;/** @internal */this._pollingBlockhash=false;/** @internal */this._blockhashInfo={latestBlockhash:null,lastFetch:0,transactionSignatures:[],simulatedSignatures:[]};/** @internal */this._nextClientSubscriptionId=0;/** @internal */this._subscriptionDisposeFunctionsByClientSubscriptionId={};/** @internal */this._subscriptionHashByClientSubscriptionId={};/** @internal */this._subscriptionStateChangeCallbacksByHash={};/** @internal */this._subscriptionCallbacksByServerSubscriptionId={};/** @internal */this._subscriptionsByHash={};/**
     * Special case.
     * After a signature is processed, RPCs automatically dispose of the
     * subscription on the server side. We need to track which of these
     * subscriptions have been disposed in such a way, so that we know
     * whether the client is dealing with a not-yet-processed signature
     * (in which case we must tear down the server subscription) or an
     * already-processed signature (in which case the client can simply
     * clear out the subscription locally without telling the server).
     *
     * NOTE: There is a proposal to eliminate this special case, here:
     * https://github.com/solana-labs/solana/issues/18892
     *//** @internal */this._subscriptionsAutoDisposedByRpc=new Set();/*
     * Returns the current block height of the node
     */this.getBlockHeight=function(){var requestPromises={};return/*#__PURE__*/function(){var _ref25=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee10(commitmentOrConfig){var _requestPromises$requ;var _extractCommitmentFro,commitment,config,args,requestHash;return _regeneratorRuntime().wrap(function _callee10$(_context10){while(1)switch(_context10.prev=_context10.next){case 0:_extractCommitmentFro=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro.commitment,config=_extractCommitmentFro.config;args=_this16._buildArgs([],commitment,undefined/* encoding */,config);requestHash=fastStableStringify$1(args);requestPromises[requestHash]=(_requestPromises$requ=requestPromises[requestHash])!==null&&_requestPromises$requ!==void 0?_requestPromises$requ:_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee9(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee9$(_context9){while(1)switch(_context9.prev=_context9.next){case 0:_context9.prev=0;_context9.next=3;return _this16._rpcRequest('getBlockHeight',args);case 3:unsafeRes=_context9.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.number()));if(!('error'in res)){_context9.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get block height information');case 7:return _context9.abrupt("return",res.result);case 8:_context9.prev=8;delete requestPromises[requestHash];return _context9.finish(8);case 11:case"end":return _context9.stop();}},_callee9,null,[[0,,8,11]]);}))();_context10.next=6;return requestPromises[requestHash];case 6:return _context10.abrupt("return",_context10.sent);case 7:case"end":return _context10.stop();}},_callee10);}));return function(_x23){return _ref25.apply(this,arguments);};}();}();var wsEndpoint;var httpHeaders;var fetch;var fetchMiddleware;var disableRetryOnRateLimit;var httpAgent;if(_commitmentOrConfig&&typeof _commitmentOrConfig==='string'){this._commitment=_commitmentOrConfig;}else if(_commitmentOrConfig){this._commitment=_commitmentOrConfig.commitment;this._confirmTransactionInitialTimeout=_commitmentOrConfig.confirmTransactionInitialTimeout;wsEndpoint=_commitmentOrConfig.wsEndpoint;httpHeaders=_commitmentOrConfig.httpHeaders;fetch=_commitmentOrConfig.fetch;fetchMiddleware=_commitmentOrConfig.fetchMiddleware;disableRetryOnRateLimit=_commitmentOrConfig.disableRetryOnRateLimit;httpAgent=_commitmentOrConfig.httpAgent;}this._rpcEndpoint=assertEndpointUrl(endpoint);this._rpcWsEndpoint=wsEndpoint||makeWebsocketUrl(endpoint);this._rpcClient=createRpcClient(endpoint,httpHeaders,fetch,fetchMiddleware,disableRetryOnRateLimit,httpAgent);this._rpcRequest=createRpcRequest(this._rpcClient);this._rpcBatchRequest=createRpcBatchRequest(this._rpcClient);this._rpcWebSocket=new RpcWebSocketClient(this._rpcWsEndpoint,{autoconnect:false,max_reconnects:Infinity});this._rpcWebSocket.on('open',this._wsOnOpen.bind(this));this._rpcWebSocket.on('error',this._wsOnError.bind(this));this._rpcWebSocket.on('close',this._wsOnClose.bind(this));this._rpcWebSocket.on('accountNotification',this._wsOnAccountNotification.bind(this));this._rpcWebSocket.on('programNotification',this._wsOnProgramAccountNotification.bind(this));this._rpcWebSocket.on('slotNotification',this._wsOnSlotNotification.bind(this));this._rpcWebSocket.on('slotsUpdatesNotification',this._wsOnSlotUpdatesNotification.bind(this));this._rpcWebSocket.on('signatureNotification',this._wsOnSignatureNotification.bind(this));this._rpcWebSocket.on('rootNotification',this._wsOnRootNotification.bind(this));this._rpcWebSocket.on('logsNotification',this._wsOnLogsNotification.bind(this));}/**
   * The default commitment used for requests
   */return _createClass(Connection,[{key:"commitment",get:function get(){return this._commitment;}/**
     * The RPC endpoint
     */},{key:"rpcEndpoint",get:function get(){return this._rpcEndpoint;}/**
     * Fetch the balance for the specified public key, return with context
     */},{key:"getBalanceAndContext",value:function(){var _getBalanceAndContext=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee11(publicKey,commitmentOrConfig){var _extractCommitmentFro2,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee11$(_context11){while(1)switch(_context11.prev=_context11.next){case 0:/** @internal */_extractCommitmentFro2=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro2.commitment,config=_extractCommitmentFro2.config;args=this._buildArgs([publicKey.toBase58()],commitment,undefined/* encoding */,config);_context11.next=4;return this._rpcRequest('getBalance',args);case 4:unsafeRes=_context11.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(superstruct.number()));if(!('error'in res)){_context11.next=8;break;}throw new SolanaJSONRPCError(res.error,"failed to get balance for ".concat(publicKey.toBase58()));case 8:return _context11.abrupt("return",res.result);case 9:case"end":return _context11.stop();}},_callee11,this);}));function getBalanceAndContext(_x24,_x25){return _getBalanceAndContext.apply(this,arguments);}return getBalanceAndContext;}()/**
     * Fetch the balance for the specified public key
     */},{key:"getBalance",value:function(){var _getBalance=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee12(publicKey,commitmentOrConfig){return _regeneratorRuntime().wrap(function _callee12$(_context12){while(1)switch(_context12.prev=_context12.next){case 0:_context12.next=2;return this.getBalanceAndContext(publicKey,commitmentOrConfig).then(function(x){return x.value;})["catch"](function(e){throw new Error('failed to get balance of account '+publicKey.toBase58()+': '+e);});case 2:return _context12.abrupt("return",_context12.sent);case 3:case"end":return _context12.stop();}},_callee12,this);}));function getBalance(_x26,_x27){return _getBalance.apply(this,arguments);}return getBalance;}()/**
     * Fetch the estimated production time of a block
     */},{key:"getBlockTime",value:function(){var _getBlockTime=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee13(slot){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee13$(_context13){while(1)switch(_context13.prev=_context13.next){case 0:_context13.next=2;return this._rpcRequest('getBlockTime',[slot]);case 2:unsafeRes=_context13.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.nullable(superstruct.number())));if(!('error'in res)){_context13.next=6;break;}throw new SolanaJSONRPCError(res.error,"failed to get block time for slot ".concat(slot));case 6:return _context13.abrupt("return",res.result);case 7:case"end":return _context13.stop();}},_callee13,this);}));function getBlockTime(_x28){return _getBlockTime.apply(this,arguments);}return getBlockTime;}()/**
     * Fetch the lowest slot that the node has information about in its ledger.
     * This value may increase over time if the node is configured to purge older ledger data
     */},{key:"getMinimumLedgerSlot",value:function(){var _getMinimumLedgerSlot=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee14(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee14$(_context14){while(1)switch(_context14.prev=_context14.next){case 0:_context14.next=2;return this._rpcRequest('minimumLedgerSlot',[]);case 2:unsafeRes=_context14.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.number()));if(!('error'in res)){_context14.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get minimum ledger slot');case 6:return _context14.abrupt("return",res.result);case 7:case"end":return _context14.stop();}},_callee14,this);}));function getMinimumLedgerSlot(){return _getMinimumLedgerSlot.apply(this,arguments);}return getMinimumLedgerSlot;}()/**
     * Fetch the slot of the lowest confirmed block that has not been purged from the ledger
     */},{key:"getFirstAvailableBlock",value:function(){var _getFirstAvailableBlock=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee15(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee15$(_context15){while(1)switch(_context15.prev=_context15.next){case 0:_context15.next=2;return this._rpcRequest('getFirstAvailableBlock',[]);case 2:unsafeRes=_context15.sent;res=superstruct.create(unsafeRes,SlotRpcResult);if(!('error'in res)){_context15.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get first available block');case 6:return _context15.abrupt("return",res.result);case 7:case"end":return _context15.stop();}},_callee15,this);}));function getFirstAvailableBlock(){return _getFirstAvailableBlock.apply(this,arguments);}return getFirstAvailableBlock;}()/**
     * Fetch information about the current supply
     */},{key:"getSupply",value:function(){var _getSupply=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee16(config){var configArg,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee16$(_context16){while(1)switch(_context16.prev=_context16.next){case 0:configArg={};if(typeof config==='string'){configArg={commitment:config};}else if(config){configArg=_objectSpread(_objectSpread({},config),{},{commitment:config&&config.commitment||this.commitment});}else{configArg={commitment:this.commitment};}_context16.next=4;return this._rpcRequest('getSupply',[configArg]);case 4:unsafeRes=_context16.sent;res=superstruct.create(unsafeRes,GetSupplyRpcResult);if(!('error'in res)){_context16.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get supply');case 8:return _context16.abrupt("return",res.result);case 9:case"end":return _context16.stop();}},_callee16,this);}));function getSupply(_x29){return _getSupply.apply(this,arguments);}return getSupply;}()/**
     * Fetch the current supply of a token mint
     */},{key:"getTokenSupply",value:function(){var _getTokenSupply=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee17(tokenMintAddress,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee17$(_context17){while(1)switch(_context17.prev=_context17.next){case 0:args=this._buildArgs([tokenMintAddress.toBase58()],commitment);_context17.next=3;return this._rpcRequest('getTokenSupply',args);case 3:unsafeRes=_context17.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(TokenAmountResult));if(!('error'in res)){_context17.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get token supply');case 7:return _context17.abrupt("return",res.result);case 8:case"end":return _context17.stop();}},_callee17,this);}));function getTokenSupply(_x30,_x31){return _getTokenSupply.apply(this,arguments);}return getTokenSupply;}()/**
     * Fetch the current balance of a token account
     */},{key:"getTokenAccountBalance",value:function(){var _getTokenAccountBalance=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee18(tokenAddress,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee18$(_context18){while(1)switch(_context18.prev=_context18.next){case 0:args=this._buildArgs([tokenAddress.toBase58()],commitment);_context18.next=3;return this._rpcRequest('getTokenAccountBalance',args);case 3:unsafeRes=_context18.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(TokenAmountResult));if(!('error'in res)){_context18.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get token account balance');case 7:return _context18.abrupt("return",res.result);case 8:case"end":return _context18.stop();}},_callee18,this);}));function getTokenAccountBalance(_x32,_x33){return _getTokenAccountBalance.apply(this,arguments);}return getTokenAccountBalance;}()/**
     * Fetch all the token accounts owned by the specified account
     *
     * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
     */},{key:"getTokenAccountsByOwner",value:function(){var _getTokenAccountsByOwner=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee19(ownerAddress,filter,commitmentOrConfig){var _extractCommitmentFro3,commitment,config,_args,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee19$(_context19){while(1)switch(_context19.prev=_context19.next){case 0:_extractCommitmentFro3=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro3.commitment,config=_extractCommitmentFro3.config;_args=[ownerAddress.toBase58()];if('mint'in filter){_args.push({mint:filter.mint.toBase58()});}else{_args.push({programId:filter.programId.toBase58()});}args=this._buildArgs(_args,commitment,'base64',config);_context19.next=6;return this._rpcRequest('getTokenAccountsByOwner',args);case 6:unsafeRes=_context19.sent;res=superstruct.create(unsafeRes,GetTokenAccountsByOwner);if(!('error'in res)){_context19.next=10;break;}throw new SolanaJSONRPCError(res.error,"failed to get token accounts owned by account ".concat(ownerAddress.toBase58()));case 10:return _context19.abrupt("return",res.result);case 11:case"end":return _context19.stop();}},_callee19,this);}));function getTokenAccountsByOwner(_x34,_x35,_x36){return _getTokenAccountsByOwner.apply(this,arguments);}return getTokenAccountsByOwner;}()/**
     * Fetch parsed token accounts owned by the specified account
     *
     * @return {Promise<RpcResponseAndContext<Array<{pubkey: PublicKey, account: AccountInfo<ParsedAccountData>}>>>}
     */},{key:"getParsedTokenAccountsByOwner",value:function(){var _getParsedTokenAccountsByOwner=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee20(ownerAddress,filter,commitment){var _args,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee20$(_context20){while(1)switch(_context20.prev=_context20.next){case 0:_args=[ownerAddress.toBase58()];if('mint'in filter){_args.push({mint:filter.mint.toBase58()});}else{_args.push({programId:filter.programId.toBase58()});}args=this._buildArgs(_args,commitment,'jsonParsed');_context20.next=5;return this._rpcRequest('getTokenAccountsByOwner',args);case 5:unsafeRes=_context20.sent;res=superstruct.create(unsafeRes,GetParsedTokenAccountsByOwner);if(!('error'in res)){_context20.next=9;break;}throw new SolanaJSONRPCError(res.error,"failed to get token accounts owned by account ".concat(ownerAddress.toBase58()));case 9:return _context20.abrupt("return",res.result);case 10:case"end":return _context20.stop();}},_callee20,this);}));function getParsedTokenAccountsByOwner(_x37,_x38,_x39){return _getParsedTokenAccountsByOwner.apply(this,arguments);}return getParsedTokenAccountsByOwner;}()/**
     * Fetch the 20 largest accounts with their current balances
     */},{key:"getLargestAccounts",value:function(){var _getLargestAccounts=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee21(config){var arg,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee21$(_context21){while(1)switch(_context21.prev=_context21.next){case 0:arg=_objectSpread(_objectSpread({},config),{},{commitment:config&&config.commitment||this.commitment});args=arg.filter||arg.commitment?[arg]:[];_context21.next=4;return this._rpcRequest('getLargestAccounts',args);case 4:unsafeRes=_context21.sent;res=superstruct.create(unsafeRes,GetLargestAccountsRpcResult);if(!('error'in res)){_context21.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get largest accounts');case 8:return _context21.abrupt("return",res.result);case 9:case"end":return _context21.stop();}},_callee21,this);}));function getLargestAccounts(_x40){return _getLargestAccounts.apply(this,arguments);}return getLargestAccounts;}()/**
     * Fetch the 20 largest token accounts with their current balances
     * for a given mint.
     */},{key:"getTokenLargestAccounts",value:function(){var _getTokenLargestAccounts=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee22(mintAddress,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee22$(_context22){while(1)switch(_context22.prev=_context22.next){case 0:args=this._buildArgs([mintAddress.toBase58()],commitment);_context22.next=3;return this._rpcRequest('getTokenLargestAccounts',args);case 3:unsafeRes=_context22.sent;res=superstruct.create(unsafeRes,GetTokenLargestAccountsResult);if(!('error'in res)){_context22.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get token largest accounts');case 7:return _context22.abrupt("return",res.result);case 8:case"end":return _context22.stop();}},_callee22,this);}));function getTokenLargestAccounts(_x41,_x42){return _getTokenLargestAccounts.apply(this,arguments);}return getTokenLargestAccounts;}()/**
     * Fetch all the account info for the specified public key, return with context
     */},{key:"getAccountInfoAndContext",value:function(){var _getAccountInfoAndContext=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee23(publicKey,commitmentOrConfig){var _extractCommitmentFro4,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee23$(_context23){while(1)switch(_context23.prev=_context23.next){case 0:_extractCommitmentFro4=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro4.commitment,config=_extractCommitmentFro4.config;args=this._buildArgs([publicKey.toBase58()],commitment,'base64',config);_context23.next=4;return this._rpcRequest('getAccountInfo',args);case 4:unsafeRes=_context23.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(superstruct.nullable(AccountInfoResult)));if(!('error'in res)){_context23.next=8;break;}throw new SolanaJSONRPCError(res.error,"failed to get info about account ".concat(publicKey.toBase58()));case 8:return _context23.abrupt("return",res.result);case 9:case"end":return _context23.stop();}},_callee23,this);}));function getAccountInfoAndContext(_x43,_x44){return _getAccountInfoAndContext.apply(this,arguments);}return getAccountInfoAndContext;}()/**
     * Fetch parsed account info for the specified public key
     */},{key:"getParsedAccountInfo",value:function(){var _getParsedAccountInfo=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee24(publicKey,commitmentOrConfig){var _extractCommitmentFro5,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee24$(_context24){while(1)switch(_context24.prev=_context24.next){case 0:_extractCommitmentFro5=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro5.commitment,config=_extractCommitmentFro5.config;args=this._buildArgs([publicKey.toBase58()],commitment,'jsonParsed',config);_context24.next=4;return this._rpcRequest('getAccountInfo',args);case 4:unsafeRes=_context24.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(superstruct.nullable(ParsedAccountInfoResult)));if(!('error'in res)){_context24.next=8;break;}throw new SolanaJSONRPCError(res.error,"failed to get info about account ".concat(publicKey.toBase58()));case 8:return _context24.abrupt("return",res.result);case 9:case"end":return _context24.stop();}},_callee24,this);}));function getParsedAccountInfo(_x45,_x46){return _getParsedAccountInfo.apply(this,arguments);}return getParsedAccountInfo;}()/**
     * Fetch all the account info for the specified public key
     */},{key:"getAccountInfo",value:function(){var _getAccountInfo=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee25(publicKey,commitmentOrConfig){var res;return _regeneratorRuntime().wrap(function _callee25$(_context25){while(1)switch(_context25.prev=_context25.next){case 0:_context25.prev=0;_context25.next=3;return this.getAccountInfoAndContext(publicKey,commitmentOrConfig);case 3:res=_context25.sent;return _context25.abrupt("return",res.value);case 7:_context25.prev=7;_context25.t0=_context25["catch"](0);throw new Error('failed to get info about account '+publicKey.toBase58()+': '+_context25.t0);case 10:case"end":return _context25.stop();}},_callee25,this,[[0,7]]);}));function getAccountInfo(_x47,_x48){return _getAccountInfo.apply(this,arguments);}return getAccountInfo;}()/**
     * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
     */},{key:"getMultipleParsedAccounts",value:function(){var _getMultipleParsedAccounts=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee26(publicKeys,rawConfig){var _extractCommitmentFro6,commitment,config,keys,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee26$(_context26){while(1)switch(_context26.prev=_context26.next){case 0:_extractCommitmentFro6=extractCommitmentFromConfig(rawConfig),commitment=_extractCommitmentFro6.commitment,config=_extractCommitmentFro6.config;keys=publicKeys.map(function(key){return key.toBase58();});args=this._buildArgs([keys],commitment,'jsonParsed',config);_context26.next=5;return this._rpcRequest('getMultipleAccounts',args);case 5:unsafeRes=_context26.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(superstruct.array(superstruct.nullable(ParsedAccountInfoResult))));if(!('error'in res)){_context26.next=9;break;}throw new SolanaJSONRPCError(res.error,"failed to get info for accounts ".concat(keys));case 9:return _context26.abrupt("return",res.result);case 10:case"end":return _context26.stop();}},_callee26,this);}));function getMultipleParsedAccounts(_x49,_x50){return _getMultipleParsedAccounts.apply(this,arguments);}return getMultipleParsedAccounts;}()/**
     * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
     */},{key:"getMultipleAccountsInfoAndContext",value:function(){var _getMultipleAccountsInfoAndContext=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee27(publicKeys,commitmentOrConfig){var _extractCommitmentFro7,commitment,config,keys,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee27$(_context27){while(1)switch(_context27.prev=_context27.next){case 0:_extractCommitmentFro7=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro7.commitment,config=_extractCommitmentFro7.config;keys=publicKeys.map(function(key){return key.toBase58();});args=this._buildArgs([keys],commitment,'base64',config);_context27.next=5;return this._rpcRequest('getMultipleAccounts',args);case 5:unsafeRes=_context27.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(superstruct.array(superstruct.nullable(AccountInfoResult))));if(!('error'in res)){_context27.next=9;break;}throw new SolanaJSONRPCError(res.error,"failed to get info for accounts ".concat(keys));case 9:return _context27.abrupt("return",res.result);case 10:case"end":return _context27.stop();}},_callee27,this);}));function getMultipleAccountsInfoAndContext(_x51,_x52){return _getMultipleAccountsInfoAndContext.apply(this,arguments);}return getMultipleAccountsInfoAndContext;}()/**
     * Fetch all the account info for multiple accounts specified by an array of public keys
     */},{key:"getMultipleAccountsInfo",value:function(){var _getMultipleAccountsInfo=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee28(publicKeys,commitmentOrConfig){var res;return _regeneratorRuntime().wrap(function _callee28$(_context28){while(1)switch(_context28.prev=_context28.next){case 0:_context28.next=2;return this.getMultipleAccountsInfoAndContext(publicKeys,commitmentOrConfig);case 2:res=_context28.sent;return _context28.abrupt("return",res.value);case 4:case"end":return _context28.stop();}},_callee28,this);}));function getMultipleAccountsInfo(_x53,_x54){return _getMultipleAccountsInfo.apply(this,arguments);}return getMultipleAccountsInfo;}()/**
     * Returns epoch activation information for a stake account that has been delegated
     *
     * @deprecated Deprecated since RPC v1.18; will be removed in a future version.
     */},{key:"getStakeActivation",value:function(){var _getStakeActivation=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee29(publicKey,commitmentOrConfig,epoch){var _extractCommitmentFro8,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee29$(_context29){while(1)switch(_context29.prev=_context29.next){case 0:_extractCommitmentFro8=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro8.commitment,config=_extractCommitmentFro8.config;args=this._buildArgs([publicKey.toBase58()],commitment,undefined/* encoding */,_objectSpread(_objectSpread({},config),{},{epoch:epoch!=null?epoch:config===null||config===void 0?void 0:config.epoch}));_context29.next=4;return this._rpcRequest('getStakeActivation',args);case 4:unsafeRes=_context29.sent;res=superstruct.create(unsafeRes,jsonRpcResult(StakeActivationResult));if(!('error'in res)){_context29.next=8;break;}throw new SolanaJSONRPCError(res.error,"failed to get Stake Activation ".concat(publicKey.toBase58()));case 8:return _context29.abrupt("return",res.result);case 9:case"end":return _context29.stop();}},_callee29,this);}));function getStakeActivation(_x55,_x56,_x57){return _getStakeActivation.apply(this,arguments);}return getStakeActivation;}()/**
     * Fetch all the accounts owned by the specified program id
     *
     * @return {Promise<Array<{pubkey: PublicKey, account: AccountInfo<Buffer>}>>}
     */// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
},{key:"getProgramAccounts",value:function(){var _getProgramAccounts=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee30(programId,configOrCommitment){var _extractCommitmentFro9,commitment,config,_ref27,encoding,configWithoutEncoding,args,unsafeRes,baseSchema,res;return _regeneratorRuntime().wrap(function _callee30$(_context30){while(1)switch(_context30.prev=_context30.next){case 0:_extractCommitmentFro9=extractCommitmentFromConfig(configOrCommitment),commitment=_extractCommitmentFro9.commitment,config=_extractCommitmentFro9.config;_ref27=config||{},encoding=_ref27.encoding,configWithoutEncoding=_objectWithoutProperties(_ref27,_excluded2);args=this._buildArgs([programId.toBase58()],commitment,encoding||'base64',_objectSpread(_objectSpread({},configWithoutEncoding),configWithoutEncoding.filters?{filters:applyDefaultMemcmpEncodingToFilters(configWithoutEncoding.filters)}:null));_context30.next=5;return this._rpcRequest('getProgramAccounts',args);case 5:unsafeRes=_context30.sent;baseSchema=superstruct.array(KeyedAccountInfoResult);res=configWithoutEncoding.withContext===true?superstruct.create(unsafeRes,jsonRpcResultAndContext(baseSchema)):superstruct.create(unsafeRes,jsonRpcResult(baseSchema));if(!('error'in res)){_context30.next=10;break;}throw new SolanaJSONRPCError(res.error,"failed to get accounts owned by program ".concat(programId.toBase58()));case 10:return _context30.abrupt("return",res.result);case 11:case"end":return _context30.stop();}},_callee30,this);}));function getProgramAccounts(_x58,_x59){return _getProgramAccounts.apply(this,arguments);}return getProgramAccounts;}()/**
     * Fetch and parse all the accounts owned by the specified program id
     *
     * @return {Promise<Array<{pubkey: PublicKey, account: AccountInfo<Buffer | ParsedAccountData>}>>}
     */},{key:"getParsedProgramAccounts",value:function(){var _getParsedProgramAccounts=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee31(programId,configOrCommitment){var _extractCommitmentFro10,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee31$(_context31){while(1)switch(_context31.prev=_context31.next){case 0:_extractCommitmentFro10=extractCommitmentFromConfig(configOrCommitment),commitment=_extractCommitmentFro10.commitment,config=_extractCommitmentFro10.config;args=this._buildArgs([programId.toBase58()],commitment,'jsonParsed',config);_context31.next=4;return this._rpcRequest('getProgramAccounts',args);case 4:unsafeRes=_context31.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.array(KeyedParsedAccountInfoResult)));if(!('error'in res)){_context31.next=8;break;}throw new SolanaJSONRPCError(res.error,"failed to get accounts owned by program ".concat(programId.toBase58()));case 8:return _context31.abrupt("return",res.result);case 9:case"end":return _context31.stop();}},_callee31,this);}));function getParsedProgramAccounts(_x60,_x61){return _getParsedProgramAccounts.apply(this,arguments);}return getParsedProgramAccounts;}()/** @deprecated Instead, call `confirmTransaction` and pass in {@link TransactionConfirmationStrategy} */// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
},{key:"confirmTransaction",value:function(){var _confirmTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee32(strategy,commitment){var rawSignature,_config$abortSignal,config,decodedSignature;return _regeneratorRuntime().wrap(function _callee32$(_context32){while(1)switch(_context32.prev=_context32.next){case 0:if(!(typeof strategy=='string')){_context32.next=4;break;}rawSignature=strategy;_context32.next=8;break;case 4:config=strategy;if(!((_config$abortSignal=config.abortSignal)!==null&&_config$abortSignal!==void 0&&_config$abortSignal.aborted)){_context32.next=7;break;}return _context32.abrupt("return",Promise.reject(config.abortSignal.reason));case 7:rawSignature=config.signature;case 8:_context32.prev=8;decodedSignature=bs58__default["default"].decode(rawSignature);_context32.next=15;break;case 12:_context32.prev=12;_context32.t0=_context32["catch"](8);throw new Error('signature must be base58 encoded: '+rawSignature);case 15:assert(decodedSignature.length===64,'signature has invalid length');if(!(typeof strategy==='string')){_context32.next=22;break;}_context32.next=19;return this.confirmTransactionUsingLegacyTimeoutStrategy({commitment:commitment||this.commitment,signature:rawSignature});case 19:return _context32.abrupt("return",_context32.sent);case 22:if(!('lastValidBlockHeight'in strategy)){_context32.next=28;break;}_context32.next=25;return this.confirmTransactionUsingBlockHeightExceedanceStrategy({commitment:commitment||this.commitment,strategy:strategy});case 25:return _context32.abrupt("return",_context32.sent);case 28:_context32.next=30;return this.confirmTransactionUsingDurableNonceStrategy({commitment:commitment||this.commitment,strategy:strategy});case 30:return _context32.abrupt("return",_context32.sent);case 31:case"end":return _context32.stop();}},_callee32,this,[[8,12]]);}));function confirmTransaction(_x62,_x63){return _confirmTransaction.apply(this,arguments);}return confirmTransaction;}()},{key:"getCancellationPromise",value:function getCancellationPromise(signal){return new Promise(function(_,reject){if(signal==null){return;}if(signal.aborted){reject(signal.reason);}else{signal.addEventListener('abort',function(){reject(signal.reason);});}});}},{key:"getTransactionConfirmationPromise",value:function getTransactionConfirmationPromise(_ref28){var _this17=this;var commitment=_ref28.commitment,signature=_ref28.signature;var signatureSubscriptionId;var disposeSignatureSubscriptionStateChangeObserver;var done=false;var confirmationPromise=new Promise(function(resolve,reject){try{signatureSubscriptionId=_this17.onSignature(signature,function(result,context){signatureSubscriptionId=undefined;var response={context:context,value:result};resolve({__type:TransactionStatus.PROCESSED,response:response});},commitment);var subscriptionSetupPromise=new Promise(function(resolveSubscriptionSetup){if(signatureSubscriptionId==null){resolveSubscriptionSetup();}else{disposeSignatureSubscriptionStateChangeObserver=_this17._onSubscriptionStateChange(signatureSubscriptionId,function(nextState){if(nextState==='subscribed'){resolveSubscriptionSetup();}});}});_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee33(){var response,context,value;return _regeneratorRuntime().wrap(function _callee33$(_context33){while(1)switch(_context33.prev=_context33.next){case 0:_context33.next=2;return subscriptionSetupPromise;case 2:if(!done){_context33.next=4;break;}return _context33.abrupt("return");case 4:_context33.next=6;return _this17.getSignatureStatus(signature);case 6:response=_context33.sent;if(!done){_context33.next=9;break;}return _context33.abrupt("return");case 9:if(!(response==null)){_context33.next=11;break;}return _context33.abrupt("return");case 11:context=response.context,value=response.value;if(!(value==null)){_context33.next=14;break;}return _context33.abrupt("return");case 14:if(!(value!==null&&value!==void 0&&value.err)){_context33.next=18;break;}reject(value.err);_context33.next=29;break;case 18:_context33.t0=commitment;_context33.next=_context33.t0==='confirmed'?21:_context33.t0==='single'?21:_context33.t0==='singleGossip'?21:_context33.t0==='finalized'?24:_context33.t0==='max'?24:_context33.t0==='root'?24:_context33.t0==='processed'?27:_context33.t0==='recent'?27:27;break;case 21:if(!(value.confirmationStatus==='processed')){_context33.next=23;break;}return _context33.abrupt("return");case 23:return _context33.abrupt("break",27);case 24:if(!(value.confirmationStatus==='processed'||value.confirmationStatus==='confirmed')){_context33.next=26;break;}return _context33.abrupt("return");case 26:return _context33.abrupt("break",27);case 27:done=true;resolve({__type:TransactionStatus.PROCESSED,response:{context:context,value:value}});case 29:case"end":return _context33.stop();}},_callee33);}))();}catch(err){reject(err);}});var abortConfirmation=function abortConfirmation(){if(disposeSignatureSubscriptionStateChangeObserver){disposeSignatureSubscriptionStateChangeObserver();disposeSignatureSubscriptionStateChangeObserver=undefined;}if(signatureSubscriptionId!=null){_this17.removeSignatureListener(signatureSubscriptionId);signatureSubscriptionId=undefined;}};return{abortConfirmation:abortConfirmation,confirmationPromise:confirmationPromise};}},{key:"confirmTransactionUsingBlockHeightExceedanceStrategy",value:function(){var _confirmTransactionUsingBlockHeightExceedanceStrategy=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee36(_ref30){var _this18=this;var commitment,_ref30$strategy,abortSignal,lastValidBlockHeight,signature,done,expiryPromise,_this$getTransactionC,abortConfirmation,confirmationPromise,cancellationPromise,result,outcome;return _regeneratorRuntime().wrap(function _callee36$(_context36){while(1)switch(_context36.prev=_context36.next){case 0:commitment=_ref30.commitment,_ref30$strategy=_ref30.strategy,abortSignal=_ref30$strategy.abortSignal,lastValidBlockHeight=_ref30$strategy.lastValidBlockHeight,signature=_ref30$strategy.signature;done=false;expiryPromise=new Promise(function(resolve){var checkBlockHeight=/*#__PURE__*/function(){var _ref31=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee34(){var blockHeight;return _regeneratorRuntime().wrap(function _callee34$(_context34){while(1)switch(_context34.prev=_context34.next){case 0:_context34.prev=0;_context34.next=3;return _this18.getBlockHeight(commitment);case 3:blockHeight=_context34.sent;return _context34.abrupt("return",blockHeight);case 7:_context34.prev=7;_context34.t0=_context34["catch"](0);return _context34.abrupt("return",-1);case 10:case"end":return _context34.stop();}},_callee34,null,[[0,7]]);}));return function checkBlockHeight(){return _ref31.apply(this,arguments);};}();_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee35(){var currentBlockHeight;return _regeneratorRuntime().wrap(function _callee35$(_context35){while(1)switch(_context35.prev=_context35.next){case 0:_context35.next=2;return checkBlockHeight();case 2:currentBlockHeight=_context35.sent;if(!done){_context35.next=5;break;}return _context35.abrupt("return");case 5:if(!(currentBlockHeight<=lastValidBlockHeight)){_context35.next=17;break;}_context35.next=8;return sleep(1000);case 8:if(!done){_context35.next=10;break;}return _context35.abrupt("return");case 10:_context35.next=12;return checkBlockHeight();case 12:currentBlockHeight=_context35.sent;if(!done){_context35.next=15;break;}return _context35.abrupt("return");case 15:_context35.next=5;break;case 17:resolve({__type:TransactionStatus.BLOCKHEIGHT_EXCEEDED});case 18:case"end":return _context35.stop();}},_callee35);}))();});_this$getTransactionC=this.getTransactionConfirmationPromise({commitment:commitment,signature:signature}),abortConfirmation=_this$getTransactionC.abortConfirmation,confirmationPromise=_this$getTransactionC.confirmationPromise;cancellationPromise=this.getCancellationPromise(abortSignal);_context36.prev=5;_context36.next=8;return Promise.race([cancellationPromise,confirmationPromise,expiryPromise]);case 8:outcome=_context36.sent;if(!(outcome.__type===TransactionStatus.PROCESSED)){_context36.next=13;break;}result=outcome.response;_context36.next=14;break;case 13:throw new TransactionExpiredBlockheightExceededError(signature);case 14:_context36.prev=14;done=true;abortConfirmation();return _context36.finish(14);case 18:return _context36.abrupt("return",result);case 19:case"end":return _context36.stop();}},_callee36,this,[[5,,14,18]]);}));function confirmTransactionUsingBlockHeightExceedanceStrategy(_x64){return _confirmTransactionUsingBlockHeightExceedanceStrategy.apply(this,arguments);}return confirmTransactionUsingBlockHeightExceedanceStrategy;}()},{key:"confirmTransactionUsingDurableNonceStrategy",value:function(){var _confirmTransactionUsingDurableNonceStrategy=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee39(_ref33){var _this19=this;var commitment,_ref33$strategy,abortSignal,minContextSlot,nonceAccountPubkey,nonceValue,signature,done,expiryPromise,_this$getTransactionC2,abortConfirmation,confirmationPromise,cancellationPromise,result,outcome,_signatureStatus,signatureStatus,_outcome$slotInWhichN,status,commitmentForStatus,confirmationStatus;return _regeneratorRuntime().wrap(function _callee39$(_context39){while(1)switch(_context39.prev=_context39.next){case 0:commitment=_ref33.commitment,_ref33$strategy=_ref33.strategy,abortSignal=_ref33$strategy.abortSignal,minContextSlot=_ref33$strategy.minContextSlot,nonceAccountPubkey=_ref33$strategy.nonceAccountPubkey,nonceValue=_ref33$strategy.nonceValue,signature=_ref33$strategy.signature;done=false;expiryPromise=new Promise(function(resolve){var currentNonceValue=nonceValue;var lastCheckedSlot=null;var getCurrentNonceValue=/*#__PURE__*/function(){var _ref34=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee37(){var _yield$_this19$getNon,context,nonceAccount;return _regeneratorRuntime().wrap(function _callee37$(_context37){while(1)switch(_context37.prev=_context37.next){case 0:_context37.prev=0;_context37.next=3;return _this19.getNonceAndContext(nonceAccountPubkey,{commitment:commitment,minContextSlot:minContextSlot});case 3:_yield$_this19$getNon=_context37.sent;context=_yield$_this19$getNon.context;nonceAccount=_yield$_this19$getNon.value;lastCheckedSlot=context.slot;return _context37.abrupt("return",nonceAccount===null||nonceAccount===void 0?void 0:nonceAccount.nonce);case 10:_context37.prev=10;_context37.t0=_context37["catch"](0);return _context37.abrupt("return",currentNonceValue);case 13:case"end":return _context37.stop();}},_callee37,null,[[0,10]]);}));return function getCurrentNonceValue(){return _ref34.apply(this,arguments);};}();_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee38(){return _regeneratorRuntime().wrap(function _callee38$(_context38){while(1)switch(_context38.prev=_context38.next){case 0:_context38.next=2;return getCurrentNonceValue();case 2:currentNonceValue=_context38.sent;if(!done){_context38.next=5;break;}return _context38.abrupt("return");case 5:if(!true// eslint-disable-line no-constant-condition
){_context38.next=20;break;}if(!(nonceValue!==currentNonceValue)){_context38.next=9;break;}resolve({__type:TransactionStatus.NONCE_INVALID,slotInWhichNonceDidAdvance:lastCheckedSlot});return _context38.abrupt("return");case 9:_context38.next=11;return sleep(2000);case 11:if(!done){_context38.next=13;break;}return _context38.abrupt("return");case 13:_context38.next=15;return getCurrentNonceValue();case 15:currentNonceValue=_context38.sent;if(!done){_context38.next=18;break;}return _context38.abrupt("return");case 18:_context38.next=5;break;case 20:case"end":return _context38.stop();}},_callee38);}))();});_this$getTransactionC2=this.getTransactionConfirmationPromise({commitment:commitment,signature:signature}),abortConfirmation=_this$getTransactionC2.abortConfirmation,confirmationPromise=_this$getTransactionC2.confirmationPromise;cancellationPromise=this.getCancellationPromise(abortSignal);_context39.prev=5;_context39.next=8;return Promise.race([cancellationPromise,confirmationPromise,expiryPromise]);case 8:outcome=_context39.sent;if(!(outcome.__type===TransactionStatus.PROCESSED)){_context39.next=13;break;}result=outcome.response;_context39.next=47;break;case 13:if(!true// eslint-disable-line no-constant-condition
){_context39.next=27;break;}_context39.next=16;return this.getSignatureStatus(signature);case 16:status=_context39.sent;if(!(status==null)){_context39.next=19;break;}return _context39.abrupt("break",27);case 19:if(!(status.context.slot<((_outcome$slotInWhichN=outcome.slotInWhichNonceDidAdvance)!==null&&_outcome$slotInWhichN!==void 0?_outcome$slotInWhichN:minContextSlot))){_context39.next=23;break;}_context39.next=22;return sleep(400);case 22:return _context39.abrupt("continue",13);case 23:signatureStatus=status;return _context39.abrupt("break",27);case 27:if(!((_signatureStatus=signatureStatus)!==null&&_signatureStatus!==void 0&&_signatureStatus.value)){_context39.next=46;break;}commitmentForStatus=commitment||'finalized';confirmationStatus=signatureStatus.value.confirmationStatus;_context39.t0=commitmentForStatus;_context39.next=_context39.t0==='processed'?33:_context39.t0==='recent'?33:_context39.t0==='confirmed'?36:_context39.t0==='single'?36:_context39.t0==='singleGossip'?36:_context39.t0==='finalized'?39:_context39.t0==='max'?39:_context39.t0==='root'?39:42;break;case 33:if(!(confirmationStatus!=='processed'&&confirmationStatus!=='confirmed'&&confirmationStatus!=='finalized')){_context39.next=35;break;}throw new TransactionExpiredNonceInvalidError(signature);case 35:return _context39.abrupt("break",43);case 36:if(!(confirmationStatus!=='confirmed'&&confirmationStatus!=='finalized')){_context39.next=38;break;}throw new TransactionExpiredNonceInvalidError(signature);case 38:return _context39.abrupt("break",43);case 39:if(!(confirmationStatus!=='finalized')){_context39.next=41;break;}throw new TransactionExpiredNonceInvalidError(signature);case 41:return _context39.abrupt("break",43);case 42:// Exhaustive switch.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
(function(_){})(commitmentForStatus);case 43:result={context:signatureStatus.context,value:{err:signatureStatus.value.err}};_context39.next=47;break;case 46:throw new TransactionExpiredNonceInvalidError(signature);case 47:_context39.prev=47;done=true;abortConfirmation();return _context39.finish(47);case 51:return _context39.abrupt("return",result);case 52:case"end":return _context39.stop();}},_callee39,this,[[5,,47,51]]);}));function confirmTransactionUsingDurableNonceStrategy(_x65){return _confirmTransactionUsingDurableNonceStrategy.apply(this,arguments);}return confirmTransactionUsingDurableNonceStrategy;}()},{key:"confirmTransactionUsingLegacyTimeoutStrategy",value:function(){var _confirmTransactionUsingLegacyTimeoutStrategy=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee40(_ref36){var _this20=this;var commitment,signature,timeoutId,expiryPromise,_this$getTransactionC3,abortConfirmation,confirmationPromise,result,outcome;return _regeneratorRuntime().wrap(function _callee40$(_context40){while(1)switch(_context40.prev=_context40.next){case 0:commitment=_ref36.commitment,signature=_ref36.signature;expiryPromise=new Promise(function(resolve){var timeoutMs=_this20._confirmTransactionInitialTimeout||60*1000;switch(commitment){case'processed':case'recent':case'single':case'confirmed':case'singleGossip':{timeoutMs=_this20._confirmTransactionInitialTimeout||30*1000;break;}}timeoutId=setTimeout(function(){return resolve({__type:TransactionStatus.TIMED_OUT,timeoutMs:timeoutMs});},timeoutMs);});_this$getTransactionC3=this.getTransactionConfirmationPromise({commitment:commitment,signature:signature}),abortConfirmation=_this$getTransactionC3.abortConfirmation,confirmationPromise=_this$getTransactionC3.confirmationPromise;_context40.prev=3;_context40.next=6;return Promise.race([confirmationPromise,expiryPromise]);case 6:outcome=_context40.sent;if(!(outcome.__type===TransactionStatus.PROCESSED)){_context40.next=11;break;}result=outcome.response;_context40.next=12;break;case 11:throw new TransactionExpiredTimeoutError(signature,outcome.timeoutMs/1000);case 12:_context40.prev=12;clearTimeout(timeoutId);abortConfirmation();return _context40.finish(12);case 16:return _context40.abrupt("return",result);case 17:case"end":return _context40.stop();}},_callee40,this,[[3,,12,16]]);}));function confirmTransactionUsingLegacyTimeoutStrategy(_x66){return _confirmTransactionUsingLegacyTimeoutStrategy.apply(this,arguments);}return confirmTransactionUsingLegacyTimeoutStrategy;}()/**
     * Return the list of nodes that are currently participating in the cluster
     */},{key:"getClusterNodes",value:function(){var _getClusterNodes=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee41(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee41$(_context41){while(1)switch(_context41.prev=_context41.next){case 0:_context41.next=2;return this._rpcRequest('getClusterNodes',[]);case 2:unsafeRes=_context41.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.array(ContactInfoResult)));if(!('error'in res)){_context41.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get cluster nodes');case 6:return _context41.abrupt("return",res.result);case 7:case"end":return _context41.stop();}},_callee41,this);}));function getClusterNodes(){return _getClusterNodes.apply(this,arguments);}return getClusterNodes;}()/**
     * Return the list of nodes that are currently participating in the cluster
     */},{key:"getVoteAccounts",value:function(){var _getVoteAccounts=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee42(commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee42$(_context42){while(1)switch(_context42.prev=_context42.next){case 0:args=this._buildArgs([],commitment);_context42.next=3;return this._rpcRequest('getVoteAccounts',args);case 3:unsafeRes=_context42.sent;res=superstruct.create(unsafeRes,GetVoteAccounts);if(!('error'in res)){_context42.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get vote accounts');case 7:return _context42.abrupt("return",res.result);case 8:case"end":return _context42.stop();}},_callee42,this);}));function getVoteAccounts(_x67){return _getVoteAccounts.apply(this,arguments);}return getVoteAccounts;}()/**
     * Fetch the current slot that the node is processing
     */},{key:"getSlot",value:function(){var _getSlot=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee43(commitmentOrConfig){var _extractCommitmentFro11,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee43$(_context43){while(1)switch(_context43.prev=_context43.next){case 0:_extractCommitmentFro11=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro11.commitment,config=_extractCommitmentFro11.config;args=this._buildArgs([],commitment,undefined/* encoding */,config);_context43.next=4;return this._rpcRequest('getSlot',args);case 4:unsafeRes=_context43.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.number()));if(!('error'in res)){_context43.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get slot');case 8:return _context43.abrupt("return",res.result);case 9:case"end":return _context43.stop();}},_callee43,this);}));function getSlot(_x68){return _getSlot.apply(this,arguments);}return getSlot;}()/**
     * Fetch the current slot leader of the cluster
     */},{key:"getSlotLeader",value:function(){var _getSlotLeader=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee44(commitmentOrConfig){var _extractCommitmentFro12,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee44$(_context44){while(1)switch(_context44.prev=_context44.next){case 0:_extractCommitmentFro12=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro12.commitment,config=_extractCommitmentFro12.config;args=this._buildArgs([],commitment,undefined/* encoding */,config);_context44.next=4;return this._rpcRequest('getSlotLeader',args);case 4:unsafeRes=_context44.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.string()));if(!('error'in res)){_context44.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get slot leader');case 8:return _context44.abrupt("return",res.result);case 9:case"end":return _context44.stop();}},_callee44,this);}));function getSlotLeader(_x69){return _getSlotLeader.apply(this,arguments);}return getSlotLeader;}()/**
     * Fetch `limit` number of slot leaders starting from `startSlot`
     *
     * @param startSlot fetch slot leaders starting from this slot
     * @param limit number of slot leaders to return
     */},{key:"getSlotLeaders",value:function(){var _getSlotLeaders=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee45(startSlot,limit){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee45$(_context45){while(1)switch(_context45.prev=_context45.next){case 0:args=[startSlot,limit];_context45.next=3;return this._rpcRequest('getSlotLeaders',args);case 3:unsafeRes=_context45.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.array(PublicKeyFromString)));if(!('error'in res)){_context45.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get slot leaders');case 7:return _context45.abrupt("return",res.result);case 8:case"end":return _context45.stop();}},_callee45,this);}));function getSlotLeaders(_x70,_x71){return _getSlotLeaders.apply(this,arguments);}return getSlotLeaders;}()/**
     * Fetch the current status of a signature
     */},{key:"getSignatureStatus",value:function(){var _getSignatureStatus=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee46(signature,config){var _yield$this$getSignat,context,values,value;return _regeneratorRuntime().wrap(function _callee46$(_context46){while(1)switch(_context46.prev=_context46.next){case 0:_context46.next=2;return this.getSignatureStatuses([signature],config);case 2:_yield$this$getSignat=_context46.sent;context=_yield$this$getSignat.context;values=_yield$this$getSignat.value;assert(values.length===1);value=values[0];return _context46.abrupt("return",{context:context,value:value});case 8:case"end":return _context46.stop();}},_callee46,this);}));function getSignatureStatus(_x72,_x73){return _getSignatureStatus.apply(this,arguments);}return getSignatureStatus;}()/**
     * Fetch the current statuses of a batch of signatures
     */},{key:"getSignatureStatuses",value:function(){var _getSignatureStatuses=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee47(signatures,config){var params,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee47$(_context47){while(1)switch(_context47.prev=_context47.next){case 0:params=[signatures];if(config){params.push(config);}_context47.next=4;return this._rpcRequest('getSignatureStatuses',params);case 4:unsafeRes=_context47.sent;res=superstruct.create(unsafeRes,GetSignatureStatusesRpcResult);if(!('error'in res)){_context47.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get signature status');case 8:return _context47.abrupt("return",res.result);case 9:case"end":return _context47.stop();}},_callee47,this);}));function getSignatureStatuses(_x74,_x75){return _getSignatureStatuses.apply(this,arguments);}return getSignatureStatuses;}()/**
     * Fetch the current transaction count of the cluster
     */},{key:"getTransactionCount",value:function(){var _getTransactionCount=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee48(commitmentOrConfig){var _extractCommitmentFro13,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee48$(_context48){while(1)switch(_context48.prev=_context48.next){case 0:_extractCommitmentFro13=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro13.commitment,config=_extractCommitmentFro13.config;args=this._buildArgs([],commitment,undefined/* encoding */,config);_context48.next=4;return this._rpcRequest('getTransactionCount',args);case 4:unsafeRes=_context48.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.number()));if(!('error'in res)){_context48.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get transaction count');case 8:return _context48.abrupt("return",res.result);case 9:case"end":return _context48.stop();}},_callee48,this);}));function getTransactionCount(_x76){return _getTransactionCount.apply(this,arguments);}return getTransactionCount;}()/**
     * Fetch the current total currency supply of the cluster in lamports
     *
     * @deprecated Deprecated since RPC v1.2.8. Please use {@link getSupply} instead.
     */},{key:"getTotalSupply",value:function(){var _getTotalSupply=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee49(commitment){var result;return _regeneratorRuntime().wrap(function _callee49$(_context49){while(1)switch(_context49.prev=_context49.next){case 0:_context49.next=2;return this.getSupply({commitment:commitment,excludeNonCirculatingAccountsList:true});case 2:result=_context49.sent;return _context49.abrupt("return",result.value.total);case 4:case"end":return _context49.stop();}},_callee49,this);}));function getTotalSupply(_x77){return _getTotalSupply.apply(this,arguments);}return getTotalSupply;}()/**
     * Fetch the cluster InflationGovernor parameters
     */},{key:"getInflationGovernor",value:function(){var _getInflationGovernor=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee50(commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee50$(_context50){while(1)switch(_context50.prev=_context50.next){case 0:args=this._buildArgs([],commitment);_context50.next=3;return this._rpcRequest('getInflationGovernor',args);case 3:unsafeRes=_context50.sent;res=superstruct.create(unsafeRes,GetInflationGovernorRpcResult);if(!('error'in res)){_context50.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get inflation');case 7:return _context50.abrupt("return",res.result);case 8:case"end":return _context50.stop();}},_callee50,this);}));function getInflationGovernor(_x78){return _getInflationGovernor.apply(this,arguments);}return getInflationGovernor;}()/**
     * Fetch the inflation reward for a list of addresses for an epoch
     */},{key:"getInflationReward",value:function(){var _getInflationReward=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee51(addresses,epoch,commitmentOrConfig){var _extractCommitmentFro14,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee51$(_context51){while(1)switch(_context51.prev=_context51.next){case 0:_extractCommitmentFro14=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro14.commitment,config=_extractCommitmentFro14.config;args=this._buildArgs([addresses.map(function(pubkey){return pubkey.toBase58();})],commitment,undefined/* encoding */,_objectSpread(_objectSpread({},config),{},{epoch:epoch!=null?epoch:config===null||config===void 0?void 0:config.epoch}));_context51.next=4;return this._rpcRequest('getInflationReward',args);case 4:unsafeRes=_context51.sent;res=superstruct.create(unsafeRes,GetInflationRewardResult);if(!('error'in res)){_context51.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get inflation reward');case 8:return _context51.abrupt("return",res.result);case 9:case"end":return _context51.stop();}},_callee51,this);}));function getInflationReward(_x79,_x80,_x81){return _getInflationReward.apply(this,arguments);}return getInflationReward;}()/**
     * Fetch the specific inflation values for the current epoch
     */},{key:"getInflationRate",value:function(){var _getInflationRate=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee52(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee52$(_context52){while(1)switch(_context52.prev=_context52.next){case 0:_context52.next=2;return this._rpcRequest('getInflationRate',[]);case 2:unsafeRes=_context52.sent;res=superstruct.create(unsafeRes,GetInflationRateRpcResult);if(!('error'in res)){_context52.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get inflation rate');case 6:return _context52.abrupt("return",res.result);case 7:case"end":return _context52.stop();}},_callee52,this);}));function getInflationRate(){return _getInflationRate.apply(this,arguments);}return getInflationRate;}()/**
     * Fetch the Epoch Info parameters
     */},{key:"getEpochInfo",value:function(){var _getEpochInfo=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee53(commitmentOrConfig){var _extractCommitmentFro15,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee53$(_context53){while(1)switch(_context53.prev=_context53.next){case 0:_extractCommitmentFro15=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro15.commitment,config=_extractCommitmentFro15.config;args=this._buildArgs([],commitment,undefined/* encoding */,config);_context53.next=4;return this._rpcRequest('getEpochInfo',args);case 4:unsafeRes=_context53.sent;res=superstruct.create(unsafeRes,GetEpochInfoRpcResult);if(!('error'in res)){_context53.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get epoch info');case 8:return _context53.abrupt("return",res.result);case 9:case"end":return _context53.stop();}},_callee53,this);}));function getEpochInfo(_x82){return _getEpochInfo.apply(this,arguments);}return getEpochInfo;}()/**
     * Fetch the Epoch Schedule parameters
     */},{key:"getEpochSchedule",value:function(){var _getEpochSchedule=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee54(){var unsafeRes,res,epochSchedule;return _regeneratorRuntime().wrap(function _callee54$(_context54){while(1)switch(_context54.prev=_context54.next){case 0:_context54.next=2;return this._rpcRequest('getEpochSchedule',[]);case 2:unsafeRes=_context54.sent;res=superstruct.create(unsafeRes,GetEpochScheduleRpcResult);if(!('error'in res)){_context54.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get epoch schedule');case 6:epochSchedule=res.result;return _context54.abrupt("return",new EpochSchedule(epochSchedule.slotsPerEpoch,epochSchedule.leaderScheduleSlotOffset,epochSchedule.warmup,epochSchedule.firstNormalEpoch,epochSchedule.firstNormalSlot));case 8:case"end":return _context54.stop();}},_callee54,this);}));function getEpochSchedule(){return _getEpochSchedule.apply(this,arguments);}return getEpochSchedule;}()/**
     * Fetch the leader schedule for the current epoch
     * @return {Promise<RpcResponseAndContext<LeaderSchedule>>}
     */},{key:"getLeaderSchedule",value:function(){var _getLeaderSchedule=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee55(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee55$(_context55){while(1)switch(_context55.prev=_context55.next){case 0:_context55.next=2;return this._rpcRequest('getLeaderSchedule',[]);case 2:unsafeRes=_context55.sent;res=superstruct.create(unsafeRes,GetLeaderScheduleRpcResult);if(!('error'in res)){_context55.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get leader schedule');case 6:return _context55.abrupt("return",res.result);case 7:case"end":return _context55.stop();}},_callee55,this);}));function getLeaderSchedule(){return _getLeaderSchedule.apply(this,arguments);}return getLeaderSchedule;}()/**
     * Fetch the minimum balance needed to exempt an account of `dataLength`
     * size from rent
     */},{key:"getMinimumBalanceForRentExemption",value:function(){var _getMinimumBalanceForRentExemption=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee56(dataLength,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee56$(_context56){while(1)switch(_context56.prev=_context56.next){case 0:args=this._buildArgs([dataLength],commitment);_context56.next=3;return this._rpcRequest('getMinimumBalanceForRentExemption',args);case 3:unsafeRes=_context56.sent;res=superstruct.create(unsafeRes,GetMinimumBalanceForRentExemptionRpcResult);if(!('error'in res)){_context56.next=8;break;}console.warn('Unable to fetch minimum balance for rent exemption');return _context56.abrupt("return",0);case 8:return _context56.abrupt("return",res.result);case 9:case"end":return _context56.stop();}},_callee56,this);}));function getMinimumBalanceForRentExemption(_x83,_x84){return _getMinimumBalanceForRentExemption.apply(this,arguments);}return getMinimumBalanceForRentExemption;}()/**
     * Fetch a recent blockhash from the cluster, return with context
     * @return {Promise<RpcResponseAndContext<{blockhash: Blockhash, feeCalculator: FeeCalculator}>>}
     *
     * @deprecated Deprecated since RPC v1.9.0. Please use {@link getLatestBlockhash} instead.
     */},{key:"getRecentBlockhashAndContext",value:function(){var _getRecentBlockhashAndContext=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee57(commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee57$(_context57){while(1)switch(_context57.prev=_context57.next){case 0:args=this._buildArgs([],commitment);_context57.next=3;return this._rpcRequest('getRecentBlockhash',args);case 3:unsafeRes=_context57.sent;res=superstruct.create(unsafeRes,GetRecentBlockhashAndContextRpcResult);if(!('error'in res)){_context57.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get recent blockhash');case 7:return _context57.abrupt("return",res.result);case 8:case"end":return _context57.stop();}},_callee57,this);}));function getRecentBlockhashAndContext(_x85){return _getRecentBlockhashAndContext.apply(this,arguments);}return getRecentBlockhashAndContext;}()/**
     * Fetch recent performance samples
     * @return {Promise<Array<PerfSample>>}
     */},{key:"getRecentPerformanceSamples",value:function(){var _getRecentPerformanceSamples=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee58(limit){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee58$(_context58){while(1)switch(_context58.prev=_context58.next){case 0:_context58.next=2;return this._rpcRequest('getRecentPerformanceSamples',limit?[limit]:[]);case 2:unsafeRes=_context58.sent;res=superstruct.create(unsafeRes,GetRecentPerformanceSamplesRpcResult);if(!('error'in res)){_context58.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get recent performance samples');case 6:return _context58.abrupt("return",res.result);case 7:case"end":return _context58.stop();}},_callee58,this);}));function getRecentPerformanceSamples(_x86){return _getRecentPerformanceSamples.apply(this,arguments);}return getRecentPerformanceSamples;}()/**
     * Fetch the fee calculator for a recent blockhash from the cluster, return with context
     *
     * @deprecated Deprecated since RPC v1.9.0. Please use {@link getFeeForMessage} instead.
     */},{key:"getFeeCalculatorForBlockhash",value:function(){var _getFeeCalculatorForBlockhash=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee59(blockhash,commitment){var args,unsafeRes,res,_res$result,context,value;return _regeneratorRuntime().wrap(function _callee59$(_context59){while(1)switch(_context59.prev=_context59.next){case 0:args=this._buildArgs([blockhash],commitment);_context59.next=3;return this._rpcRequest('getFeeCalculatorForBlockhash',args);case 3:unsafeRes=_context59.sent;res=superstruct.create(unsafeRes,GetFeeCalculatorRpcResult);if(!('error'in res)){_context59.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get fee calculator');case 7:_res$result=res.result,context=_res$result.context,value=_res$result.value;return _context59.abrupt("return",{context:context,value:value!==null?value.feeCalculator:null});case 9:case"end":return _context59.stop();}},_callee59,this);}));function getFeeCalculatorForBlockhash(_x87,_x88){return _getFeeCalculatorForBlockhash.apply(this,arguments);}return getFeeCalculatorForBlockhash;}()/**
     * Fetch the fee for a message from the cluster, return with context
     */},{key:"getFeeForMessage",value:function(){var _getFeeForMessage=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee60(message,commitment){var wireMessage,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee60$(_context60){while(1)switch(_context60.prev=_context60.next){case 0:wireMessage=toBuffer(message.serialize()).toString('base64');args=this._buildArgs([wireMessage],commitment);_context60.next=4;return this._rpcRequest('getFeeForMessage',args);case 4:unsafeRes=_context60.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(superstruct.nullable(superstruct.number())));if(!('error'in res)){_context60.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get fee for message');case 8:if(!(res.result===null)){_context60.next=10;break;}throw new Error('invalid blockhash');case 10:return _context60.abrupt("return",res.result);case 11:case"end":return _context60.stop();}},_callee60,this);}));function getFeeForMessage(_x89,_x90){return _getFeeForMessage.apply(this,arguments);}return getFeeForMessage;}()/**
     * Fetch a list of prioritization fees from recent blocks.
     */},{key:"getRecentPrioritizationFees",value:function(){var _getRecentPrioritizationFees=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee61(config){var _config$lockedWritabl;var accounts,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee61$(_context61){while(1)switch(_context61.prev=_context61.next){case 0:accounts=config===null||config===void 0||(_config$lockedWritabl=config.lockedWritableAccounts)===null||_config$lockedWritabl===void 0?void 0:_config$lockedWritabl.map(function(key){return key.toBase58();});args=accounts!==null&&accounts!==void 0&&accounts.length?[accounts]:[];_context61.next=4;return this._rpcRequest('getRecentPrioritizationFees',args);case 4:unsafeRes=_context61.sent;res=superstruct.create(unsafeRes,GetRecentPrioritizationFeesRpcResult);if(!('error'in res)){_context61.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get recent prioritization fees');case 8:return _context61.abrupt("return",res.result);case 9:case"end":return _context61.stop();}},_callee61,this);}));function getRecentPrioritizationFees(_x91){return _getRecentPrioritizationFees.apply(this,arguments);}return getRecentPrioritizationFees;}()/**
     * Fetch a recent blockhash from the cluster
     * @return {Promise<{blockhash: Blockhash, feeCalculator: FeeCalculator}>}
     *
     * @deprecated Deprecated since RPC v1.8.0. Please use {@link getLatestBlockhash} instead.
     */},{key:"getRecentBlockhash",value:function(){var _getRecentBlockhash=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee62(commitment){var res;return _regeneratorRuntime().wrap(function _callee62$(_context62){while(1)switch(_context62.prev=_context62.next){case 0:_context62.prev=0;_context62.next=3;return this.getRecentBlockhashAndContext(commitment);case 3:res=_context62.sent;return _context62.abrupt("return",res.value);case 7:_context62.prev=7;_context62.t0=_context62["catch"](0);throw new Error('failed to get recent blockhash: '+_context62.t0);case 10:case"end":return _context62.stop();}},_callee62,this,[[0,7]]);}));function getRecentBlockhash(_x92){return _getRecentBlockhash.apply(this,arguments);}return getRecentBlockhash;}()/**
     * Fetch the latest blockhash from the cluster
     * @return {Promise<BlockhashWithExpiryBlockHeight>}
     */},{key:"getLatestBlockhash",value:function(){var _getLatestBlockhash=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee63(commitmentOrConfig){var res;return _regeneratorRuntime().wrap(function _callee63$(_context63){while(1)switch(_context63.prev=_context63.next){case 0:_context63.prev=0;_context63.next=3;return this.getLatestBlockhashAndContext(commitmentOrConfig);case 3:res=_context63.sent;return _context63.abrupt("return",res.value);case 7:_context63.prev=7;_context63.t0=_context63["catch"](0);throw new Error('failed to get recent blockhash: '+_context63.t0);case 10:case"end":return _context63.stop();}},_callee63,this,[[0,7]]);}));function getLatestBlockhash(_x93){return _getLatestBlockhash.apply(this,arguments);}return getLatestBlockhash;}()/**
     * Fetch the latest blockhash from the cluster
     * @return {Promise<BlockhashWithExpiryBlockHeight>}
     */},{key:"getLatestBlockhashAndContext",value:function(){var _getLatestBlockhashAndContext=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee64(commitmentOrConfig){var _extractCommitmentFro16,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee64$(_context64){while(1)switch(_context64.prev=_context64.next){case 0:_extractCommitmentFro16=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro16.commitment,config=_extractCommitmentFro16.config;args=this._buildArgs([],commitment,undefined/* encoding */,config);_context64.next=4;return this._rpcRequest('getLatestBlockhash',args);case 4:unsafeRes=_context64.sent;res=superstruct.create(unsafeRes,GetLatestBlockhashRpcResult);if(!('error'in res)){_context64.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get latest blockhash');case 8:return _context64.abrupt("return",res.result);case 9:case"end":return _context64.stop();}},_callee64,this);}));function getLatestBlockhashAndContext(_x94){return _getLatestBlockhashAndContext.apply(this,arguments);}return getLatestBlockhashAndContext;}()/**
     * Returns whether a blockhash is still valid or not
     */},{key:"isBlockhashValid",value:function(){var _isBlockhashValid=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee65(blockhash,rawConfig){var _extractCommitmentFro17,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee65$(_context65){while(1)switch(_context65.prev=_context65.next){case 0:_extractCommitmentFro17=extractCommitmentFromConfig(rawConfig),commitment=_extractCommitmentFro17.commitment,config=_extractCommitmentFro17.config;args=this._buildArgs([blockhash],commitment,undefined/* encoding */,config);_context65.next=4;return this._rpcRequest('isBlockhashValid',args);case 4:unsafeRes=_context65.sent;res=superstruct.create(unsafeRes,IsBlockhashValidRpcResult);if(!('error'in res)){_context65.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to determine if the blockhash `'+blockhash+'`is valid');case 8:return _context65.abrupt("return",res.result);case 9:case"end":return _context65.stop();}},_callee65,this);}));function isBlockhashValid(_x95,_x96){return _isBlockhashValid.apply(this,arguments);}return isBlockhashValid;}()/**
     * Fetch the node version
     */},{key:"getVersion",value:function(){var _getVersion=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee66(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee66$(_context66){while(1)switch(_context66.prev=_context66.next){case 0:_context66.next=2;return this._rpcRequest('getVersion',[]);case 2:unsafeRes=_context66.sent;res=superstruct.create(unsafeRes,jsonRpcResult(VersionResult));if(!('error'in res)){_context66.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get version');case 6:return _context66.abrupt("return",res.result);case 7:case"end":return _context66.stop();}},_callee66,this);}));function getVersion(){return _getVersion.apply(this,arguments);}return getVersion;}()/**
     * Fetch the genesis hash
     */},{key:"getGenesisHash",value:function(){var _getGenesisHash=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee67(){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee67$(_context67){while(1)switch(_context67.prev=_context67.next){case 0:_context67.next=2;return this._rpcRequest('getGenesisHash',[]);case 2:unsafeRes=_context67.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.string()));if(!('error'in res)){_context67.next=6;break;}throw new SolanaJSONRPCError(res.error,'failed to get genesis hash');case 6:return _context67.abrupt("return",res.result);case 7:case"end":return _context67.stop();}},_callee67,this);}));function getGenesisHash(){return _getGenesisHash.apply(this,arguments);}return getGenesisHash;}()/**
     * Fetch a processed block from the cluster.
     *
     * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
     * setting the `maxSupportedTransactionVersion` property.
     *//**
     * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
     * setting the `maxSupportedTransactionVersion` property.
     */// eslint-disable-next-line no-dupe-class-members
/**
     * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
     * setting the `maxSupportedTransactionVersion` property.
     */// eslint-disable-next-line no-dupe-class-members
/**
     * Fetch a processed block from the cluster.
     */// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
/**
     * Fetch a processed block from the cluster.
     */// eslint-disable-next-line no-dupe-class-members
},{key:"getBlock",value:function(){var _getBlock=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee68(slot,rawConfig){var _extractCommitmentFro18,commitment,config,args,unsafeRes,res,_res,_res2,result;return _regeneratorRuntime().wrap(function _callee68$(_context68){while(1)switch(_context68.prev=_context68.next){case 0:_extractCommitmentFro18=extractCommitmentFromConfig(rawConfig),commitment=_extractCommitmentFro18.commitment,config=_extractCommitmentFro18.config;args=this._buildArgsAtLeastConfirmed([slot],commitment,undefined/* encoding */,config);_context68.next=4;return this._rpcRequest('getBlock',args);case 4:unsafeRes=_context68.sent;_context68.prev=5;_context68.t0=config===null||config===void 0?void 0:config.transactionDetails;_context68.next=_context68.t0==='accounts'?9:_context68.t0==='none'?13:17;break;case 9:res=superstruct.create(unsafeRes,GetAccountsModeBlockRpcResult);if(!('error'in res)){_context68.next=12;break;}throw res.error;case 12:return _context68.abrupt("return",res.result);case 13:_res=superstruct.create(unsafeRes,GetNoneModeBlockRpcResult);if(!('error'in _res)){_context68.next=16;break;}throw _res.error;case 16:return _context68.abrupt("return",_res.result);case 17:_res2=superstruct.create(unsafeRes,GetBlockRpcResult);if(!('error'in _res2)){_context68.next=20;break;}throw _res2.error;case 20:result=_res2.result;return _context68.abrupt("return",result?_objectSpread(_objectSpread({},result),{},{transactions:result.transactions.map(function(_ref37){var transaction=_ref37.transaction,meta=_ref37.meta,version=_ref37.version;return{meta:meta,transaction:_objectSpread(_objectSpread({},transaction),{},{message:versionedMessageFromResponse(version,transaction.message)}),version:version};})}):null);case 22:_context68.next=27;break;case 24:_context68.prev=24;_context68.t1=_context68["catch"](5);throw new SolanaJSONRPCError(_context68.t1,'failed to get confirmed block');case 27:case"end":return _context68.stop();}},_callee68,this,[[5,24]]);}));function getBlock(_x97,_x98){return _getBlock.apply(this,arguments);}return getBlock;}()/**
     * Fetch parsed transaction details for a confirmed or finalized block
     */// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
},{key:"getParsedBlock",value:function(){var _getParsedBlock=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee69(slot,rawConfig){var _extractCommitmentFro19,commitment,config,args,unsafeRes,res,_res3,_res4;return _regeneratorRuntime().wrap(function _callee69$(_context69){while(1)switch(_context69.prev=_context69.next){case 0:_extractCommitmentFro19=extractCommitmentFromConfig(rawConfig),commitment=_extractCommitmentFro19.commitment,config=_extractCommitmentFro19.config;args=this._buildArgsAtLeastConfirmed([slot],commitment,'jsonParsed',config);_context69.next=4;return this._rpcRequest('getBlock',args);case 4:unsafeRes=_context69.sent;_context69.prev=5;_context69.t0=config===null||config===void 0?void 0:config.transactionDetails;_context69.next=_context69.t0==='accounts'?9:_context69.t0==='none'?13:17;break;case 9:res=superstruct.create(unsafeRes,GetParsedAccountsModeBlockRpcResult);if(!('error'in res)){_context69.next=12;break;}throw res.error;case 12:return _context69.abrupt("return",res.result);case 13:_res3=superstruct.create(unsafeRes,GetParsedNoneModeBlockRpcResult);if(!('error'in _res3)){_context69.next=16;break;}throw _res3.error;case 16:return _context69.abrupt("return",_res3.result);case 17:_res4=superstruct.create(unsafeRes,GetParsedBlockRpcResult);if(!('error'in _res4)){_context69.next=20;break;}throw _res4.error;case 20:return _context69.abrupt("return",_res4.result);case 21:_context69.next=26;break;case 23:_context69.prev=23;_context69.t1=_context69["catch"](5);throw new SolanaJSONRPCError(_context69.t1,'failed to get block');case 26:case"end":return _context69.stop();}},_callee69,this,[[5,23]]);}));function getParsedBlock(_x99,_x100){return _getParsedBlock.apply(this,arguments);}return getParsedBlock;}()/*
     * Returns recent block production information from the current or previous epoch
     */},{key:"getBlockProduction",value:function(){var _getBlockProduction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee70(configOrCommitment){var extra,commitment,c,rest,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee70$(_context70){while(1)switch(_context70.prev=_context70.next){case 0:if(typeof configOrCommitment==='string'){commitment=configOrCommitment;}else if(configOrCommitment){c=configOrCommitment.commitment,rest=_objectWithoutProperties(configOrCommitment,_excluded3);commitment=c;extra=rest;}args=this._buildArgs([],commitment,'base64',extra);_context70.next=4;return this._rpcRequest('getBlockProduction',args);case 4:unsafeRes=_context70.sent;res=superstruct.create(unsafeRes,BlockProductionResponseStruct);if(!('error'in res)){_context70.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get block production information');case 8:return _context70.abrupt("return",res.result);case 9:case"end":return _context70.stop();}},_callee70,this);}));function getBlockProduction(_x101){return _getBlockProduction.apply(this,arguments);}return getBlockProduction;}()/**
     * Fetch a confirmed or finalized transaction from the cluster.
     *
     * @deprecated Instead, call `getTransaction` using a
     * `GetVersionedTransactionConfig` by setting the
     * `maxSupportedTransactionVersion` property.
     *//**
     * Fetch a confirmed or finalized transaction from the cluster.
     */// eslint-disable-next-line no-dupe-class-members
/**
     * Fetch a confirmed or finalized transaction from the cluster.
     */// eslint-disable-next-line no-dupe-class-members
},{key:"getTransaction",value:function(){var _getTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee71(signature,rawConfig){var _extractCommitmentFro20,commitment,config,args,unsafeRes,res,result;return _regeneratorRuntime().wrap(function _callee71$(_context71){while(1)switch(_context71.prev=_context71.next){case 0:_extractCommitmentFro20=extractCommitmentFromConfig(rawConfig),commitment=_extractCommitmentFro20.commitment,config=_extractCommitmentFro20.config;args=this._buildArgsAtLeastConfirmed([signature],commitment,undefined/* encoding */,config);_context71.next=4;return this._rpcRequest('getTransaction',args);case 4:unsafeRes=_context71.sent;res=superstruct.create(unsafeRes,GetTransactionRpcResult);if(!('error'in res)){_context71.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get transaction');case 8:result=res.result;if(result){_context71.next=11;break;}return _context71.abrupt("return",result);case 11:return _context71.abrupt("return",_objectSpread(_objectSpread({},result),{},{transaction:_objectSpread(_objectSpread({},result.transaction),{},{message:versionedMessageFromResponse(result.version,result.transaction.message)})}));case 12:case"end":return _context71.stop();}},_callee71,this);}));function getTransaction(_x102,_x103){return _getTransaction.apply(this,arguments);}return getTransaction;}()/**
     * Fetch parsed transaction details for a confirmed or finalized transaction
     */},{key:"getParsedTransaction",value:function(){var _getParsedTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee72(signature,commitmentOrConfig){var _extractCommitmentFro21,commitment,config,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee72$(_context72){while(1)switch(_context72.prev=_context72.next){case 0:_extractCommitmentFro21=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro21.commitment,config=_extractCommitmentFro21.config;args=this._buildArgsAtLeastConfirmed([signature],commitment,'jsonParsed',config);_context72.next=4;return this._rpcRequest('getTransaction',args);case 4:unsafeRes=_context72.sent;res=superstruct.create(unsafeRes,GetParsedTransactionRpcResult);if(!('error'in res)){_context72.next=8;break;}throw new SolanaJSONRPCError(res.error,'failed to get transaction');case 8:return _context72.abrupt("return",res.result);case 9:case"end":return _context72.stop();}},_callee72,this);}));function getParsedTransaction(_x104,_x105){return _getParsedTransaction.apply(this,arguments);}return getParsedTransaction;}()/**
     * Fetch parsed transaction details for a batch of confirmed transactions
     */},{key:"getParsedTransactions",value:function(){var _getParsedTransactions=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee73(signatures,commitmentOrConfig){var _this21=this;var _extractCommitmentFro22,commitment,config,batch,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee73$(_context73){while(1)switch(_context73.prev=_context73.next){case 0:_extractCommitmentFro22=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro22.commitment,config=_extractCommitmentFro22.config;batch=signatures.map(function(signature){var args=_this21._buildArgsAtLeastConfirmed([signature],commitment,'jsonParsed',config);return{methodName:'getTransaction',args:args};});_context73.next=4;return this._rpcBatchRequest(batch);case 4:unsafeRes=_context73.sent;res=unsafeRes.map(function(unsafeRes){var res=superstruct.create(unsafeRes,GetParsedTransactionRpcResult);if('error'in res){throw new SolanaJSONRPCError(res.error,'failed to get transactions');}return res.result;});return _context73.abrupt("return",res);case 7:case"end":return _context73.stop();}},_callee73,this);}));function getParsedTransactions(_x106,_x107){return _getParsedTransactions.apply(this,arguments);}return getParsedTransactions;}()/**
     * Fetch transaction details for a batch of confirmed transactions.
     * Similar to {@link getParsedTransactions} but returns a {@link TransactionResponse}.
     *
     * @deprecated Instead, call `getTransactions` using a
     * `GetVersionedTransactionConfig` by setting the
     * `maxSupportedTransactionVersion` property.
     *//**
     * Fetch transaction details for a batch of confirmed transactions.
     * Similar to {@link getParsedTransactions} but returns a {@link
     * VersionedTransactionResponse}.
     */// eslint-disable-next-line no-dupe-class-members
/**
     * Fetch transaction details for a batch of confirmed transactions.
     * Similar to {@link getParsedTransactions} but returns a {@link
     * VersionedTransactionResponse}.
     */// eslint-disable-next-line no-dupe-class-members
},{key:"getTransactions",value:function(){var _getTransactions=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee74(signatures,commitmentOrConfig){var _this22=this;var _extractCommitmentFro23,commitment,config,batch,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee74$(_context74){while(1)switch(_context74.prev=_context74.next){case 0:_extractCommitmentFro23=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro23.commitment,config=_extractCommitmentFro23.config;batch=signatures.map(function(signature){var args=_this22._buildArgsAtLeastConfirmed([signature],commitment,undefined/* encoding */,config);return{methodName:'getTransaction',args:args};});_context74.next=4;return this._rpcBatchRequest(batch);case 4:unsafeRes=_context74.sent;res=unsafeRes.map(function(unsafeRes){var res=superstruct.create(unsafeRes,GetTransactionRpcResult);if('error'in res){throw new SolanaJSONRPCError(res.error,'failed to get transactions');}var result=res.result;if(!result)return result;return _objectSpread(_objectSpread({},result),{},{transaction:_objectSpread(_objectSpread({},result.transaction),{},{message:versionedMessageFromResponse(result.version,result.transaction.message)})});});return _context74.abrupt("return",res);case 7:case"end":return _context74.stop();}},_callee74,this);}));function getTransactions(_x108,_x109){return _getTransactions.apply(this,arguments);}return getTransactions;}()/**
     * Fetch a list of Transactions and transaction statuses from the cluster
     * for a confirmed block.
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlock} instead.
     */},{key:"getConfirmedBlock",value:function(){var _getConfirmedBlock=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee75(slot,commitment){var args,unsafeRes,res,result,block;return _regeneratorRuntime().wrap(function _callee75$(_context75){while(1)switch(_context75.prev=_context75.next){case 0:args=this._buildArgsAtLeastConfirmed([slot],commitment);_context75.next=3;return this._rpcRequest('getConfirmedBlock',args);case 3:unsafeRes=_context75.sent;res=superstruct.create(unsafeRes,GetConfirmedBlockRpcResult);if(!('error'in res)){_context75.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get confirmed block');case 7:result=res.result;if(result){_context75.next=10;break;}throw new Error('Confirmed block '+slot+' not found');case 10:block=_objectSpread(_objectSpread({},result),{},{transactions:result.transactions.map(function(_ref38){var transaction=_ref38.transaction,meta=_ref38.meta;var message=new Message(transaction.message);return{meta:meta,transaction:_objectSpread(_objectSpread({},transaction),{},{message:message})};})});return _context75.abrupt("return",_objectSpread(_objectSpread({},block),{},{transactions:block.transactions.map(function(_ref39){var transaction=_ref39.transaction,meta=_ref39.meta;return{meta:meta,transaction:Transaction.populate(transaction.message,transaction.signatures)};})}));case 12:case"end":return _context75.stop();}},_callee75,this);}));function getConfirmedBlock(_x110,_x111){return _getConfirmedBlock.apply(this,arguments);}return getConfirmedBlock;}()/**
     * Fetch confirmed blocks between two slots
     */},{key:"getBlocks",value:function(){var _getBlocks=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee76(startSlot,endSlot,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee76$(_context76){while(1)switch(_context76.prev=_context76.next){case 0:args=this._buildArgsAtLeastConfirmed(endSlot!==undefined?[startSlot,endSlot]:[startSlot],commitment);_context76.next=3;return this._rpcRequest('getBlocks',args);case 3:unsafeRes=_context76.sent;res=superstruct.create(unsafeRes,jsonRpcResult(superstruct.array(superstruct.number())));if(!('error'in res)){_context76.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get blocks');case 7:return _context76.abrupt("return",res.result);case 8:case"end":return _context76.stop();}},_callee76,this);}));function getBlocks(_x112,_x113,_x114){return _getBlocks.apply(this,arguments);}return getBlocks;}()/**
     * Fetch a list of Signatures from the cluster for a block, excluding rewards
     */},{key:"getBlockSignatures",value:function(){var _getBlockSignatures=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee77(slot,commitment){var args,unsafeRes,res,result;return _regeneratorRuntime().wrap(function _callee77$(_context77){while(1)switch(_context77.prev=_context77.next){case 0:args=this._buildArgsAtLeastConfirmed([slot],commitment,undefined,{transactionDetails:'signatures',rewards:false});_context77.next=3;return this._rpcRequest('getBlock',args);case 3:unsafeRes=_context77.sent;res=superstruct.create(unsafeRes,GetBlockSignaturesRpcResult);if(!('error'in res)){_context77.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get block');case 7:result=res.result;if(result){_context77.next=10;break;}throw new Error('Block '+slot+' not found');case 10:return _context77.abrupt("return",result);case 11:case"end":return _context77.stop();}},_callee77,this);}));function getBlockSignatures(_x115,_x116){return _getBlockSignatures.apply(this,arguments);}return getBlockSignatures;}()/**
     * Fetch a list of Signatures from the cluster for a confirmed block, excluding rewards
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlockSignatures} instead.
     */},{key:"getConfirmedBlockSignatures",value:function(){var _getConfirmedBlockSignatures=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee78(slot,commitment){var args,unsafeRes,res,result;return _regeneratorRuntime().wrap(function _callee78$(_context78){while(1)switch(_context78.prev=_context78.next){case 0:args=this._buildArgsAtLeastConfirmed([slot],commitment,undefined,{transactionDetails:'signatures',rewards:false});_context78.next=3;return this._rpcRequest('getConfirmedBlock',args);case 3:unsafeRes=_context78.sent;res=superstruct.create(unsafeRes,GetBlockSignaturesRpcResult);if(!('error'in res)){_context78.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get confirmed block');case 7:result=res.result;if(result){_context78.next=10;break;}throw new Error('Confirmed block '+slot+' not found');case 10:return _context78.abrupt("return",result);case 11:case"end":return _context78.stop();}},_callee78,this);}));function getConfirmedBlockSignatures(_x117,_x118){return _getConfirmedBlockSignatures.apply(this,arguments);}return getConfirmedBlockSignatures;}()/**
     * Fetch a transaction details for a confirmed transaction
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getTransaction} instead.
     */},{key:"getConfirmedTransaction",value:function(){var _getConfirmedTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee79(signature,commitment){var args,unsafeRes,res,result,message,signatures;return _regeneratorRuntime().wrap(function _callee79$(_context79){while(1)switch(_context79.prev=_context79.next){case 0:args=this._buildArgsAtLeastConfirmed([signature],commitment);_context79.next=3;return this._rpcRequest('getConfirmedTransaction',args);case 3:unsafeRes=_context79.sent;res=superstruct.create(unsafeRes,GetTransactionRpcResult);if(!('error'in res)){_context79.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get transaction');case 7:result=res.result;if(result){_context79.next=10;break;}return _context79.abrupt("return",result);case 10:message=new Message(result.transaction.message);signatures=result.transaction.signatures;return _context79.abrupt("return",_objectSpread(_objectSpread({},result),{},{transaction:Transaction.populate(message,signatures)}));case 13:case"end":return _context79.stop();}},_callee79,this);}));function getConfirmedTransaction(_x119,_x120){return _getConfirmedTransaction.apply(this,arguments);}return getConfirmedTransaction;}()/**
     * Fetch parsed transaction details for a confirmed transaction
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransaction} instead.
     */},{key:"getParsedConfirmedTransaction",value:function(){var _getParsedConfirmedTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee80(signature,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee80$(_context80){while(1)switch(_context80.prev=_context80.next){case 0:args=this._buildArgsAtLeastConfirmed([signature],commitment,'jsonParsed');_context80.next=3;return this._rpcRequest('getConfirmedTransaction',args);case 3:unsafeRes=_context80.sent;res=superstruct.create(unsafeRes,GetParsedTransactionRpcResult);if(!('error'in res)){_context80.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get confirmed transaction');case 7:return _context80.abrupt("return",res.result);case 8:case"end":return _context80.stop();}},_callee80,this);}));function getParsedConfirmedTransaction(_x121,_x122){return _getParsedConfirmedTransaction.apply(this,arguments);}return getParsedConfirmedTransaction;}()/**
     * Fetch parsed transaction details for a batch of confirmed transactions
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransactions} instead.
     */},{key:"getParsedConfirmedTransactions",value:function(){var _getParsedConfirmedTransactions=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee81(signatures,commitment){var _this23=this;var batch,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee81$(_context81){while(1)switch(_context81.prev=_context81.next){case 0:batch=signatures.map(function(signature){var args=_this23._buildArgsAtLeastConfirmed([signature],commitment,'jsonParsed');return{methodName:'getConfirmedTransaction',args:args};});_context81.next=3;return this._rpcBatchRequest(batch);case 3:unsafeRes=_context81.sent;res=unsafeRes.map(function(unsafeRes){var res=superstruct.create(unsafeRes,GetParsedTransactionRpcResult);if('error'in res){throw new SolanaJSONRPCError(res.error,'failed to get confirmed transactions');}return res.result;});return _context81.abrupt("return",res);case 6:case"end":return _context81.stop();}},_callee81,this);}));function getParsedConfirmedTransactions(_x123,_x124){return _getParsedConfirmedTransactions.apply(this,arguments);}return getParsedConfirmedTransactions;}()/**
     * Fetch a list of all the confirmed signatures for transactions involving an address
     * within a specified slot range. Max range allowed is 10,000 slots.
     *
     * @deprecated Deprecated since RPC v1.3. Please use {@link getConfirmedSignaturesForAddress2} instead.
     *
     * @param address queried address
     * @param startSlot start slot, inclusive
     * @param endSlot end slot, inclusive
     */},{key:"getConfirmedSignaturesForAddress",value:function(){var _getConfirmedSignaturesForAddress=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee82(address,startSlot,endSlot){var options,firstAvailableBlock,block,highestConfirmedRoot,_block,confirmedSignatureInfo;return _regeneratorRuntime().wrap(function _callee82$(_context82){while(1)switch(_context82.prev=_context82.next){case 0:options={};_context82.next=3;return this.getFirstAvailableBlock();case 3:firstAvailableBlock=_context82.sent;case 4:if('until'in options){_context82.next=24;break;}startSlot--;if(!(startSlot<=0||startSlot<firstAvailableBlock)){_context82.next=8;break;}return _context82.abrupt("break",24);case 8:_context82.prev=8;_context82.next=11;return this.getConfirmedBlockSignatures(startSlot,'finalized');case 11:block=_context82.sent;if(block.signatures.length>0){options.until=block.signatures[block.signatures.length-1].toString();}_context82.next=22;break;case 15:_context82.prev=15;_context82.t0=_context82["catch"](8);if(!(_context82.t0 instanceof Error&&_context82.t0.message.includes('skipped'))){_context82.next=21;break;}return _context82.abrupt("continue",4);case 21:throw _context82.t0;case 22:_context82.next=4;break;case 24:_context82.next=26;return this.getSlot('finalized');case 26:highestConfirmedRoot=_context82.sent;case 27:if('before'in options){_context82.next=47;break;}endSlot++;if(!(endSlot>highestConfirmedRoot)){_context82.next=31;break;}return _context82.abrupt("break",47);case 31:_context82.prev=31;_context82.next=34;return this.getConfirmedBlockSignatures(endSlot);case 34:_block=_context82.sent;if(_block.signatures.length>0){options.before=_block.signatures[_block.signatures.length-1].toString();}_context82.next=45;break;case 38:_context82.prev=38;_context82.t1=_context82["catch"](31);if(!(_context82.t1 instanceof Error&&_context82.t1.message.includes('skipped'))){_context82.next=44;break;}return _context82.abrupt("continue",27);case 44:throw _context82.t1;case 45:_context82.next=27;break;case 47:_context82.next=49;return this.getConfirmedSignaturesForAddress2(address,options);case 49:confirmedSignatureInfo=_context82.sent;return _context82.abrupt("return",confirmedSignatureInfo.map(function(info){return info.signature;}));case 51:case"end":return _context82.stop();}},_callee82,this,[[8,15],[31,38]]);}));function getConfirmedSignaturesForAddress(_x125,_x126,_x127){return _getConfirmedSignaturesForAddress.apply(this,arguments);}return getConfirmedSignaturesForAddress;}()/**
     * Returns confirmed signatures for transactions involving an
     * address backwards in time from the provided signature or most recent confirmed block
     *
     * @deprecated Deprecated since RPC v1.7.0. Please use {@link getSignaturesForAddress} instead.
     */},{key:"getConfirmedSignaturesForAddress2",value:function(){var _getConfirmedSignaturesForAddress2=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee83(address,options,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee83$(_context83){while(1)switch(_context83.prev=_context83.next){case 0:args=this._buildArgsAtLeastConfirmed([address.toBase58()],commitment,undefined,options);_context83.next=3;return this._rpcRequest('getConfirmedSignaturesForAddress2',args);case 3:unsafeRes=_context83.sent;res=superstruct.create(unsafeRes,GetConfirmedSignaturesForAddress2RpcResult);if(!('error'in res)){_context83.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get confirmed signatures for address');case 7:return _context83.abrupt("return",res.result);case 8:case"end":return _context83.stop();}},_callee83,this);}));function getConfirmedSignaturesForAddress2(_x128,_x129,_x130){return _getConfirmedSignaturesForAddress2.apply(this,arguments);}return getConfirmedSignaturesForAddress2;}()/**
     * Returns confirmed signatures for transactions involving an
     * address backwards in time from the provided signature or most recent confirmed block
     *
     *
     * @param address queried address
     * @param options
     */},{key:"getSignaturesForAddress",value:function(){var _getSignaturesForAddress=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee84(address,options,commitment){var args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee84$(_context84){while(1)switch(_context84.prev=_context84.next){case 0:args=this._buildArgsAtLeastConfirmed([address.toBase58()],commitment,undefined,options);_context84.next=3;return this._rpcRequest('getSignaturesForAddress',args);case 3:unsafeRes=_context84.sent;res=superstruct.create(unsafeRes,GetSignaturesForAddressRpcResult);if(!('error'in res)){_context84.next=7;break;}throw new SolanaJSONRPCError(res.error,'failed to get signatures for address');case 7:return _context84.abrupt("return",res.result);case 8:case"end":return _context84.stop();}},_callee84,this);}));function getSignaturesForAddress(_x131,_x132,_x133){return _getSignaturesForAddress.apply(this,arguments);}return getSignaturesForAddress;}()},{key:"getAddressLookupTable",value:function(){var _getAddressLookupTable=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee85(accountKey,config){var _yield$this$getAccoun,context,accountInfo,value;return _regeneratorRuntime().wrap(function _callee85$(_context85){while(1)switch(_context85.prev=_context85.next){case 0:_context85.next=2;return this.getAccountInfoAndContext(accountKey,config);case 2:_yield$this$getAccoun=_context85.sent;context=_yield$this$getAccoun.context;accountInfo=_yield$this$getAccoun.value;value=null;if(accountInfo!==null){value=new AddressLookupTableAccount({key:accountKey,state:AddressLookupTableAccount.deserialize(accountInfo.data)});}return _context85.abrupt("return",{context:context,value:value});case 8:case"end":return _context85.stop();}},_callee85,this);}));function getAddressLookupTable(_x134,_x135){return _getAddressLookupTable.apply(this,arguments);}return getAddressLookupTable;}()/**
     * Fetch the contents of a Nonce account from the cluster, return with context
     */},{key:"getNonceAndContext",value:function(){var _getNonceAndContext=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee86(nonceAccount,commitmentOrConfig){var _yield$this$getAccoun2,context,accountInfo,value;return _regeneratorRuntime().wrap(function _callee86$(_context86){while(1)switch(_context86.prev=_context86.next){case 0:_context86.next=2;return this.getAccountInfoAndContext(nonceAccount,commitmentOrConfig);case 2:_yield$this$getAccoun2=_context86.sent;context=_yield$this$getAccoun2.context;accountInfo=_yield$this$getAccoun2.value;value=null;if(accountInfo!==null){value=NonceAccount.fromAccountData(accountInfo.data);}return _context86.abrupt("return",{context:context,value:value});case 8:case"end":return _context86.stop();}},_callee86,this);}));function getNonceAndContext(_x136,_x137){return _getNonceAndContext.apply(this,arguments);}return getNonceAndContext;}()/**
     * Fetch the contents of a Nonce account from the cluster
     */},{key:"getNonce",value:function(){var _getNonce=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee87(nonceAccount,commitmentOrConfig){return _regeneratorRuntime().wrap(function _callee87$(_context87){while(1)switch(_context87.prev=_context87.next){case 0:_context87.next=2;return this.getNonceAndContext(nonceAccount,commitmentOrConfig).then(function(x){return x.value;})["catch"](function(e){throw new Error('failed to get nonce for account '+nonceAccount.toBase58()+': '+e);});case 2:return _context87.abrupt("return",_context87.sent);case 3:case"end":return _context87.stop();}},_callee87,this);}));function getNonce(_x138,_x139){return _getNonce.apply(this,arguments);}return getNonce;}()/**
     * Request an allocation of lamports to the specified address
     *
     * ```typescript
     * import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
     *
     * (async () => {
     *   const connection = new Connection("https://api.testnet.solana.com", "confirmed");
     *   const myAddress = new PublicKey("2nr1bHFT86W9tGnyvmYW4vcHKsQB3sVQfnddasz4kExM");
     *   const signature = await connection.requestAirdrop(myAddress, LAMPORTS_PER_SOL);
     *   await connection.confirmTransaction(signature);
     * })();
     * ```
     */},{key:"requestAirdrop",value:function(){var _requestAirdrop=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee88(to,lamports){var unsafeRes,res;return _regeneratorRuntime().wrap(function _callee88$(_context88){while(1)switch(_context88.prev=_context88.next){case 0:_context88.next=2;return this._rpcRequest('requestAirdrop',[to.toBase58(),lamports]);case 2:unsafeRes=_context88.sent;res=superstruct.create(unsafeRes,RequestAirdropRpcResult);if(!('error'in res)){_context88.next=6;break;}throw new SolanaJSONRPCError(res.error,"airdrop to ".concat(to.toBase58()," failed"));case 6:return _context88.abrupt("return",res.result);case 7:case"end":return _context88.stop();}},_callee88,this);}));function requestAirdrop(_x140,_x141){return _requestAirdrop.apply(this,arguments);}return requestAirdrop;}()/**
     * @internal
     */},{key:"_blockhashWithExpiryBlockHeight",value:function(){var _blockhashWithExpiryBlockHeight2=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee89(disableCache){var timeSinceFetch,expired;return _regeneratorRuntime().wrap(function _callee89$(_context89){while(1)switch(_context89.prev=_context89.next){case 0:if(disableCache){_context89.next=10;break;}case 1:if(!this._pollingBlockhash){_context89.next=6;break;}_context89.next=4;return sleep(100);case 4:_context89.next=1;break;case 6:timeSinceFetch=Date.now()-this._blockhashInfo.lastFetch;expired=timeSinceFetch>=BLOCKHASH_CACHE_TIMEOUT_MS;if(!(this._blockhashInfo.latestBlockhash!==null&&!expired)){_context89.next=10;break;}return _context89.abrupt("return",this._blockhashInfo.latestBlockhash);case 10:_context89.next=12;return this._pollNewBlockhash();case 12:return _context89.abrupt("return",_context89.sent);case 13:case"end":return _context89.stop();}},_callee89,this);}));function _blockhashWithExpiryBlockHeight(_x142){return _blockhashWithExpiryBlockHeight2.apply(this,arguments);}return _blockhashWithExpiryBlockHeight;}()/**
     * @internal
     */},{key:"_pollNewBlockhash",value:function(){var _pollNewBlockhash2=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee90(){var startTime,cachedLatestBlockhash,cachedBlockhash,i,latestBlockhash;return _regeneratorRuntime().wrap(function _callee90$(_context90){while(1)switch(_context90.prev=_context90.next){case 0:this._pollingBlockhash=true;_context90.prev=1;startTime=Date.now();cachedLatestBlockhash=this._blockhashInfo.latestBlockhash;cachedBlockhash=cachedLatestBlockhash?cachedLatestBlockhash.blockhash:null;i=0;case 6:if(!(i<50)){_context90.next=18;break;}_context90.next=9;return this.getLatestBlockhash('finalized');case 9:latestBlockhash=_context90.sent;if(!(cachedBlockhash!==latestBlockhash.blockhash)){_context90.next=13;break;}this._blockhashInfo={latestBlockhash:latestBlockhash,lastFetch:Date.now(),transactionSignatures:[],simulatedSignatures:[]};return _context90.abrupt("return",latestBlockhash);case 13:_context90.next=15;return sleep(MS_PER_SLOT/2);case 15:i++;_context90.next=6;break;case 18:throw new Error("Unable to obtain a new blockhash after ".concat(Date.now()-startTime,"ms"));case 19:_context90.prev=19;this._pollingBlockhash=false;return _context90.finish(19);case 22:case"end":return _context90.stop();}},_callee90,this,[[1,,19,22]]);}));function _pollNewBlockhash(){return _pollNewBlockhash2.apply(this,arguments);}return _pollNewBlockhash;}()/**
     * get the stake minimum delegation
     */},{key:"getStakeMinimumDelegation",value:function(){var _getStakeMinimumDelegation=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee91(config){var _extractCommitmentFro24,commitment,configArg,args,unsafeRes,res;return _regeneratorRuntime().wrap(function _callee91$(_context91){while(1)switch(_context91.prev=_context91.next){case 0:_extractCommitmentFro24=extractCommitmentFromConfig(config),commitment=_extractCommitmentFro24.commitment,configArg=_extractCommitmentFro24.config;args=this._buildArgs([],commitment,'base64',configArg);_context91.next=4;return this._rpcRequest('getStakeMinimumDelegation',args);case 4:unsafeRes=_context91.sent;res=superstruct.create(unsafeRes,jsonRpcResultAndContext(superstruct.number()));if(!('error'in res)){_context91.next=8;break;}throw new SolanaJSONRPCError(res.error,"failed to get stake minimum delegation");case 8:return _context91.abrupt("return",res.result);case 9:case"end":return _context91.stop();}},_callee91,this);}));function getStakeMinimumDelegation(_x143){return _getStakeMinimumDelegation.apply(this,arguments);}return getStakeMinimumDelegation;}()/**
     * Simulate a transaction
     *
     * @deprecated Instead, call {@link simulateTransaction} with {@link
     * VersionedTransaction} and {@link SimulateTransactionConfig} parameters
     *//**
     * Simulate a transaction
     */// eslint-disable-next-line no-dupe-class-members
/**
     * Simulate a transaction
     */// eslint-disable-next-line no-dupe-class-members
},{key:"simulateTransaction",value:function(){var _simulateTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee92(transactionOrMessage,configOrSigners,includeAccounts){var versionedTx,_wireTransaction,_encodedTransaction,_config,_args93,_unsafeRes,_res5,transaction,originalTx,signers,_transaction3,disableCache,_transaction4,latestBlockhash,_signature3,message,signData,wireTransaction,encodedTransaction,config,addresses,args,unsafeRes,res,logs,traceIndent,logTrace;return _regeneratorRuntime().wrap(function _callee92$(_context92){while(1)switch(_context92.prev=_context92.next){case 0:if(!('message'in transactionOrMessage)){_context92.next=18;break;}versionedTx=transactionOrMessage;_wireTransaction=versionedTx.serialize();_encodedTransaction=buffer.Buffer.from(_wireTransaction).toString('base64');if(!(Array.isArray(configOrSigners)||includeAccounts!==undefined)){_context92.next=6;break;}throw new Error('Invalid arguments');case 6:_config=configOrSigners||{};_config.encoding='base64';if(!('commitment'in _config)){_config.commitment=this.commitment;}if(configOrSigners&&_typeof(configOrSigners)==='object'&&'innerInstructions'in configOrSigners){_config.innerInstructions=configOrSigners.innerInstructions;}_args93=[_encodedTransaction,_config];_context92.next=13;return this._rpcRequest('simulateTransaction',_args93);case 13:_unsafeRes=_context92.sent;_res5=superstruct.create(_unsafeRes,SimulatedTransactionResponseStruct);if(!('error'in _res5)){_context92.next=17;break;}throw new Error('failed to simulate transaction: '+_res5.error.message);case 17:return _context92.abrupt("return",_res5.result);case 18:if(transactionOrMessage instanceof Transaction){originalTx=transactionOrMessage;transaction=new Transaction();transaction.feePayer=originalTx.feePayer;transaction.instructions=transactionOrMessage.instructions;transaction.nonceInfo=originalTx.nonceInfo;transaction.signatures=originalTx.signatures;}else{transaction=Transaction.populate(transactionOrMessage);// HACK: this function relies on mutating the populated transaction
transaction._message=transaction._json=undefined;}if(!(configOrSigners!==undefined&&!Array.isArray(configOrSigners))){_context92.next=21;break;}throw new Error('Invalid arguments');case 21:signers=configOrSigners;if(!(transaction.nonceInfo&&signers)){_context92.next=26;break;}(_transaction3=transaction).sign.apply(_transaction3,_toConsumableArray(signers));_context92.next=46;break;case 26:disableCache=this._disableBlockhashCaching;case 27:_context92.next=29;return this._blockhashWithExpiryBlockHeight(disableCache);case 29:latestBlockhash=_context92.sent;transaction.lastValidBlockHeight=latestBlockhash.lastValidBlockHeight;transaction.recentBlockhash=latestBlockhash.blockhash;if(signers){_context92.next=34;break;}return _context92.abrupt("break",46);case 34:(_transaction4=transaction).sign.apply(_transaction4,_toConsumableArray(signers));if(transaction.signature){_context92.next=37;break;}throw new Error('!signature');case 37:_signature3=transaction.signature.toString('base64');if(!(!this._blockhashInfo.simulatedSignatures.includes(_signature3)&&!this._blockhashInfo.transactionSignatures.includes(_signature3))){_context92.next=43;break;}// The signature of this transaction has not been seen before with the
// current recentBlockhash, all done. Let's break
this._blockhashInfo.simulatedSignatures.push(_signature3);return _context92.abrupt("break",46);case 43:// This transaction would be treated as duplicate (its derived signature
// matched to one of already recorded signatures).
// So, we must fetch a new blockhash for a different signature by disabling
// our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
disableCache=true;case 44:_context92.next=27;break;case 46:message=transaction._compile();signData=message.serialize();wireTransaction=transaction._serialize(signData);encodedTransaction=wireTransaction.toString('base64');config={encoding:'base64',commitment:this.commitment};if(includeAccounts){addresses=(Array.isArray(includeAccounts)?includeAccounts:message.nonProgramIds()).map(function(key){return key.toBase58();});config['accounts']={encoding:'base64',addresses:addresses};}if(signers){config.sigVerify=true;}if(configOrSigners&&_typeof(configOrSigners)==='object'&&'innerInstructions'in configOrSigners){config.innerInstructions=configOrSigners.innerInstructions;}args=[encodedTransaction,config];_context92.next=57;return this._rpcRequest('simulateTransaction',args);case 57:unsafeRes=_context92.sent;res=superstruct.create(unsafeRes,SimulatedTransactionResponseStruct);if(!('error'in res)){_context92.next=62;break;}if('data'in res.error){logs=res.error.data.logs;if(logs&&Array.isArray(logs)){traceIndent='\n    ';logTrace=traceIndent+logs.join(traceIndent);console.error(res.error.message,logTrace);}}throw new SendTransactionError({action:'simulate',signature:'',transactionMessage:res.error.message,logs:logs});case 62:return _context92.abrupt("return",res.result);case 63:case"end":return _context92.stop();}},_callee92,this);}));function simulateTransaction(_x144,_x145,_x146){return _simulateTransaction.apply(this,arguments);}return simulateTransaction;}()/**
     * Sign and send a transaction
     *
     * @deprecated Instead, call {@link sendTransaction} with a {@link
     * VersionedTransaction}
     *//**
     * Send a signed transaction
     */// eslint-disable-next-line no-dupe-class-members
/**
     * Sign and send a transaction
     */// eslint-disable-next-line no-dupe-class-members
},{key:"sendTransaction",value:function(){var _sendTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee93(transaction,signersOrOptions,options){var _wireTransaction2,signers,disableCache,latestBlockhash,_signature4,wireTransaction;return _regeneratorRuntime().wrap(function _callee93$(_context93){while(1)switch(_context93.prev=_context93.next){case 0:if(!('version'in transaction)){_context93.next=7;break;}if(!(signersOrOptions&&Array.isArray(signersOrOptions))){_context93.next=3;break;}throw new Error('Invalid arguments');case 3:_wireTransaction2=transaction.serialize();_context93.next=6;return this.sendRawTransaction(_wireTransaction2,signersOrOptions);case 6:return _context93.abrupt("return",_context93.sent);case 7:if(!(signersOrOptions===undefined||!Array.isArray(signersOrOptions))){_context93.next=9;break;}throw new Error('Invalid arguments');case 9:signers=signersOrOptions;if(!transaction.nonceInfo){_context93.next=14;break;}transaction.sign.apply(transaction,_toConsumableArray(signers));_context93.next=32;break;case 14:disableCache=this._disableBlockhashCaching;case 15:_context93.next=17;return this._blockhashWithExpiryBlockHeight(disableCache);case 17:latestBlockhash=_context93.sent;transaction.lastValidBlockHeight=latestBlockhash.lastValidBlockHeight;transaction.recentBlockhash=latestBlockhash.blockhash;transaction.sign.apply(transaction,_toConsumableArray(signers));if(transaction.signature){_context93.next=23;break;}throw new Error('!signature');case 23:_signature4=transaction.signature.toString('base64');if(this._blockhashInfo.transactionSignatures.includes(_signature4)){_context93.next=29;break;}// The signature of this transaction has not been seen before with the
// current recentBlockhash, all done. Let's break
this._blockhashInfo.transactionSignatures.push(_signature4);return _context93.abrupt("break",32);case 29:// This transaction would be treated as duplicate (its derived signature
// matched to one of already recorded signatures).
// So, we must fetch a new blockhash for a different signature by disabling
// our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
disableCache=true;case 30:_context93.next=15;break;case 32:wireTransaction=transaction.serialize();_context93.next=35;return this.sendRawTransaction(wireTransaction,options);case 35:return _context93.abrupt("return",_context93.sent);case 36:case"end":return _context93.stop();}},_callee93,this);}));function sendTransaction(_x147,_x148,_x149){return _sendTransaction.apply(this,arguments);}return sendTransaction;}()/**
     * Send a transaction that has already been signed and serialized into the
     * wire format
     */},{key:"sendRawTransaction",value:function(){var _sendRawTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee94(rawTransaction,options){var encodedTransaction,result;return _regeneratorRuntime().wrap(function _callee94$(_context94){while(1)switch(_context94.prev=_context94.next){case 0:encodedTransaction=toBuffer(rawTransaction).toString('base64');_context94.next=3;return this.sendEncodedTransaction(encodedTransaction,options);case 3:result=_context94.sent;return _context94.abrupt("return",result);case 5:case"end":return _context94.stop();}},_callee94,this);}));function sendRawTransaction(_x150,_x151){return _sendRawTransaction.apply(this,arguments);}return sendRawTransaction;}()/**
     * Send a transaction that has already been signed, serialized into the
     * wire format, and encoded as a base64 string
     */},{key:"sendEncodedTransaction",value:function(){var _sendEncodedTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee95(encodedTransaction,options){var config,skipPreflight,preflightCommitment,args,unsafeRes,res,logs;return _regeneratorRuntime().wrap(function _callee95$(_context95){while(1)switch(_context95.prev=_context95.next){case 0:config={encoding:'base64'};skipPreflight=options&&options.skipPreflight;preflightCommitment=skipPreflight===true?'processed'// FIXME Remove when https://github.com/anza-xyz/agave/pull/483 is deployed.
:options&&options.preflightCommitment||this.commitment;if(options&&options.maxRetries!=null){config.maxRetries=options.maxRetries;}if(options&&options.minContextSlot!=null){config.minContextSlot=options.minContextSlot;}if(skipPreflight){config.skipPreflight=skipPreflight;}if(preflightCommitment){config.preflightCommitment=preflightCommitment;}args=[encodedTransaction,config];_context95.next=10;return this._rpcRequest('sendTransaction',args);case 10:unsafeRes=_context95.sent;res=superstruct.create(unsafeRes,SendTransactionRpcResult);if(!('error'in res)){_context95.next=16;break;}logs=undefined;if('data'in res.error){logs=res.error.data.logs;}throw new SendTransactionError({action:skipPreflight?'send':'simulate',signature:'',transactionMessage:res.error.message,logs:logs});case 16:return _context95.abrupt("return",res.result);case 17:case"end":return _context95.stop();}},_callee95,this);}));function sendEncodedTransaction(_x152,_x153){return _sendEncodedTransaction.apply(this,arguments);}return sendEncodedTransaction;}()/**
     * @internal
     */},{key:"_wsOnOpen",value:function _wsOnOpen(){var _this24=this;this._rpcWebSocketConnected=true;this._rpcWebSocketHeartbeat=setInterval(function(){// Ping server every 5s to prevent idle timeouts
_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee96(){return _regeneratorRuntime().wrap(function _callee96$(_context96){while(1)switch(_context96.prev=_context96.next){case 0:_context96.prev=0;_context96.next=3;return _this24._rpcWebSocket.notify('ping');case 3:_context96.next=7;break;case 5:_context96.prev=5;_context96.t0=_context96["catch"](0);case 7:case"end":return _context96.stop();}},_callee96,null,[[0,5]]);}))();},5000);this._updateSubscriptions();}/**
     * @internal
     */},{key:"_wsOnError",value:function _wsOnError(err){this._rpcWebSocketConnected=false;console.error('ws error:',err.message);}/**
     * @internal
     */},{key:"_wsOnClose",value:function _wsOnClose(code){var _this25=this;this._rpcWebSocketConnected=false;this._rpcWebSocketGeneration=(this._rpcWebSocketGeneration+1)%Number.MAX_SAFE_INTEGER;if(this._rpcWebSocketIdleTimeout){clearTimeout(this._rpcWebSocketIdleTimeout);this._rpcWebSocketIdleTimeout=null;}if(this._rpcWebSocketHeartbeat){clearInterval(this._rpcWebSocketHeartbeat);this._rpcWebSocketHeartbeat=null;}if(code===1000){// explicit close, check if any subscriptions have been made since close
this._updateSubscriptions();return;}// implicit close, prepare subscriptions for auto-reconnect
this._subscriptionCallbacksByServerSubscriptionId={};Object.entries(this._subscriptionsByHash).forEach(function(_ref41){var _ref42=_slicedToArray(_ref41,2),hash=_ref42[0],subscription=_ref42[1];_this25._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{state:'pending'}));});}/**
     * @internal
     */},{key:"_setSubscription",value:function _setSubscription(hash,nextSubscription){var _this$_subscriptionsB;var prevState=(_this$_subscriptionsB=this._subscriptionsByHash[hash])===null||_this$_subscriptionsB===void 0?void 0:_this$_subscriptionsB.state;this._subscriptionsByHash[hash]=nextSubscription;if(prevState!==nextSubscription.state){var stateChangeCallbacks=this._subscriptionStateChangeCallbacksByHash[hash];if(stateChangeCallbacks){stateChangeCallbacks.forEach(function(cb){try{cb(nextSubscription.state);// eslint-disable-next-line no-empty
}catch(_unused4){}});}}}/**
     * @internal
     */},{key:"_onSubscriptionStateChange",value:function _onSubscriptionStateChange(clientSubscriptionId,callback){var _this$_subscriptionSt,_this26=this;var hash=this._subscriptionHashByClientSubscriptionId[clientSubscriptionId];if(hash==null){return function(){};}var stateChangeCallbacks=(_this$_subscriptionSt=this._subscriptionStateChangeCallbacksByHash)[hash]||(_this$_subscriptionSt[hash]=new Set());stateChangeCallbacks.add(callback);return function(){stateChangeCallbacks["delete"](callback);if(stateChangeCallbacks.size===0){delete _this26._subscriptionStateChangeCallbacksByHash[hash];}};}/**
     * @internal
     */},{key:"_updateSubscriptions",value:function(){var _updateSubscriptions2=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee100(){var _this27=this;var activeWebSocketGeneration,isCurrentConnectionStillActive;return _regeneratorRuntime().wrap(function _callee100$(_context100){while(1)switch(_context100.prev=_context100.next){case 0:if(!(Object.keys(this._subscriptionsByHash).length===0)){_context100.next=3;break;}if(this._rpcWebSocketConnected){this._rpcWebSocketConnected=false;this._rpcWebSocketIdleTimeout=setTimeout(function(){_this27._rpcWebSocketIdleTimeout=null;try{_this27._rpcWebSocket.close();}catch(err){// swallow error if socket has already been closed.
if(err instanceof Error){console.log("Error when closing socket connection: ".concat(err.message));}}},500);}return _context100.abrupt("return");case 3:if(this._rpcWebSocketIdleTimeout!==null){clearTimeout(this._rpcWebSocketIdleTimeout);this._rpcWebSocketIdleTimeout=null;this._rpcWebSocketConnected=true;}if(this._rpcWebSocketConnected){_context100.next=7;break;}this._rpcWebSocket.connect();return _context100.abrupt("return");case 7:activeWebSocketGeneration=this._rpcWebSocketGeneration;isCurrentConnectionStillActive=function isCurrentConnectionStillActive(){return activeWebSocketGeneration===_this27._rpcWebSocketGeneration;};_context100.next=11;return Promise.all(// Don't be tempted to change this to `Object.entries`. We call
// `_updateSubscriptions` recursively when processing the state,
// so it's important that we look up the *current* version of
// each subscription, every time we process a hash.
Object.keys(this._subscriptionsByHash).map(/*#__PURE__*/function(){var _ref43=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee99(hash){var subscription;return _regeneratorRuntime().wrap(function _callee99$(_context99){while(1)switch(_context99.prev=_context99.next){case 0:subscription=_this27._subscriptionsByHash[hash];if(!(subscription===undefined)){_context99.next=3;break;}return _context99.abrupt("return");case 3:_context99.t0=subscription.state;_context99.next=_context99.t0==='pending'?6:_context99.t0==='unsubscribed'?6:_context99.t0==='subscribed'?15:19;break;case 6:if(!(subscription.callbacks.size===0)){_context99.next=12;break;}/**
                         * You can end up here when:
                         *
                         * - a subscription has recently unsubscribed
                         *   without having new callbacks added to it
                         *   while the unsubscribe was in flight, or
                         * - when a pending subscription has its
                         *   listeners removed before a request was
                         *   sent to the server.
                         *
                         * Being that nobody is interested in this
                         * subscription any longer, delete it.
                         */delete _this27._subscriptionsByHash[hash];if(subscription.state==='unsubscribed'){delete _this27._subscriptionCallbacksByServerSubscriptionId[subscription.serverSubscriptionId];}_context99.next=11;return _this27._updateSubscriptions();case 11:return _context99.abrupt("return");case 12:_context99.next=14;return _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee97(){var args,method,serverSubscriptionId;return _regeneratorRuntime().wrap(function _callee97$(_context97){while(1)switch(_context97.prev=_context97.next){case 0:args=subscription.args,method=subscription.method;_context97.prev=1;_this27._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{state:'subscribing'}));_context97.next=5;return _this27._rpcWebSocket.call(method,args);case 5:serverSubscriptionId=_context97.sent;_this27._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{serverSubscriptionId:serverSubscriptionId,state:'subscribed'}));_this27._subscriptionCallbacksByServerSubscriptionId[serverSubscriptionId]=subscription.callbacks;_context97.next=10;return _this27._updateSubscriptions();case 10:_context97.next=20;break;case 12:_context97.prev=12;_context97.t0=_context97["catch"](1);if(_context97.t0 instanceof Error){console.error("".concat(method," error for argument"),args,_context97.t0.message);}if(isCurrentConnectionStillActive()){_context97.next=17;break;}return _context97.abrupt("return");case 17:// TODO: Maybe add an 'errored' state or a retry limit?
_this27._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{state:'pending'}));_context97.next=20;return _this27._updateSubscriptions();case 20:case"end":return _context97.stop();}},_callee97,null,[[1,12]]);}))();case 14:return _context99.abrupt("break",19);case 15:if(!(subscription.callbacks.size===0)){_context99.next=18;break;}_context99.next=18;return _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee98(){var serverSubscriptionId,unsubscribeMethod;return _regeneratorRuntime().wrap(function _callee98$(_context98){while(1)switch(_context98.prev=_context98.next){case 0:serverSubscriptionId=subscription.serverSubscriptionId,unsubscribeMethod=subscription.unsubscribeMethod;if(!_this27._subscriptionsAutoDisposedByRpc.has(serverSubscriptionId)){_context98.next=5;break;}/**
                                 * Special case.
                                 * If we're dealing with a subscription that has been auto-
                                 * disposed by the RPC, then we can skip the RPC call to
                                 * tear down the subscription here.
                                 *
                                 * NOTE: There is a proposal to eliminate this special case, here:
                                 * https://github.com/solana-labs/solana/issues/18892
                                 */_this27._subscriptionsAutoDisposedByRpc["delete"](serverSubscriptionId);_context98.next=21;break;case 5:_this27._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{state:'unsubscribing'}));_this27._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{state:'unsubscribing'}));_context98.prev=7;_context98.next=10;return _this27._rpcWebSocket.call(unsubscribeMethod,[serverSubscriptionId]);case 10:_context98.next=21;break;case 12:_context98.prev=12;_context98.t0=_context98["catch"](7);if(_context98.t0 instanceof Error){console.error("".concat(unsubscribeMethod," error:"),_context98.t0.message);}if(isCurrentConnectionStillActive()){_context98.next=17;break;}return _context98.abrupt("return");case 17:// TODO: Maybe add an 'errored' state or a retry limit?
_this27._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{state:'subscribed'}));_context98.next=20;return _this27._updateSubscriptions();case 20:return _context98.abrupt("return");case 21:_this27._setSubscription(hash,_objectSpread(_objectSpread({},subscription),{},{state:'unsubscribed'}));_context98.next=24;return _this27._updateSubscriptions();case 24:case"end":return _context98.stop();}},_callee98,null,[[7,12]]);}))();case 18:return _context99.abrupt("break",19);case 19:case"end":return _context99.stop();}},_callee99);}));return function(_x154){return _ref43.apply(this,arguments);};}()));case 11:case"end":return _context100.stop();}},_callee100,this);}));function _updateSubscriptions(){return _updateSubscriptions2.apply(this,arguments);}return _updateSubscriptions;}()/**
     * @internal
     */},{key:"_handleServerNotification",value:function _handleServerNotification(serverSubscriptionId,callbackArgs){var callbacks=this._subscriptionCallbacksByServerSubscriptionId[serverSubscriptionId];if(callbacks===undefined){return;}callbacks.forEach(function(cb){try{cb.apply(void 0,_toConsumableArray(callbackArgs));}catch(e){console.error(e);}});}/**
     * @internal
     */},{key:"_wsOnAccountNotification",value:function _wsOnAccountNotification(notification){var _superstruct$create=superstruct.create(notification,AccountNotificationResult),result=_superstruct$create.result,subscription=_superstruct$create.subscription;this._handleServerNotification(subscription,[result.value,result.context]);}/**
     * @internal
     */},{key:"_makeSubscription",value:function _makeSubscription(subscriptionConfig,/**
     * When preparing `args` for a call to `_makeSubscription`, be sure
     * to carefully apply a default `commitment` property, if necessary.
     *
     * - If the user supplied a `commitment` use that.
     * - Otherwise, if the `Connection::commitment` is set, use that.
     * - Otherwise, set it to the RPC server default: `finalized`.
     *
     * This is extremely important to ensure that these two fundamentally
     * identical subscriptions produce the same identifying hash:
     *
     * - A subscription made without specifying a commitment.
     * - A subscription made where the commitment specified is the same
     *   as the default applied to the subscription above.
     *
     * Example; these two subscriptions must produce the same hash:
     *
     * - An `accountSubscribe` subscription for `'PUBKEY'`
     * - An `accountSubscribe` subscription for `'PUBKEY'` with commitment
     *   `'finalized'`.
     *
     * See the 'making a subscription with defaulted params omitted' test
     * in `connection-subscriptions.ts` for more.
     */args){var _this28=this;var clientSubscriptionId=this._nextClientSubscriptionId++;var hash=fastStableStringify$1([subscriptionConfig.method,args]);var existingSubscription=this._subscriptionsByHash[hash];if(existingSubscription===undefined){this._subscriptionsByHash[hash]=_objectSpread(_objectSpread({},subscriptionConfig),{},{args:args,callbacks:new Set([subscriptionConfig.callback]),state:'pending'});}else{existingSubscription.callbacks.add(subscriptionConfig.callback);}this._subscriptionHashByClientSubscriptionId[clientSubscriptionId]=hash;this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId]=/*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee101(){var subscription;return _regeneratorRuntime().wrap(function _callee101$(_context101){while(1)switch(_context101.prev=_context101.next){case 0:delete _this28._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId];delete _this28._subscriptionHashByClientSubscriptionId[clientSubscriptionId];subscription=_this28._subscriptionsByHash[hash];assert(subscription!==undefined,"Could not find a `Subscription` when tearing down client subscription #".concat(clientSubscriptionId));subscription.callbacks["delete"](subscriptionConfig.callback);_context101.next=7;return _this28._updateSubscriptions();case 7:case"end":return _context101.stop();}},_callee101);}));this._updateSubscriptions();return clientSubscriptionId;}/**
     * Register a callback to be invoked whenever the specified account changes
     *
     * @param publicKey Public key of the account to monitor
     * @param callback Function to invoke whenever the account is changed
     * @param config
     * @return subscription id
     *//** @deprecated Instead, pass in an {@link AccountSubscriptionConfig} */// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
},{key:"onAccountChange",value:function onAccountChange(publicKey,callback,commitmentOrConfig){var _extractCommitmentFro25=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro25.commitment,config=_extractCommitmentFro25.config;var args=this._buildArgs([publicKey.toBase58()],commitment||this._commitment||'finalized',// Apply connection/server default.
'base64',config);return this._makeSubscription({callback:callback,method:'accountSubscribe',unsubscribeMethod:'accountUnsubscribe'},args);}/**
     * Deregister an account notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */},{key:"removeAccountChangeListener",value:function(){var _removeAccountChangeListener=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee102(clientSubscriptionId){return _regeneratorRuntime().wrap(function _callee102$(_context102){while(1)switch(_context102.prev=_context102.next){case 0:_context102.next=2;return this._unsubscribeClientSubscription(clientSubscriptionId,'account change');case 2:case"end":return _context102.stop();}},_callee102,this);}));function removeAccountChangeListener(_x155){return _removeAccountChangeListener.apply(this,arguments);}return removeAccountChangeListener;}()/**
     * @internal
     */},{key:"_wsOnProgramAccountNotification",value:function _wsOnProgramAccountNotification(notification){var _superstruct$create2=superstruct.create(notification,ProgramAccountNotificationResult),result=_superstruct$create2.result,subscription=_superstruct$create2.subscription;this._handleServerNotification(subscription,[{accountId:result.value.pubkey,accountInfo:result.value.account},result.context]);}/**
     * Register a callback to be invoked whenever accounts owned by the
     * specified program change
     *
     * @param programId Public key of the program to monitor
     * @param callback Function to invoke whenever the account is changed
     * @param config
     * @return subscription id
     *//** @deprecated Instead, pass in a {@link ProgramAccountSubscriptionConfig} */// eslint-disable-next-line no-dupe-class-members
// eslint-disable-next-line no-dupe-class-members
},{key:"onProgramAccountChange",value:function onProgramAccountChange(programId,callback,commitmentOrConfig,maybeFilters){var _extractCommitmentFro26=extractCommitmentFromConfig(commitmentOrConfig),commitment=_extractCommitmentFro26.commitment,config=_extractCommitmentFro26.config;var args=this._buildArgs([programId.toBase58()],commitment||this._commitment||'finalized',// Apply connection/server default.
'base64'/* encoding */,config?config:maybeFilters?{filters:applyDefaultMemcmpEncodingToFilters(maybeFilters)}:undefined/* extra */);return this._makeSubscription({callback:callback,method:'programSubscribe',unsubscribeMethod:'programUnsubscribe'},args);}/**
     * Deregister an account notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */},{key:"removeProgramAccountChangeListener",value:function(){var _removeProgramAccountChangeListener=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee103(clientSubscriptionId){return _regeneratorRuntime().wrap(function _callee103$(_context103){while(1)switch(_context103.prev=_context103.next){case 0:_context103.next=2;return this._unsubscribeClientSubscription(clientSubscriptionId,'program account change');case 2:case"end":return _context103.stop();}},_callee103,this);}));function removeProgramAccountChangeListener(_x156){return _removeProgramAccountChangeListener.apply(this,arguments);}return removeProgramAccountChangeListener;}()/**
     * Registers a callback to be invoked whenever logs are emitted.
     */},{key:"onLogs",value:function onLogs(filter,callback,commitment){var args=this._buildArgs([_typeof(filter)==='object'?{mentions:[filter.toString()]}:filter],commitment||this._commitment||'finalized'// Apply connection/server default.
);return this._makeSubscription({callback:callback,method:'logsSubscribe',unsubscribeMethod:'logsUnsubscribe'},args);}/**
     * Deregister a logs callback.
     *
     * @param clientSubscriptionId client subscription id to deregister.
     */},{key:"removeOnLogsListener",value:function(){var _removeOnLogsListener=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee104(clientSubscriptionId){return _regeneratorRuntime().wrap(function _callee104$(_context104){while(1)switch(_context104.prev=_context104.next){case 0:_context104.next=2;return this._unsubscribeClientSubscription(clientSubscriptionId,'logs');case 2:case"end":return _context104.stop();}},_callee104,this);}));function removeOnLogsListener(_x157){return _removeOnLogsListener.apply(this,arguments);}return removeOnLogsListener;}()/**
     * @internal
     */},{key:"_wsOnLogsNotification",value:function _wsOnLogsNotification(notification){var _superstruct$create3=superstruct.create(notification,LogsNotificationResult),result=_superstruct$create3.result,subscription=_superstruct$create3.subscription;this._handleServerNotification(subscription,[result.value,result.context]);}/**
     * @internal
     */},{key:"_wsOnSlotNotification",value:function _wsOnSlotNotification(notification){var _superstruct$create4=superstruct.create(notification,SlotNotificationResult),result=_superstruct$create4.result,subscription=_superstruct$create4.subscription;this._handleServerNotification(subscription,[result]);}/**
     * Register a callback to be invoked upon slot changes
     *
     * @param callback Function to invoke whenever the slot changes
     * @return subscription id
     */},{key:"onSlotChange",value:function onSlotChange(callback){return this._makeSubscription({callback:callback,method:'slotSubscribe',unsubscribeMethod:'slotUnsubscribe'},[]/* args */);}/**
     * Deregister a slot notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */},{key:"removeSlotChangeListener",value:function(){var _removeSlotChangeListener=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee105(clientSubscriptionId){return _regeneratorRuntime().wrap(function _callee105$(_context105){while(1)switch(_context105.prev=_context105.next){case 0:_context105.next=2;return this._unsubscribeClientSubscription(clientSubscriptionId,'slot change');case 2:case"end":return _context105.stop();}},_callee105,this);}));function removeSlotChangeListener(_x158){return _removeSlotChangeListener.apply(this,arguments);}return removeSlotChangeListener;}()/**
     * @internal
     */},{key:"_wsOnSlotUpdatesNotification",value:function _wsOnSlotUpdatesNotification(notification){var _superstruct$create5=superstruct.create(notification,SlotUpdateNotificationResult),result=_superstruct$create5.result,subscription=_superstruct$create5.subscription;this._handleServerNotification(subscription,[result]);}/**
     * Register a callback to be invoked upon slot updates. {@link SlotUpdate}'s
     * may be useful to track live progress of a cluster.
     *
     * @param callback Function to invoke whenever the slot updates
     * @return subscription id
     */},{key:"onSlotUpdate",value:function onSlotUpdate(callback){return this._makeSubscription({callback:callback,method:'slotsUpdatesSubscribe',unsubscribeMethod:'slotsUpdatesUnsubscribe'},[]/* args */);}/**
     * Deregister a slot update notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */},{key:"removeSlotUpdateListener",value:function(){var _removeSlotUpdateListener=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee106(clientSubscriptionId){return _regeneratorRuntime().wrap(function _callee106$(_context106){while(1)switch(_context106.prev=_context106.next){case 0:_context106.next=2;return this._unsubscribeClientSubscription(clientSubscriptionId,'slot update');case 2:case"end":return _context106.stop();}},_callee106,this);}));function removeSlotUpdateListener(_x159){return _removeSlotUpdateListener.apply(this,arguments);}return removeSlotUpdateListener;}()/**
     * @internal
     */},{key:"_unsubscribeClientSubscription",value:function(){var _unsubscribeClientSubscription2=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee107(clientSubscriptionId,subscriptionName){var dispose;return _regeneratorRuntime().wrap(function _callee107$(_context107){while(1)switch(_context107.prev=_context107.next){case 0:dispose=this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId];if(!dispose){_context107.next=6;break;}_context107.next=4;return dispose();case 4:_context107.next=7;break;case 6:console.warn('Ignored unsubscribe request because an active subscription with id '+"`".concat(clientSubscriptionId,"` for '").concat(subscriptionName,"' events ")+'could not be found.');case 7:case"end":return _context107.stop();}},_callee107,this);}));function _unsubscribeClientSubscription(_x160,_x161){return _unsubscribeClientSubscription2.apply(this,arguments);}return _unsubscribeClientSubscription;}()},{key:"_buildArgs",value:function _buildArgs(args,override,encoding,extra){var commitment=override||this._commitment;if(commitment||encoding||extra){var options={};if(encoding){options.encoding=encoding;}if(commitment){options.commitment=commitment;}if(extra){options=Object.assign(options,extra);}args.push(options);}return args;}/**
     * @internal
     */},{key:"_buildArgsAtLeastConfirmed",value:function _buildArgsAtLeastConfirmed(args,override,encoding,extra){var commitment=override||this._commitment;if(commitment&&!['confirmed','finalized'].includes(commitment)){throw new Error('Using Connection with default commitment: `'+this._commitment+'`, but method requires at least `confirmed`');}return this._buildArgs(args,override,encoding,extra);}/**
     * @internal
     */},{key:"_wsOnSignatureNotification",value:function _wsOnSignatureNotification(notification){var _superstruct$create6=superstruct.create(notification,SignatureNotificationResult),result=_superstruct$create6.result,subscription=_superstruct$create6.subscription;if(result.value!=='receivedSignature'){/**
         * Special case.
         * After a signature is processed, RPCs automatically dispose of the
         * subscription on the server side. We need to track which of these
         * subscriptions have been disposed in such a way, so that we know
         * whether the client is dealing with a not-yet-processed signature
         * (in which case we must tear down the server subscription) or an
         * already-processed signature (in which case the client can simply
         * clear out the subscription locally without telling the server).
         *
         * NOTE: There is a proposal to eliminate this special case, here:
         * https://github.com/solana-labs/solana/issues/18892
         */this._subscriptionsAutoDisposedByRpc.add(subscription);}this._handleServerNotification(subscription,result.value==='receivedSignature'?[{type:'received'},result.context]:[{type:'status',result:result.value},result.context]);}/**
     * Register a callback to be invoked upon signature updates
     *
     * @param signature Transaction signature string in base 58
     * @param callback Function to invoke on signature notifications
     * @param commitment Specify the commitment level signature must reach before notification
     * @return subscription id
     */},{key:"onSignature",value:function onSignature(signature,_callback,commitment){var _this29=this;var args=this._buildArgs([signature],commitment||this._commitment||'finalized'// Apply connection/server default.
);var clientSubscriptionId=this._makeSubscription({callback:function callback(notification,context){if(notification.type==='status'){_callback(notification.result,context);// Signatures subscriptions are auto-removed by the RPC service
// so no need to explicitly send an unsubscribe message.
try{_this29.removeSignatureListener(clientSubscriptionId);// eslint-disable-next-line no-empty
}catch(_err){// Already removed.
}}},method:'signatureSubscribe',unsubscribeMethod:'signatureUnsubscribe'},args);return clientSubscriptionId;}/**
     * Register a callback to be invoked when a transaction is
     * received and/or processed.
     *
     * @param signature Transaction signature string in base 58
     * @param callback Function to invoke on signature notifications
     * @param options Enable received notifications and set the commitment
     *   level that signature must reach before notification
     * @return subscription id
     */},{key:"onSignatureWithOptions",value:function onSignatureWithOptions(signature,_callback2,options){var _this30=this;var _options$commitment=_objectSpread(_objectSpread({},options),{},{commitment:options&&options.commitment||this._commitment||'finalized'// Apply connection/server default.
}),commitment=_options$commitment.commitment,extra=_objectWithoutProperties(_options$commitment,_excluded4);var args=this._buildArgs([signature],commitment,undefined/* encoding */,extra);var clientSubscriptionId=this._makeSubscription({callback:function callback(notification,context){_callback2(notification,context);// Signatures subscriptions are auto-removed by the RPC service
// so no need to explicitly send an unsubscribe message.
try{_this30.removeSignatureListener(clientSubscriptionId);// eslint-disable-next-line no-empty
}catch(_err){// Already removed.
}},method:'signatureSubscribe',unsubscribeMethod:'signatureUnsubscribe'},args);return clientSubscriptionId;}/**
     * Deregister a signature notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */},{key:"removeSignatureListener",value:function(){var _removeSignatureListener=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee108(clientSubscriptionId){return _regeneratorRuntime().wrap(function _callee108$(_context108){while(1)switch(_context108.prev=_context108.next){case 0:_context108.next=2;return this._unsubscribeClientSubscription(clientSubscriptionId,'signature result');case 2:case"end":return _context108.stop();}},_callee108,this);}));function removeSignatureListener(_x162){return _removeSignatureListener.apply(this,arguments);}return removeSignatureListener;}()/**
     * @internal
     */},{key:"_wsOnRootNotification",value:function _wsOnRootNotification(notification){var _superstruct$create7=superstruct.create(notification,RootNotificationResult),result=_superstruct$create7.result,subscription=_superstruct$create7.subscription;this._handleServerNotification(subscription,[result]);}/**
     * Register a callback to be invoked upon root changes
     *
     * @param callback Function to invoke whenever the root changes
     * @return subscription id
     */},{key:"onRootChange",value:function onRootChange(callback){return this._makeSubscription({callback:callback,method:'rootSubscribe',unsubscribeMethod:'rootUnsubscribe'},[]/* args */);}/**
     * Deregister a root notification callback
     *
     * @param clientSubscriptionId client subscription id to deregister
     */},{key:"removeRootChangeListener",value:function(){var _removeRootChangeListener=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee109(clientSubscriptionId){return _regeneratorRuntime().wrap(function _callee109$(_context109){while(1)switch(_context109.prev=_context109.next){case 0:_context109.next=2;return this._unsubscribeClientSubscription(clientSubscriptionId,'root change');case 2:case"end":return _context109.stop();}},_callee109,this);}));function removeRootChangeListener(_x163){return _removeRootChangeListener.apply(this,arguments);}return removeRootChangeListener;}()}]);}();/**
 * Keypair signer interface
 *//**
 * An account keypair used for signing transactions.
 */var Keypair=/*#__PURE__*/function(){/**
   * Create a new keypair instance.
   * Generate random keypair if no {@link Ed25519Keypair} is provided.
   *
   * @param {Ed25519Keypair} keypair ed25519 keypair
   */function Keypair(keypair){_classCallCheck(this,Keypair);this._keypair=void 0;this._keypair=keypair!==null&&keypair!==void 0?keypair:generateKeypair();}/**
   * Generate a new random keypair
   *
   * @returns {Keypair} Keypair
   */return _createClass(Keypair,[{key:"publicKey",get:/**
     * The public key for this keypair
     *
     * @returns {PublicKey} PublicKey
     */function get(){return new PublicKey(this._keypair.publicKey);}/**
     * The raw secret key for this keypair
     * @returns {Uint8Array} Secret key in an array of Uint8 bytes
     */},{key:"secretKey",get:function get(){return new Uint8Array(this._keypair.secretKey);}}],[{key:"generate",value:function generate(){return new Keypair(generateKeypair());}/**
     * Create a keypair from a raw secret key byte array.
     *
     * This method should only be used to recreate a keypair from a previously
     * generated secret key. Generating keypairs from a random seed should be done
     * with the {@link Keypair.fromSeed} method.
     *
     * @throws error if the provided secret key is invalid and validation is not skipped.
     *
     * @param secretKey secret key byte array
     * @param options skip secret key validation
     *
     * @returns {Keypair} Keypair
     */},{key:"fromSecretKey",value:function fromSecretKey(secretKey,options){if(secretKey.byteLength!==64){throw new Error('bad secret key size');}var publicKey=secretKey.slice(32,64);if(!options||!options.skipValidation){var privateScalar=secretKey.slice(0,32);var computedPublicKey=getPublicKey(privateScalar);for(var ii=0;ii<32;ii++){if(publicKey[ii]!==computedPublicKey[ii]){throw new Error('provided secretKey is invalid');}}}return new Keypair({publicKey:publicKey,secretKey:secretKey});}/**
     * Generate a keypair from a 32 byte seed.
     *
     * @param seed seed byte array
     *
     * @returns {Keypair} Keypair
     */},{key:"fromSeed",value:function fromSeed(seed){var publicKey=getPublicKey(seed);var secretKey=new Uint8Array(64);secretKey.set(seed);secretKey.set(publicKey,32);return new Keypair({publicKey:publicKey,secretKey:secretKey});}}]);}();/**
 * An enumeration of valid LookupTableInstructionType's
 *//**
 * An enumeration of valid address lookup table InstructionType's
 * @internal
 */var LOOKUP_TABLE_INSTRUCTION_LAYOUTS=Object.freeze({CreateLookupTable:{index:0,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),u64('recentSlot'),BufferLayout__namespace.u8('bumpSeed')])},FreezeLookupTable:{index:1,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])},ExtendLookupTable:{index:2,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),u64(),BufferLayout__namespace.seq(publicKey(),BufferLayout__namespace.offset(BufferLayout__namespace.u32(),-8),'addresses')])},DeactivateLookupTable:{index:3,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])},CloseLookupTable:{index:4,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])}});var AddressLookupTableInstruction=/*#__PURE__*/function(){/**
   * @internal
   */function AddressLookupTableInstruction(){_classCallCheck(this,AddressLookupTableInstruction);}return _createClass(AddressLookupTableInstruction,null,[{key:"decodeInstructionType",value:function decodeInstructionType(instruction){this.checkProgramId(instruction.programId);var instructionTypeLayout=BufferLayout__namespace.u32('instruction');var index=instructionTypeLayout.decode(instruction.data);var type;for(var _i7=0,_Object$entries2=Object.entries(LOOKUP_TABLE_INSTRUCTION_LAYOUTS);_i7<_Object$entries2.length;_i7++){var _Object$entries2$_i=_slicedToArray(_Object$entries2[_i7],2),layoutType=_Object$entries2$_i[0],layout=_Object$entries2$_i[1];if(layout.index==index){type=layoutType;break;}}if(!type){throw new Error('Invalid Instruction. Should be a LookupTable Instruction');}return type;}},{key:"decodeCreateLookupTable",value:function decodeCreateLookupTable(instruction){this.checkProgramId(instruction.programId);this.checkKeysLength(instruction.keys,4);var _decodeData$12=decodeData$1(LOOKUP_TABLE_INSTRUCTION_LAYOUTS.CreateLookupTable,instruction.data),recentSlot=_decodeData$12.recentSlot;return{authority:instruction.keys[1].pubkey,payer:instruction.keys[2].pubkey,recentSlot:Number(recentSlot)};}},{key:"decodeExtendLookupTable",value:function decodeExtendLookupTable(instruction){this.checkProgramId(instruction.programId);if(instruction.keys.length<2){throw new Error("invalid instruction; found ".concat(instruction.keys.length," keys, expected at least 2"));}var _decodeData$13=decodeData$1(LOOKUP_TABLE_INSTRUCTION_LAYOUTS.ExtendLookupTable,instruction.data),addresses=_decodeData$13.addresses;return{lookupTable:instruction.keys[0].pubkey,authority:instruction.keys[1].pubkey,payer:instruction.keys.length>2?instruction.keys[2].pubkey:undefined,addresses:addresses.map(function(buffer){return new PublicKey(buffer);})};}},{key:"decodeCloseLookupTable",value:function decodeCloseLookupTable(instruction){this.checkProgramId(instruction.programId);this.checkKeysLength(instruction.keys,3);return{lookupTable:instruction.keys[0].pubkey,authority:instruction.keys[1].pubkey,recipient:instruction.keys[2].pubkey};}},{key:"decodeFreezeLookupTable",value:function decodeFreezeLookupTable(instruction){this.checkProgramId(instruction.programId);this.checkKeysLength(instruction.keys,2);return{lookupTable:instruction.keys[0].pubkey,authority:instruction.keys[1].pubkey};}},{key:"decodeDeactivateLookupTable",value:function decodeDeactivateLookupTable(instruction){this.checkProgramId(instruction.programId);this.checkKeysLength(instruction.keys,2);return{lookupTable:instruction.keys[0].pubkey,authority:instruction.keys[1].pubkey};}/**
     * @internal
     */},{key:"checkProgramId",value:function checkProgramId(programId){if(!programId.equals(AddressLookupTableProgram.programId)){throw new Error('invalid instruction; programId is not AddressLookupTable Program');}}/**
     * @internal
     */},{key:"checkKeysLength",value:function checkKeysLength(keys,expectedLength){if(keys.length<expectedLength){throw new Error("invalid instruction; found ".concat(keys.length," keys, expected at least ").concat(expectedLength));}}}]);}();var AddressLookupTableProgram=/*#__PURE__*/function(){/**
   * @internal
   */function AddressLookupTableProgram(){_classCallCheck(this,AddressLookupTableProgram);}return _createClass(AddressLookupTableProgram,null,[{key:"createLookupTable",value:function createLookupTable(params){var _PublicKey$findProgra=PublicKey.findProgramAddressSync([params.authority.toBuffer(),bigintBuffer.toBufferLE(BigInt(params.recentSlot),8)],this.programId),_PublicKey$findProgra2=_slicedToArray(_PublicKey$findProgra,2),lookupTableAddress=_PublicKey$findProgra2[0],bumpSeed=_PublicKey$findProgra2[1];var type=LOOKUP_TABLE_INSTRUCTION_LAYOUTS.CreateLookupTable;var data=encodeData(type,{recentSlot:BigInt(params.recentSlot),bumpSeed:bumpSeed});var keys=[{pubkey:lookupTableAddress,isSigner:false,isWritable:true},{pubkey:params.authority,isSigner:true,isWritable:false},{pubkey:params.payer,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}];return[new TransactionInstruction({programId:this.programId,keys:keys,data:data}),lookupTableAddress];}},{key:"freezeLookupTable",value:function freezeLookupTable(params){var type=LOOKUP_TABLE_INSTRUCTION_LAYOUTS.FreezeLookupTable;var data=encodeData(type);var keys=[{pubkey:params.lookupTable,isSigner:false,isWritable:true},{pubkey:params.authority,isSigner:true,isWritable:false}];return new TransactionInstruction({programId:this.programId,keys:keys,data:data});}},{key:"extendLookupTable",value:function extendLookupTable(params){var type=LOOKUP_TABLE_INSTRUCTION_LAYOUTS.ExtendLookupTable;var data=encodeData(type,{addresses:params.addresses.map(function(addr){return addr.toBytes();})});var keys=[{pubkey:params.lookupTable,isSigner:false,isWritable:true},{pubkey:params.authority,isSigner:true,isWritable:false}];if(params.payer){keys.push({pubkey:params.payer,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false});}return new TransactionInstruction({programId:this.programId,keys:keys,data:data});}},{key:"deactivateLookupTable",value:function deactivateLookupTable(params){var type=LOOKUP_TABLE_INSTRUCTION_LAYOUTS.DeactivateLookupTable;var data=encodeData(type);var keys=[{pubkey:params.lookupTable,isSigner:false,isWritable:true},{pubkey:params.authority,isSigner:true,isWritable:false}];return new TransactionInstruction({programId:this.programId,keys:keys,data:data});}},{key:"closeLookupTable",value:function closeLookupTable(params){var type=LOOKUP_TABLE_INSTRUCTION_LAYOUTS.CloseLookupTable;var data=encodeData(type);var keys=[{pubkey:params.lookupTable,isSigner:false,isWritable:true},{pubkey:params.authority,isSigner:true,isWritable:false},{pubkey:params.recipient,isSigner:false,isWritable:true}];return new TransactionInstruction({programId:this.programId,keys:keys,data:data});}}]);}();AddressLookupTableProgram.programId=new PublicKey('AddressLookupTab1e1111111111111111111111111');/**
 * Compute Budget Instruction class
 */var ComputeBudgetInstruction=/*#__PURE__*/function(){/**
   * @internal
   */function ComputeBudgetInstruction(){_classCallCheck(this,ComputeBudgetInstruction);}/**
   * Decode a compute budget instruction and retrieve the instruction type.
   */return _createClass(ComputeBudgetInstruction,null,[{key:"decodeInstructionType",value:function decodeInstructionType(instruction){this.checkProgramId(instruction.programId);var instructionTypeLayout=BufferLayout__namespace.u8('instruction');var typeIndex=instructionTypeLayout.decode(instruction.data);var type;for(var _i8=0,_Object$entries3=Object.entries(COMPUTE_BUDGET_INSTRUCTION_LAYOUTS);_i8<_Object$entries3.length;_i8++){var _Object$entries3$_i=_slicedToArray(_Object$entries3[_i8],2),ixType=_Object$entries3$_i[0],layout=_Object$entries3$_i[1];if(layout.index==typeIndex){type=ixType;break;}}if(!type){throw new Error('Instruction type incorrect; not a ComputeBudgetInstruction');}return type;}/**
     * Decode request units compute budget instruction and retrieve the instruction params.
     */},{key:"decodeRequestUnits",value:function decodeRequestUnits(instruction){this.checkProgramId(instruction.programId);var _decodeData$14=decodeData$1(COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.RequestUnits,instruction.data),units=_decodeData$14.units,additionalFee=_decodeData$14.additionalFee;return{units:units,additionalFee:additionalFee};}/**
     * Decode request heap frame compute budget instruction and retrieve the instruction params.
     */},{key:"decodeRequestHeapFrame",value:function decodeRequestHeapFrame(instruction){this.checkProgramId(instruction.programId);var _decodeData$15=decodeData$1(COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.RequestHeapFrame,instruction.data),bytes=_decodeData$15.bytes;return{bytes:bytes};}/**
     * Decode set compute unit limit compute budget instruction and retrieve the instruction params.
     */},{key:"decodeSetComputeUnitLimit",value:function decodeSetComputeUnitLimit(instruction){this.checkProgramId(instruction.programId);var _decodeData$16=decodeData$1(COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.SetComputeUnitLimit,instruction.data),units=_decodeData$16.units;return{units:units};}/**
     * Decode set compute unit price compute budget instruction and retrieve the instruction params.
     */},{key:"decodeSetComputeUnitPrice",value:function decodeSetComputeUnitPrice(instruction){this.checkProgramId(instruction.programId);var _decodeData$17=decodeData$1(COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.SetComputeUnitPrice,instruction.data),microLamports=_decodeData$17.microLamports;return{microLamports:microLamports};}/**
     * @internal
     */},{key:"checkProgramId",value:function checkProgramId(programId){if(!programId.equals(ComputeBudgetProgram.programId)){throw new Error('invalid instruction; programId is not ComputeBudgetProgram');}}}]);}();/**
 * An enumeration of valid ComputeBudgetInstructionType's
 *//**
 * Request units instruction params
 *//**
 * Request heap frame instruction params
 *//**
 * Set compute unit limit instruction params
 *//**
 * Set compute unit price instruction params
 *//**
 * An enumeration of valid ComputeBudget InstructionType's
 * @internal
 */var COMPUTE_BUDGET_INSTRUCTION_LAYOUTS=Object.freeze({RequestUnits:{index:0,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'),BufferLayout__namespace.u32('units'),BufferLayout__namespace.u32('additionalFee')])},RequestHeapFrame:{index:1,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'),BufferLayout__namespace.u32('bytes')])},SetComputeUnitLimit:{index:2,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'),BufferLayout__namespace.u32('units')])},SetComputeUnitPrice:{index:3,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u8('instruction'),u64('microLamports')])}});/**
 * Factory class for transaction instructions to interact with the Compute Budget program
 */var ComputeBudgetProgram=/*#__PURE__*/function(){/**
   * @internal
   */function ComputeBudgetProgram(){_classCallCheck(this,ComputeBudgetProgram);}/**
   * Public key that identifies the Compute Budget program
   *//**
   * @deprecated Instead, call {@link setComputeUnitLimit} and/or {@link setComputeUnitPrice}
   */return _createClass(ComputeBudgetProgram,null,[{key:"requestUnits",value:function requestUnits(params){var type=COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.RequestUnits;var data=encodeData(type,params);return new TransactionInstruction({keys:[],programId:this.programId,data:data});}},{key:"requestHeapFrame",value:function requestHeapFrame(params){var type=COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.RequestHeapFrame;var data=encodeData(type,params);return new TransactionInstruction({keys:[],programId:this.programId,data:data});}},{key:"setComputeUnitLimit",value:function setComputeUnitLimit(params){var type=COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.SetComputeUnitLimit;var data=encodeData(type,params);return new TransactionInstruction({keys:[],programId:this.programId,data:data});}},{key:"setComputeUnitPrice",value:function setComputeUnitPrice(params){var type=COMPUTE_BUDGET_INSTRUCTION_LAYOUTS.SetComputeUnitPrice;var data=encodeData(type,{microLamports:BigInt(params.microLamports)});return new TransactionInstruction({keys:[],programId:this.programId,data:data});}}]);}();ComputeBudgetProgram.programId=new PublicKey('ComputeBudget111111111111111111111111111111');var PRIVATE_KEY_BYTES$1=64;var PUBLIC_KEY_BYTES$1=32;var SIGNATURE_BYTES=64;/**
 * Params for creating an ed25519 instruction using a public key
 *//**
 * Params for creating an ed25519 instruction using a private key
 */var ED25519_INSTRUCTION_LAYOUT=BufferLayout__namespace.struct([BufferLayout__namespace.u8('numSignatures'),BufferLayout__namespace.u8('padding'),BufferLayout__namespace.u16('signatureOffset'),BufferLayout__namespace.u16('signatureInstructionIndex'),BufferLayout__namespace.u16('publicKeyOffset'),BufferLayout__namespace.u16('publicKeyInstructionIndex'),BufferLayout__namespace.u16('messageDataOffset'),BufferLayout__namespace.u16('messageDataSize'),BufferLayout__namespace.u16('messageInstructionIndex')]);var Ed25519Program=/*#__PURE__*/function(){/**
   * @internal
   */function Ed25519Program(){_classCallCheck(this,Ed25519Program);}/**
   * Public key that identifies the ed25519 program
   *//**
   * Create an ed25519 instruction with a public key and signature. The
   * public key must be a buffer that is 32 bytes long, and the signature
   * must be a buffer of 64 bytes.
   */return _createClass(Ed25519Program,null,[{key:"createInstructionWithPublicKey",value:function createInstructionWithPublicKey(params){var publicKey=params.publicKey,message=params.message,signature=params.signature,instructionIndex=params.instructionIndex;assert(publicKey.length===PUBLIC_KEY_BYTES$1,"Public Key must be ".concat(PUBLIC_KEY_BYTES$1," bytes but received ").concat(publicKey.length," bytes"));assert(signature.length===SIGNATURE_BYTES,"Signature must be ".concat(SIGNATURE_BYTES," bytes but received ").concat(signature.length," bytes"));var publicKeyOffset=ED25519_INSTRUCTION_LAYOUT.span;var signatureOffset=publicKeyOffset+publicKey.length;var messageDataOffset=signatureOffset+signature.length;var numSignatures=1;var instructionData=buffer.Buffer.alloc(messageDataOffset+message.length);var index=instructionIndex==null?0xffff// An index of `u16::MAX` makes it default to the current instruction.
:instructionIndex;ED25519_INSTRUCTION_LAYOUT.encode({numSignatures:numSignatures,padding:0,signatureOffset:signatureOffset,signatureInstructionIndex:index,publicKeyOffset:publicKeyOffset,publicKeyInstructionIndex:index,messageDataOffset:messageDataOffset,messageDataSize:message.length,messageInstructionIndex:index},instructionData);instructionData.fill(publicKey,publicKeyOffset);instructionData.fill(signature,signatureOffset);instructionData.fill(message,messageDataOffset);return new TransactionInstruction({keys:[],programId:Ed25519Program.programId,data:instructionData});}/**
     * Create an ed25519 instruction with a private key. The private key
     * must be a buffer that is 64 bytes long.
     */},{key:"createInstructionWithPrivateKey",value:function createInstructionWithPrivateKey(params){var privateKey=params.privateKey,message=params.message,instructionIndex=params.instructionIndex;assert(privateKey.length===PRIVATE_KEY_BYTES$1,"Private key must be ".concat(PRIVATE_KEY_BYTES$1," bytes but received ").concat(privateKey.length," bytes"));try{var keypair=Keypair.fromSecretKey(privateKey);var _publicKey2=keypair.publicKey.toBytes();var _signature5=_sign(message,keypair.secretKey);return this.createInstructionWithPublicKey({publicKey:_publicKey2,message:message,signature:_signature5,instructionIndex:instructionIndex});}catch(error){throw new Error("Error creating instruction; ".concat(error));}}}]);}();Ed25519Program.programId=new PublicKey('Ed25519SigVerify111111111111111111111111111');var ecdsaSign=function ecdsaSign(msgHash,privKey){var signature=secp256k1.secp256k1.sign(msgHash,privKey);return[signature.toCompactRawBytes(),signature.recovery];};secp256k1.secp256k1.utils.isValidPrivateKey;var publicKeyCreate=secp256k1.secp256k1.getPublicKey;var PRIVATE_KEY_BYTES=32;var ETHEREUM_ADDRESS_BYTES=20;var PUBLIC_KEY_BYTES=64;var SIGNATURE_OFFSETS_SERIALIZED_SIZE=11;/**
 * Params for creating an secp256k1 instruction using a public key
 *//**
 * Params for creating an secp256k1 instruction using an Ethereum address
 *//**
 * Params for creating an secp256k1 instruction using a private key
 */var SECP256K1_INSTRUCTION_LAYOUT=BufferLayout__namespace.struct([BufferLayout__namespace.u8('numSignatures'),BufferLayout__namespace.u16('signatureOffset'),BufferLayout__namespace.u8('signatureInstructionIndex'),BufferLayout__namespace.u16('ethAddressOffset'),BufferLayout__namespace.u8('ethAddressInstructionIndex'),BufferLayout__namespace.u16('messageDataOffset'),BufferLayout__namespace.u16('messageDataSize'),BufferLayout__namespace.u8('messageInstructionIndex'),BufferLayout__namespace.blob(20,'ethAddress'),BufferLayout__namespace.blob(64,'signature'),BufferLayout__namespace.u8('recoveryId')]);var Secp256k1Program=/*#__PURE__*/function(){/**
   * @internal
   */function Secp256k1Program(){_classCallCheck(this,Secp256k1Program);}/**
   * Public key that identifies the secp256k1 program
   *//**
   * Construct an Ethereum address from a secp256k1 public key buffer.
   * @param {Buffer} publicKey a 64 byte secp256k1 public key buffer
   */return _createClass(Secp256k1Program,null,[{key:"publicKeyToEthAddress",value:function publicKeyToEthAddress(publicKey){assert(publicKey.length===PUBLIC_KEY_BYTES,"Public key must be ".concat(PUBLIC_KEY_BYTES," bytes but received ").concat(publicKey.length," bytes"));try{return buffer.Buffer.from(sha3.keccak_256(toBuffer(publicKey))).slice(-ETHEREUM_ADDRESS_BYTES);}catch(error){throw new Error("Error constructing Ethereum address: ".concat(error));}}/**
     * Create an secp256k1 instruction with a public key. The public key
     * must be a buffer that is 64 bytes long.
     */},{key:"createInstructionWithPublicKey",value:function createInstructionWithPublicKey(params){var publicKey=params.publicKey,message=params.message,signature=params.signature,recoveryId=params.recoveryId,instructionIndex=params.instructionIndex;return Secp256k1Program.createInstructionWithEthAddress({ethAddress:Secp256k1Program.publicKeyToEthAddress(publicKey),message:message,signature:signature,recoveryId:recoveryId,instructionIndex:instructionIndex});}/**
     * Create an secp256k1 instruction with an Ethereum address. The address
     * must be a hex string or a buffer that is 20 bytes long.
     */},{key:"createInstructionWithEthAddress",value:function createInstructionWithEthAddress(params){var rawAddress=params.ethAddress,message=params.message,signature=params.signature,recoveryId=params.recoveryId,_params$instructionIn=params.instructionIndex,instructionIndex=_params$instructionIn===void 0?0:_params$instructionIn;var ethAddress;if(typeof rawAddress==='string'){if(rawAddress.startsWith('0x')){ethAddress=buffer.Buffer.from(rawAddress.substr(2),'hex');}else{ethAddress=buffer.Buffer.from(rawAddress,'hex');}}else{ethAddress=rawAddress;}assert(ethAddress.length===ETHEREUM_ADDRESS_BYTES,"Address must be ".concat(ETHEREUM_ADDRESS_BYTES," bytes but received ").concat(ethAddress.length," bytes"));var dataStart=1+SIGNATURE_OFFSETS_SERIALIZED_SIZE;var ethAddressOffset=dataStart;var signatureOffset=dataStart+ethAddress.length;var messageDataOffset=signatureOffset+signature.length+1;var numSignatures=1;var instructionData=buffer.Buffer.alloc(SECP256K1_INSTRUCTION_LAYOUT.span+message.length);SECP256K1_INSTRUCTION_LAYOUT.encode({numSignatures:numSignatures,signatureOffset:signatureOffset,signatureInstructionIndex:instructionIndex,ethAddressOffset:ethAddressOffset,ethAddressInstructionIndex:instructionIndex,messageDataOffset:messageDataOffset,messageDataSize:message.length,messageInstructionIndex:instructionIndex,signature:toBuffer(signature),ethAddress:toBuffer(ethAddress),recoveryId:recoveryId},instructionData);instructionData.fill(toBuffer(message),SECP256K1_INSTRUCTION_LAYOUT.span);return new TransactionInstruction({keys:[],programId:Secp256k1Program.programId,data:instructionData});}/**
     * Create an secp256k1 instruction with a private key. The private key
     * must be a buffer that is 32 bytes long.
     */},{key:"createInstructionWithPrivateKey",value:function createInstructionWithPrivateKey(params){var pkey=params.privateKey,message=params.message,instructionIndex=params.instructionIndex;assert(pkey.length===PRIVATE_KEY_BYTES,"Private key must be ".concat(PRIVATE_KEY_BYTES," bytes but received ").concat(pkey.length," bytes"));try{var privateKey=toBuffer(pkey);var _publicKey3=publicKeyCreate(privateKey,false/* isCompressed */).slice(1);// throw away leading byte
var messageHash=buffer.Buffer.from(sha3.keccak_256(toBuffer(message)));var _ecdsaSign=ecdsaSign(messageHash,privateKey),_ecdsaSign2=_slicedToArray(_ecdsaSign,2),_signature6=_ecdsaSign2[0],recoveryId=_ecdsaSign2[1];return this.createInstructionWithPublicKey({publicKey:_publicKey3,message:message,signature:_signature6,recoveryId:recoveryId,instructionIndex:instructionIndex});}catch(error){throw new Error("Error creating instruction; ".concat(error));}}}]);}();Secp256k1Program.programId=new PublicKey('KeccakSecp256k11111111111111111111111111111');var _Lockup;/**
 * Address of the stake config account which configures the rate
 * of stake warmup and cooldown as well as the slashing penalty.
 */var STAKE_CONFIG_ID=new PublicKey('StakeConfig11111111111111111111111111111111');/**
 * Stake account authority info
 */var Authorized=/*#__PURE__*/_createClass(/**
 * Create a new Authorized object
 * @param staker the stake authority
 * @param withdrawer the withdraw authority
 */function Authorized(staker,withdrawer){_classCallCheck(this,Authorized);/** stake authority */this.staker=void 0;/** withdraw authority */this.withdrawer=void 0;this.staker=staker;this.withdrawer=withdrawer;});/**
 * Stake account lockup info
 */var Lockup=/*#__PURE__*/_createClass(/**
 * Create a new Lockup object
 */function Lockup(unixTimestamp,epoch,custodian){_classCallCheck(this,Lockup);/** Unix timestamp of lockup expiration */this.unixTimestamp=void 0;/** Epoch of lockup expiration */this.epoch=void 0;/** Lockup custodian authority */this.custodian=void 0;this.unixTimestamp=unixTimestamp;this.epoch=epoch;this.custodian=custodian;}/**
 * Default, inactive Lockup value
 */);_Lockup=Lockup;Lockup["default"]=new _Lockup(0,0,PublicKey["default"]);/**
 * Create stake account transaction params
 *//**
 * Create stake account with seed transaction params
 *//**
 * Initialize stake instruction params
 *//**
 * Delegate stake instruction params
 *//**
 * Authorize stake instruction params
 *//**
 * Authorize stake instruction params using a derived key
 *//**
 * Split stake instruction params
 *//**
 * Split with seed transaction params
 *//**
 * Withdraw stake instruction params
 *//**
 * Deactivate stake instruction params
 *//**
 * Merge stake instruction params
 *//**
 * Stake Instruction class
 */var StakeInstruction=/*#__PURE__*/function(){/**
   * @internal
   */function StakeInstruction(){_classCallCheck(this,StakeInstruction);}/**
   * Decode a stake instruction and retrieve the instruction type.
   */return _createClass(StakeInstruction,null,[{key:"decodeInstructionType",value:function decodeInstructionType(instruction){this.checkProgramId(instruction.programId);var instructionTypeLayout=BufferLayout__namespace.u32('instruction');var typeIndex=instructionTypeLayout.decode(instruction.data);var type;for(var _i9=0,_Object$entries4=Object.entries(STAKE_INSTRUCTION_LAYOUTS);_i9<_Object$entries4.length;_i9++){var _Object$entries4$_i=_slicedToArray(_Object$entries4[_i9],2),ixType=_Object$entries4$_i[0],layout=_Object$entries4$_i[1];if(layout.index==typeIndex){type=ixType;break;}}if(!type){throw new Error('Instruction type incorrect; not a StakeInstruction');}return type;}/**
     * Decode a initialize stake instruction and retrieve the instruction params.
     */},{key:"decodeInitialize",value:function decodeInitialize(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,2);var _decodeData$18=decodeData$1(STAKE_INSTRUCTION_LAYOUTS.Initialize,instruction.data),authorized=_decodeData$18.authorized,lockup=_decodeData$18.lockup;return{stakePubkey:instruction.keys[0].pubkey,authorized:new Authorized(new PublicKey(authorized.staker),new PublicKey(authorized.withdrawer)),lockup:new Lockup(lockup.unixTimestamp,lockup.epoch,new PublicKey(lockup.custodian))};}/**
     * Decode a delegate stake instruction and retrieve the instruction params.
     */},{key:"decodeDelegate",value:function decodeDelegate(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,6);decodeData$1(STAKE_INSTRUCTION_LAYOUTS.Delegate,instruction.data);return{stakePubkey:instruction.keys[0].pubkey,votePubkey:instruction.keys[1].pubkey,authorizedPubkey:instruction.keys[5].pubkey};}/**
     * Decode an authorize stake instruction and retrieve the instruction params.
     */},{key:"decodeAuthorize",value:function decodeAuthorize(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);var _decodeData$19=decodeData$1(STAKE_INSTRUCTION_LAYOUTS.Authorize,instruction.data),newAuthorized=_decodeData$19.newAuthorized,stakeAuthorizationType=_decodeData$19.stakeAuthorizationType;var o={stakePubkey:instruction.keys[0].pubkey,authorizedPubkey:instruction.keys[2].pubkey,newAuthorizedPubkey:new PublicKey(newAuthorized),stakeAuthorizationType:{index:stakeAuthorizationType}};if(instruction.keys.length>3){o.custodianPubkey=instruction.keys[3].pubkey;}return o;}/**
     * Decode an authorize-with-seed stake instruction and retrieve the instruction params.
     */},{key:"decodeAuthorizeWithSeed",value:function decodeAuthorizeWithSeed(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,2);var _decodeData$20=decodeData$1(STAKE_INSTRUCTION_LAYOUTS.AuthorizeWithSeed,instruction.data),newAuthorized=_decodeData$20.newAuthorized,stakeAuthorizationType=_decodeData$20.stakeAuthorizationType,authoritySeed=_decodeData$20.authoritySeed,authorityOwner=_decodeData$20.authorityOwner;var o={stakePubkey:instruction.keys[0].pubkey,authorityBase:instruction.keys[1].pubkey,authoritySeed:authoritySeed,authorityOwner:new PublicKey(authorityOwner),newAuthorizedPubkey:new PublicKey(newAuthorized),stakeAuthorizationType:{index:stakeAuthorizationType}};if(instruction.keys.length>3){o.custodianPubkey=instruction.keys[3].pubkey;}return o;}/**
     * Decode a split stake instruction and retrieve the instruction params.
     */},{key:"decodeSplit",value:function decodeSplit(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);var _decodeData$21=decodeData$1(STAKE_INSTRUCTION_LAYOUTS.Split,instruction.data),lamports=_decodeData$21.lamports;return{stakePubkey:instruction.keys[0].pubkey,splitStakePubkey:instruction.keys[1].pubkey,authorizedPubkey:instruction.keys[2].pubkey,lamports:lamports};}/**
     * Decode a merge stake instruction and retrieve the instruction params.
     */},{key:"decodeMerge",value:function decodeMerge(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);decodeData$1(STAKE_INSTRUCTION_LAYOUTS.Merge,instruction.data);return{stakePubkey:instruction.keys[0].pubkey,sourceStakePubKey:instruction.keys[1].pubkey,authorizedPubkey:instruction.keys[4].pubkey};}/**
     * Decode a withdraw stake instruction and retrieve the instruction params.
     */},{key:"decodeWithdraw",value:function decodeWithdraw(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,5);var _decodeData$22=decodeData$1(STAKE_INSTRUCTION_LAYOUTS.Withdraw,instruction.data),lamports=_decodeData$22.lamports;var o={stakePubkey:instruction.keys[0].pubkey,toPubkey:instruction.keys[1].pubkey,authorizedPubkey:instruction.keys[4].pubkey,lamports:lamports};if(instruction.keys.length>5){o.custodianPubkey=instruction.keys[5].pubkey;}return o;}/**
     * Decode a deactivate stake instruction and retrieve the instruction params.
     */},{key:"decodeDeactivate",value:function decodeDeactivate(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);decodeData$1(STAKE_INSTRUCTION_LAYOUTS.Deactivate,instruction.data);return{stakePubkey:instruction.keys[0].pubkey,authorizedPubkey:instruction.keys[2].pubkey};}/**
     * @internal
     */},{key:"checkProgramId",value:function checkProgramId(programId){if(!programId.equals(StakeProgram.programId)){throw new Error('invalid instruction; programId is not StakeProgram');}}/**
     * @internal
     */},{key:"checkKeyLength",value:function checkKeyLength(keys,expectedLength){if(keys.length<expectedLength){throw new Error("invalid instruction; found ".concat(keys.length," keys, expected at least ").concat(expectedLength));}}}]);}();/**
 * An enumeration of valid StakeInstructionType's
 *//**
 * An enumeration of valid stake InstructionType's
 * @internal
 */var STAKE_INSTRUCTION_LAYOUTS=Object.freeze({Initialize:{index:0,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),authorized(),lockup()])},Authorize:{index:1,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('newAuthorized'),BufferLayout__namespace.u32('stakeAuthorizationType')])},Delegate:{index:2,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])},Split:{index:3,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),BufferLayout__namespace.ns64('lamports')])},Withdraw:{index:4,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),BufferLayout__namespace.ns64('lamports')])},Deactivate:{index:5,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])},Merge:{index:7,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])},AuthorizeWithSeed:{index:8,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('newAuthorized'),BufferLayout__namespace.u32('stakeAuthorizationType'),rustString('authoritySeed'),publicKey('authorityOwner')])}});/**
 * Stake authorization type
 *//**
 * An enumeration of valid StakeAuthorizationLayout's
 */var StakeAuthorizationLayout=Object.freeze({Staker:{index:0},Withdrawer:{index:1}});/**
 * Factory class for transactions to interact with the Stake program
 */var StakeProgram=/*#__PURE__*/function(){/**
   * @internal
   */function StakeProgram(){_classCallCheck(this,StakeProgram);}/**
   * Public key that identifies the Stake program
   *//**
   * Generate an Initialize instruction to add to a Stake Create transaction
   */return _createClass(StakeProgram,null,[{key:"initialize",value:function initialize(params){var stakePubkey=params.stakePubkey,authorized=params.authorized,maybeLockup=params.lockup;var lockup=maybeLockup||Lockup["default"];var type=STAKE_INSTRUCTION_LAYOUTS.Initialize;var data=encodeData(type,{authorized:{staker:toBuffer(authorized.staker.toBuffer()),withdrawer:toBuffer(authorized.withdrawer.toBuffer())},lockup:{unixTimestamp:lockup.unixTimestamp,epoch:lockup.epoch,custodian:toBuffer(lockup.custodian.toBuffer())}});var instructionData={keys:[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_RENT_PUBKEY,isSigner:false,isWritable:false}],programId:this.programId,data:data};return new TransactionInstruction(instructionData);}/**
     * Generate a Transaction that creates a new Stake account at
     *   an address generated with `from`, a seed, and the Stake programId
     */},{key:"createAccountWithSeed",value:function createAccountWithSeed(params){var transaction=new Transaction();transaction.add(SystemProgram.createAccountWithSeed({fromPubkey:params.fromPubkey,newAccountPubkey:params.stakePubkey,basePubkey:params.basePubkey,seed:params.seed,lamports:params.lamports,space:this.space,programId:this.programId}));var stakePubkey=params.stakePubkey,authorized=params.authorized,lockup=params.lockup;return transaction.add(this.initialize({stakePubkey:stakePubkey,authorized:authorized,lockup:lockup}));}/**
     * Generate a Transaction that creates a new Stake account
     */},{key:"createAccount",value:function createAccount(params){var transaction=new Transaction();transaction.add(SystemProgram.createAccount({fromPubkey:params.fromPubkey,newAccountPubkey:params.stakePubkey,lamports:params.lamports,space:this.space,programId:this.programId}));var stakePubkey=params.stakePubkey,authorized=params.authorized,lockup=params.lockup;return transaction.add(this.initialize({stakePubkey:stakePubkey,authorized:authorized,lockup:lockup}));}/**
     * Generate a Transaction that delegates Stake tokens to a validator
     * Vote PublicKey. This transaction can also be used to redelegate Stake
     * to a new validator Vote PublicKey.
     */},{key:"delegate",value:function delegate(params){var stakePubkey=params.stakePubkey,authorizedPubkey=params.authorizedPubkey,votePubkey=params.votePubkey;var type=STAKE_INSTRUCTION_LAYOUTS.Delegate;var data=encodeData(type);return new Transaction().add({keys:[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:votePubkey,isSigner:false,isWritable:false},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false},{pubkey:SYSVAR_STAKE_HISTORY_PUBKEY,isSigner:false,isWritable:false},{pubkey:STAKE_CONFIG_ID,isSigner:false,isWritable:false},{pubkey:authorizedPubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data});}/**
     * Generate a Transaction that authorizes a new PublicKey as Staker
     * or Withdrawer on the Stake account.
     */},{key:"authorize",value:function authorize(params){var stakePubkey=params.stakePubkey,authorizedPubkey=params.authorizedPubkey,newAuthorizedPubkey=params.newAuthorizedPubkey,stakeAuthorizationType=params.stakeAuthorizationType,custodianPubkey=params.custodianPubkey;var type=STAKE_INSTRUCTION_LAYOUTS.Authorize;var data=encodeData(type,{newAuthorized:toBuffer(newAuthorizedPubkey.toBuffer()),stakeAuthorizationType:stakeAuthorizationType.index});var keys=[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:true},{pubkey:authorizedPubkey,isSigner:true,isWritable:false}];if(custodianPubkey){keys.push({pubkey:custodianPubkey,isSigner:true,isWritable:false});}return new Transaction().add({keys:keys,programId:this.programId,data:data});}/**
     * Generate a Transaction that authorizes a new PublicKey as Staker
     * or Withdrawer on the Stake account.
     */},{key:"authorizeWithSeed",value:function authorizeWithSeed(params){var stakePubkey=params.stakePubkey,authorityBase=params.authorityBase,authoritySeed=params.authoritySeed,authorityOwner=params.authorityOwner,newAuthorizedPubkey=params.newAuthorizedPubkey,stakeAuthorizationType=params.stakeAuthorizationType,custodianPubkey=params.custodianPubkey;var type=STAKE_INSTRUCTION_LAYOUTS.AuthorizeWithSeed;var data=encodeData(type,{newAuthorized:toBuffer(newAuthorizedPubkey.toBuffer()),stakeAuthorizationType:stakeAuthorizationType.index,authoritySeed:authoritySeed,authorityOwner:toBuffer(authorityOwner.toBuffer())});var keys=[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:authorityBase,isSigner:true,isWritable:false},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false}];if(custodianPubkey){keys.push({pubkey:custodianPubkey,isSigner:true,isWritable:false});}return new Transaction().add({keys:keys,programId:this.programId,data:data});}/**
     * @internal
     */},{key:"splitInstruction",value:function splitInstruction(params){var stakePubkey=params.stakePubkey,authorizedPubkey=params.authorizedPubkey,splitStakePubkey=params.splitStakePubkey,lamports=params.lamports;var type=STAKE_INSTRUCTION_LAYOUTS.Split;var data=encodeData(type,{lamports:lamports});return new TransactionInstruction({keys:[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:splitStakePubkey,isSigner:false,isWritable:true},{pubkey:authorizedPubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data});}/**
     * Generate a Transaction that splits Stake tokens into another stake account
     */},{key:"split",value:function split(params,// Compute the cost of allocating the new stake account in lamports
rentExemptReserve){var transaction=new Transaction();transaction.add(SystemProgram.createAccount({fromPubkey:params.authorizedPubkey,newAccountPubkey:params.splitStakePubkey,lamports:rentExemptReserve,space:this.space,programId:this.programId}));return transaction.add(this.splitInstruction(params));}/**
     * Generate a Transaction that splits Stake tokens into another account
     * derived from a base public key and seed
     */},{key:"splitWithSeed",value:function splitWithSeed(params,// If this stake account is new, compute the cost of allocating it in lamports
rentExemptReserve){var stakePubkey=params.stakePubkey,authorizedPubkey=params.authorizedPubkey,splitStakePubkey=params.splitStakePubkey,basePubkey=params.basePubkey,seed=params.seed,lamports=params.lamports;var transaction=new Transaction();transaction.add(SystemProgram.allocate({accountPubkey:splitStakePubkey,basePubkey:basePubkey,seed:seed,space:this.space,programId:this.programId}));if(rentExemptReserve&&rentExemptReserve>0){transaction.add(SystemProgram.transfer({fromPubkey:params.authorizedPubkey,toPubkey:splitStakePubkey,lamports:rentExemptReserve}));}return transaction.add(this.splitInstruction({stakePubkey:stakePubkey,authorizedPubkey:authorizedPubkey,splitStakePubkey:splitStakePubkey,lamports:lamports}));}/**
     * Generate a Transaction that merges Stake accounts.
     */},{key:"merge",value:function merge(params){var stakePubkey=params.stakePubkey,sourceStakePubKey=params.sourceStakePubKey,authorizedPubkey=params.authorizedPubkey;var type=STAKE_INSTRUCTION_LAYOUTS.Merge;var data=encodeData(type);return new Transaction().add({keys:[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:sourceStakePubKey,isSigner:false,isWritable:true},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false},{pubkey:SYSVAR_STAKE_HISTORY_PUBKEY,isSigner:false,isWritable:false},{pubkey:authorizedPubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data});}/**
     * Generate a Transaction that withdraws deactivated Stake tokens.
     */},{key:"withdraw",value:function withdraw(params){var stakePubkey=params.stakePubkey,authorizedPubkey=params.authorizedPubkey,toPubkey=params.toPubkey,lamports=params.lamports,custodianPubkey=params.custodianPubkey;var type=STAKE_INSTRUCTION_LAYOUTS.Withdraw;var data=encodeData(type,{lamports:lamports});var keys=[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:toPubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false},{pubkey:SYSVAR_STAKE_HISTORY_PUBKEY,isSigner:false,isWritable:false},{pubkey:authorizedPubkey,isSigner:true,isWritable:false}];if(custodianPubkey){keys.push({pubkey:custodianPubkey,isSigner:true,isWritable:false});}return new Transaction().add({keys:keys,programId:this.programId,data:data});}/**
     * Generate a Transaction that deactivates Stake tokens.
     */},{key:"deactivate",value:function deactivate(params){var stakePubkey=params.stakePubkey,authorizedPubkey=params.authorizedPubkey;var type=STAKE_INSTRUCTION_LAYOUTS.Deactivate;var data=encodeData(type);return new Transaction().add({keys:[{pubkey:stakePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false},{pubkey:authorizedPubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data});}}]);}();StakeProgram.programId=new PublicKey('Stake11111111111111111111111111111111111111');/**
 * Max space of a Stake account
 *
 * This is generated from the solana-stake-program StakeState struct as
 * `StakeStateV2::size_of()`:
 * https://docs.rs/solana-stake-program/latest/solana_stake_program/stake_state/enum.StakeStateV2.html
 */StakeProgram.space=200;/**
 * Vote account info
 */var VoteInit=/*#__PURE__*/_createClass(/** [0, 100] */function VoteInit(nodePubkey,authorizedVoter,authorizedWithdrawer,commission){_classCallCheck(this,VoteInit);this.nodePubkey=void 0;this.authorizedVoter=void 0;this.authorizedWithdrawer=void 0;this.commission=void 0;this.nodePubkey=nodePubkey;this.authorizedVoter=authorizedVoter;this.authorizedWithdrawer=authorizedWithdrawer;this.commission=commission;});/**
 * Create vote account transaction params
 *//**
 * InitializeAccount instruction params
 *//**
 * Authorize instruction params
 *//**
 * AuthorizeWithSeed instruction params
 *//**
 * Withdraw from vote account transaction params
 *//**
 * Update validator identity (node pubkey) vote account instruction params.
 *//**
 * Vote Instruction class
 */var VoteInstruction=/*#__PURE__*/function(){/**
   * @internal
   */function VoteInstruction(){_classCallCheck(this,VoteInstruction);}/**
   * Decode a vote instruction and retrieve the instruction type.
   */return _createClass(VoteInstruction,null,[{key:"decodeInstructionType",value:function decodeInstructionType(instruction){this.checkProgramId(instruction.programId);var instructionTypeLayout=BufferLayout__namespace.u32('instruction');var typeIndex=instructionTypeLayout.decode(instruction.data);var type;for(var _i10=0,_Object$entries5=Object.entries(VOTE_INSTRUCTION_LAYOUTS);_i10<_Object$entries5.length;_i10++){var _Object$entries5$_i=_slicedToArray(_Object$entries5[_i10],2),ixType=_Object$entries5$_i[0],layout=_Object$entries5$_i[1];if(layout.index==typeIndex){type=ixType;break;}}if(!type){throw new Error('Instruction type incorrect; not a VoteInstruction');}return type;}/**
     * Decode an initialize vote instruction and retrieve the instruction params.
     */},{key:"decodeInitializeAccount",value:function decodeInitializeAccount(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,4);var _decodeData$23=decodeData$1(VOTE_INSTRUCTION_LAYOUTS.InitializeAccount,instruction.data),voteInit=_decodeData$23.voteInit;return{votePubkey:instruction.keys[0].pubkey,nodePubkey:instruction.keys[3].pubkey,voteInit:new VoteInit(new PublicKey(voteInit.nodePubkey),new PublicKey(voteInit.authorizedVoter),new PublicKey(voteInit.authorizedWithdrawer),voteInit.commission)};}/**
     * Decode an authorize instruction and retrieve the instruction params.
     */},{key:"decodeAuthorize",value:function decodeAuthorize(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);var _decodeData$24=decodeData$1(VOTE_INSTRUCTION_LAYOUTS.Authorize,instruction.data),newAuthorized=_decodeData$24.newAuthorized,voteAuthorizationType=_decodeData$24.voteAuthorizationType;return{votePubkey:instruction.keys[0].pubkey,authorizedPubkey:instruction.keys[2].pubkey,newAuthorizedPubkey:new PublicKey(newAuthorized),voteAuthorizationType:{index:voteAuthorizationType}};}/**
     * Decode an authorize instruction and retrieve the instruction params.
     */},{key:"decodeAuthorizeWithSeed",value:function decodeAuthorizeWithSeed(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);var _decodeData$25=decodeData$1(VOTE_INSTRUCTION_LAYOUTS.AuthorizeWithSeed,instruction.data),_decodeData$25$voteAu=_decodeData$25.voteAuthorizeWithSeedArgs,currentAuthorityDerivedKeyOwnerPubkey=_decodeData$25$voteAu.currentAuthorityDerivedKeyOwnerPubkey,currentAuthorityDerivedKeySeed=_decodeData$25$voteAu.currentAuthorityDerivedKeySeed,newAuthorized=_decodeData$25$voteAu.newAuthorized,voteAuthorizationType=_decodeData$25$voteAu.voteAuthorizationType;return{currentAuthorityDerivedKeyBasePubkey:instruction.keys[2].pubkey,currentAuthorityDerivedKeyOwnerPubkey:new PublicKey(currentAuthorityDerivedKeyOwnerPubkey),currentAuthorityDerivedKeySeed:currentAuthorityDerivedKeySeed,newAuthorizedPubkey:new PublicKey(newAuthorized),voteAuthorizationType:{index:voteAuthorizationType},votePubkey:instruction.keys[0].pubkey};}/**
     * Decode a withdraw instruction and retrieve the instruction params.
     */},{key:"decodeWithdraw",value:function decodeWithdraw(instruction){this.checkProgramId(instruction.programId);this.checkKeyLength(instruction.keys,3);var _decodeData$26=decodeData$1(VOTE_INSTRUCTION_LAYOUTS.Withdraw,instruction.data),lamports=_decodeData$26.lamports;return{votePubkey:instruction.keys[0].pubkey,authorizedWithdrawerPubkey:instruction.keys[2].pubkey,lamports:lamports,toPubkey:instruction.keys[1].pubkey};}/**
     * @internal
     */},{key:"checkProgramId",value:function checkProgramId(programId){if(!programId.equals(VoteProgram.programId)){throw new Error('invalid instruction; programId is not VoteProgram');}}/**
     * @internal
     */},{key:"checkKeyLength",value:function checkKeyLength(keys,expectedLength){if(keys.length<expectedLength){throw new Error("invalid instruction; found ".concat(keys.length," keys, expected at least ").concat(expectedLength));}}}]);}();/**
 * An enumeration of valid VoteInstructionType's
 *//** @internal */var VOTE_INSTRUCTION_LAYOUTS=Object.freeze({InitializeAccount:{index:0,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),voteInit()])},Authorize:{index:1,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),publicKey('newAuthorized'),BufferLayout__namespace.u32('voteAuthorizationType')])},Withdraw:{index:3,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),BufferLayout__namespace.ns64('lamports')])},UpdateValidatorIdentity:{index:4,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction')])},AuthorizeWithSeed:{index:10,layout:BufferLayout__namespace.struct([BufferLayout__namespace.u32('instruction'),voteAuthorizeWithSeedArgs()])}});/**
 * VoteAuthorize type
 *//**
 * An enumeration of valid VoteAuthorization layouts.
 */var VoteAuthorizationLayout=Object.freeze({Voter:{index:0},Withdrawer:{index:1}});/**
 * Factory class for transactions to interact with the Vote program
 */var VoteProgram=/*#__PURE__*/function(){/**
   * @internal
   */function VoteProgram(){_classCallCheck(this,VoteProgram);}/**
   * Public key that identifies the Vote program
   *//**
   * Generate an Initialize instruction.
   */return _createClass(VoteProgram,null,[{key:"initializeAccount",value:function initializeAccount(params){var votePubkey=params.votePubkey,nodePubkey=params.nodePubkey,voteInit=params.voteInit;var type=VOTE_INSTRUCTION_LAYOUTS.InitializeAccount;var data=encodeData(type,{voteInit:{nodePubkey:toBuffer(voteInit.nodePubkey.toBuffer()),authorizedVoter:toBuffer(voteInit.authorizedVoter.toBuffer()),authorizedWithdrawer:toBuffer(voteInit.authorizedWithdrawer.toBuffer()),commission:voteInit.commission}});var instructionData={keys:[{pubkey:votePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_RENT_PUBKEY,isSigner:false,isWritable:false},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false},{pubkey:nodePubkey,isSigner:true,isWritable:false}],programId:this.programId,data:data};return new TransactionInstruction(instructionData);}/**
     * Generate a transaction that creates a new Vote account.
     */},{key:"createAccount",value:function createAccount(params){var transaction=new Transaction();transaction.add(SystemProgram.createAccount({fromPubkey:params.fromPubkey,newAccountPubkey:params.votePubkey,lamports:params.lamports,space:this.space,programId:this.programId}));return transaction.add(this.initializeAccount({votePubkey:params.votePubkey,nodePubkey:params.voteInit.nodePubkey,voteInit:params.voteInit}));}/**
     * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account.
     */},{key:"authorize",value:function authorize(params){var votePubkey=params.votePubkey,authorizedPubkey=params.authorizedPubkey,newAuthorizedPubkey=params.newAuthorizedPubkey,voteAuthorizationType=params.voteAuthorizationType;var type=VOTE_INSTRUCTION_LAYOUTS.Authorize;var data=encodeData(type,{newAuthorized:toBuffer(newAuthorizedPubkey.toBuffer()),voteAuthorizationType:voteAuthorizationType.index});var keys=[{pubkey:votePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false},{pubkey:authorizedPubkey,isSigner:true,isWritable:false}];return new Transaction().add({keys:keys,programId:this.programId,data:data});}/**
     * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account
     * where the current Voter or Withdrawer authority is a derived key.
     */},{key:"authorizeWithSeed",value:function authorizeWithSeed(params){var currentAuthorityDerivedKeyBasePubkey=params.currentAuthorityDerivedKeyBasePubkey,currentAuthorityDerivedKeyOwnerPubkey=params.currentAuthorityDerivedKeyOwnerPubkey,currentAuthorityDerivedKeySeed=params.currentAuthorityDerivedKeySeed,newAuthorizedPubkey=params.newAuthorizedPubkey,voteAuthorizationType=params.voteAuthorizationType,votePubkey=params.votePubkey;var type=VOTE_INSTRUCTION_LAYOUTS.AuthorizeWithSeed;var data=encodeData(type,{voteAuthorizeWithSeedArgs:{currentAuthorityDerivedKeyOwnerPubkey:toBuffer(currentAuthorityDerivedKeyOwnerPubkey.toBuffer()),currentAuthorityDerivedKeySeed:currentAuthorityDerivedKeySeed,newAuthorized:toBuffer(newAuthorizedPubkey.toBuffer()),voteAuthorizationType:voteAuthorizationType.index}});var keys=[{pubkey:votePubkey,isSigner:false,isWritable:true},{pubkey:SYSVAR_CLOCK_PUBKEY,isSigner:false,isWritable:false},{pubkey:currentAuthorityDerivedKeyBasePubkey,isSigner:true,isWritable:false}];return new Transaction().add({keys:keys,programId:this.programId,data:data});}/**
     * Generate a transaction to withdraw from a Vote account.
     */},{key:"withdraw",value:function withdraw(params){var votePubkey=params.votePubkey,authorizedWithdrawerPubkey=params.authorizedWithdrawerPubkey,lamports=params.lamports,toPubkey=params.toPubkey;var type=VOTE_INSTRUCTION_LAYOUTS.Withdraw;var data=encodeData(type,{lamports:lamports});var keys=[{pubkey:votePubkey,isSigner:false,isWritable:true},{pubkey:toPubkey,isSigner:false,isWritable:true},{pubkey:authorizedWithdrawerPubkey,isSigner:true,isWritable:false}];return new Transaction().add({keys:keys,programId:this.programId,data:data});}/**
     * Generate a transaction to withdraw safely from a Vote account.
     *
     * This function was created as a safeguard for vote accounts running validators, `safeWithdraw`
     * checks that the withdraw amount will not exceed the specified balance while leaving enough left
     * to cover rent. If you wish to close the vote account by withdrawing the full amount, call the
     * `withdraw` method directly.
     */},{key:"safeWithdraw",value:function safeWithdraw(params,currentVoteAccountBalance,rentExemptMinimum){if(params.lamports>currentVoteAccountBalance-rentExemptMinimum){throw new Error('Withdraw will leave vote account with insufficient funds.');}return VoteProgram.withdraw(params);}/**
     * Generate a transaction to update the validator identity (node pubkey) of a Vote account.
     */},{key:"updateValidatorIdentity",value:function updateValidatorIdentity(params){var votePubkey=params.votePubkey,authorizedWithdrawerPubkey=params.authorizedWithdrawerPubkey,nodePubkey=params.nodePubkey;var type=VOTE_INSTRUCTION_LAYOUTS.UpdateValidatorIdentity;var data=encodeData(type);var keys=[{pubkey:votePubkey,isSigner:false,isWritable:true},{pubkey:nodePubkey,isSigner:true,isWritable:false},{pubkey:authorizedWithdrawerPubkey,isSigner:true,isWritable:false}];return new Transaction().add({keys:keys,programId:this.programId,data:data});}}]);}();VoteProgram.programId=new PublicKey('Vote111111111111111111111111111111111111111');/**
 * Max space of a Vote account
 *
 * This is generated from the solana-vote-program VoteState struct as
 * `VoteState::size_of()`:
 * https://docs.rs/solana-vote-program/1.9.5/solana_vote_program/vote_state/struct.VoteState.html#method.size_of
 *
 * KEEP IN SYNC WITH `VoteState::size_of()` in https://github.com/solana-labs/solana/blob/a474cb24b9238f5edcc982f65c0b37d4a1046f7e/sdk/program/src/vote/state/mod.rs#L340-L342
 */VoteProgram.space=3762;var VALIDATOR_INFO_KEY=new PublicKey('Va1idator1nfo111111111111111111111111111111');/**
 * @internal
 *//**
 * Info used to identity validators.
 */var InfoString=superstruct.type({name:superstruct.string(),website:superstruct.optional(superstruct.string()),details:superstruct.optional(superstruct.string()),iconUrl:superstruct.optional(superstruct.string()),keybaseUsername:superstruct.optional(superstruct.string())});/**
 * ValidatorInfo class
 */var ValidatorInfo=/*#__PURE__*/function(){/**
   * Construct a valid ValidatorInfo
   *
   * @param key validator public key
   * @param info validator information
   */function ValidatorInfo(key,info){_classCallCheck(this,ValidatorInfo);/**
     * validator public key
     */this.key=void 0;/**
     * validator information
     */this.info=void 0;this.key=key;this.info=info;}/**
   * Deserialize ValidatorInfo from the config account data. Exactly two config
   * keys are required in the data.
   *
   * @param buffer config account data
   * @return null if info was not found
   */return _createClass(ValidatorInfo,null,[{key:"fromConfigData",value:function fromConfigData(buffer$1){var byteArray=_toConsumableArray(buffer$1);var configKeyCount=decodeLength(byteArray);if(configKeyCount!==2)return null;var configKeys=[];for(var i=0;i<2;i++){var _publicKey4=new PublicKey(guardedSplice(byteArray,0,PUBLIC_KEY_LENGTH));var isSigner=guardedShift(byteArray)===1;configKeys.push({publicKey:_publicKey4,isSigner:isSigner});}if(configKeys[0].publicKey.equals(VALIDATOR_INFO_KEY)){if(configKeys[1].isSigner){var rawInfo=rustString().decode(buffer.Buffer.from(byteArray));var info=JSON.parse(rawInfo);superstruct.assert(info,InfoString);return new ValidatorInfo(configKeys[1].publicKey,info);}}return null;}}]);}();var VOTE_PROGRAM_ID=new PublicKey('Vote111111111111111111111111111111111111111');/**
 * History of how many credits earned by the end of each epoch
 *//**
 * See https://github.com/solana-labs/solana/blob/8a12ed029cfa38d4a45400916c2463fb82bbec8c/programs/vote_api/src/vote_state.rs#L68-L88
 *
 * @internal
 */var VoteAccountLayout=BufferLayout__namespace.struct([publicKey('nodePubkey'),publicKey('authorizedWithdrawer'),BufferLayout__namespace.u8('commission'),BufferLayout__namespace.nu64(),// votes.length
BufferLayout__namespace.seq(BufferLayout__namespace.struct([BufferLayout__namespace.nu64('slot'),BufferLayout__namespace.u32('confirmationCount')]),BufferLayout__namespace.offset(BufferLayout__namespace.u32(),-8),'votes'),BufferLayout__namespace.u8('rootSlotValid'),BufferLayout__namespace.nu64('rootSlot'),BufferLayout__namespace.nu64(),// authorizedVoters.length
BufferLayout__namespace.seq(BufferLayout__namespace.struct([BufferLayout__namespace.nu64('epoch'),publicKey('authorizedVoter')]),BufferLayout__namespace.offset(BufferLayout__namespace.u32(),-8),'authorizedVoters'),BufferLayout__namespace.struct([BufferLayout__namespace.seq(BufferLayout__namespace.struct([publicKey('authorizedPubkey'),BufferLayout__namespace.nu64('epochOfLastAuthorizedSwitch'),BufferLayout__namespace.nu64('targetEpoch')]),32,'buf'),BufferLayout__namespace.nu64('idx'),BufferLayout__namespace.u8('isEmpty')],'priorVoters'),BufferLayout__namespace.nu64(),// epochCredits.length
BufferLayout__namespace.seq(BufferLayout__namespace.struct([BufferLayout__namespace.nu64('epoch'),BufferLayout__namespace.nu64('credits'),BufferLayout__namespace.nu64('prevCredits')]),BufferLayout__namespace.offset(BufferLayout__namespace.u32(),-8),'epochCredits'),BufferLayout__namespace.struct([BufferLayout__namespace.nu64('slot'),BufferLayout__namespace.nu64('timestamp')],'lastTimestamp')]);/**
 * VoteAccount class
 */var VoteAccount=/*#__PURE__*/function(){/**
   * @internal
   */function VoteAccount(args){_classCallCheck(this,VoteAccount);this.nodePubkey=void 0;this.authorizedWithdrawer=void 0;this.commission=void 0;this.rootSlot=void 0;this.votes=void 0;this.authorizedVoters=void 0;this.priorVoters=void 0;this.epochCredits=void 0;this.lastTimestamp=void 0;this.nodePubkey=args.nodePubkey;this.authorizedWithdrawer=args.authorizedWithdrawer;this.commission=args.commission;this.rootSlot=args.rootSlot;this.votes=args.votes;this.authorizedVoters=args.authorizedVoters;this.priorVoters=args.priorVoters;this.epochCredits=args.epochCredits;this.lastTimestamp=args.lastTimestamp;}/**
   * Deserialize VoteAccount from the account data.
   *
   * @param buffer account data
   * @return VoteAccount
   */return _createClass(VoteAccount,null,[{key:"fromAccountData",value:function fromAccountData(buffer){var versionOffset=4;var va=VoteAccountLayout.decode(toBuffer(buffer),versionOffset);var rootSlot=va.rootSlot;if(!va.rootSlotValid){rootSlot=null;}return new VoteAccount({nodePubkey:new PublicKey(va.nodePubkey),authorizedWithdrawer:new PublicKey(va.authorizedWithdrawer),commission:va.commission,votes:va.votes,rootSlot:rootSlot,authorizedVoters:va.authorizedVoters.map(parseAuthorizedVoter),priorVoters:getPriorVoters(va.priorVoters),epochCredits:va.epochCredits,lastTimestamp:va.lastTimestamp});}}]);}();function parseAuthorizedVoter(_ref47){var authorizedVoter=_ref47.authorizedVoter,epoch=_ref47.epoch;return{epoch:epoch,authorizedVoter:new PublicKey(authorizedVoter)};}function parsePriorVoters(_ref48){var authorizedPubkey=_ref48.authorizedPubkey,epochOfLastAuthorizedSwitch=_ref48.epochOfLastAuthorizedSwitch,targetEpoch=_ref48.targetEpoch;return{authorizedPubkey:new PublicKey(authorizedPubkey),epochOfLastAuthorizedSwitch:epochOfLastAuthorizedSwitch,targetEpoch:targetEpoch};}function getPriorVoters(_ref49){var buf=_ref49.buf,idx=_ref49.idx,isEmpty=_ref49.isEmpty;if(isEmpty){return[];}return[].concat(_toConsumableArray(buf.slice(idx+1).map(parsePriorVoters)),_toConsumableArray(buf.slice(0,idx).map(parsePriorVoters)));}var endpoint={http:{devnet:'http://api.devnet.solana.com',testnet:'http://api.testnet.solana.com','mainnet-beta':'http://api.mainnet-beta.solana.com/'},https:{devnet:'https://api.devnet.solana.com',testnet:'https://api.testnet.solana.com','mainnet-beta':'https://api.mainnet-beta.solana.com/'}};/**
 * Retrieves the RPC API URL for the specified cluster
 * @param {Cluster} [cluster="devnet"] - The cluster name of the RPC API URL to use. Possible options: 'devnet' | 'testnet' | 'mainnet-beta'
 * @param {boolean} [tls="http"] - Use TLS when connecting to cluster.
 *
 * @returns {string} URL string of the RPC endpoint
 */function clusterApiUrl(cluster,tls){var key=tls===false?'http':'https';if(!cluster){return endpoint[key]['devnet'];}var url=endpoint[key][cluster];if(!url){throw new Error("Unknown ".concat(key," cluster: ").concat(cluster));}return url;}/**
 * Send and confirm a raw transaction
 *
 * If `commitment` option is not specified, defaults to 'max' commitment.
 *
 * @param {Connection} connection
 * @param {Buffer} rawTransaction
 * @param {TransactionConfirmationStrategy} confirmationStrategy
 * @param {ConfirmOptions} [options]
 * @returns {Promise<TransactionSignature>}
 *//**
 * @deprecated Calling `sendAndConfirmRawTransaction()` without a `confirmationStrategy`
 * is no longer supported and will be removed in a future version.
 */// eslint-disable-next-line no-redeclare
// eslint-disable-next-line no-redeclare
function sendAndConfirmRawTransaction(_x164,_x165,_x166,_x167){return _sendAndConfirmRawTransaction.apply(this,arguments);}/**
 * There are 1-billion lamports in one SOL
 */function _sendAndConfirmRawTransaction(){_sendAndConfirmRawTransaction=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee111(connection,rawTransaction,confirmationStrategyOrConfirmOptions,maybeConfirmOptions){var confirmationStrategy,options,sendOptions,signature,commitment,confirmationPromise,status;return _regeneratorRuntime().wrap(function _callee111$(_context111){while(1)switch(_context111.prev=_context111.next){case 0:if(confirmationStrategyOrConfirmOptions&&Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions,'lastValidBlockHeight')){confirmationStrategy=confirmationStrategyOrConfirmOptions;options=maybeConfirmOptions;}else if(confirmationStrategyOrConfirmOptions&&Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions,'nonceValue')){confirmationStrategy=confirmationStrategyOrConfirmOptions;options=maybeConfirmOptions;}else{options=confirmationStrategyOrConfirmOptions;}sendOptions=options&&{skipPreflight:options.skipPreflight,preflightCommitment:options.preflightCommitment||options.commitment,minContextSlot:options.minContextSlot};_context111.next=4;return connection.sendRawTransaction(rawTransaction,sendOptions);case 4:signature=_context111.sent;commitment=options&&options.commitment;confirmationPromise=confirmationStrategy?connection.confirmTransaction(confirmationStrategy,commitment):connection.confirmTransaction(signature,commitment);_context111.next=9;return confirmationPromise;case 9:status=_context111.sent.value;if(!status.err){_context111.next=14;break;}if(!(signature!=null)){_context111.next=13;break;}throw new SendTransactionError({action:sendOptions!==null&&sendOptions!==void 0&&sendOptions.skipPreflight?'send':'simulate',signature:signature,transactionMessage:"Status: (".concat(JSON.stringify(status),")")});case 13:throw new Error("Raw transaction ".concat(signature," failed (").concat(JSON.stringify(status),")"));case 14:return _context111.abrupt("return",signature);case 15:case"end":return _context111.stop();}},_callee111);}));return _sendAndConfirmRawTransaction.apply(this,arguments);}var LAMPORTS_PER_SOL=1000000000;exports.Account=Account;exports.AddressLookupTableAccount=AddressLookupTableAccount;exports.AddressLookupTableInstruction=AddressLookupTableInstruction;exports.AddressLookupTableProgram=AddressLookupTableProgram;exports.Authorized=Authorized;exports.BLOCKHASH_CACHE_TIMEOUT_MS=BLOCKHASH_CACHE_TIMEOUT_MS;exports.BPF_LOADER_DEPRECATED_PROGRAM_ID=BPF_LOADER_DEPRECATED_PROGRAM_ID;exports.BPF_LOADER_PROGRAM_ID=BPF_LOADER_PROGRAM_ID;exports.BpfLoader=BpfLoader;exports.COMPUTE_BUDGET_INSTRUCTION_LAYOUTS=COMPUTE_BUDGET_INSTRUCTION_LAYOUTS;exports.ComputeBudgetInstruction=ComputeBudgetInstruction;exports.ComputeBudgetProgram=ComputeBudgetProgram;exports.Connection=Connection;exports.Ed25519Program=Ed25519Program;exports.Enum=Enum;exports.EpochSchedule=EpochSchedule;exports.FeeCalculatorLayout=FeeCalculatorLayout;exports.Keypair=Keypair;exports.LAMPORTS_PER_SOL=LAMPORTS_PER_SOL;exports.LOOKUP_TABLE_INSTRUCTION_LAYOUTS=LOOKUP_TABLE_INSTRUCTION_LAYOUTS;exports.Loader=Loader;exports.Lockup=Lockup;exports.MAX_SEED_LENGTH=MAX_SEED_LENGTH;exports.Message=Message;exports.MessageAccountKeys=MessageAccountKeys;exports.MessageV0=MessageV0;exports.NONCE_ACCOUNT_LENGTH=NONCE_ACCOUNT_LENGTH;exports.NonceAccount=NonceAccount;exports.PACKET_DATA_SIZE=PACKET_DATA_SIZE;exports.PUBLIC_KEY_LENGTH=PUBLIC_KEY_LENGTH;exports.PublicKey=PublicKey;exports.SIGNATURE_LENGTH_IN_BYTES=SIGNATURE_LENGTH_IN_BYTES;exports.SOLANA_SCHEMA=SOLANA_SCHEMA;exports.STAKE_CONFIG_ID=STAKE_CONFIG_ID;exports.STAKE_INSTRUCTION_LAYOUTS=STAKE_INSTRUCTION_LAYOUTS;exports.SYSTEM_INSTRUCTION_LAYOUTS=SYSTEM_INSTRUCTION_LAYOUTS;exports.SYSVAR_CLOCK_PUBKEY=SYSVAR_CLOCK_PUBKEY;exports.SYSVAR_EPOCH_SCHEDULE_PUBKEY=SYSVAR_EPOCH_SCHEDULE_PUBKEY;exports.SYSVAR_INSTRUCTIONS_PUBKEY=SYSVAR_INSTRUCTIONS_PUBKEY;exports.SYSVAR_RECENT_BLOCKHASHES_PUBKEY=SYSVAR_RECENT_BLOCKHASHES_PUBKEY;exports.SYSVAR_RENT_PUBKEY=SYSVAR_RENT_PUBKEY;exports.SYSVAR_REWARDS_PUBKEY=SYSVAR_REWARDS_PUBKEY;exports.SYSVAR_SLOT_HASHES_PUBKEY=SYSVAR_SLOT_HASHES_PUBKEY;exports.SYSVAR_SLOT_HISTORY_PUBKEY=SYSVAR_SLOT_HISTORY_PUBKEY;exports.SYSVAR_STAKE_HISTORY_PUBKEY=SYSVAR_STAKE_HISTORY_PUBKEY;exports.Secp256k1Program=Secp256k1Program;exports.SendTransactionError=SendTransactionError;exports.SolanaJSONRPCError=SolanaJSONRPCError;exports.SolanaJSONRPCErrorCode=SolanaJSONRPCErrorCode;exports.StakeAuthorizationLayout=StakeAuthorizationLayout;exports.StakeInstruction=StakeInstruction;exports.StakeProgram=StakeProgram;exports.Struct=Struct;exports.SystemInstruction=SystemInstruction;exports.SystemProgram=SystemProgram;exports.Transaction=Transaction;exports.TransactionExpiredBlockheightExceededError=TransactionExpiredBlockheightExceededError;exports.TransactionExpiredNonceInvalidError=TransactionExpiredNonceInvalidError;exports.TransactionExpiredTimeoutError=TransactionExpiredTimeoutError;exports.TransactionInstruction=TransactionInstruction;exports.TransactionMessage=TransactionMessage;exports.TransactionStatus=TransactionStatus;exports.VALIDATOR_INFO_KEY=VALIDATOR_INFO_KEY;exports.VERSION_PREFIX_MASK=VERSION_PREFIX_MASK;exports.VOTE_PROGRAM_ID=VOTE_PROGRAM_ID;exports.ValidatorInfo=ValidatorInfo;exports.VersionedMessage=VersionedMessage;exports.VersionedTransaction=VersionedTransaction;exports.VoteAccount=VoteAccount;exports.VoteAuthorizationLayout=VoteAuthorizationLayout;exports.VoteInit=VoteInit;exports.VoteInstruction=VoteInstruction;exports.VoteProgram=VoteProgram;exports.clusterApiUrl=clusterApiUrl;exports.sendAndConfirmRawTransaction=sendAndConfirmRawTransaction;exports.sendAndConfirmTransaction=sendAndConfirmTransaction;

},{"@noble/curves/ed25519":13,"@noble/curves/secp256k1":14,"@noble/hashes/sha256":20,"@noble/hashes/sha3":21,"@solana/buffer-layout":24,"bigint-buffer":26,"bn.js":27,"borsh":28,"bs58":30,"buffer":2,"jayson/lib/client/browser":32,"rpc-websockets":34,"superstruct":36}]},{},[4]);
