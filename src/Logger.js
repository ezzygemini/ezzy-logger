/*!
 * Copyright (c) 2016 Moises Romero
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
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const LOG_LEVELS = [
  'error',
  'warn',
  'highlight',
  'info',
  'log',
  'debug'
];
const argument = require('argument');
const path = require('path');
const callsite = require('callsite');
const clc = require('cli-color');
const configSetup = require('config-setup');
const DEBUG_LEVEL = LOG_LEVELS.indexOf('debug');
const INFO_LEVEL = LOG_LEVELS.indexOf('info');
const LOG_LEVEL = LOG_LEVELS.indexOf('log');
const HIGHLIGHT_LEVEL = LOG_LEVELS.indexOf('highlight');
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

  constructor() {

    const defaultLevel = argument(['LOG_LEVEL', 'NODE_LOG_LEVEL'], 'info');

    /**
     * Indicates if we should be silent.
     *
     * @type {boolean}
     * @private
     */
    this._silent = false;

    /**
     * The level of logging.
     *
     * @type {string}
     * @private
     */
    this._level = LOG_LEVELS.indexOf(defaultLevel);

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
   * @private
   */
  static _concat(logType, debugColor, args) {

    const config = configSetup(
      {
        title: '',
        message: '',
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
        borderChar: '-'
      },
      args,
      ['message:error'],
      ['this:object'],
      ['message:string'],
      ['message:function']
    );
    const indentation = new Array(config.indent).join(' ');
    let i;
    let border;

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

    if (config.color) {
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
      Logger._concat.call(this, 'HGH', 'yellowBright', arguments);
    }
    return arguments;
  }

  /**
   * Sends a debug log into the console.
   * @returns {Arguments}
   */
  debug() {
    if (!this._silent && this.isDebugging) {
      Logger._concat.call(this, 'DBG', 'magenta', arguments);
    }
    return arguments;
  }

  /**
   * Sends an info log into the console.
   * @returns {Arguments}
   */
  info() {
    if (!this._silent && this._level >= INFO_LEVEL) {
      Logger._concat.call(this, 'INF', null, arguments);
    }
    return arguments;
  }

  /**
   * Sends a simple log into the console.
   * @returns {Arguments}
   */
  log() {
    if (!this._silent && this._level >= LOG_LEVEL) {
      Logger._concat.call(this, 'LOG', null, arguments);
    }
    return arguments;
  }

  /**
   * Sends a warning log into the console.
   * @returns {Arguments}
   */
  warn() {
    if (!this._silent && this._level >= WARN_LEVEL) {
      Logger._concat.call(this, 'WRN', 'yellow', arguments);
    }
    return arguments;
  }

  /**
   * Sends an error log into the console.
   * @returns {Arguments}
   */
  error() {
    if (!this._silent && this._level >= ERROR_LEVEL) {
      Logger._concat.call(this, 'ERR', 'red', arguments);
    }
    return arguments;
  }

  /**
   * Sends a fatal log into the console and throws a new error.
   * @throws {TypeError}
   */
  fatal() {
    if (!this._silent) {
      Logger._concat.call(this, 'ERR', 'red', arguments);
    }
    throw new TypeError(args[0]);
  }

  /**
   * Shortcut to assertion.
   * @param {*} val Value to assert.
   * @param {string=} msg The message to display.
   * @returns {Arguments}
   */
  assert(val, msg) {
    if (!this._silent && this._level >= ERROR_LEVEL) {
      if (!val) {
        Logger._concat.call(this, 'AST', 'red', [msg || 'Assertion Failed']);
      }
    }
    return arguments;
  }

  /**
   * Throttles a message to be logged and logs it once.
   * @param msg
   * @param timeout
   * @param method
   */
  throttle(msg, timeout = 1000, method = 'log') {
    const realMsg = msg.message || msg;
    if (_throttle[realMsg]) {
      clearTimeout(_throttle[realMsg]);
    }
    const self = this;
    const line = this._getLastLine();
    _throttle[realMsg] = setTimeout((function() {
      self[this.method](msg);
      delete _throttle[this.key];
    }).bind({
      method: method,
      msg: Object.assign(typeof msg === 'string' ? {message: msg} : msg, {
        suffix: 'Throttled - ' + line
      }),
      key: realMsg
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
   * Throttles assertion.
   * @param msg
   * @param timeout
   * @returns void
   */
  assertThrottle(msg, timeout) {
    this.throttle(msg, timeout, 'assert');
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
