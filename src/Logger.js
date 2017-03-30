const LOG_LEVELS = [
  'error',
  'warn',
  'highlight',
  'info',
  'log',
  'debug',
  'deepDebug'
];
const argument = require('argument');
const DEFAULT_LEVEL = argument(['LOG_LEVEL', 'NODE_LOG_LEVEL'], 'info');
const path = require('path');
const callsite = require('callsite');
const clc = require('cli-color');
const configSetup = require('config-setup');
const DEBUG_LEVEL = LOG_LEVELS.indexOf('debug');
const INFO_LEVEL = LOG_LEVELS.indexOf('info');
const LOG_LEVEL = LOG_LEVELS.indexOf('log');
const HIGHLIGHT_LEVEL = LOG_LEVELS.indexOf('highlight');
const DEEP_DEBUG_LEVEL = LOG_LEVELS.indexOf('deepDebug');
const WARN_LEVEL = LOG_LEVELS.indexOf('warn');
const ERROR_LEVEL = LOG_LEVELS.indexOf('error');
const trueTypeOf = require('true-typeof');
let defaultInstance;

/**
 * The throttle timeouts.
 *
 * @type {object}
 * @private
 */
const _throttle = {};

/**
 * A logger class that spits out log entries into the console colored and
 * stylized in different ways depending on the level.
 */
class Logger {

  /**
   * @param {string|number} level The default start level.
   * @param {boolean} silent If the logger should start silent.
   */
  constructor(level = DEFAULT_LEVEL, silent = false) {

    /**
     * Indicates if we should be silent.
     *
     * @type {boolean}
     * @private
     */
    this._silent = silent;

    /**
     * The level of logging.
     *
     * @type {string}
     * @private
     */
    this._level = LOG_LEVELS.indexOf(level);

    /**
     * The levels of logging.
     * @type {string[]}
     */
    this.LEVELS = LOG_LEVELS;

    // Inform the debugging status.
    console.log(
      '[LOG] Logging level set to ' + this._level + ' | is ' +
      (this.isDebugging ? '' : 'not') + ' debugging | is ' +
      (this._silent ? '' : 'not') + ' silent'
    );

  }

  /**
   * Obtains the default instance.
   * @returns {Logger}
   */
  static get logger() {
    if (defaultInstance) {
      return defaultInstance;
    }
    defaultInstance = new Logger();
    return defaultInstance;
  }

  /**
   * Obtains a new instance of the logger.
   * @param {string|number=} level The initial level of the logger.
   * @param {boolean=} silent If the logger should start silent.
   * @returns {Logger}
   */
  static getLogger(level, silent) {
    return new Logger(level, silent);
  }

  /**
   * Sets the level of logging.
   * @param {*} level The new level
   */
  set level(level) {
    console.log(clc.magentaBright
      .bold(`[LOG] Requested logging level to change to '${level}'`));
    if (isNaN(level)) {
      const index = LOG_LEVELS.indexOf(level);
      this._level = index > -1 ? index : 0;
    } else {
      this._level = parseInt(level);
    }
  }

  /**
   * Gets the level.
   * @returns {number}
   */
  get level() {
    return this._level;
  }

  /**
   * Concatenates the type of log into a single string for the console.
   *
   * @param {String} logType The log type.
   * @param {String} debugColor Color to use for the console.
   * @param {Arguments} args The arguments to check as configuration.
   */
  static doLog(logType, debugColor, args) {

    const config = configSetup(
      {
        title: '',
        message: '',
        msg: null,
        data: null,
        type: '',
        color: debugColor,
        indent: 0,
        prefix: true,
        suffix: this.isDebugging,
        marginTop: 0,
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: 0,
        borderTop: 0,
        borderBottom: 0,
        borderChar: '-',
        ts: false,
        timestamp: false,
        muted: false
      },
      args,
      ['message:error'],
      ['message:string'],
      ['message:function'],
      ['title:string', 'message'],
      ['title:string', 'message', 'data'],
      ['this:object']
    );
    const indentation = new Array(config.indent).join(' ');
    let i;
    let border;

    config.message = config.message || config.msg;

    if (trueTypeOf(config.message) === 'error') {
      config.message = config.message.message;
    }

    if (trueTypeOf(config.message) === 'function') {
      config.message = config.message();
    }

    if (trueTypeOf(config.message) === 'object') {
      config.message = JSON.stringify(config.message);
    }

    if (config.data) {
      config.message += JSON.stringify(config.data);
    }

    if (config.message === '') {
      return;
    }

    if (config.type !== '') {
      config.type = `[${config.type}] `;
    }

    if (config.title) {
      config.message = `[${config.title}] ${config.message}`;
    }

    if (config.prefix) {
      config.message = `[${logType}] ${config.type}${config.message}`;
    }

    if (typeof config.suffix === 'string') {
      config.message += clc.blackBright(` (${config.suffix})`);
    } else if (config.suffix) {
      config.message += clc.blackBright(` (${this._getLastLine()})`);
    }

    if (config.ts || config.timestamp) {
      config.message += clc.blackBright(` > ${new Date().getTime()}`);
    }

    if (config.muted) {
      config.message = clc.blackBright(config.message);
    } else if (config.color) {
      config.message = clc[config.color](config.message);
    }

    if (config.marginTop) {
      for (i = 0; i < config.marginTop; i++) {
        console.log('');
      }
    }

    if (config.borderTop || config.borderBottom) {
      border = clc[config.color]
      (new Array(Math.max(config.borderTop, config.borderBottom))
        .join(config.borderChar));
    }

    if (config.borderTop) {
      console.log(border);
    }

    if (config.paddingTop) {
      for (i = 0; i < config.paddingTop; i++) {
        console.log('');
      }
    }

    console.log(indentation + config.message);

    if (config.paddingBottom) {
      for (i = 0; i < config.paddingBottom; i++) {
        console.log('');
      }
    }

    if (config.borderTop) {
      console.log(border);
    }

    if (config.marginBottom) {
      for (i = 0; i < config.marginBottom; i++) {
        console.log('');
      }
    }

  }

  /**
   * Obtains the last line called in the stack trace.
   * @returns {string}
   * @private
   */
  _getLastLine() {
    /**
     * @type {{
       *  getFileName: function,
       *  getLineNumber: function,
       *  getColumnNumber: function
       * }}
     */
    const call =
      callsite().find(l => !/(index|Logger)\.js$/.test(l.getFileName()));
    const fileName = path.basename(call.getFileName());
    const colNo = call.getColumnNumber();
    const lineNo = call.getLineNumber();
    return clc.blackBright(`${fileName} ${lineNo}:${colNo}`);
  }

  /**
   * Sets the logger to silence.
   *
   * @returns {Logger}
   */
  silence() {
    this._silent = true;
    return this;
  }

  /**
   * Sets the logger to talk.
   *
   * @returns {Logger}
   */
  talk() {
    this._silent = false;
    return this;
  }

  /**
   * Checks if we're debugging.
   *
   * @returns {boolean}
   */
  get isDebugging() {
    return this._level >= DEBUG_LEVEL;
  }

  /**
   * Sends a highlight info log to the console.
   * @returns {Arguments}
   */
  highlight() {
    if (!this._silent && this._level >= HIGHLIGHT_LEVEL) {
      Logger.doLog.call(this, 'HGH', 'yellowBright', arguments);
    }
    return arguments;
  }

  /**
   * Sends a debug log into the console.
   * @returns {Arguments}
   */
  debug() {
    if (!this._silent && this.isDebugging) {
      Logger.doLog.call(this, 'DBG', 'magenta', arguments);
    }
    return arguments;
  }

  /**
   * Sends a deep debug log into the console.
   * @returns {Arguments}
   */
  deepDebug() {
    if (!this._silent && this._level >= DEEP_DEBUG_LEVEL) {
      Logger.doLog.call(this, 'DBG', 'blackBright', arguments);
    }
    return arguments;
  }

  /**
   * Sends an info log into the console.
   * @returns {Arguments}
   */
  info() {
    if (!this._silent && this._level >= INFO_LEVEL) {
      Logger.doLog.call(this, 'INF', null, arguments);
    }
    return arguments;
  }

  /**
   * Sends a simple log into the console.
   * @returns {Arguments}
   */
  log() {
    if (!this._silent && this._level >= LOG_LEVEL) {
      Logger.doLog.call(this, 'LOG', null, arguments);
    }
    return arguments;
  }

  /**
   * Sends a warning log into the console.
   * @returns {Arguments}
   */
  warn() {
    if (!this._silent && this._level >= WARN_LEVEL) {
      Logger.doLog.call(this, 'WRN', 'yellow', arguments);
    }
    return arguments;
  }

  /**
   * Sends an error log into the console.
   * @returns {Arguments}
   */
  error() {
    if (!this._silent && this._level >= ERROR_LEVEL) {
      Logger.doLog.call(this, 'ERR', 'red', arguments);
    }
    return arguments;
  }

  /**
   * Sends a fatal log into the console and throws a new error.
   * @throws {TypeError}
   */
  fatal() {
    if (!this._silent) {
      Logger.doLog.call(this, 'ERR', 'red', arguments);
    }
    throw new TypeError(args[0]);
  }

  /**
   * Shortcut to assertion.
   * @param {*} val Values to assert.
   * @returns {boolean}
   */
  assert(...val) {
    for (let i = 0; i < val.length; i++) {
      if (!val[i]) {
        if (!this._silent && this._level >= ERROR_LEVEL) {
          Logger.doLog.call(this, 'AST', 'red',
            [`Assertion Failed: Value '${val[i]}' is falsy`]);
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Asserts that 2 values are equal.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertEqual(a, b) {
    if (a !== b) {
      if (!this._silent && this._level >= ERROR_LEVEL) {
        Logger.doLog.call(this, 'AST', 'red',
          [`Assertion Failed: Value ${a} is not equal to ${b}`]);
      }
      return false;
    }
    return true;
  }

  /**
   * Asserts that value a is greater than value b.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertGreaterThan(a, b) {
    if (a <= b) {
      if (!this._silent && this._level >= ERROR_LEVEL) {
        Logger.doLog.call(this, 'AST', 'red',
          [`Assertion Failed: Value ${a} is not greater than ${b}`]);
      }
      return false;
    }
    return true;
  }

  /**
   * Asserts that value a is less than value b.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertLessThan(a, b) {
    if (a >= b) {
      if (!this._silent && this._level >= ERROR_LEVEL) {
        Logger.doLog
          .call(this, 'AST', 'red',
            [`Assertion Failed: Value ${a} is not smaller than ${b}`]);
      }
      return false;
    }
    return true;
  }

  /**
   * Asserts that 2 values are not equal.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertNotEqual(a, b) {
    if (a === b) {
      if (!this._silent && this._level >= ERROR_LEVEL) {
        Logger.doLog
          .call(this, 'AST', 'red',
            [`Assertion Failed: Value '${val[i]}' has no length`]);
      }
      return false;
    }
    return true;
  }

  /**
   * Asserts that the values has a length (array/string).
   * @param {string|[]} val The first value.
   * @returns {boolean}
   */
  assertLength(...val) {
    for (let i = 0; i < val.length; i++) {
      if (!val[i].length) {
        if (!this._silent && this._level >= ERROR_LEVEL) {
          Logger.doLog
            .call(this, 'AST', 'red',
              [`Assertion Failed: Value '${val[i]}' has no length`]);
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Asserts that a value is a type.
   * @param {*} value A value to assert.
   * @param {string} type The true type of the value.
   * @returns {boolean}
   */
  assertType(value, type) {
    if (trueTypeOf(value) !== type) {
      if (!this._silent && this._level >= ERROR_LEVEL) {
        Logger.doLog
          .call(this, 'AST', 'red',
            [`Assertion Failed: Value ${value} is not ${type}`]);
      }
      return false;
    }
    return true;
  }

  /**
   * Throttles a message to be logged and logs it once.
   * @param msg
   * @param timeout
   * @param method
   */
  throttle(msg, timeout = 1000, method = 'log') {
    const key = method + (msg.message || msg);
    if (_throttle[key]) {
      clearTimeout(_throttle[key]);
    } else {
      this[method](msg);
    }
    const self = this;
    _throttle[key] = setTimeout(function() {
      self[this.method](Object.assign(this.msg, {
        suffix: 'Throttled - ' + self._getLastLine()
      }));
      delete _throttle[this.key];
    }.bind({
      key,
      method: method,
      msg: typeof msg === 'string' ? {message: msg} : msg
    }), timeout);
  }

  /**
   * Shortcut to throttle debug.
   * @param msg
   * @param timeout
   * @returns void
   */
  debugThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'debug');
  }

  /**
   * Shortcut to throttle deep debug.
   * @param msg
   * @param timeout
   * @returns void
   */
  deepDebugThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'deepDebug');
  }

  /**
   * Shortcut to throttle log.
   * @param msg
   * @param timeout
   * @returns void
   */
  logThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'log');
  }

  /**
   * Shortcut to throttle info.
   * @param msg
   * @param timeout
   * @returns void
   */
  infoThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'info');
  }

  /**
   * Shortcut to throttle debug.
   * @param msg
   * @param timeout
   * @returns void
   */
  highlightThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'highlight');
  }

  /**
   * Shortcut to throttle debug.
   * @param msg
   * @param timeout
   * @returns void
   */
  warnThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'warn');
  }

  /**
   * Shortcut to throttle error.
   * @param msg
   * @param timeout
   * @returns void
   */
  errorThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'error');
  }

  /**
   * Logs the output of an child_process.exec command.
   * @param {Error} e Any errors that might have ocurred.
   * @param {Buffer} stdout The output of the exec command.
   * @param {Buffer} stderr The error of the exec command.
   */
  fromExec(e, stdout, stderr) {
    if (e) {
      Logger.logger.error(e);
    }
    if (stdout) {
      Logger.logger.debug(stdout);
    }
    if (stderr) {
      Logger.logger.error(stderr);
    }
  }

}

module.exports = Logger;
