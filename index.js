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
  'debug',
  'log',
  'info',
  'warn',
  'error',
  'fatal'
];
const path = require('path');
const callsite = require('callsite');
const clc = require('cli-color');
const configSetup = require('config-setup');
const DEBUG_LEVEL = LOG_LEVELS.indexOf('debug');
const INFO_LEVEL = LOG_LEVELS.indexOf('info');
const LOG_LEVEL = LOG_LEVELS.indexOf('log');
const WARN_LEVEL = LOG_LEVELS.indexOf('warn');
const ERROR_LEVEL = LOG_LEVELS.indexOf('error');

/**
 * A logger class that spits out log entries into the console colored and
 * stylized in different ways depending on the level.
 */
class Logger {

  constructor() {

    /**
     * Indicates if we should be silent.
     * @type {boolean}
     * @private
     */
    this.silent_ = false;

    /**
     * The level of logging.
     * @type {string}
     * @private
     */
    this.level_ = LOG_LEVELS['log'];

  }

  /**
   * Concatenates the type of log into a single string for the console
   * @param {String} logType The log type
   * @param {String} debugColor Color to use for the console
   * @param {Arguments} args The arguments to check as configuration
   * @private
   */
  static _concat(logType, debugColor, args) {

    const config = configSetup(
      {
        message: '',
        type: '',
        color: debugColor,
        indent: 0,
        suffix: true,
        line: isDebugging,
        marginTop: 0,
        marginBottom: 0,
        borderTop: false,
        borderBottom: false,
        borderChar: '-',
        borderLength: 20
      },
      args,
      ['this:object'],
      ['message:string'],
      ['message:function']
    );
    let indentation = new Array(config.indent).join(' ');
    let i;
    let border;

    if (typeof config.message === 'function') {
      config.message = config.message();
    }

    if (typeof config.message === 'object') {
      config.message = JSON.stringify(config.message);
    }

    if (config.type !== '') {
      config.type = '[' + config.type + '] ';
    }

    if (config.suffix) {
      config.message = '[' + logType + '] ' + config.type + config.message;
    }

    if (config.line) {
      /**
       * @type {{
       *  getFileName: function,
       *  getLineNumber: function,
       *  getColumnNumber: function
       * }}
       */
      const call = callsite()[2];
      config.message += clc.inverse(
        ' (' +
        path.basename(call.getFileName()) +
        ' ' +
        call.getLineNumber() +
        ':' +
        call.getColumnNumber() +
        ')'
      );
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
      (new Array(config.borderLength).join(config.borderChar));
    }

    if (config.borderTop) {
      console.log(border);
    }

    console.log(indentation + config.message);

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
   * Sets the logger to silence
   * @returns {Logger}
   */
  silence() {
    this.silent_ = true;
    return this;
  }

  /**
   * Sets the logger to talk
   * @returns {Logger}
   */
  talk() {
    this.silent_ = false;
    return this;
  }

  /**
   * Checks if we're debugging.
   * @returns {boolean}
   */
  get isDebugging() {
    return DEBUG_LEVEL >= this.level_;
  }

  /**
   * Sends a highlight info log to the console
   * @returns {Logger}
   */
  highlight(...args) {
    if (!this.silent_ && INFO_LEVEL >= this.level_) {
      Logger._concat.call(this, 'HGH', 'yellow', args);
    }
    return this;
  };

  /**
   * Sends a debug log into the console
   * @returns {Logger}
   */
  debug(...args) {
    if (!this.silent_ && this.isDebugging)
      Logger._concat.call(this, 'DBG', 'blue', args);
    return this;
  };

  /**
   * Sends an info log into the console
   * @returns {Logger}
   */
  info(...args) {
    if (!this.silent_ && INFO_LEVEL >= this.level_)
      Logger._concat.call(this, 'INF', null, args);
    return this;
  };

  /**
   * Sends a simple log into the console
   * @returns {Logger}
   */
  log(...args) {
    if (!this.silent_ && LOG_LEVEL >= this.level_)
      Logger._concat.call(this, 'LOG', null, args);
    return this;
  };

  /**
   * Sends a warning log into the console
   * @returns {Logger}
   */
  warn(...args) {
    if (!this.silent_ && WARN_LEVEL >= this.level_)
      Logger._concat.call(this, 'WRN', 'yellow', args);
    return this;
  };

  /**
   * Sends an error log into the console
   * @returns {Logger}
   */
  error(...args) {
    if (!this.silent_ && ERROR_LEVEL >= this.level_)
      concat.call(this, 'ERR', 'red', args);
    return this;
  };

  /**
   * Sends a fatal log into the console and throws a new error
   * @throws {TypeError}
   */
  fatal(...args) {
    if (!this.silent_)
      Logger._concat.call(this, 'ERR', 'red', args);
    throw new TypeError(args[0]);
  };

}

/**
 * Returns a new instance of the logger.
 */
Logger.logger = () => {
  if (!this._logger) {
    this._logger = new Logger();
  }
  return this._logger;
};

module.exports = Logger;
